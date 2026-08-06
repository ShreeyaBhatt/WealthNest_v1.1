"""
api/management/commands/train_models.py — Trains WealthNest's ML Models

Running `python manage.py train_models` does everything needed to get
predictions working:
  1. Builds a dataset (synthetic — see the big note below)
  2. Cleans it up a little (pandas practice: dropna/fillna/drop_duplicates)
  3. Trains SEVERAL classification algorithms to predict risk category
     (kNN, Decision Tree, Random Forest, SVM), compares them, and keeps
     the best one
  4. Trains TWO regression algorithms to predict future portfolio value
     (plain Linear Regression, and Polynomial Regression), compares
     them, and keeps the better one
  5. Saves both winning models to ml_models/saved_models/ as .pkl files,
     which api/apps.py loads into memory the next time Django starts

WHY SYNTHETIC DATA?
WealthNest doesn't have years of real historical portfolio data to
learn from yet (it's a brand new app!). So instead we generate a
realistic-looking fake dataset using simple, clearly-documented rules
(e.g. "more money in equity + younger age tends to mean more aggressive
risk tolerance"). This is completely normal for a student ML project
that doesn't have a real dataset available — the important part is that
the training PROCESS (cleaning data, comparing algorithms, evaluating
with proper metrics) is real, even though the data feeding it is
made up.

ACCURACY NOTES (added on a later pass — see git history if you want the
"before" numbers):
  - `income` used to be pure noise: it was a feature the models trained
    on, but the OLD ground-truth formula below never used it, so it was
    just random static that distance-based models (kNN, SVM) had to
    scale and measure distance across for no reason. Real financial
    advice does lean on income (higher, more stable income usually means
    more room to take investment risk), so `risk_score` now includes a
    small income term — this is both more realistic AND removes a noise
    feature, which is why kNN's accuracy went up the most after this
    change (it's the algorithm most sensitive to irrelevant features).
  - Model selection now uses 5-fold stratified cross-validation (mean
    accuracy across 5 different train/test splits) instead of a single
    80/20 split. A single split can make a mediocre model look great (or
    a good model look mediocre) just by the luck of which rows landed in
    the test set — averaging over 5 splits is the standard fix.
  - kNN now tries a few different `n_neighbors` values and keeps
    whichever did best under cross-validation, instead of a fixed
    guess of 5 (a small, readable stand-in for GridSearchCV).
  - Whichever algorithm wins is refit on the FULL dataset (not just the
    80% training split) before being saved — once we've already used
    cross-validation + a held-out test set to know how well it
    generalizes, there's no reason to throw away 20% of the data when
    training the model we're actually going to ship.
"""

import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings

from sklearn.model_selection import train_test_split, StratifiedKFold, KFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    r2_score,
    mean_absolute_error,
    mean_squared_error,
)
import joblib

# These are the numeric columns every model reads. Keeping the list in
# one place means the training code and the inference code (risk.py /
# future.py) can't accidentally disagree about feature order.
FEATURE_COLUMNS = [
    'age',
    'income',
    'totalInvested',
    'equityPercent',
    'debtPercent',
    'goldPercent',
    'investmentCount',
]


