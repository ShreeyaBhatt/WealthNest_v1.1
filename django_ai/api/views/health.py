"""
api/views/health.py — Health Check Endpoint

A simple endpoint to verify the Django server is running.
Used by the Node.js server to confirm Django is available
before making ML/AI requests.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone

from api.apps import loaded_models
from api.views.chat import is_configured as gemini_is_configured


@api_view(['GET'])
def health_check(request):
    """
    GET /api/health/
    Returns server status and timestamp.
    """
    both_models_loaded = all(model is not None for model in loaded_models.values())

    return Response({
        'success': True,
        'message': 'WealthNest Django AI Service is running 🤖',
        'timestamp': timezone.now().isoformat(),
        'services': {
            'ml_models': 'loaded' if both_models_loaded else 'pending',
            'gemini': 'connected' if gemini_is_configured() else 'pending',
        }
    })
