"""
manage.py — Django Management Utility

This is the standard Django entry point for:
  - Running the development server: python manage.py runserver
  - Creating migrations: python manage.py makemigrations
  - Applying migrations: python manage.py migrate
  - Running custom commands: python manage.py train_models
  - Creating superuser: python manage.py createsuperuser

You don't need to modify this file.
"""

import os
import sys


def main():
    """Run administrative tasks."""
    # Tell Django which settings file to use
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and "
            "available on your PYTHONPATH. Did you activate your "
            "virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
