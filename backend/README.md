# AI Parking System — Backend

Sprint 4: Production-ready backend foundation built with Spring Boot 3, Java 21, PostgreSQL, and JWT authentication.

## Tech Stack

| Component       | Technology                        |
|-----------------|-----------------------------------|
| Language        | Java 21                           |
| Framework       | Spring Boot 3.2.5                 |
| Build           | Maven                             |
| Database        | PostgreSQL 16                     |
| Migrations      | Flyway                            |
| Auth            | Spring Security + JWT (jjwt 0.12) |
| ORM             | Spring Data JPA / Hibernate       |
| Validation      | Jakarta Bean Validation           |
| API Docs        | SpringDoc OpenAPI / Swagger UI    |
| Docker          | Dockerfile + docker-compose       |
| Testing         | JUnit 5 + MockMvc + H2            |

## Project Structure

```
backend/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── README.md
└── src/
    ├── main/
    │   ├── java/com/cityparking/backend/
    │   │   ├── BackendApplication.java
    │   │   ├── config/
    │   │   │   ├── SecurityConfig.java
    │   │   │   └── OpenApiConfig.java
    │   │   ├── controller/
    │   │   │   ├── AuthController.java
    │   │   │   ├── VehicleController.java
    │   │   │   └── FaceEnrollmentController.java
    │   │   ├── dto/
    │   │   │   ├── auth/
    │   │   │   ├── user/
    │   │   │   ├── vehicle/
    │   │   │   ├── faceenrollment/
    │   │   │   └── common/
    │   │   ├── entity/
    │   │   │   ├── User.java
    │   │   │   ├── Vehicle.java
    │   │   │   └── FaceEnrollment.java
    │   │   ├── exception/
    │   │   │   ├── GlobalExceptionHandler.java
    │   │   │   ├── ResourceNotFoundException.java
    │   │   │   ├── BadRequestException.java
    │   │   │   └── DuplicateResourceException.java
    │   │   ├── repository/
    │   │   │   ├── UserRepository.java
    │   │   │   ├── VehicleRepository.java
    │   │   │   └── FaceEnrollmentRepository.java
    │   │   ├── security/
    │   │   │   ├── JwtAuthenticationFilter.java
    │   │   │   ├── JwtTokenProvider.java
    │   │   │   └── CustomUserDetailsService.java
    │   │   └── service/
    │   │       ├── AuthService.java
    │   │       ├── VehicleService.java
    │   │       └── FaceEnrollmentService.java
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/
    │           └── V1__create_tables.sql
    └── test/
        ├── java/com/cityparking/backend/
        │   ├── BackendApplicationTests.java
        │   └── controller/
        │       ├── AuthControllerTest.java
        │       └── VehicleControllerTest.java
        └── resources/
            └── application-test.yml
```

## Database Schema

### Users
| Column      | Type         | Constraints       |
|-------------|--------------|-------------------|
| id          | BIGSERIAL    | PK                |
| first_name  | VARCHAR(100) | NOT NULL          |
| last_name   | VARCHAR(100) | NOT NULL          |
| email       | VARCHAR(255) | NOT NULL, UNIQUE  |
| password    | VARCHAR(255) | NOT NULL          |
| phone       | VARCHAR(20)  |                   |
| avatar_url  | VARCHAR(500) |                   |
| is_active   | BOOLEAN      | DEFAULT TRUE      |
| role        | VARCHAR(20)  | DEFAULT 'USER'    |
| created_at  | TIMESTAMP    | NOT NULL          |
| updated_at  | TIMESTAMP    | NOT NULL          |

### Vehicles
| Column        | Type         | Constraints               |
|---------------|--------------|---------------------------|
| id            | BIGSERIAL    | PK                        |
| license_plate | VARCHAR(20)  | NOT NULL                  |
| make          | VARCHAR(100) | NOT NULL                  |
| model         | VARCHAR(100) | NOT NULL                  |
| year          | INTEGER      | NOT NULL                  |
| color         | VARCHAR(50)  |                           |
| vehicle_type  | VARCHAR(50)  |                           |
| is_default    | BOOLEAN      | DEFAULT FALSE             |
| user_id       | BIGINT       | FK → users, NOT NULL      |
| created_at    | TIMESTAMP    | NOT NULL                  |
| updated_at    | TIMESTAMP    | NOT NULL                  |

### Face Enrollments
| Column      | Type         | Constraints               |
|-------------|--------------|---------------------------|
| id          | BIGSERIAL    | PK                        |
| user_id     | BIGINT       | FK → users, NOT NULL      |
| video_url   | VARCHAR(500) |                           |
| status      | VARCHAR(20)  | DEFAULT 'PENDING'         |
| notes       | VARCHAR(1000)|                           |
| enrolled_at | TIMESTAMP    |                           |
| created_at  | TIMESTAMP    | NOT NULL                  |
| updated_at  | TIMESTAMP    | NOT NULL                  |

## API Endpoints

### Authentication

