"""
core/wsgi.py — WSGI Application Entry Point

WSGI = Web Server Gateway Interface
This is the standard interface between Python web apps and web servers.

In development: Django's built-in server uses this.
In production: Gunicorn uses this to serve the app.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
application = get_wsgi_application()
