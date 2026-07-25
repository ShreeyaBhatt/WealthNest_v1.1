"""
api/views/prediction_log.py — Read-only history of past predictions

This is a genuine DRF ViewSet + Router pairing (see api/urls.py):
instead of writing a URL and a view function for "list all" and another
pair for "get one by id", a ReadOnlyModelViewSet gives us both for free,
and DefaultRouter wires up the URLs automatically.

It's read-only on purpose — predictions get created as a side effect of
/api/predict-risk/ and /api/predict-future/, never directly through
this endpoint.
"""

from rest_framework import viewsets

from api.models import PredictionLog
from api.serializers import PredictionLogSerializer


class PredictionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PredictionLog.objects.all()
    serializer_class = PredictionLogSerializer
