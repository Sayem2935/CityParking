# CityParking API Cleanup Report

**Date:** 2026-06-14
**Audit Type:** Complete API and Backend Cleanup Audit

---

## SECTION A: Safe-to-Delete APIs

| # | API Endpoint | Controller | Reason |
|---|-------------|-----------|--------|
| — | **None** | — | All controller endpoints are actively used by the frontend or are required by the product scope. |

All 9 controllers and their endpoints are actively used:
- `AuthController` — `/api/auth/login`, `/api/auth/register` → Used by LoginPage, RegisterPage
- `UserController` — `/api/users/profile`, `/api/users/profile` (PUT) → Used by ProfilePage, EditProfilePage
- `VehicleController` — `/api/vehicles/**` → Used by VehiclesPage, AddVehiclePage, EditVehiclePage
- `FaceEnrollmentController` — `/api/face-enrollment/**` → Used by FaceEnrollmentPage
- `FaceVerificationController` — `/api/face-verification/verify` → Used by access verification
- `AccessVerificationController` — `/api/access-verification/**` → Used by access verification
- `PlateVerificationController` — `/api/plate-verification/**` → Used by access verification
- `DocumentExtractionController` — `/api/documents/extract` → Used by UniversityIdPage
- `ParkingController` — `/api/parking/**` → Used by ParkingDashboardPage

---

## SECTION B: Safe-to-Delete DTOs

| # | File | Package | Reason |
|---|------|---------|--------|
| 1 | `ParkingScanRequest.java` | `dto.parking` | Not referenced by any controller, service, or test |
| 2 | `ScanResultResponse.java` | `dto.parking` | Not referenced by any controller, service, or test |

**Evidence:**
- `ParkingScanRequest` — No controller endpoint accepts this DTO. No service method uses it.
- `ScanResultResponse` — No controller endpoint returns this DTO. No service method produces it.
- Searched `backend/src` for `ParkingScanRequest` — only found in its own file.
- Searched `backend/src` for `ScanResultResponse` — only found in its own file.

---

## SECTION C: Safe-to-Delete Services

| # | File | Reason |
|---|------|--------|
| — | **None** | All services are actively used by controllers, other services, or are part of the Gemini/Face/Access architecture. |

All services are actively referenced:
- `AuthService` → AuthController
- `UserService` → UserController
- `VehicleService` → VehicleController
- `FaceEnrollmentService` → FaceEnrollmentController
- `FaceVerificationService` → FaceVerificationController, AccessDecisionService
- `PlateRecognitionService` → PlateVerificationController, AccessDecisionService
- `AccessDecisionService` → AccessVerificationController
- `ParkingSlotService` → ParkingController
- `ParkingAssignmentService` → ParkingController
- `FileStorageService`/`LocalStorageService` → FaceEnrollmentService
- `AccessDecisionResult` → AccessDecisionService
- AI services (GeminiService, MockGeminiService, FaceRecognitionService, MockFaceRecognitionService, AwsRekognitionService, DocumentExtractionService, MockGeminiDocumentService) → Part of Gemini/Face/Access architecture

---

## SECTION D: Safe-to-Delete Repositories

| # | File | Reason |
|---|------|--------|
| 1 | `ParkingScanLogRepository.java` | Not injected or used by any service, controller, or scheduled task |
| 2 | `ParkingOccupancyHistoryRepository.java` | Not injected or used by any service, controller, or scheduled task |

**Evidence:**
- Searched `backend/src` for `ParkingScanLogRepository` — only found in its own file.
- Searched `backend/src` for `ParkingOccupancyHistoryRepository` — only found in its own file.
- `ScheduledCleanupConfig` does NOT reference either repository.

---

## SECTION E: Safe-to-Delete Frontend Files

| # | File | Reason |
|---|------|--------|
| — | **None** | All frontend files are actively used. Every page, component, service, store, hook, type, and util is referenced and used. |

**Evidence:**
- All pages are routed in `App.tsx`
- All services are called by stores/pages
- All stores are used by pages
- All types are used by services/stores
- All components are used by pages
- No references to removed features (prediction, optimization, digital twin, RL, congestion, forecasting) found in any frontend file

---

## SECTION F: Safe-to-Delete Routes

| # | Route | Reason |
|---|-------|--------|
| — | **None** | All backend routes and frontend routes are actively used. |

All routes in `SecurityConfig.java` are valid:
- `/api/auth/**` — Authentication
- `/api/documents/**` — Document extraction
- `/api/parking/availability` — Parking availability (public)
- `/swagger-ui/**` — API docs
- `/v3/api-docs/**` — OpenAPI spec

---

## SECTION G: Safe-to-Delete Types/Interfaces

| # | File | Reason |
|---|------|--------|
| 1 | `ParkingScanLog.java` (entity) | Not referenced by any service, controller, or repository injection |
| 2 | `ParkingOccupancyHistory.java` (entity) | Not referenced by any service, controller, or repository injection |