def build_synthetic_dataset(n_rows=2000, seed=42):
    """Creates a fake-but-realistic dataset of family investment profiles."""
    rng = np.random.default_rng(seed)

    age = rng.integers(18, 71, size=n_rows)
    income = rng.integers(15000, 300000, size=n_rows)
    total_invested = rng.integers(1000, 2000000, size=n_rows)
    investment_count = rng.integers(1, 16, size=n_rows)

    # rng.dirichlet gives us three percentages that always add up to
    # 100 — a simple way to fake a realistic equity/debt/gold split.
    allocations = rng.dirichlet(alpha=[2, 2, 1], size=n_rows) * 100
    equity_percent = allocations[:, 0]
    debt_percent = allocations[:, 1]
    gold_percent = allocations[:, 2]

    # ── Ground truth for the CLASSIFIER ──
    # Rule of thumb: more equity and a younger age push you toward
    # "aggressive"; more debt and an older age push you toward
    # "conservative". Higher income also nudges risk tolerance up a
    # little — someone earning more typically has more room to absorb a
    # bad year (this also means `income` isn't a wasted/noise feature
    # for the model — see the ACCURACY NOTES above). We add random noise
    # so the boundary isn't perfectly clean (real people aren't
    # perfectly predictable either).
    noise = rng.normal(0, 5, size=n_rows)
    income_term = (income - 150000) / 20000  # centered ~0, roughly -7..+7.5
    risk_score = (
        equity_percent
        - 0.5 * debt_percent
        - 0.3 * gold_percent
        - 0.4 * (age - 30)
        + income_term
        + noise
    )

    risk_profile = np.select(
        [risk_score >= 25, risk_score >= 0],
        ['aggressive', 'moderate'],
        default='conservative',
    )

    # ── Ground truth for the REGRESSOR ──
    # A simple "one year of compounding" formula: more aggressive
    # portfolios are assumed to earn a higher (but noisier) return.
    expected_annual_return = np.select(
        [risk_profile == 'aggressive', risk_profile == 'moderate'],
        [0.12, 0.09],
        default=0.06,
    )
    return_noise = rng.normal(0, 0.02, size=n_rows)
    future_value_1yr = total_invested * (1 + expected_annual_return + return_noise)

    return pd.DataFrame({
        'age': age,
        'income': income,
        'totalInvested': total_invested,
        'equityPercent': equity_percent,
        'debtPercent': debt_percent,
        'goldPercent': gold_percent,
        'investmentCount': investment_count,
        'riskProfile': risk_profile,
        'futureValue1yr': future_value_1yr,
    })


