# WealthNest Project Documentation

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                 REACT FRONTEND (Port 3000)           │
│  React + Vite + Tailwind + Redux + React Router     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (Axios)
                       ▼
┌─────────────────────────────────────────────────────┐
│            NODE.JS + EXPRESS (Port 5000)             │
│  • JWT Authentication   • CRUD APIs                 │
│  • MongoDB via Mongoose • API Gateway to Django     │
└──────────┬──────────────────────────┬───────────────┘
           │ Mongoose                  │ HTTP (Axios)
           ▼                          ▼
┌──────────────────┐    ┌─────────────────────────────┐
│  MONGODB (27017) │    │    DJANGO REST (Port 8000)   │
│  • Users         │    │  • ML Predictions            │
│  • Families      │    │  • Gemini AI Chat            │
│  • Investments   │    │  • Plotly Analytics          │
│  • Transactions  │    │  • PDF Generation            │
│  • ChatHistory   │    │  • Health Score              │
│  • Reports       │    └─────────────────────────────┘
│  • Notifications │
└──────────────────┘
```

## API Reference

### Node.js APIs (Port 5000)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | None |
| POST | /api/auth/login | Login, receive JWT | None |
| POST | /api/auth/refresh | Refresh access token | Refresh Token |
| POST | /api/auth/forgot-password | Send reset token | None |
| POST | /api/auth/reset-password | Reset password | Reset Token |
| GET | /api/users/me | Get own profile | JWT |
| PUT | /api/users/me | Update profile | JWT |
| GET | /api/users | List all users | Admin JWT |
| GET | /api/families | Get user's family | JWT |
| POST | /api/families | Create family | JWT |
| POST | /api/families/invite | Invite member | Head JWT |
| GET | /api/investments | List investments | JWT |
| POST | /api/investments | Add investment | JWT |
| PUT | /api/investments/:id | Update investment | JWT |
| DELETE | /api/investments/:id | Delete investment | JWT |
| GET | /api/transactions | Get transactions | JWT |
| POST | /api/transactions | Add transaction | JWT |
| GET | /api/dashboard | Get dashboard stats | JWT |
| GET | /api/notifications | Get notifications | JWT |
| PATCH | /api/notifications/:id/read | Mark as read | JWT |

### Django APIs (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/ | Gemini AI chat |
| POST | /api/predict-risk/ | ML risk prediction |
| POST | /api/predict-future/ | Future value prediction |
| POST | /api/recommend/ | Investment recommendations |
| POST | /api/health-score/ | Portfolio health score |
| POST | /api/analytics/ | Generate Plotly charts |
| POST | /api/pdf-report/ | Generate PDF report |
| GET | /api/health/ | Service health check |

## Database Schema

### users
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "string (hashed)",
  "role": "admin | family_head | family_member",
  "phone": "string",
  "age": "number",
  "income": "number",
  "riskProfile": "conservative | moderate | aggressive",
  "family": "ObjectId (ref: families)",
  "avatar": "string (url)",
  "isActive": "boolean",
  "refreshToken": "string",
  "resetPasswordToken": "string",
  "resetPasswordExpire": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### investments
```json
{
  "_id": "ObjectId",
  "name": "string",
  "category": "mutual_fund | stock | gold | fd | bond | ppf | nps | real_estate",
  "amount": "number",
  "currentValue": "number",
  "purchaseDate": "Date",
  "expectedReturn": "number",
  "riskLevel": "low | medium | high",
  "owner": "ObjectId (ref: users)",
  "family": "ObjectId (ref: families)",
  "notes": "string",
  "isActive": "boolean",
  "createdAt": "Date"
}
```

## User Roles & Permissions

| Action | Admin | Family Head | Family Member |
|--------|-------|-------------|---------------|
| Manage Users | ✅ | ❌ | ❌ |
| Create Family | ✅ | ✅ | ❌ |
| Invite Members | ✅ | ✅ | ❌ |
| Add Investments | ✅ | ✅ | ✅ (own only) |
| Delete Investments | ✅ | ✅ (family) | ✅ (own only) |
| Generate Reports | ✅ | ✅ | ❌ |
| Use AI Assistant | ✅ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ |
| Admin Dashboard | ✅ | ❌ | ❌ |
