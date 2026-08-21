"""
api/views/market_data.py — GET /api/market-data/

Two syllabus skills live side by side here:
1. "REST APIs using requests; JSON handling" — fetch a live gold/
   bitcoin reference price from a public JSON API (CoinGecko normally,
   Binance + a forex rate as a fallback if CoinGecko comes back empty
   — see fetch_live_prices()'s docstring for why a fallback exists).
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
import logging
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)

COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price'
BINANCE_URL = 'https://api.binance.com/api/v3/ticker/price'
FOREX_URL = 'https://open.er-api.com/v6/latest/USD'
INVESTMENT_TIPS_WIKI_URL = 'https://en.wikipedia.org/wiki/Asset_allocation'

_cache = {'data': None, 'fetched_at': 0}
CACHE_SECONDS = 60 * 60  # 1 hour


def fetch_live_prices():
    """
    Unit 7.2 — REST APIs using requests + JSON handling.
    Tries CoinGecko first; if that comes back empty for any reason
    (see the comment on _fetch_from_coingecko), falls back to a
    completely different provider (Binance) rather than giving up —
    two independent providers failing at the same time is far less
    likely than one.
    """
    prices = _fetch_from_coingecko()
    if prices['goldPricePerOunceINR'] is None and prices['bitcoinPriceINR'] is None:
        prices = _fetch_from_binance()
    return prices


def _fetch_from_coingecko():
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
    except (requests.RequestException, ValueError) as err:
        # Logged (not just swallowed) so a real cause — an invalid key,
        # CoinGecko still blocking us, a genuine outage — shows up in
        # Render's Logs tab instead of just silently falling back forever.
        logger.warning('CoinGecko price fetch failed, falling back to Binance: %s', err)
        return {'goldPricePerOunceINR': None, 'bitcoinPriceINR': None}


def _fetch_from_binance():
    """
    Backup price source, used only when CoinGecko returns nothing.
    Binance's public market-data endpoints (no account/key needed)
    aren't gated behind the same kind of anonymous-datacenter-IP
    filtering that blocks CoinGecko — but Binance only quotes in USDT,
    so this needs one more call to convert to INR. PAXG (Pax Gold) is
    Binance's own gold-pegged token — same idea as tether-gold above,
    different issuer.
    """
    try:
        btc_response = requests.get(BINANCE_URL, params={'symbol': 'BTCUSDT'}, timeout=8)
        gold_response = requests.get(BINANCE_URL, params={'symbol': 'PAXGUSDT'}, timeout=8)
        forex_response = requests.get(FOREX_URL, timeout=8)

        # raise_for_status() on each individually — otherwise a rejected
        # request (Binance geo/IP-blocking us, same idea as CoinGecko
        # above) shows up several lines later as a confusing KeyError on
        # 'price' instead of the real HTTP error and status code.
        btc_response.raise_for_status()
        gold_response.raise_for_status()
        forex_response.raise_for_status()

        btc, gold, forex = btc_response.json(), gold_response.json(), forex_response.json()
        usd_to_inr = forex['rates']['INR']

        return {
            'goldPricePerOunceINR': round(float(gold['price']) * usd_to_inr),
            'bitcoinPriceINR': round(float(btc['price']) * usd_to_inr),
        }
    except (requests.RequestException, ValueError, KeyError) as err:
        logger.warning('Binance fallback price fetch also failed: %s', err)
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
