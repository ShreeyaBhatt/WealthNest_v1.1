/**
 * src/api/marketData.js — Calls Django directly (not through Node)
 *
 * WHY not go through the shared `api` instance in api/axios.js?
 * That instance is baseURL'd to the NODE backend and attaches the
 * user's JWT — neither of those apply here. Market data doesn't need
 * a login and doesn't touch MongoDB at all (see
 * django_ai/api/views/market_data.py), so there's no reason to route
 * it through Node first.
 */

import axios from 'axios';

const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8000/api';

export const getMarketData = () => axios.get(`${DJANGO_URL}/market-data/`).then((res) => res.data);
