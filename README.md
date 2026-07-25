# 💰 WealthNest — Family Investment Portfolio Tracker

> A full-stack, AI-powered Family Investment Portfolio Tracker built with MERN Stack + Django + Machine Learning + Google Gemini API.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, Vite, Tailwind CSS, Redux Toolkit |
| Primary Backend | Node.js, Express.js, JWT |
| AI/ML Backend | Python, Django, Django REST Framework |
| Database | MongoDB (Local / Atlas) |
| Machine Learning | Scikit-learn, Pandas, NumPy |
| Generative AI | Google Gemini API |
| Charts | Plotly (interactive), Matplotlib (PDF) |
| PDF | ReportLab |

---

## 📁 Project Structure

```
WealthNest_v1.1/
├── client/          # React + Vite + Tailwind (Frontend)
├── server/          # Node.js + Express (Primary Backend)
├── django_ai/       # Django + DRF (ML + AI + Analytics)
├── docs/            # Documentation
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB (local) or MongoDB Atlas
- Google Gemini API Key

### 1. Clone / Open the Project
```bash
cd WealthNest_v1.1
```

### 2. Start the Node.js Backend
```bash
cd server
npm install
npm run dev
```

### 3. Start the Django Backend
```bash
cd django_ai
pip install -r requirements.txt
python manage.py migrate
python manage.py train_models   # Train ML models
python manage.py runserver 8000
```

### 4. Start the React Frontend
```bash
cd client
npm install
npm run dev
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` in each folder and fill in the values.

| Service | File | Key Variables |
|---|---|---|
| server | `server/.env` | `MONGO_URI`, `JWT_SECRET`, `DJANGO_URL` |
| django_ai | `django_ai/.env` | `GEMINI_API_KEY`, `SECRET_KEY` |
| client | `client/.env` | `VITE_API_URL`, `VITE_DJANGO_URL` |

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **Admin** | Manage users, families, view all analytics |
| **Family Head** | Create family, invite members, manage investments, generate reports |
| **Family Member** | View investments, add own investments, use AI assistant |

---

## 🤖 AI Features

- **Gemini AI Chat** — Ask questions about your portfolio in plain English
- **Risk Prediction** — ML-based risk profile (Conservative / Moderate / Aggressive)
- **Future Value Prediction** — 1, 3, 5 year projections
- **Recommendations** — Personalized investment suggestions
- **Health Score** — Portfolio health score (0–100)

---

## 📊 Investment Types Supported

Mutual Funds | Stocks | Gold | Fixed Deposits | Bonds | PPF | NPS | Real Estate

---

## 📄 License
Academic Project — B.Tech Computer Science Engineering, Semester 4
