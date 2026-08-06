"""
api/views/health_score.py — POST /api/health-score/

Boils a portfolio down to one 0-100 number, made of two sub-scores:
  - diversification: is the money spread across more than one bucket
    (equity/debt/gold) and more than a couple of holdings?
  - riskAlignment: how close is the actual equity/debt/gold split to
    the target split for the user's risk profile (see
    api/utils/allocation_targets.py — the same targets recommend.py uses,
    so the two features never disagree with each other)?

Like recommend.py, this is deliberately rule-based rather than a
trained model — a health SCORE only means something to a user if they
can see roughly why it's what it is, which a hand-written formula
allows and a trained model wouldn't.
"""

from rest_framework.views import APIView
from rest_framework.response import Response

from api.models import PredictionLog
from api.serializers import PredictionRequestSerializer, HealthScoreResponseSerializer
from api.utils.allocation_targets import get_target


def diversification_score(actual, investment_count):
    # How many of the 3 buckets (equity/debt/gold) actually hold money —
    # putting everything in one bucket is the least diversified case.
    buckets_used = sum(1 for value in actual.values() if value > 0)
    bucket_score = (buckets_used / 3) * 100

    # Spreading money across more individual holdings also counts,
    # capped at 5 so this doesn't reward endlessly adding tiny positions.
    count_score = min(investment_count / 5, 1) * 100

    return round((bucket_score + count_score) / 2, 1)


def risk_alignment_score(actual, target):
    # Sum of how far each bucket is from its target. Since equity/debt/
    # gold each range 0-100 and all three sets sum to 100, the largest
    # possible total deviation between two splits is 200 (e.g. 100/0/0
    # vs. 0/100/0) — normalize against that so the score lands in 0-100.
    total_deviation = sum(abs(actual[category] - target[category]) for category in target)
    return round(max(0, 100 - (total_deviation / 2)), 1)


def summary_for(score):
    if score >= 80:
        return 'Your portfolio is well-diversified and closely matches your risk profile.'
    if score >= 50:
        return 'Your portfolio is reasonably balanced, but has some room for improvement.'
    return "Your portfolio could use some rebalancing — check your recommendations for specifics."


class HealthScoreView(APIView):
    def post(self, request):
        request_serializer = PredictionRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        risk_profile = data.get('riskProfile') or 'moderate'
        target = get_target(risk_profile)
        actual = {
            'equity': data['equityPercent'],
            'debt': data['debtPercent'],
            'gold': data['goldPercent'],
        }

        diversification = diversification_score(actual, data['investmentCount'])
        risk_alignment = risk_alignment_score(actual, target)
        # Simple average — deliberately not over-engineered with custom
        # weights, so the number stays easy to explain: "two things we
        # measured, averaged together."
        health_score = round((diversification + risk_alignment) / 2, 1)

        result = {
            'healthScore': health_score,
            'breakdown': {
                'diversification': diversification,
                'riskAlignment': risk_alignment,
            },
            'summary': summary_for(health_score),
        }

        PredictionLog.objects.create(
            prediction_type='health_score',
            input_features=data,
            result=result,
        )

        response_serializer = HealthScoreResponseSerializer(result)
        return Response({'success': True, 'message': 'Health score generated', 'data': response_serializer.data})
