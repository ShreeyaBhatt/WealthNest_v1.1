"""
core/settings.py — Django Project Settings

WHY python-decouple for config?
Instead of hardcoding values like SECRET_KEY or DEBUG, we read them
from the .env file. This is the standard 12-Factor App approach:
"Store config in the environment."

HOW decouple works:
  config('SECRET_KEY')         → reads from .env
  config('DEBUG', cast=bool)   → reads and converts to bool
  config('PORT', default=8000) → uses default if not set
"""

import os
from pathlib import Path
from decouple import config

# ─── Base Directory ──────────────────────────────────────────
# BASE_DIR is the root of the django_ai folder
# Path(__file__) = this file's path
# .resolve().parent.parent = go up 2 levels (core/ → django_ai/)
BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Security ────────────────────────────────────────────────
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

# List of allowed hostnames that can serve this app
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# ─── Application Definition ──────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',       # Django REST Framework
    'corsheaders',          # Handle CORS headers

    # Our custom app
    'api',                  # The main Django API app
]

MIDDLEWARE = [
    # CORS middleware MUST be first (before anything that might respond to requests)
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ─── Database ────────────────────────────────────────────────
# Django needs a database for its built-in admin system.
# Since our actual data is in MongoDB (via Node.js), we use SQLite
# here just for Django's internal needs (admin, sessions).
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ─── Password Validation ─────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalization ────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'   # IST — Indian Standard Time
USE_I18N = True
USE_TZ = True

# ─── Static Files ────────────────────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ─── Default Auto Field ──────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Django REST Framework Configuration ─────────────────────
REST_FRAMEWORK = {
    # Return JSON responses by default
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    # Show browsable API in development
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    # No authentication needed — Node.js handles auth
    # Django only receives already-validated requests from Node
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# ─── CORS Configuration ──────────────────────────────────────
# CORS_ALLOWED_ORIGINS: Only these URLs can call this Django API
# Node.js (port 5000) and React (port 3000) need access
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5000,http://localhost:3000'
).split(',')

CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
CORS_ALLOW_HEADERS = ['content-type', 'authorization', 'x-requested-with']

# ─── Gemini API Key ──────────────────────────────────────────
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')

# ─── Custom Paths ────────────────────────────────────────────
# Where ML models (pickle files) are stored
ML_MODELS_DIR = BASE_DIR / config('ML_MODELS_DIR', default='ml_models/saved_models')

# Where generated PDF reports are saved
REPORTS_DIR = BASE_DIR / config('REPORTS_DIR', default='reports')

# Create these directories if they don't exist
os.makedirs(ML_MODELS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
