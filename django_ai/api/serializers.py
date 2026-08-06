"""
api/serializers.py — Turning JSON into Python (and back again)

WHY serializers?
When Node sends a POST request with a JSON body, Django doesn't
automatically know if that JSON is valid or what shape it should be.
A serializer is DRF's way of describing "here's exactly what fields
I expect, and what type each one should be" — very similar to how
express-validator's body() chains work on the Node side of this
project, just for Django instead.
"""

from rest_framework import serializers
from .models import PredictionLog


class PredictionRequestSerializer(serializers.Serializer):
    """
    What Node sends us when asking for a risk or future-value prediction.
    This mirrors Prediction.model.js's `inputFeatures` on the Node side,
    so the same payload shape works for logging AND for the ML models.
    """
    age = serializers.IntegerField(min_value=18, max_value=100)
    income = serializers.FloatField(min_value=0)
    totalInvested = serializers.FloatField(min_value=0)
    equityPercent = serializers.FloatField(min_value=0, max_value=100)
    debtPercent = serializers.FloatField(min_value=0, max_value=100)
    goldPercent = serializers.FloatField(min_value=0, max_value=100)
    investmentCount = serializers.IntegerField(min_value=0)

    # This is the user's OWN self-declared risk profile. We accept it
    # so it can be logged alongside the prediction for comparison, but
    # the ML model never sees it as an input — otherwise the model
    # could just copy this field back out instead of actually learning
    # anything from the portfolio numbers.
    riskProfile = serializers.ChoiceField(
        choices=['conservative', 'moderate', 'aggressive'],
        required=False,
    )

    def validate(self, data):
        # Sanity check — Node always computes these to sum to ~100 already.
        total = data['equityPercent'] + data['debtPercent'] + data['goldPercent']
        if not (99 <= total <= 101):
            raise serializers.ValidationError(
                f'equityPercent + debtPercent + goldPercent should sum to ~100, got {total:.1f}'
            )
        return data


class RiskResponseSerializer(serializers.Serializer):
    riskCategory = serializers.ChoiceField(choices=['conservative', 'moderate', 'aggressive'])
    riskConfidence = serializers.FloatField()


class FutureValueResponseSerializer(serializers.Serializer):
    oneYear = serializers.FloatField()
    threeYears = serializers.FloatField()
    fiveYears = serializers.FloatField()


class RecommendationItemSerializer(serializers.Serializer):
    """One suggested change — e.g. 'you're overweight in equity, consider
    moving some of it into debt instruments.'"""
    category = serializers.ChoiceField(choices=['equity', 'debt', 'gold', 'diversification'])
    action = serializers.ChoiceField(choices=['increase', 'decrease', 'add'])
    reason = serializers.CharField()


class RecommendationResponseSerializer(serializers.Serializer):
    recommendations = RecommendationItemSerializer(many=True)


class HealthScoreBreakdownSerializer(serializers.Serializer):
    diversification = serializers.FloatField()
    riskAlignment = serializers.FloatField()


class HealthScoreResponseSerializer(serializers.Serializer):
    healthScore = serializers.FloatField()
    breakdown = HealthScoreBreakdownSerializer()
    summary = serializers.CharField()


class PredictionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionLog
        fields = ['id', 'prediction_type', 'input_features', 'result', 'created_at']
