# WealthNest

<p align="left">
<img alt="React" src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB"/>
<img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white"/>
<img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white"/>
<img alt="Django REST" src="https://img.shields.io/badge/Django_REST-092E20?style=flat-square&logo=django&logoColor=white"/>
<img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white"/>
<img alt="Python" src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white"/>
<img alt="scikit-learn" src="https://img.shields.io/badge/scikit--learn-F7931E?style=flat-square&logo=scikitlearn&logoColor=white"/>
</p>

<!-- TODO: once deployed, replace this line with your actual link, e.g.:
**[Live Demo →](https://wealthnest.vercel.app)** -->

WealthNest is a full-stack family investment portfolio tracker. It consolidates a household's holdings into a single, role-aware dashboard and layers on machine-learning risk/growth prediction, an AI chat assistant, and automated portfolio reporting.

The system is built as two independently deployable backends behind one frontend: a Node.js/Express service handles core application data (accounts, families, investments, transactions), while a Django service owns all AI/ML functionality (predictions, the chat assistant, analytics, and PDF generation). Application data lives in MongoDB; the ML service maintains its own SQLite store strictly for prediction logging, kept isolated from user data by design.


<!--
  TODO: Add 2-4 screenshots here — this section has the single biggest
  impact on how quickly a recruiter understands what you built.

  Suggested shots: the portfolio dashboard, the risk prediction view,
  the AI chat assistant, and a generated PDF report.

  1. Create a folder for them, e.g. docs/screenshots/
  2. Add each image there
  3. Reference them like this:

  ![Portfolio Dashboard](docs/screenshots/dashboard.png)
  ![AI Chat Assistant](docs/screenshots/chat-assistant.png)
  ![Risk Prediction](docs/screenshots/risk-prediction.png)
-->

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

## Testing

```bash
# Node.js backend — Jest + Supertest, runs against a throw-away
# "wealthnest_test" MongoDB database (never touches your real dev data)
cd server
npm test

# Django AI backend — Django's built-in test runner, uses its own
# throw-away SQLite test database
cd django_ai
python manage.py test api
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
