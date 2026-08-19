"""
api/management/commands/train_models.py — Trains WealthNest's ML Models

Running `python manage.py train_models` does everything needed to get
predictions working:
  1. Builds a dataset (real survey data + a documented simulation layer
     on top — see "WHERE THE DATA COMES FROM" below)
  2. Cleans it up a little (pandas practice: dropna/fillna/drop_duplicates)
  3. Trains SEVERAL classification algorithms to predict risk category
     (kNN, Decision Tree, Random Forest, SVM), compares them, and keeps
     the best one
  4. Trains TWO regression algorithms to predict future portfolio value
     (plain Linear Regression, and Polynomial Regression), compares
     them, and keeps the better one
  5. Saves both winning models to ml_models/saved_models/ as .pkl files,
     which api/apps.py loads into memory the next time Django starts

WHERE THE DATA COMES FROM (updated on a later pass — this used to be
100% synthetic; see git history for the old all-fake version):
WealthNest doesn't have years of its own historical portfolio data to
learn from yet (it's a brand new app!), and no public dataset exists
that breaks a household's money down into WealthNest's exact categories
(mutual fund / stock / gold / FD / bond / PPF / NPS / ...). So this is
a HYBRID: real survey data for the parts that genuinely exist publicly,
and a clearly-labeled simulation for the parts that don't.

  REAL (from `django_ai/datasets/scf_risk_tolerance_2007.csv`):
  age, income, totalInvested, and — most importantly — the riskProfile
  LABEL itself. This file is the US Federal Reserve's 2007-2009 Survey
  of Consumer Finances panel, pre-processed into a `TrueRiskTol` score
  (the real, OBSERVED ratio of risky-to-total assets each household
  actually held) by the "Machine Learning and Data Science Blueprints
  for Finance" (O'Reilly) case study on investor risk tolerance —
  sourced from https://github.com/tatsath/fin-ml (the standard teaching
  dataset for exactly this kind of model). Using an *observed* risk
  score instead of a self-reported survey answer avoids a well-known
  bias: people are famously bad at accurately rating their own risk
  tolerance, but what they actually held in risky assets doesn't lie.
  income/totalInvested are US-dollar/net-worth figures from 2007 — we
  keep their real RELATIVE shape (percentile rank) but rescale that
  rank onto WealthNest's expected ₹ ranges via quantile mapping, since
  a literal 2007 US dollar figure means nothing in an INR family
  budgeting app. riskProfile is a real 3-way split of `TrueRiskTol`
  into terciles (bottom third = conservative, middle = moderate, top =
  aggressive) — balanced by construction, not by a hand-tuned formula.

  STILL SIMULATED (clearly, on purpose): equityPercent/debtPercent/
  goldPercent/investmentCount. No dataset ties a household's real net
  worth to WealthNest's specific instrument categories, so these are
  still generated the same way the old fully-synthetic version did —
  via `rng.dirichlet(...)` for the split — EXCEPT the Dirichlet's bias
  is now conditioned on each row's REAL riskProfile instead of an
  invented formula, so "someone the SCF panel showed actually holding
  mostly risky assets" ends up simulated with a mostly-equity split,
  not a random one.

  futureValue1yr's growth assumption is also grounded in real numbers
  now instead of a guessed "12%/9%/6% by risk bucket" — see
  EQUITY_ANNUAL_RETURN/DEBT_ANNUAL_RETURN/GOLD_ANNUAL_RETURN below for
  the real historical figures used and where they came from.

ACCURACY NOTES (from the original synthetic-data pass — see git history
if you want the "before" numbers; still relevant since the TRAINING
process below didn't change, only how the dataset is built):
  - `income` used to be pure noise: it was a feature the models trained
    on, but the OLD ground-truth formula below never used it, so it was
    just random static that distance-based models (kNN, SVM) had to
    scale and measure distance across for no reason. Real financial
    advice does lean on income (higher, more stable income usually means
    more room to take investment risk) — and now that the label comes
    from real survey data, income's relationship to risk tolerance is
    whatever it really was for these households, not an assumption.
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



# Real long-run historical average annual returns, used to turn a
# simulated equity/debt/gold split into a realistic "what would this
# portfolio have earned" figure for the regressor's ground truth,
# instead of a made-up flat rate. Sourced (August 2026):
#   equity → Nifty 50 Total Return Index ~20-year CAGR, widely cited in
#            the 11-15% range (NSE's own "Nifty 50 Whitepaper 2026"
#            reports 12.44% TRI over 20 years) — we use the middle of
#            that range.
#   debt   → India's 10-year government bond (G-Sec) yield, which has
#            traded roughly 6.5%-7.3% recently (a reasonable stand-in
#            for FD/bond/PPF/NPS-style steady returns).
#   gold   → India gold price CAGR in ₹ terms over the last 10-20 years,
#            widely cited in the 10-13% range.
# These are still simplifications (a single flat "expected" rate, not a
# real year-by-year time series), but they're real, citable numbers
# instead of guesses.
EQUITY_ANNUAL_RETURN = 0.12
DEBT_ANNUAL_RETURN = 0.07
GOLD_ANNUAL_RETURN = 0.11

# Where equityPercent/debtPercent/goldPercent get their Dirichlet "bias"
# from, per real riskProfile bucket — see the module docstring's
# "STILL SIMULATED" section for why this part can't be real data too.
ALLOCATION_BIAS_BY_RISK_PROFILE = {
    'aggressive': [5, 2, 1],     # skewed toward equity
    'moderate': [2, 2, 1],       # same balanced mix the old synthetic version used
    'conservative': [1, 5, 2],   # skewed toward debt
}


def build_training_dataset(seed=42):
    """
    Builds the training dataset from REAL Survey of Consumer Finances
    data (age/income/totalInvested/riskProfile) plus a documented
    simulation layer on top (equityPercent/debtPercent/goldPercent/
    investmentCount/futureValue1yr) — see the module docstring's
    "WHERE THE DATA COMES FROM" section for the full explanation of
    which parts are real and why the rest can't be.
    """
    rng = np.random.default_rng(seed)

    data_path = settings.BASE_DIR / 'datasets' / 'scf_risk_tolerance_2007.csv'
    real_data = pd.read_csv(data_path, index_col=0)

    # ── A little pandas EDA / cleaning practice ──
    # Real survey data comes with genuine rows to clean, unlike a
    # from-scratch synthetic dataset — the SCF panel repeats some rows
    # across its "implicates" (the Fed's way of handling missing survey
    # answers via multiple imputation), which shows up here as exact
    # duplicate rows once we've selected just the columns we need.
    real_data = real_data.dropna()
    real_data = real_data.drop_duplicates()

    # ── REAL: age ──
    # Django's serializer only accepts 18-100 (see PredictionRequestSerializer) —
    # the real data is already within that range, but clip defensively
    # in case a future refresh of the source file isn't.
    age = real_data['AGE07'].clip(18, 100).to_numpy()

    # ── REAL: income and totalInvested, rescaled ──
    # INCOME07/NETWORTH07 are real 2007 US-dollar figures — literally
    # using those numbers would be meaningless in an INR family-budget
    # app. Instead we keep each row's REAL percentile rank within the
    # dataset (i.e. "this household was richer than 73% of the others")
    # and map that rank onto the same ₹ ranges the old fully-synthetic
    # version used, via simple linear quantile mapping. This preserves
    # the real shape/inequality of the income & net-worth distribution
    # while landing in a currency and scale that makes sense here.
    income_rank = real_data['INCOME07'].rank(pct=True)
    income = 15000 + income_rank.to_numpy() * (300000 - 15000)

    # A few real households have negative net worth (more debt than
    # assets) — that doesn't make sense as "amount invested", so floor
    # it at 0 before ranking.
    net_worth_floored = real_data['NETWORTH07'].clip(lower=0)
    net_worth_rank = net_worth_floored.rank(pct=True)
    total_invested = 1000 + net_worth_rank.to_numpy() * (2000000 - 1000)

    # ── REAL: riskProfile (the label!) ──
    # TrueRiskTol is the dataset's OBSERVED risky-assets ratio (real
    # behavior, not a self-reported survey answer) — split into three
    # equal-sized buckets so the classes stay balanced by construction.
    risk_profile = pd.qcut(
        real_data['TrueRiskTol'], q=3, labels=['conservative', 'moderate', 'aggressive']
    ).astype(str).to_numpy()

    # ── SIMULATED: equity/debt/gold split, biased by the REAL label ──
    # rng.dirichlet gives three percentages that always add up to 100 —
    # same mechanism the old fully-synthetic version used, but now the
    # bias comes from each row's real riskProfile instead of a formula.
    n_rows = len(real_data)
    equity_percent = np.zeros(n_rows)
    debt_percent = np.zeros(n_rows)
    gold_percent = np.zeros(n_rows)
    for i, profile in enumerate(risk_profile):
        allocation = rng.dirichlet(ALLOCATION_BIAS_BY_RISK_PROFILE[profile]) * 100
        equity_percent[i], debt_percent[i], gold_percent[i] = allocation

    # ── SIMULATED: investmentCount ──
    # No dataset ties net worth to "how many separate holdings" — kept
    # as the same simple simulation the old version used.
    investment_count = rng.integers(1, 16, size=n_rows)

    # ── Ground truth for the REGRESSOR ──
    # Blend the REAL historical asset-class returns (see the constants
    # above) using each row's SIMULATED equity/debt/gold weights, then
    # add a little noise so it isn't a perfectly deterministic formula.
    blended_return = (
        (equity_percent / 100) * EQUITY_ANNUAL_RETURN
        + (debt_percent / 100) * DEBT_ANNUAL_RETURN
        + (gold_percent / 100) * GOLD_ANNUAL_RETURN
    )
    return_noise = rng.normal(0, 0.03, size=n_rows)
    future_value_1yr = total_invested * (1 + blended_return + return_noise)

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
        self.stdout.write('Building training data from real Survey of Consumer Finances data...')
        df = build_training_dataset()

        # The real dropna()/drop_duplicates() cleaning already happened
        # inside build_training_dataset (on the real source columns,
        # before they were rescaled) — this second pass just catches
        # any exact-duplicate ROWS the simulation layer could produce
        # (unlikely, but cheap to check, and keeps the same pandas
        # dropna/drop_duplicates practice the old synthetic version had).
        df = df.dropna()
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
