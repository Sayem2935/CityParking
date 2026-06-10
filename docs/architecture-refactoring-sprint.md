# Architecture Refactoring Sprint — AF-4 through AF-8

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Controller Layer                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────────────┐  │
│  │ FaceEnrollment   │ │ FaceVerification │ │ PlateVerification           │  │
│  │ Controller       │ │ Controller       │ │ Controller                  │  │
│  └────────┬─────────┘ └────────┬─────────┘ └──────────────┬──────────────┘  │
└───────────┼────────────────────┼──────────────────────────┼─────────────────┘
            │                    │                          │
┌───────────┼────────────────────┼──────────────────────────┼─────────────────┐
│           ▼                    ▼              Service Layer│                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────▼──────────────┐  │
│  │ FaceEnrollment   │ │ FaceVerification │ │ PlateRecognition            │  │
│  │ Service          │ │ Service          │ │ Service                     │  │
│  └────────┬─────────┘ └────────┬─────────┘ └──────────────┬──────────────┘  │
│           │                    │                          │                  │
│  ┌────────┴─────────┐         │                          │                  │
│  │ FaceProcessing   │         │                          │                  │
│  │ Service          │         │                          │                  │
│  └────────┬─────────┘         │                          │                  │
│           │                    │                          │                  │
│  ┌────────▼────────────────────▼──────────────────────────▼──────────────┐  │
│  │                   AiServiceClient (NEW)                               │  │
│  │  ┌─────────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────────────┐ │  │
│  │  │ Timeout     │ │ Retry     │ │ Circuit      │ │ RestTemplate     │ │  │
│  │  │ Handling    │ │ (3x exp.) │ │ Breaker      │ │ (centralized)    │ │  │
│  │  │ (10s/30s)   │ │           │ │ (Resilience4j│ │                  │ │  │
│  │  └─────────────┘ └───────────┘ └──────────────┘ └──────────────────┘ │  │
│  └───────────────────────────────┬──────────────────────────────────────┘  │
│                                  │                                         │
│  ┌───────────────────────────────┼──────────────────────────────────────┐  │
│  │           FileStorageService (NEW — abstraction)                     │  │
│  │  ┌──────────────────────────┐ │                                      │  │
│  │  │ LocalStorageService      │ │                                      │  │
│  │  │ (implements interface)   │ │                                      │  │
│  │  └──────────────────────────┘ │                                      │  │
│  └───────────────────────────────┼──────────────────────────────────────┘  │
│                                  │                                         │
│  ┌───────────────────────────────┼──────────────────────────────────────┐  │
│  │          AccessDecisionService                                       │  │
│  │  (uses structured flags — no string matching)                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────────────────┐
│                          ▼           Shared AI DTOs (NEW)                 │
│  ┌──────────────────────────────────────────────────────────────────┐     │
│  │ AiServiceClient Result Types (records with enum status):        │     │
│  │  • AiFaceProcessingResult    (SUCCESS / NO_FACE / ERROR)        │     │
│  │  • AiFaceVerificationResult  (MATCH / NO_MATCH / ERROR)         │     │
│  │  • AiEmbeddingExtractionResult (SUCCESS / FAILURE)              │     │
│  │  • AiPlateDetectionResult    (DETECTED / NOT_DETECTED / FAILURE)│     │
│  │  • AiEnrollmentProcessingResult (SUCCESS / FAILURE)             │     │
│  └──────────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        External AI Service (Python)                       │
│  /process-enrollment  /extract-embedding  /verify-face  /detect-plate     │
└───────────────────────────────────────────────────────────────────────────┘
```

## Files Changed

### New Files Created (11)

| File | Purpose |
|------|---------|
| `backend/.../config/AiServiceConfig.java` | Centralized RestTemplate bean with connect/read timeouts |
| `backend/.../service/client/AiServiceClient.java` | Abstraction for all AI communication (timeout, retry, circuit breaker) |
| `backend/.../service/client/AiFaceProcessingResult.java` | Typed result DTO for face processing |
| `backend/.../service/client/AiFaceVerificationResult.java` | Typed result DTO for face verification |
| `backend/.../service/client/AiEmbeddingExtractionResult.java` | Typed result DTO for embedding extraction |
| `backend/.../service/client/AiPlateDetectionResult.java` | Typed result DTO for plate detection |
| `backend/.../service/client/AiEnrollmentProcessingResult.java` | Typed result DTO for enrollment processing |
| `backend/.../service/storage/FileStorageService.java` | Upload storage abstraction interface |
| `backend/.../service/storage/LocalStorageService.java` | Local filesystem implementation |
| `docs/architecture-refactoring-sprint.md` | This architecture document |

### Modified Files (7)

| File | Changes |
|------|---------|
| `backend/pom.xml` | Added `resilience4j-spring-boot3` dependency |
| `backend/.../resources/application.yml` | Added AI service config (timeouts, retry, circuit breaker) |
| `backend/.../service/FaceProcessingService.java` | Replaced direct RestTemplate with AiServiceClient; uses typed result DTOs |
| `backend/.../service/FaceVerificationService.java` | Replaced direct RestTemplate with AiServiceClient; sets structured flags |
| `backend/.../service/PlateRecognitionService.java` | Replaced direct RestTemplate with AiServiceClient; uses typed result DTOs |
| `backend/.../service/AccessDecisionService.java` | Replaced all `contains()` string matching with structured boolean flag checks |
| `backend/.../service/FaceEnrollmentUploadService.java` | Injected FileStorageService abstraction instead of direct file I/O |

## Design Improvements

### AF-4: Centralized AI Communication
- **Before**: 3 services each creating `new RestTemplate()` with independent HTTP calls
- **After**: Single `AiServiceClient` bean wraps all AI endpoints with shared resilience

### AF-5: Timeout Handling
- Connect timeout: 5s (configurable)
- Read timeout: 10s (processing), 30s (verification)
- Prevents thread starvation from hung AI requests

### AF-6: Retry Logic + Circuit Breaker
- Retry: 3 attempts with exponential backoff (1s → 2s → 4s)
- Circuit Breaker: Opens after 5 failures, 30s wait, 10-call sliding window
- Half-open: 3 permitted calls to test recovery
- AI service outage degrades gracefully instead of cascading failures

### AF-7: Shared AI DTOs
- **Before**: Services parsed raw `Map<String, Object>` responses with fragile string matching
- **After**: Typed record DTOs with enum status codes + factory methods
- Each result type has semantic query methods: `isNoFaceDetected()`, `isMatch()`, `isDetected()`, etc.
- Error codes (`NO_FACE_DETECTED`, `SERVICE_UNAVAILABLE`, `CONNECTION_TIMEOUT`) replace string matching

### AF-8: File Storage Abstraction
- **Before**: `FaceEnrollmentUploadService` directly used `Files.createDirectories()`, `Path.of()`, `Files.copy()`
- **After**: `FileStorageService` interface with `LocalStorageService` implementation
- Enables swapping to S3, GCS, or Azure Blob without changing service code
- `@ConditionalOnMissingBean` allows production override via configuration

### Service Boundary Improvements
- `AccessDecisionService` no longer knows about AI response internals
- Structured flags (`verification.isMatch()`, `verification.isNoFaceDetected()`, etc.) replace string parsing
- Each service's responsibility is clear: AI communication → AiServiceClient, business logic → domain services

## Updated Architecture Fitness Scores

| Fitness Attribute | Before | After | Δ |
|---|---|---|---|
| **AF-4** Centralized AI Communication | 2/10 | 9/10 | +7 |
| **AF-5** Timeout Handling | 0/10 | 8/10 | +8 |
| **AF-6** Resilience (Retry + Circuit Breaker) | 0/10 | 8/10 | +8 |
| **AF-7** Shared AI DTOs | 2/10 | 8/10 | +6 |
| **AF-8** Upload Storage Abstraction | 2/10 | 8/10 | +6 |
| **Service Boundary Quality** | 3/10 | 7/10 | +4 |