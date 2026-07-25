"""
api/views/market_data.py — GET /api/market-data/

Two syllabus skills live side by side here:
1. "REST APIs using requests; JSON handling" — fetch a live gold/
   bitcoin reference price from a public JSON API (CoinGecko, no key
   required).
2. "Web scraping using BeautifulSoup" — pull real text out of a
   webpage's raw HTML (not a clean API), and save what we scraped to
   a CSV file, exactly like the practical task asks for.

Both external calls are wrapped in try/except and the combined result
is cached in memory for an hour. External websites are the one part of
this whole project we don't control — they can be slow, rate-limit us,
or go down — and none of that should ever break WealthNest itself.
"""

import csv
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
GOLD_WIKI_URL = 'https://en.wikipedia.org/wiki/Gold_as_an_investment'

_cache = {'data': None, 'fetched_at': 0}
CACHE_SECONDS = 60 * 60  # 1 hour


def fetch_live_prices():
    """Unit 7.2 — REST APIs using requests + JSON handling."""
    try:
        response = requests.get(
            COINGECKO_URL,
            params={'ids': 'tether-gold,bitcoin', 'vs_currencies': 'inr'},
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()  # requests parses the JSON response body for us

        return {
            # tether-gold (XAUT) is a token pegged to 1 troy ounce of real
            # gold — a reasonable free, no-key stand-in for a live gold feed.
            'goldPricePerOunceINR': data.get('tether-gold', {}).get('inr'),
            'bitcoinPriceINR': data.get('bitcoin', {}).get('inr'),
        }
    except (requests.RequestException, ValueError):
        return {'goldPricePerOunceINR': None, 'bitcoinPriceINR': None}


def scrape_gold_summary():
    """Unit 7.1 — Web scraping using BeautifulSoup."""
    try:
        response = requests.get(
            GOLD_WIKI_URL, timeout=5, headers={'User-Agent': 'WealthNest-Student-Project/1.0'}
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # A Wikipedia page can contain more than one element with this
        # class name (some are empty wrapper divs) — the real article
        # body is whichever one actually has paragraphs inside it.
        candidates = soup.find_all('div', class_='mw-parser-output')
        article = max(candidates, key=lambda div: len(div.find_all('p')), default=None)

        paragraphs = []
        if article:
            for p in article.find_all('p'):
                text = p.get_text(strip=True)
                if text:
                    paragraphs.append(text)
                if len(paragraphs) >= 3:
                    break

        save_paragraphs_to_csv(paragraphs)
        return paragraphs
    except requests.RequestException:
        return []


def save_paragraphs_to_csv(paragraphs):
    """The practical task explicitly asks for scraped data to be saved
    into a CSV file — this is that step."""
    csv_path = Path(settings.BASE_DIR) / 'datasets' / 'scraped_gold_summary.csv'
    csv_path.parent.mkdir(exist_ok=True)

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['paragraph_number', 'text'])
        for i, text in enumerate(paragraphs, start=1):
            writer.writerow([i, text])


@api_view(['GET'])
def market_data(request):
    """
    GET /api/market-data/
    Returns live gold/bitcoin reference prices plus a short scraped
    summary about gold investing — cached for an hour at a time.
    """
    now = time.time()
    if _cache['data'] and (now - _cache['fetched_at']) < CACHE_SECONDS:
        return Response({'success': True, 'message': 'Market data (cached)', 'data': _cache['data']})

    data = {
        **fetch_live_prices(),
        'goldSummary': scrape_gold_summary(),
    }
    _cache['data'] = data
    _cache['fetched_at'] = now

    return Response({'success': True, 'message': 'Market data fetched', 'data': data})
