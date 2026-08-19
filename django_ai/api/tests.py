"""
api/tests.py — Tests for the Django ML/AI service

WHY test THIS app instead of Node?
Django is completely stateless per-request (see settings.py's comment:
real data lives in Mongo via Node, not here), which actually makes it
the EASIEST part of the whole project to test — every view here just
takes a JSON payload in, and returns a JSON payload out. No database
setup, no auth tokens, no family/investment fixtures needed like the
Node side required.

WHY Django's built-in test runner instead of pytest?
Django already ships everything we need (TestCase, APITestCase from
DRF) with zero extra pip installs — see requirements.txt, nothing new
was added for these tests. `python manage.py test` automatically
creates and destroys a throw-away test database for PredictionLog, so
these tests can never touch the real db.sqlite3.

HOW to run these:
    python manage.py test
"""

from rest_framework.test import APITestCase
from rest_framework import status

from api.models import PredictionLog


# A valid prediction-request payload we can reuse and tweak across
# tests — this is the exact shape Node's prediction.controller.js
# sends (see PredictionRequestSerializer in serializers.py).
VALID_PAYLOAD = {
    'age': 30,
    'income': 60000,
    'totalInvested': 100000,
    'equityPercent': 60,
    'debtPercent': 30,
    'goldPercent': 10,
    'investmentCount': 4,
    'riskProfile': 'moderate',
}


class HealthCheckTests(APITestCase):
    def test_health_check_returns_success(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('services', response.data)


class PredictRiskTests(APITestCase):
    def test_valid_payload_returns_a_risk_category(self):
        response = self.client.post('/api/predict-risk/', VALID_PAYLOAD, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn(
            response.data['data']['riskCategory'],
            ['conservative', 'moderate', 'aggressive'],
        )
        # Confidence is reported as a percentage, so it has to fall in 0-100.
        confidence = response.data['data']['riskConfidence']
        self.assertGreaterEqual(confidence, 0)
        self.assertLessEqual(confidence, 100)

    def test_valid_payload_writes_a_prediction_log(self):
        self.assertEqual(PredictionLog.objects.count(), 0)
        self.client.post('/api/predict-risk/', VALID_PAYLOAD, format='json')

        self.assertEqual(PredictionLog.objects.count(), 1)
        log = PredictionLog.objects.first()
        self.assertEqual(log.prediction_type, 'risk')

    def test_rejects_a_missing_required_field(self):
        payload = {**VALID_PAYLOAD}
        del payload['age']

        response = self.client.post('/api/predict-risk/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_percentages_that_do_not_sum_to_100(self):
        # See PredictionRequestSerializer.validate() — equity+debt+gold
        # is required to land within 99-101 to allow for rounding.
        payload = {**VALID_PAYLOAD, 'equityPercent': 60, 'debtPercent': 60, 'goldPercent': 10}

        response = self.client.post('/api/predict-risk/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_age_outside_the_allowed_range(self):
        payload = {**VALID_PAYLOAD, 'age': 15}  # below the min_value=18 in the serializer

        response = self.client.post('/api/predict-risk/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PredictFutureTests(APITestCase):
    def test_valid_payload_returns_three_time_horizons(self):
        response = self.client.post('/api/predict-future/', VALID_PAYLOAD, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertIn('oneYear', data)
        self.assertIn('threeYears', data)
        self.assertIn('fiveYears', data)
        # All three should be positive projected values for a portfolio
        # that already has money invested in it.
        self.assertGreater(data['oneYear'], 0)
        self.assertGreater(data['threeYears'], 0)
        self.assertGreater(data['fiveYears'], 0)

    def test_zero_invested_does_not_crash_with_a_divide_by_zero(self):
        # future.py explicitly guards this case (totalInvested > 0 check)
        # — this test locks that guard in.
        payload = {**VALID_PAYLOAD, 'totalInvested': 0}

        response = self.client.post('/api/predict-future/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['oneYear'], 0)


class HealthScoreTests(APITestCase):
    def test_valid_payload_returns_a_score_in_range(self):
        response = self.client.post('/api/health-score/', VALID_PAYLOAD, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertGreaterEqual(data['healthScore'], 0)
        self.assertLessEqual(data['healthScore'], 100)
        self.assertIn('diversification', data['breakdown'])
        self.assertIn('riskAlignment', data['breakdown'])

    def test_perfectly_matched_allocation_scores_highest_on_risk_alignment(self):
        # allocation_targets.py's 'moderate' target is 50/40/10 — matching
        # it exactly should score a perfect 100 on riskAlignment.
        payload = {**VALID_PAYLOAD, 'equityPercent': 50, 'debtPercent': 40, 'goldPercent': 10}

        response = self.client.post('/api/health-score/', payload, format='json')
        self.assertEqual(response.data['data']['breakdown']['riskAlignment'], 100)


class RecommendTests(APITestCase):
    def test_heavily_skewed_allocation_produces_a_recommendation(self):
        # 100% equity is way past the moderate target (50%), so this
        # should trigger at least a "decrease equity" suggestion.
        payload = {**VALID_PAYLOAD, 'equityPercent': 100, 'debtPercent': 0, 'goldPercent': 0}

        response = self.client.post('/api/recommend/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recommendations = response.data['data']['recommendations']
        self.assertTrue(any(r['category'] == 'equity' and r['action'] == 'decrease' for r in recommendations))

    def test_well_balanced_allocation_produces_no_recommendations(self):
        # Exactly on-target for 'moderate' — nothing worth flagging.
        payload = {**VALID_PAYLOAD, 'equityPercent': 50, 'debtPercent': 40, 'goldPercent': 10}

        response = self.client.post('/api/recommend/', payload, format='json')
        self.assertEqual(response.data['data']['recommendations'], [])
