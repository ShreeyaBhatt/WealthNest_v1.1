"""
api/apps.py — Django App Configuration

Every Django "app" has a configuration class.
Here we configure the 'api' app and run startup tasks (like loading ML models).
"""

import joblib
from django.apps import AppConfig
from django.conf import settings

# These hold the loaded models in memory, so risk.py / future.py don't
# have to read the .pkl file from disk on every single request (that
# would be slow). They start out empty until ready() below fills them in.
loaded_models = {
    'risk_classifier': None,
    'future_value_regressor': None,
}


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'WealthNest AI & ML API'

    def ready(self):
        """
        This method runs once when Django starts. We try to load the
        two trained models here. If `python manage.py train_models`
        hasn't been run yet, the .pkl files won't exist — that's fine,
        we just leave loaded_models empty instead of crashing the
        whole server, and health.py reports 'pending' until they exist.
        """
        try:
            loaded_models['risk_classifier'] = joblib.load(
                settings.ML_MODELS_DIR / 'risk_classifier.pkl'
            )
            loaded_models['future_value_regressor'] = joblib.load(
                settings.ML_MODELS_DIR / 'future_value_regressor.pkl'
            )
        except FileNotFoundError:
            # Models haven't been trained yet — normal on a fresh checkout.
            pass
