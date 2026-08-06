"""
api/views/recommend.py — POST /api/recommend/

Suggests simple portfolio adjustments by comparing a user's actual
equity/debt/gold split against a target split for their risk profile
(see api/utils/allocation_targets.py).

DELIBERATELY RULE-BASED, NOT A TRAINED MODEL — unlike risk.py/future.py,
this doesn't load anything from loaded_models. A hand-written "you're 15
points over target, consider reducing it" rule is easy to explain to a
user; a black-box model's reasoning wouldn't be, and that matters more
here than squeezing out marginal accuracy would.
"""

from rest_framework.views import APIView
from rest_framework.response import Response

from api.models import PredictionLog
from api.serializers import PredictionRequestSerializer, RecommendationResponseSerializer
from api.utils.allocation_targets import get_target

# How many percentage points off-target before it's worth mentioning —
# small drift isn't worth nagging the user about.
DRIFT_THRESHOLD = 10


class RecommendView(APIView):
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

        recommendations = []

        # Compare each bucket against its target — only speak up when
        # the gap is bigger than DRIFT_THRESHOLD in either direction.
        for category, target_percent in target.items():
            drift = actual[category] - target_percent
            if drift > DRIFT_THRESHOLD:
                recommendations.append({
                    'category': category,
                    'action': 'decrease',
                    'reason': (
                        f"Your {category} allocation is {actual[category]:.0f}%, about "
                        f"{drift:.0f} points above the ~{target_percent}% typically "
                        f"suggested for a {risk_profile} risk profile."
                    ),
                })
            elif drift < -DRIFT_THRESHOLD:
                recommendations.append({
                    'category': category,
                    'action': 'increase',
                    'reason': (
                        f"Your {category} allocation is {actual[category]:.0f}%, about "
                        f"{abs(drift):.0f} points below the ~{target_percent}% typically "
                        f"suggested for a {risk_profile} risk profile."
                    ),
                })

        # A thin portfolio is worth flagging regardless of the split math
        # above — few holdings means more risk from any single one of
        # them underperforming.
        if data['investmentCount'] < 3:
            plural = '' if data['investmentCount'] == 1 else 's'
            recommendations.append({
                'category': 'diversification',
                'action': 'add',
                'reason': (
                    f"You only have {data['investmentCount']} investment{plural} — spreading "
                    "money across more holdings usually reduces risk without necessarily "
                    "reducing returns."
                ),
            })
        else:
            # Whole categories sitting at 0% are worth a nudge even if
            # the overall split math above didn't flag them.
            for category, value in actual.items():
                if value == 0:
                    recommendations.append({
                        'category': category,
                        'action': 'add',
                        'reason': f"You currently have 0% in {category} — consider adding some for diversification.",
                    })

        # An empty list here just means the portfolio is already close to
        # its target split — a genuinely good outcome, not an error.
        result = {'recommendations': recommendations}

        PredictionLog.objects.create(
            prediction_type='recommendation',
            input_features=data,
            result=result,
        )

        response_serializer = RecommendationResponseSerializer(result)
        return Response({'success': True, 'message': 'Recommendations generated', 'data': response_serializer.data})
