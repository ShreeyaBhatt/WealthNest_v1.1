"""
api/views/future.py — POST /api/predict-future/

The regressor we trained only predicts ONE year ahead (see
train_models.py). To also answer "3 years?" and "5 years?" without
training three separate models, we back out an implied yearly growth
rate from the 1-year prediction, then just compound that rate forward.
This is a simplification (real returns aren't a fixed rate every year),
which is fine for a student project — the interesting part (training
and comparing regression models) already happened during training.
"""

import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.apps import loaded_models
from api.models import PredictionLog
from api.serializers import PredictionRequestSerializer, FutureValueResponseSerializer


class PredictFutureView(APIView):
    def post(self, request):
        request_serializer = PredictionRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        regressor_bundle = loaded_models['future_value_regressor']
        if regressor_bundle is None:
            return Response(
                {'success': False, 'message': 'Future value model not trained yet — run: python manage.py train_models'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        pipeline = regressor_bundle['pipeline']
        feature_columns = regressor_bundle['features']

        row = pd.DataFrame([{column: data[column] for column in feature_columns}])
        raw_one_year_value = float(pipeline.predict(row)[0])

        total_invested = data['totalInvested']
        if total_invested > 0:
            implied_growth_rate = (raw_one_year_value / total_invested) - 1
        else:
            implied_growth_rate = 0

        # Clamp to a plausible annual range, then derive all three
        # figures from that same rate so they stay consistent with each
        # other (the model can occasionally predict an unrealistic value).
        implied_growth_rate = max(-0.3, min(0.3, implied_growth_rate))

        one_year_value = total_invested * (1 + implied_growth_rate)
        three_year_value = total_invested * (1 + implied_growth_rate) ** 3
        five_year_value = total_invested * (1 + implied_growth_rate) ** 5

        result = {
            'oneYear': round(one_year_value, 2),
            'threeYears': round(three_year_value, 2),
            'fiveYears': round(five_year_value, 2),
        }

        PredictionLog.objects.create(
            prediction_type='future_value',
            input_features=data,
            result=result,
        )

        response_serializer = FutureValueResponseSerializer(result)
        return Response({'success': True, 'message': 'Future value prediction generated', 'data': response_serializer.data})
