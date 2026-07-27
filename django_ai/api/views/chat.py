"""
api/views/chat.py — POST /api/chat/

Lets a user ask a plain-English question about their portfolio and get
an answer from Google's Gemini model. Node sends both the question AND
a short summary of the user's portfolio (see
server/src/controllers/chat.controller.js) so Gemini actually has
something to reason about, instead of answering with no context at all.

DEV NOTE: GEMINI_API_KEY is a placeholder value in .env.example. Until
a real key is added, this view returns a clear "not configured"
message instead of crashing — same pattern as the email fallback on
the Node side for a missing EMAIL_USER/EMAIL_PASS.
"""

import logging

import google.generativeai as genai
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def is_configured():
    key = settings.GEMINI_API_KEY
    return bool(key) and 'your_gemini_api_key' not in key


def build_prompt(message, context):
    return (
        "You are WealthNest's AI assistant, helping a user understand their family "
        "investment portfolio. Answer in plain, friendly English, keep it under 150 words, "
        "and only use the numbers given below — don't invent figures.\n\n"
        f"Portfolio summary: {context}\n\n"
        f"User's question: {message}"
    )


@api_view(['POST'])
def chat(request):
    # .get(key, default) only applies when the key is missing — an
    # explicit `null` still gets through and crashes .strip() otherwise.
    raw_message = request.data.get('message')
    message = raw_message.strip() if isinstance(raw_message, str) else ''
    context = request.data.get('context', {})

    if not message:
        return Response({'success': False, 'message': 'message is required'}, status=400)

    if not is_configured():
        return Response({
            'success': True,
            'message': 'Gemini not configured',
            'data': {
                'reply': (
                    "The AI assistant isn't set up yet — add a real GEMINI_API_KEY to "
                    "django_ai/.env (get one free at https://aistudio.google.com/app/apikey) to enable it."
                ),
            },
        })

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(build_prompt(message, context))
        reply = response.text
    except Exception as err:  # Gemini's SDK can raise several different error types
        # Log the real error, but don't echo internal details to the user.
        logger.error('Gemini chat request failed: %s', err)
        reply = "Sorry, the AI assistant couldn't answer that right now. Please try again in a moment."

    return Response({'success': True, 'message': 'Reply generated', 'data': {'reply': reply}})
