"""
api/admin.py — Registers PredictionLog with Django's Built-in Admin Site

Registering a model here is all it takes to get a full CRUD UI for it
at /admin/ for free — no extra code needed. Useful for eyeballing what
predictions have been logged without writing raw SQL or curl commands.
"""

from django.contrib import admin
from .models import PredictionLog


@admin.register(PredictionLog)
class PredictionLogAdmin(admin.ModelAdmin):
    list_display = ('prediction_type', 'created_at')
    list_filter = ('prediction_type',)
    ordering = ('-created_at',)