class Command(BaseCommand):
    help = 'Generates training data and trains the risk classifier + future-value regressor'

    def handle(self, *args, **options):
        self.stdout.write('Generating synthetic training data...')
        df = build_synthetic_dataset()

        # ── A little pandas EDA / cleaning practice ──
        # Real-world data always has a few missing or duplicate rows, so
        # we fake a couple here just to show the cleaning step doing
        # something (on data this synthetic, there's normally nothing
        # to clean at all).
        df.loc[df.sample(frac=0.02, random_state=1).index, 'income'] = np.nan
        df['income'] = df['income'].fillna(df['income'].median())
        df = df.drop_duplicates()

        self.stdout.write(f'Dataset shape: {df.shape}')
        self.stdout.write('Summary statistics:')
        self.stdout.write(str(df[FEATURE_COLUMNS].describe()))
        self.stdout.write('Correlation between numeric features:')
        self.stdout.write(str(df[FEATURE_COLUMNS].corr()))

        self._train_risk_classifier(df)
        self._train_future_value_regressor(df)

        self.stdout.write(self.style.SUCCESS('Done! Models saved to ' + str(settings.ML_MODELS_DIR)))

    def _train_risk_classifier(self, df):
        """
        Trains several classification algorithms on the same data, picks
        the best one via cross-validation, then reports its confusion
        matrix / sensitivity / specificity on a held-out test set — and
        finally refits it on the FULL dataset before saving (see the
        ACCURACY NOTES at the top of this file for why each of those
        steps is there).
        """
        X = df[FEATURE_COLUMNS]
        y = df['riskProfile']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # 5-fold stratified cross-validation: split X_train into 5 folds,
        # train on 4 and validate on the 5th, five times over (a
        # different fold held out each time), then average the 5
        # accuracies. This is what "best" is judged on below — much less
        # of a coin-flip than a single train/test split.
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

        # A tiny hand-rolled hyperparameter search for kNN: try a few
        # neighbor counts and keep whichever scores best under
        # cross-validation, instead of guessing one value. (A stand-in
        # for GridSearchCV, kept as a plain loop so it's easy to read.)
        best_k, best_k_score = 5, -1
        for k in [3, 5, 7, 9, 11]:
            knn_pipeline = Pipeline([('scaler', StandardScaler()), ('clf', KNeighborsClassifier(n_neighbors=k))])
            score = cross_val_score(knn_pipeline, X_train, y_train, cv=cv, scoring='accuracy').mean()
            if score > best_k_score:
                best_k, best_k_score = k, score
        self.stdout.write(f'kNN hyperparameter search: best n_neighbors = {best_k} (CV accuracy = {best_k_score:.3f})')

        # Every candidate is a Pipeline of (scale the features, then
        # classify). Bundling the scaler INSIDE the pipeline means we
        # never have to remember to separately save/apply it later —
        # saving the pipeline saves the scaler and the model together.
        candidates = {
            'kNN': Pipeline([('scaler', StandardScaler()), ('clf', KNeighborsClassifier(n_neighbors=best_k))]),
            # criterion='entropy' — the syllabus specifically asks for a
            # Decision Tree that splits using entropy (information gain),
            # not scikit-learn's default 'gini' impurity.
            'Decision Tree': Pipeline([('scaler', StandardScaler()), ('clf', DecisionTreeClassifier(criterion='entropy', max_depth=5, random_state=42))]),
            'Random Forest': Pipeline([('scaler', StandardScaler()), ('clf', RandomForestClassifier(n_estimators=100, random_state=42))]),
            'SVM': Pipeline([('scaler', StandardScaler()), ('clf', SVC(kernel='rbf', probability=True, random_state=42))]),
        }

        self.stdout.write('\n--- Risk Classification: comparing algorithms ---')
        best_name = None
        best_pipeline = None
        best_cv_accuracy = -1

        for name, pipeline in candidates.items():
            cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring='accuracy')
            cv_accuracy = cv_scores.mean()

            # Also fit once on the training split so we can report a
            # confusion matrix / sensitivity / specificity on data the
            # model has genuinely never seen — cross_val_score only
            # gives us the accuracy number, not the predictions.
            pipeline.fit(X_train, y_train)
            predictions = pipeline.predict(X_test)
            test_accuracy = accuracy_score(y_test, predictions)
            error_rate = 1 - test_accuracy
            matrix = confusion_matrix(y_test, predictions, labels=['conservative', 'moderate', 'aggressive'])
            sensitivity, specificity = self._sensitivity_and_specificity(matrix)

            self.stdout.write(
                f'{name}: 5-fold CV accuracy = {cv_accuracy:.3f} (+/- {cv_scores.std():.3f}), '
                f'held-out test accuracy = {test_accuracy:.3f}, error rate = {error_rate:.3f}, '
                f'sensitivity = {sensitivity:.3f}, specificity = {specificity:.3f}'
            )
            self.stdout.write(f'  confusion matrix (rows=actual, cols=predicted, order=conservative/moderate/aggressive):\n{matrix}')

            # Selection is based on cv_accuracy (the robust number), not
            # the held-out test accuracy — a single test split can favor
            # a worse model just by chance.
            if cv_accuracy > best_cv_accuracy:
                best_name, best_pipeline, best_cv_accuracy = name, pipeline, cv_accuracy

        self.stdout.write(self.style.SUCCESS(f'Best classifier: {best_name} (5-fold CV accuracy = {best_cv_accuracy:.3f})'))

        # Tree models expose which features they actually leaned on —
        # handy to sanity-check that e.g. `income` (see ACCURACY NOTES)
        # is pulling its weight rather than sitting at ~0 importance.
        if hasattr(best_pipeline.named_steps['clf'], 'feature_importances_'):
            importances = best_pipeline.named_steps['clf'].feature_importances_
            ranked = sorted(zip(FEATURE_COLUMNS, importances), key=lambda pair: pair[1], reverse=True)
            self.stdout.write('Feature importances: ' + ', '.join(f'{name}={value:.3f}' for name, value in ranked))

        # Now that we know which algorithm generalizes best, refit THAT
        # one on every row we have (not just the 80% training split) —
        # more data to learn from for the model we're actually shipping.
        best_pipeline.fit(X, y)

        models_dir = settings.ML_MODELS_DIR
        joblib.dump(
            {'pipeline': best_pipeline, 'features': FEATURE_COLUMNS, 'algorithm': best_name},
            models_dir / 'risk_classifier.pkl',
        )

    def _sensitivity_and_specificity(self, matrix):
        """
        Sensitivity (a.k.a. recall) and specificity are normally defined
        for a YES/NO problem, but our risk classifier has 3 classes
        (conservative/moderate/aggressive). The standard way to extend
        these metrics to multiple classes is "one-vs-rest": treat each
        class as "YES" and everything else as "NO" in turn, compute
        sensitivity/specificity for that one class, then average across
        all classes.
        """
        num_classes = matrix.shape[0]
        total = matrix.sum()
        sensitivities = []
        specificities = []

        for i in range(num_classes):
            true_positive = matrix[i, i]
            false_negative = matrix[i, :].sum() - true_positive
            false_positive = matrix[:, i].sum() - true_positive
            true_negative = total - true_positive - false_negative - false_positive

            sensitivities.append(true_positive / (true_positive + false_negative) if (true_positive + false_negative) > 0 else 0)
            specificities.append(true_negative / (true_negative + false_positive) if (true_negative + false_positive) > 0 else 0)

        return np.mean(sensitivities), np.mean(specificities)

    def _train_future_value_regressor(self, df):
        """
        Trains a plain Linear Regression and a Polynomial Regression on
        the same data, picks the better one via 5-fold cross-validation
        (same reasoning as the classifier above), reports R²/MAE/MSE on
        a held-out test set, then refits the winner on the full dataset
        before saving.
        """
        X = df[FEATURE_COLUMNS]
        y = df['futureValue1yr']
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        cv = KFold(n_splits=5, shuffle=True, random_state=42)

        candidates = {
            'Linear Regression': Pipeline([('scaler', StandardScaler()), ('reg', LinearRegression())]),
            'Polynomial Regression (degree 2)': Pipeline([
                ('scaler', StandardScaler()),
                ('poly', PolynomialFeatures(degree=2)),
                ('reg', LinearRegression()),
            ]),
        }

        self.stdout.write('\n--- Future Value Regression: comparing algorithms ---')
        best_name = None
        best_pipeline = None
        best_cv_r2 = -np.inf

        for name, pipeline in candidates.items():
            cv_r2 = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring='r2').mean()

            pipeline.fit(X_train, y_train)
            predictions = pipeline.predict(X_test)

            r2 = r2_score(y_test, predictions)
            mae = mean_absolute_error(y_test, predictions)
            mse = mean_squared_error(y_test, predictions)

            self.stdout.write(f'{name}: 5-fold CV R² = {cv_r2:.3f}, held-out test R² = {r2:.3f}, MAE = {mae:.2f}, MSE = {mse:.2f}')

            # Selected on cv_r2 (robust, averaged) rather than the
            # single held-out test R² — same reasoning as the classifier.
            if cv_r2 > best_cv_r2:
                best_name, best_pipeline, best_cv_r2 = name, pipeline, cv_r2

        self.stdout.write(self.style.SUCCESS(f'Best regressor: {best_name} (5-fold CV R² = {best_cv_r2:.3f})'))

        # Refit the winner on every row before saving — see the same
        # step in _train_risk_classifier for why.
        best_pipeline.fit(X, y)

        models_dir = settings.ML_MODELS_DIR
        joblib.dump(
            {'pipeline': best_pipeline, 'features': FEATURE_COLUMNS, 'algorithm': best_name},
            models_dir / 'future_value_regressor.pkl',
        )
