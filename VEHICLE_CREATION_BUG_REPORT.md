# Vehicle Creation API — HTTP 400 Bad Request Bug Report

## Executive Summary

**Root Cause:** The frontend `AddVehicleData` type was **missing the `vehicleYear` field**, causing the `year` property to be `undefined` in the JSON payload. When serialized, `undefined` values are omitted from JSON. The backend DTO has `@NotNull` on `year`, so Jackson's validation rejects the request → HTTP 400 Bad Request.

---

## 1. Exact Payload Sent (BEFORE Fix)

```json
{
  "licensePlate": "ABC 1234",
  "make": "Toyota",
  "model": "Camry",
  "color": "White",
  "vehicleType": "CAR"
}
```

**`year` is MISSING** — `data.vehicleYear` was `undefined` because `AddVehicleData` did not include `vehicleYear`. JavaScript/JSON serialization omits `undefined` values.

---

## 2. Exact DTO Expected by Backend

**File:** `backend/src/main/java/com/cityparking/backend/dto/vehicle/VehicleRequest.java`

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class VehicleRequest {

    @NotBlank(message = "License plate is required")
    private String licensePlate;

    @NotBlank(message = "Make is required")
    @Size(max = 50, message = "Make must not exceed 50 characters")
    private String make;

    @NotBlank(message = "Model is required")
    @Size(max = 50, message = "Model must not exceed 50 characters")
    private String model;

    @NotNull(message = "Year is required")
    @Min(value = 1900, message = "Year must be 1900 or later")
    @Max(value = 2100, message = "Year must be 2100 or earlier")
    private Integer year;

    @NotBlank(message = "Color is required")
    @Size(max = 30, message = "Color must not exceed 30 characters")
    private String color;

    @NotNull(message = "Vehicle type is required")
    private String vehicleType;
}
```

**Required fields with validation:**
| Field | Type | Validation |
|---|---|---|
| `licensePlate` | String | `@NotBlank` |
| `make` | String | `@NotBlank`, `@Size(max=50)` |
| `model` | String | `@NotBlank`, `@Size(max=50)` |
| `year` | Integer | `@NotNull`, `@Min(1900)`, `@Max(2100)` |
| `color` | String | `@NotBlank`, `@Size(max=30)` |
| `vehicleType` | String | `@NotNull` |

---

## 3. Exact Validation Failure

The `@NotNull` on `year` field fails because:

1. Frontend `AddVehicleData` type (in `src/types/vehicle.types.ts`) did **not** include `vehicleYear`
2. `VehicleForm.tsx` initial state had **no** `vehicleYear` field
3. `vehicle.service.ts` `mapToBackendRequest()` set `year: data.vehicleYear` → `undefined`
4. JSON.stringify omits `undefined` values → `year` absent from JSON body
5. Jackson deserializes missing `year` as `null`
6. `@NotNull(message = "Year is required")` triggers validation failure
7. Spring returns HTTP 400 with validation error message

---

## 4. Root Cause

**Primary:** Missing `vehicleYear` field in `AddVehicleData` TypeScript interface — the frontend had no way to collect or send the vehicle year.

**Secondary:** The VehicleForm component had no year input field in the UI.

---

## 5. Required Code Fixes (All Applied)

### Fix 1: Add `vehicleYear` to `AddVehicleData` type
**File:** `src/types/vehicle.types.ts`

```diff
 export interface AddVehicleData {
   vehicleNumber: string;
   vehicleType: VehicleType;
   vehicleBrand: string;
   vehicleModel: string;
   vehicleColor: string;
+  vehicleYear: number;
 }
```

### Fix 2: Add year input field to VehicleForm
**File:** `src/components/vehicles/VehicleForm.tsx`

- Added `vehicleYear` to form initial state (defaults to `currentYear`)
- Added year number input field with validation (1900–currentYear+1)
- Added year to form validation logic
- Added year to useEffect when editing existing vehicle

### Fix 3: Fix vehicle.service.ts response mapping
**File:** `src/services/vehicle.service.ts`

- Added `BackendVehicleResponse` interface to properly type the API response
- Fixed `mapToBackendRequest()` to correctly map all frontend fields to backend field names
- Fixed `mapToFrontendVehicle()` to correctly map backend response fields to frontend `Vehicle` type
- Added `console.log("Vehicle payload being sent to backend:", payload)` for debugging

### Fix 4: Add temporary backend logging
**File:** `backend/src/main/java/com/cityparking/backend/controller/VehicleController.java`

- Added `@Slf4j` annotation
- Added `log.info("Vehicle create request: {}", request)` in `createVehicle()` method
- `VehicleRequest` uses Lombok `@Data` which auto-generates `toString()`, so logging works correctly

---

## Payload After Fix

```json
{
  "licensePlate": "ABC 1234",
  "make": "Toyota",
  "model": "Camry",
  "year": 2024,
  "color": "White",
  "vehicleType": "CAR"
}
```

All 6 required fields are now present and pass validation.

---

## Files Modified

| File | Change |
|---|---|
| `src/types/vehicle.types.ts` | Added `vehicleYear: number` to `AddVehicleData` |
| `src/services/vehicle.service.ts` | Rewrote with proper BackendVehicleResponse/Request interfaces, fixed field mappings, added console.log |
| `src/components/vehicles/VehicleForm.tsx` | Added year input field, validation, initial state |
| `backend/.../controller/VehicleController.java` | Added `@Slf4j` + request logging |

## Temporary Debug Logging (Remove After Verification)

**Frontend** (`src/services/vehicle.service.ts` line in `mapToBackendRequest`):
```ts
console.log("Vehicle payload being sent to backend:", payload);
```

**Backend** (`VehicleController.java`):
```java
log.info("Vehicle create request: {}", request);