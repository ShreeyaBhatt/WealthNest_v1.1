"""
api/urls.py — Django API URL Routing

All endpoints under /api/ are defined here.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from api.views import health, market_data, analytics as analytics_view, chat as chat_view, pdf_report as pdf_report_view
from api.views.risk import PredictRiskView
from api.views.future import PredictFutureView
from api.views.recommend import RecommendView
from api.views.health_score import HealthScoreView
from api.views.prediction_log import PredictionLogViewSet

# A router auto-generates the URLs for a ViewSet (list + detail views)
# instead of us writing path() lines by hand for each one.
router = DefaultRouter()
router.register('prediction-logs', PredictionLogViewSet, basename='prediction-log')

urlpatterns = [
    # ─── Health Check ────────────────────────────────────────
    path('health/', health.health_check, name='health-check'),

    # ─── Unit 7: Web Scraping + REST API client (requests/BeautifulSoup) ──
    path('market-data/', market_data.market_data, name='market-data'),

    # ─── Phase 5: ML Predictions ─────────────────────────────
    path('predict-risk/', PredictRiskView.as_view(), name='predict-risk'),
    path('predict-future/', PredictFutureView.as_view(), name='predict-future'),
    path('recommend/', RecommendView.as_view(), name='recommend'),
    path('health-score/', HealthScoreView.as_view(), name='health-score'),

    # ─── Phase 6: Gemini AI Chat ─────────────────────────────
    path('chat/', chat_view.chat, name='chat'),

    # ─── Phase 8: Analytics (Seaborn/Plotly/NetworkX) ────────
    path('analytics/', analytics_view.analytics, name='analytics'),

    # ─── Phase 9: PDF Report ─────────────────────────────────
    path('pdf-report/', pdf_report_view.pdf_report, name='pdf-report'),

    # ─── Router-generated URLs (prediction-logs/, prediction-logs/<id>/) ──
    path('', include(router.urls)),
]
