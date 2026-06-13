# Test Failure Report — CityParking Backend

**Date:** 2026-06-10  
**Total Tests Run:** 62  
**Passed:** 42  
**Failed:** 20  
**Skipped:** 0  

---

## Summary of Failures by Category

### 1. DTO / Response Wrapper Changes (7 failures)

The controllers were refactored to wrap all responses in `ApiResponse<T>`, but the controller tests still expect the raw DTO format.

| Test Class | Test Method | Issue |
|---|---|---|
| `AuthControllerTest` | `register_ShouldReturnCreated` | Expects `$.accessToken` but now wrapped as `$.data.accessToken` |
| `AuthControllerTest` | `login_ShouldReturnOk` | Expects `$.accessToken` but now wrapped as `$.data.accessToken` |
| `AuthControllerTest` | `getCurrentUser_ShouldReturnOk` | Expects `$.email` but now wrapped as `$.data.email` |
| `VehicleControllerTest` | `getVehicles_ShouldReturnList` | Expects `$.success` on raw list but now `ApiResponse` wrapper |
| `VehicleControllerTest` | `createVehicle_ShouldReturnCreated` | Expects `$.success` on raw object |
| `VehicleControllerTest` | `updateVehicle_ShouldReturnOk` | Calls `updated.setLicensePlate()` on immutable DTO |
| `VehicleControllerTest` | `deleteVehicle_ShouldReturnOk` | Expects `$.success` but response format differs |

### 2. Entity / Lombok Getter/Setter Changes (3 failures)

`User` entity changed from mutable Lombok `@Data` to manual getters with no setters for core fields. `UserRepository` method signatures changed.

| Test Class | Test Method | Issue |
|---|---|---|
| `UserRepositoryTest` | `testFindByEmail` | `findByEmail()` now returns `Optional<User>` |
| `UserRepositoryTest` | `testFindByEmail_NotFound` | `existsByEmail()` does not exist; need `findByEmail().isEmpty()` |
| `UserRepositoryTest` | `testFindByRole` | `findByRole()` does not exist on `UserRepository` |

### 3. Repository Changes (2 failures)

VehicleRepository no longer has `existsByLicensePlateAndUserId()`. Must use `findByUserIdAndLicensePlate()`.

| Test Class | Test Method | Issue |
|---|---|---|
| `VehicleRepositoryTest` | `testExistsByLicensePlateAndUser_Found` | Method `existsByLicensePlateAndUserId()` not found |
| `VehicleRepositoryTest` | `testExistsByLicensePlateAndUser_NotFound` | Method `existsByLicensePlateAndUserId()` not found |

### 4. AccessDecision Entity Migration (2 failures)

`AccessDecision` entity field names changed from `plateNumber`→`plate`, `confidenceScore`→`confidence`, `entryTime`→`timestamp`, etc.

| Test Class | Test Method | Issue |
|---|---|---|
| `AccessDecisionRepositoryTest` | `testFindByPlateNumber` | `setPlateNumber()`, `setConfidenceScore()`, `setEntryTime()` not found |
| `AccessDecisionRepositoryTest` | `testFindByDecisionAndStatus` | `setStatus()`, `setProcessedBy()` not found |

### 5. Service Method Signature Changes (2 failures)

| Test Class | Test Method | Issue |
|---|---|---|
| `ParkingSlotServiceTest` | `assignSlot_ShouldAssignSuccessfully` | `assignSlot()` method signature changed |
| `ParkingAssignmentServiceTest` | `assignNearestSlot_ShouldAssignSuccessfully` | `assignNearestSlot()` method signature changed |

### 6. Integration Test Response Format Mismatch (4 failures)

Integration tests expect raw DTO JSON but controllers now return `ApiResponse` wrapper with `{ success, message, data }` structure.

| Test Class | Test Method | Issue |
|---|---|---|
| `AuthIntegrationTest` | `register_Success` | Expects `$.accessToken` but now `$.data.accessToken` |
| `AuthIntegrationTest` | `login_AfterRegistration_Success` | Expects `$.accessToken` but now `$.data.accessToken` |
| `AuthIntegrationTest` | `accessProtectedEndpoint_WithToken_Success` | Token extraction from wrong JSON path |
| `VehicleIntegrationTest` | `addVehicle_Success` | Expects `$.licensePlate` but now `$.data.licensePlate` |

---

## Fixes Required

### Category 1 — DTO Response Wrapper (AuthControllerTest, VehicleControllerTest)
- Update JSONPath assertions to use `$.data.*` paths matching `ApiResponse` wrapper
- Fix VehicleResponse builder to use correct field names
- Replace direct setter calls with builder pattern

### Category 2 — Repository Changes (UserRepositoryTest)
- `findByEmail()` → returns `Optional<User>`, use `.get()` or `.orElseThrow()`
- `existsByEmail()` → use `findByEmail(email).isPresent()`
- Remove `testFindByRole` (method removed from repository)

### Category 3 — Repository Changes (VehicleRepositoryTest)
- Replace `existsByLicensePlateAndUserId()` with `findByUserIdAndLicensePlate().isPresent()`

### Category 4 — Entity Field Names (AccessDecisionRepositoryTest)
- Use actual `AccessDecision` entity fields: `plate`, `confidence`, `timestamp`, `decision`, `operatorId`

### Category 5 — Service Method Signatures (ParkingSlotServiceTest, ParkingAssignmentServiceTest)
- Update method calls to match new service signatures

### Category 6 — Integration Test Response Paths
- Update all JSONPath assertions in AuthIntegrationTest and VehicleIntegrationTest to account for `ApiResponse` wrapper






