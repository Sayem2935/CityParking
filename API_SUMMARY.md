# CityParking API Summary

**Version:** 1.0.0 | **Base URL:** `http://localhost:8080` | **Auth:** JWT Bearer Token

---

## Quick Reference

| # | Method | Endpoint | Auth | Role | Description |
|---|--------|----------|------|------|-------------|
| 1 | POST | `/api/auth/register` | No | - | User registration |
| 2 | POST | `/api/auth/login` | No | - | User login |
| 3 | GET | `/api/users/profile` | Yes | USER/ADMIN | Get user profile |
| 4 | PUT | `/api/users/profile` | Yes | USER/ADMIN | Update user profile |
| 5 | GET | `/api/vehicles` | Yes | USER/ADMIN | List user vehicles |
| 6 | GET | `/api/vehicles/{id}` | Yes | USER/ADMIN | Get vehicle by ID |
| 7 | POST | `/api/vehicles` | Yes | USER/ADMIN | Create vehicle |
| 8 | PUT | `/api/vehicles/{id}` | Yes | USER/ADMIN | Update vehicle |
| 9 | DELETE | `/api/vehicles/{id}` | Yes | USER/ADMIN | Delete vehicle |
| 10 | POST | `/api/face-enrollment/upload` | Yes | USER/ADMIN | Upload face enrollment video |
| 11 | GET | `/api/face-enrollment/{id}/status` | Yes | USER/ADMIN | Get enrollment status |
| 12 | GET | `/api/face-enrollment` | Yes | USER/ADMIN | List all enrollments |
| 13 | POST | `/api/face-verification/verify` | Yes | USER/ADMIN | Verify face image |
| 14 | POST | `/api/plate-verification/verify` | Yes | USER/ADMIN | Verify license plate |
| 15 | POST | `/api/access-verification/verify` | Yes | USER/ADMIN | Combined access verification |
| 16 | GET | `/api/parking/slots` | Yes | USER/ADMIN | Get all parking slots |
| 17 | GET | `/api/parking/availability` | Yes | USER/ADMIN | Get parking availability |
| 18 | POST | `/api/parking/scan` | Yes | USER/ADMIN | Scan parking area |
| 19 | POST | `/api/parking/assign` | Yes | USER/ADMIN | Assign parking slot |
| 20 | GET | `/api/parking/statistics` | Yes | USER/ADMIN | Get parking statistics |
| 21 | POST | `/api/documents/extract` | Yes | USER/ADMIN | Extract university ID document |

---

## By Category

### Authentication (Public)
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token

### User Profile (Protected)
- `GET /api/users/profile` — Read profile
- `PUT /api/users/profile` — Update profile

### Vehicle Management (Protected)
- `GET /api/vehicles` — List all
- `GET /api/vehicles/{id}` — Get one
- `POST /api/vehicles` — Create
- `PUT /api/vehicles/{id}` — Update
- `DELETE /api/vehicles/{id}` — Delete

### Face Enrollment (Protected, File Upload)
- `POST /api/face-enrollment/upload` — Upload video (multipart)
- `GET /api/face-enrollment/{id}/status` — Check status
- `GET /api/face-enrollment` — List all

### Face Verification (Protected, File Upload)
- `POST /api/face-verification/verify` — Verify face (multipart)

### Plate Verification (Protected, File Upload)
- `POST /api/plate-verification/verify` — Verify plate (multipart)

### Access Verification (Protected, File Upload)
- `POST /api/access-verification/verify` — Combined face + plate (multipart)

### Parking Management (Protected)
- `GET /api/parking/slots` — All slots
- `GET /api/parking/availability` — Availability stats
- `POST /api/parking/scan` — AI scan (multipart)
- `POST /api/parking/assign` — Assign slot to vehicle
- `GET /api/parking/statistics` — Usage analytics

### Document Extraction (Protected, File Upload)
- `POST /api/documents/extract` — OCR university ID (multipart)

---

## Authentication Flow

```
1. POST /api/auth/register or /api/auth/login
2. Receive JWT token in response
3. Include in all subsequent requests:
   Authorization: Bearer <token>
```

## Standard Response Format

```json
{
  "success": true|false,
  "message": "Description",
  "data": { ... }
}
```

## Error Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error / Bad request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Duplicate resource |
| 413 | File too large |
| 500 | Internal server error |

---

## Files Generated

| File | Description |
|------|-------------|
| `API_DOCUMENTATION.txt` | Full plain-text API documentation |
| `API_DOCUMENTATION.md` | Full Markdown API documentation |
| `POSTMAN_COLLECTION.json` | Importable Postman collection |
| `API_SUMMARY.md` | This quick-reference summary |