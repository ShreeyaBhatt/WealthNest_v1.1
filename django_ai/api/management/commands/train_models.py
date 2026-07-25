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
"""

import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings

from sklearn.model_selection import train_test_split
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


def build_synthetic_dataset(n_rows=600, seed=42):
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
    # "conservative". We add random noise so the boundary isn't
    # perfectly clean (real people aren't perfectly predictable either).
    noise = rng.normal(0, 5, size=n_rows)
    risk_score = equity_percent - 0.5 * debt_percent - 0.3 * gold_percent - 0.4 * (age - 30) + noise

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
        Trains 4 different classification algorithms on the same data,
        prints how each one did, and keeps only the best-performing one.
        """
        X = df[FEATURE_COLUMNS]
        y = df['riskProfile']
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # Every candidate is a Pipeline of (scale the features, then
        # classify). Bundling the scaler INSIDE the pipeline means we
        # never have to remember to separately save/apply it later —
        # saving the pipeline saves the scaler and the model together.
        candidates = {
            'kNN': Pipeline([('scaler', StandardScaler()), ('clf', KNeighborsClassifier(n_neighbors=5))]),
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
        best_accuracy = -1

        for name, pipeline in candidates.items():
            pipeline.fit(X_train, y_train)
            predictions = pipeline.predict(X_test)
            accuracy = accuracy_score(y_test, predictions)
            error_rate = 1 - accuracy
            matrix = confusion_matrix(y_test, predictions, labels=['conservative', 'moderate', 'aggressive'])
            sensitivity, specificity = self._sensitivity_and_specificity(matrix)

            self.stdout.write(f'{name}: accuracy = {accuracy:.3f}, error rate = {error_rate:.3f}, sensitivity = {sensitivity:.3f}, specificity = {specificity:.3f}')
            self.stdout.write(f'  confusion matrix (rows=actual, cols=predicted, order=conservative/moderate/aggressive):\n{matrix}')

            if accuracy > best_accuracy:
                best_name, best_pipeline, best_accuracy = name, pipeline, accuracy

        self.stdout.write(self.style.SUCCESS(f'Best classifier: {best_name} (accuracy = {best_accuracy:.3f})'))

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
        the same data, compares them with R²/MAE/MSE, and keeps the
        better one.
        """
        X = df[FEATURE_COLUMNS]
        y = df['futureValue1yr']
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

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
        best_r2 = -np.inf

        for name, pipeline in candidates.items():
            pipeline.fit(X_train, y_train)
            predictions = pipeline.predict(X_test)

            r2 = r2_score(y_test, predictions)
            mae = mean_absolute_error(y_test, predictions)
            mse = mean_squared_error(y_test, predictions)

            self.stdout.write(f'{name}: R² = {r2:.3f}, MAE = {mae:.2f}, MSE = {mse:.2f}')

            if r2 > best_r2:
                best_name, best_pipeline, best_r2 = name, pipeline, r2

        self.stdout.write(self.style.SUCCESS(f'Best regressor: {best_name} (R² = {best_r2:.3f})'))

        models_dir = settings.ML_MODELS_DIR
        joblib.dump(
            {'pipeline': best_pipeline, 'features': FEATURE_COLUMNS, 'algorithm': best_name},
            models_dir / 'future_value_regressor.pkl',
        )
