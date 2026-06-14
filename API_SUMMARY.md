# CityParking API Summary

**Last Updated:** 2026-06-14
**Total Active Endpoints:** 20

---

## Endpoints by Module

### Authentication (2 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login user |

### Users (2 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | JWT | Get user profile |
| PUT | `/api/users/profile` | JWT | Update user profile |

### Vehicles (5 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/vehicles` | JWT | List all vehicles |
| GET | `/api/vehicles/{id}` | JWT | Get vehicle by ID |
| POST | `/api/vehicles` | JWT | Create vehicle |
| PUT | `/api/vehicles/{id}` | JWT | Update vehicle |
| DELETE | `/api/vehicles/{id}` | JWT | Delete vehicle |

### Face Enrollment (3 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/face-enrollment` | JWT | Enroll face with image |
| POST | `/api/face-enrollment/upload` | JWT | Upload face video |
| GET | `/api/face-enrollment/status` | JWT | Get enrollment status |

### Face Verification (1 endpoint)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/face-verification/verify` | JWT | Verify face |

### Access Verification (1 endpoint)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/access-verification/verify` | JWT | Verify access (face + plate) |

### Plate Verification (1 endpoint)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/plate-verification/verify` | JWT | Verify license plate |

### Document Extraction (1 endpoint)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/documents/extract` | JWT | Extract university ID data |

### Parking (4 endpoints)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/parking/availability` | No | Get parking availability |
| POST | `/api/parking/assign` | JWT | Assign parking slot |
| POST | `/api/parking/release` | JWT | Release parking slot |
| GET | `/api/parking/statistics` | JWT | Get parking statistics |

---

## Authentication

- **Type:** JWT (JSON Web Token)
- **Header:** `Authorization: Bearer <token>`
- **Obtain via:** `/api/auth/login` or `/api/auth/register`

## Parking Zones

| Zone Code | Name |
|-----------|------|
| `AB4` | AB4 Parking Area |
| `ENGINEERING` | Engineering Parking Area |

## Response Format

All endpoints return responses in the standard `ApiResponse` format:

```json
{
  "success": true|false,
  "message": "string",
  "data": <payload>
}
```

## Backend Architecture

- **Framework:** Spring Boot 3.x
- **Database:** PostgreSQL with Flyway migrations
- **AI Integration:** Gemini API (with mock implementation)
- **Face Recognition:** AWS Rekognition (with mock implementation)
- **File Storage:** Local storage with configurable paths
- **Security:** JWT authentication, rate limiting, CORS