| Method | Endpoint             | Auth | Description                |
|--------|----------------------|------|----------------------------|
| POST   | `/api/auth/register` | No   | Register a new user        |
| POST   | `/api/auth/login`    | No   | Login, returns JWT         |
| GET    | `/api/auth/me`       | Yes  | Get current user profile   |

### Vehicles

| Method | Endpoint              | Auth | Description                |
|--------|-----------------------|------|----------------------------|
| GET    | `/api/vehicles`       | Yes  | List user's vehicles       |
| POST   | `/api/vehicles`       | Yes  | Add a new vehicle          |
| PUT    | `/api/vehicles/{id}`  | Yes  | Update a vehicle           |
| DELETE | `/api/vehicles/{id}`  | Yes  | Delete a vehicle           |

### Face Enrollment

| Method | Endpoint               | Auth | Description                |
|--------|------------------------|------|----------------------------|
| POST   | `/api/face-enrollment` | Yes  | Submit face enrollment     |
| GET    | `/api/face-enrollment` | Yes  | List enrollments           |

### API Documentation

| Endpoint            | Description               |
|---------------------|---------------------------|
| `/swagger-ui.html`  | Swagger UI                |
| `/api-docs`         | OpenAPI JSON spec         |

## Quick Start

### Prerequisites

- Java 21 (JDK)
- PostgreSQL 16+ (or Docker)
- Maven 3.9+ (or use included wrapper)

### Option 1: Docker (Recommended)

```bash
# Start PostgreSQL + Backend
docker-compose up --build

# Backend will be available at http://localhost:8080
# Swagger UI at http://localhost:8080/swagger-ui.html
```

### Option 2: Local Development

```bash
# 1. Start PostgreSQL
# Create database: parking_db

# 2. Set environment variables (or edit application.yml)
export DB_URL=jdbc:postgresql://localhost:5432/parking_db
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export JWT_SECRET=your-secret-key-at-least-256-bits-long

# 3. Build and run
cd backend
./mvnw spring-boot:run
```

### Option 3: Build JAR

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/backend-1.0.0.jar
```

## Build Instructions

```bash
# Clean build
./mvnw clean package

# Skip tests
./mvnw clean package -DskipTests

# Run tests only
./mvnw test

# Run specific test class
./mvnw test -Dtest=AuthControllerTest

# Build Docker image
docker build -t parking-backend .
```

## Testing Instructions

### Unit Tests

```bash
# Run all tests
./mvnw test

# Run with coverage
./mvnw test jacoco:report
# Report at: target/site/jacoco/index.html
```

### API Testing with cURL

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Save the token from login response
TOKEN="<paste-access-token-here>"

# Get current user
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Create vehicle
curl -X POST http://localhost:8080/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "licensePlate": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "year": 2023,
    "color": "Blue",
    "vehicleType": "Sedan"
  }'

# List vehicles
curl -X GET http://localhost:8080/api/vehicles \
  -H "Authorization: Bearer $TOKEN"

# Update vehicle (replace {id} with actual vehicle ID)
curl -X PUT http://localhost:8080/api/vehicles/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "licensePlate": "XYZ789",
    "make": "Honda",
    "model": "Civic",
    "year": 2024,
    "color": "Red",
    "vehicleType": "Sedan"
  }'

# Delete vehicle
curl -X DELETE http://localhost:8080/api/vehicles/1 \
  -H "Authorization: Bearer $TOKEN"

# Submit face enrollment
curl -X POST http://localhost:8080/api/face-enrollment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "notes": "Initial enrollment"
  }'

# List face enrollments
curl -X GET http://localhost:8080/api/face-enrollment \
  -H "Authorization: Bearer $TOKEN"
```

### API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "timestamp": "2026-06-09T07:00:00"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "fieldName": "Validation message"
  },
  "timestamp": "2026-06-09T07:00:00"
}
```

## Environment Variables

| Variable        | Default                                          | Description           |
|-----------------|--------------------------------------------------|-----------------------|
| `DB_URL`        | `jdbc:postgresql://localhost:5432/parking_db`     | Database JDBC URL     |
| `DB_USERNAME`   | `postgres`                                       | Database username     |
| `DB_PASSWORD`   | `postgres`                                       | Database password     |
| `JWT_SECRET`    | (built-in default)                               | JWT signing secret    |
| `JWT_EXPIRATION_MS` | `86400000` (24h)                              | Token expiration      |
| `SERVER_PORT`   | `8080`                                           | Server port           |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Controller  │────▶│   Service    │────▶│  Repository  │
│  (REST API)  │     │  (Business)  │     │  (Data)      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     DTO      │     │   Entity     │     │  PostgreSQL  │
│  (Request/   │     │  (JPA/       │     │  (Flyway)    │
│   Response)  │     │   Hibernate) │     │              │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────────────────────────────────────────────┐
│                  Security Layer                       │
│  JWT Filter → Authentication → Authorization         │
└──────────────────────────────────────────────────────┘