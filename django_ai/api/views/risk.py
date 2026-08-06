"""
api/views/risk.py — POST /api/predict-risk/

Takes a user's portfolio numbers, runs them through the trained
classifier (see management/commands/train_models.py), and returns a
predicted risk category with a confidence score.
"""

import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.apps import loaded_models
from api.models import PredictionLog
from api.serializers import PredictionRequestSerializer, RiskResponseSerializer


class PredictRiskView(APIView):
    def post(self, request):
        request_serializer = PredictionRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        classifier_bundle = loaded_models['risk_classifier']
        if classifier_bundle is None:
            return Response(
                {'success': False, 'message': 'Risk model not trained yet — run: python manage.py train_models'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        pipeline = classifier_bundle['pipeline']
        feature_columns = classifier_bundle['features']

        # Build a single-row DataFrame in the exact same column order
        # the model was trained on — scikit-learn cares about order,
        # not just column names.
        row = pd.DataFrame([{column: data[column] for column in feature_columns}])

        predicted_category = pipeline.predict(row)[0]
        # predict_proba gives a probability for each possible class — the
        # confidence is how sure the model was about the class it
        # actually picked (predicted_category), so we look up THAT
        # class's own probability rather than just taking max(probabilities).
        # Those aren't always the same number: SVC's probability=True uses
        # Platt scaling, fit via its own internal cross-validation, which
        # is a slightly different code path than the one .predict() uses —
        # so on a small slice of inputs, the highest predict_proba() value
        # belongs to a DIFFERENT class than the one .predict() returned.
        # Reporting max(probabilities) here would then show a confidence
        # number that doesn't actually belong to predicted_category.
        probabilities = pipeline.predict_proba(row)[0]
        class_index = list(pipeline.classes_).index(predicted_category)
        confidence = round(probabilities[class_index] * 100, 2)

        result = {'riskCategory': predicted_category, 'riskConfidence': confidence}

        PredictionLog.objects.create(
            prediction_type='risk',
            input_features=data,
            result=result,
        )

        response_serializer = RiskResponseSerializer(result)
        return Response({'success': True, 'message': 'Risk prediction generated', 'data': response_serializer.data})
