"""
api/views/market_data.py — GET /api/market-data/

Two syllabus skills live side by side here:
1. "REST APIs using requests; JSON handling" — fetch a live gold/
   bitcoin reference price from a public JSON API (CoinGecko, no key
   required).
2. "Web scraping using BeautifulSoup" — pull real text out of a
   webpage's raw HTML (not a clean API), and save what we scraped to
   a CSV file, exactly like the practical task asks for. This scrapes
   Wikipedia's "Asset allocation" article — practical tips on spreading
   money across different investment categories to balance risk and
   reward, which is directly relevant to a multi-category portfolio
   tracker like WealthNest (as opposed to a page about one specific
   asset, e.g. gold).

Both external calls are wrapped in try/except and the combined result
is cached in memory for an hour. External websites are the one part of
this whole project we don't control — they can be slow, rate-limit us,
or go down — and none of that should ever break WealthNest itself.
"""

import csv
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
INVESTMENT_TIPS_WIKI_URL = 'https://en.wikipedia.org/wiki/Asset_allocation'

_cache = {'data': None, 'fetched_at': 0}
CACHE_SECONDS = 60 * 60  # 1 hour


def fetch_live_prices():
    """Unit 7.2 — REST APIs using requests + JSON handling."""
    try:
        # CoinGecko sits behind Cloudflare, which quietly returns a 200
        # with EMPTY price data (not an error) to anonymous requests from
        # cloud/datacenter IP ranges like Render's — the identical request
        # from an ordinary machine gets real prices back. A User-Agent
        # header alone doesn't fix this (verified — it's an IP-reputation
        # thing, not a header thing); a free "Demo" API key does, because
        # it's tied to an account instead of judged purely on the calling
        # IP. COINGECKO_API_KEY is optional — leave it unset and this
        # still works fine for local dev off a residential/normal IP.
        headers = {'User-Agent': 'WealthNest-Student-Project/1.0'}
        if settings.COINGECKO_API_KEY:
            headers['x-cg-demo-api-key'] = settings.COINGECKO_API_KEY

        response = requests.get(
            COINGECKO_URL,
            params={'ids': 'tether-gold,bitcoin', 'vs_currencies': 'inr'},
            headers=headers,
            timeout=8,
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


def scrape_investment_tips():
    """Unit 7.1 — Web scraping using BeautifulSoup."""
    try:
        response = requests.get(
            INVESTMENT_TIPS_WIKI_URL, timeout=5, headers={'User-Agent': 'WealthNest-Student-Project/1.0'}
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
                # Drop citation markers like "[1]" — they're meaningless
                # without the footnotes they point to, and without this
                # they'd show up as a stray "[ 1 ]" in the scraped text.
                for sup in p.find_all('sup'):
                    sup.decompose()

                # get_text(strip=True) with no separator glues together
                # text from adjacent inline tags (links, citations) with
                # no space, e.g. "allocationis" instead of "allocation is".
                # separator=' ' fixes that, but then adds a stray space
                # before punctuation like commas — the two regex passes
                # below clean that back up.
                text = p.get_text(separator=' ', strip=True)
                text = re.sub(r'\s+([,.;:])', r'\1', text)
                text = re.sub(r'\s+', ' ', text).strip()

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
    csv_path = Path(settings.BASE_DIR) / 'datasets' / 'scraped_investment_tips.csv'
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
    summary of investment-allocation tips — cached for an hour at a time.
    """
    now = time.time()
    if _cache['data'] and (now - _cache['fetched_at']) < CACHE_SECONDS:
        return Response({'success': True, 'message': 'Market data (cached)', 'data': _cache['data']})

    prices = fetch_live_prices()
    data = {
        **prices,
        'investmentTipsSummary': scrape_investment_tips(),
    }

    # Only cache for the full hour if the live price fetch actually
    # worked. Caching a transient failure (both None, e.g. CoinGecko
    # timed out or rate-limited us once) would otherwise pin "no data"
    # on the Analytics page for a full hour even after CoinGecko recovers.
    if prices.get('goldPricePerOunceINR') is not None or prices.get('bitcoinPriceINR') is not None:
        _cache['data'] = data
        _cache['fetched_at'] = now

    return Response({'success': True, 'message': 'Market data fetched', 'data': data})
