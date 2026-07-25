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
        # predict_proba gives a probability for each possible class —
        # the confidence is just how sure the model was about the class
        # it actually picked.
        probabilities = pipeline.predict_proba(row)[0]
        confidence = round(max(probabilities) * 100, 2)

        result = {'riskCategory': predicted_category, 'riskConfidence': confidence}

        PredictionLog.objects.create(
            prediction_type='risk',
            input_features=data,
            result=result,
        )

        response_serializer = RiskResponseSerializer(result)
        return Response({'success': True, 'message': 'Risk prediction generated', 'data': response_serializer.data})
