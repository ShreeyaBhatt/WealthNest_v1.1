# WealthNest

WealthNest is a full-stack family investment portfolio tracker. It consolidates a household's holdings into a single, role-aware dashboard and layers on machine-learning risk/growth prediction, an AI chat assistant, and automated portfolio reporting.

The system is built as two independently deployable backends behind one frontend: a Node.js/Express service handles core application data (accounts, families, investments, transactions), while a Django service owns all AI/ML functionality (predictions, the chat assistant, analytics, and PDF generation). Application data lives in MongoDB; the ML service maintains its own SQLite store strictly for prediction logging, kept isolated from user data by design.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS, Redux Toolkit |
| Application Backend | Node.js, Express, JWT (access + refresh tokens) |
| AI/ML Backend | Python, Django, Django REST Framework |
| Primary Datastore | MongoDB |
| Machine Learning | scikit-learn, pandas, NumPy |
| Conversational AI | Google Gemini API |
| Data Visualization | Plotly (interactive), Matplotlib/Seaborn (static), NetworkX |
| Reporting | ReportLab (PDF generation) |

**Design notes:**
- The Node service is the sole point of contact for the client; it authenticates every request and proxies AI/ML calls to the Django service. Django never receives requests directly from a browser.
- Investment ownership is modeled with a dynamic reference (`ownerType`), allowing a single investment to belong to either the family head's account or a dependent's profile record, rather than requiring separate schemas for each.
- Django's SQLite database exists solely to log prediction requests/responses for auditability; it holds no application or user data.

## Project Structure

```
WealthNest_v1.1/
├── client/          React + Vite frontend
├── server/          Node.js + Express application backend
├── django_ai/       Django + DRF AI/ML backend
├── docs/            API reference and supplementary documentation
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local instance or Atlas)
- A Google Gemini API key

### 1. Application Backend (Node.js)

```bash
cd server
npm install
npm run dev
```

### 2. AI/ML Backend (Django)

```bash
cd django_ai
pip install -r requirements.txt
python manage.py migrate
python manage.py train_models   # trains and serializes the risk/future-value models
python manage.py runserver 8000
```

### 3. Frontend (React)

```bash
cd client
npm install
npm run dev
```

## Configuration

Copy `.env.example` to `.env` in each service directory and populate the required values.

| Service | File | Key Variables |
|---|---|---|
| `server` | `server/.env` | `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DJANGO_URL` |
| `django_ai` | `django_ai/.env` | `SECRET_KEY`, `GEMINI_API_KEY`, `ML_MODELS_DIR` |
| `client` | `client/.env` | `VITE_API_URL`, `VITE_DJANGO_URL` |

## Roles & Permissions

| Role | Scope |
|---|---|
| **Administrator** | Cross-family visibility; manages the full user base and platform-level data. |
| **Family Head** | Owner of a family workspace. Creates the family, manages member profiles directly (no invitation flow — members are profile records, not separate accounts), and has full authority over the household's investments, transactions, and reports. |
| **Family Member** *(profile)* | A dependent's record within a family — name, contact details, income — attributable as an investment owner, but without independent login access. |

A newly registered account holds no family-level permissions until it creates a family, at which point it becomes that family's Head.

## Core Features

- **Unified Portfolio Dashboard** — aggregated totals, gain/loss, and breakdowns by category and by family member, computed via a single MongoDB aggregation pipeline.
- **Risk Classification** — predicts a conservative/moderate/aggressive risk profile from portfolio composition and demographic inputs, with a model automatically selected from four candidate algorithms (kNN, Decision Tree, Random Forest, SVM) based on held-out accuracy.
- **Future Value Forecasting** — projects portfolio value at 1, 3, and 5-year horizons using a regression model chosen between Linear and Polynomial candidates.
- **AI Chat Assistant** — a Gemini-backed assistant grounded in the requesting family's real portfolio data.
- **Visual Analytics** — static and interactive charts plus a graph view of ownership relationships across the family.
- **PDF Reporting** — a formatted, on-demand portfolio statement.
- **Live Market Data** — reference gold/bitcoin pricing and general allocation guidance sourced externally.

## Investment Categories

Mutual Funds · Stocks · Gold · Fixed Deposits · Bonds · PPF · NPS · Real Estate · Cryptocurrency · Other

For risk modeling, categories are grouped into three feature buckets: **equity** (mutual funds, stocks, crypto), **gold**, and **debt** (all remaining categories).

## Documentation

Full API endpoint reference is maintained in [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md).

## License

Academic project — B.Tech Computer Science Engineering, Semester IV.
