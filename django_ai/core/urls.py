"""
core/urls.py — Django Root URL Configuration

This is the "router" for the entire Django application.
All API endpoints under /api/ are routed to the 'api' app.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Django admin panel (useful for debugging)
    path('admin/', admin.site.urls),

    # All our ML/AI API endpoints live under /api/
    # The actual endpoint definitions are in api/urls.py
    path('api/', include('api.urls')),
]