**Evidence:**
- Searched `backend/src` for `ParkingScanLog` — only found in its own file and `ParkingScanLogRepository.java` (also dead).
- Searched `backend/src` for `ParkingOccupancyHistory` — only found in its own file and `ParkingOccupancyHistoryRepository.java` (also dead).
- No JPA relationships reference these entities from other entities.

**Dead Documentation Files:**

| # | File | Reason |
|---|------|--------|
| 3 | `docs/sprint11-parking-occupancy-prediction.md` | Documents removed prediction feature |
| 4 | `docs/sprint13-rl-parking-optimization.md` | Documents removed RL optimization feature |
| 5 | `docs/sprint14-parking-digital-twin.md` | Documents removed digital twin feature |

---

## SECTION H: Must Keep for Gemini Integration

The following are **REQUIRED** and must NOT be deleted:

| File | Reason |
|------|--------|
| `GeminiService.java` (interface) | Core Gemini integration contract |
| `GeminiServiceImpl.java` | Real Gemini API implementation |
| `MockGeminiService.java` | Mock implementation for development/testing |
| `GeminiProperties.java` | Configuration properties for Gemini |
| `GeminiConfig.java` | Spring configuration for Gemini |
| `AiProviderConfig.java` | AI provider bean selection |
| `VehicleAnalysisResult.java` | Return type for `GeminiService.analyzeVehicle()` |
| `ParkingDetectionResult.java` | Return type for `GeminiService.detectParkingOccupancy()` |
| `PlateDetectionResult.java` (in service/ai) | Used by Gemini plate detection |

---

## SECTION I: Must Keep for Future Parking Occupancy Updates

| File | Reason |
|------|--------|
| `ParkingSlotService.java` | Manages parking slot availability |
| `ParkingAssignmentService.java` | Manages parking slot assignments |
| `ParkingController.java` | Exposes parking APIs |
| `ParkingSlot.java` (entity) | Core parking slot entity |
| `ParkingAssignment.java` (entity) | Core parking assignment entity |
| All parking DTOs (except ScanRequest/ScanResultResponse) | Used by active parking endpoints |

**Note:** `V8__create_parking_prediction_tables.sql` and `V9__create_parking_optimization_tables.sql` create tables that are NOT used by any Java code. However, these migration files **CANNOT be deleted** because Flyway tracks migration history. Deleting them would break database migrations. The tables exist in the database but are dead — no code reads from or writes to them.

---

## SECTION J: Must Keep for University Parking Requirements

| File | Reason |
|------|--------|
| `DocumentExtractionController.java` | University ID extraction endpoint |
| `DocumentExtractionService.java` (interface) | Gemini document extraction contract |
| `MockGeminiDocumentService.java` | Mock document extraction |
| `DocumentExtractionResult.java` (DTO) | Response for document extraction |
| `document.service.ts` | Frontend document service |
| `document.types.ts` | Frontend document types |
| `UniversityIdPage.tsx` | University ID upload page |
| `V12__add_university_id_fields.sql` | DB migration for university ID fields |
| `V13__university_parking_customization.sql` | DB migration for university parking zones |
| `V12.5__expand_parking_zone_columns.sql` | DB migration for parking zone expansion |

---

## Summary

### Total Files to Delete: 8

**Backend Dead Code (6 files):**
1. `backend/src/main/java/com/cityparking/backend/entity/ParkingScanLog.java`
2. `backend/src/main/java/com/cityparking/backend/entity/ParkingOccupancyHistory.java`
3. `backend/src/main/java/com/cityparking/backend/repository/ParkingScanLogRepository.java`
4. `backend/src/main/java/com/cityparking/backend/repository/ParkingOccupancyHistoryRepository.java`
5. `backend/src/main/java/com/cityparking/backend/dto/parking/ParkingScanRequest.java`
6. `backend/src/main/java/com/cityparking/backend/dto/parking/ScanResultResponse.java`

**Dead Documentation (3 files):**
7. `docs/sprint11-parking-occupancy-prediction.md`
8. `docs/sprint13-rl-parking-optimization.md`
9. `docs/sprint14-parking-digital-twin.md`

### Files NOT Deleted (with reason):
- DB migration files V8, V9 — Flyway requires them for migration history
- All controllers — All endpoints are actively used
- All services — All are actively referenced
- All other entities — All are actively used
- All other repositories — All are actively injected
- All other DTOs — All are actively used
- All frontend files — All are actively used
- All Gemini/AI architecture files — Required by product scope
- All config files — All are actively used

### Endpoints Before Cleanup: 31
### Endpoints After Cleanup: 31 (no endpoints removed — all are actively used)

### Dead Code Removed:
- 2 unused entities (ParkingScanLog, ParkingOccupancyHistory)
- 2 unused repositories (ParkingScanLogRepository, ParkingOccupancyHistoryRepository)
- 2 unused DTOs (ParkingScanRequest, ScanResultResponse)
- 3 dead documentation files