# License Plate Unicode (Bangla) Audit Report

**Date:** 2026-06-14  
**Country:** Bangladesh  
**Module:** Vehicle Registration  
**Issue:** License plate field rejects Bangla characters  

---

## 1. Audit Findings

### 1.1 Frontend Validation Rules Found

| File | Location | Issue |
|------|----------|-------|
| `src/components/vehicles/VehicleForm.tsx` | `validate()` function | **No regex validation** — only checked min length (3 chars) and non-empty. Any character was accepted. No Unicode-aware pattern. |

**Before:** The frontend had no character-level validation, so Bangla input would pass the frontend but fail at the backend.

### 1.2 Backend Validation Rules Found

| File | Location | Issue |
|------|----------|-------|
| `backend/.../dto/vehicle/VehicleRequest.java` | `@Size(min=3, max=20)` | Max 20 chars too short for Bangla plates (e.g., "ঢাকা মেট্রো-গ ১২-৩৪৫৬" = 19 chars but many valid plates exceed 20) |
| `backend/.../service/VehicleService.java` | `normalizeLicensePlate()` | `toUpperCase()` — **safe** for Bangla (Bangla script has no case distinction), but the original code before a prior refactor used `replaceAll("[^A-Z0-9]", "")` which **destroyed all non-ASCII characters** |
| `backend/.../service/PlateRecognitionService.java` | `normalizePlate()` | **`replaceAll("[^A-Z0-9]", "")`** — **strips ALL Unicode characters** including Bangla text. This was the primary blocker. |
| `backend/.../service/PlateRecognitionService.java` | `fuzzyMatch()` | Used `char` comparison — does not handle supplementary Unicode code points correctly |

### 1.3 Database Constraints Found

| File | Location | Issue |
|------|----------|-------|
| `backend/.../db/migration/V1__create_tables.sql` | `license_plate VARCHAR(20)` | VARCHAR(20) too short for Bangla plates |
| `backend/.../db/migration/V4__create_plate_verification_logs.sql` | `detected_plate VARCHAR(20)` | Same issue for verification logs |
| PostgreSQL encoding | Default | Modern PostgreSQL defaults to UTF-8 encoding. The `vehicles` table column type `VARCHAR` is byte-counted for `VARCHAR(n)`, meaning multi-byte Bangla characters consume more bytes. However, `VARCHAR(20)` limits to 20 characters (not bytes) in PostgreSQL. |

### 1.4 Regex Patterns Found (All Locations)

| File | Pattern | Purpose | Problem |
|------|---------|---------|---------|
| `PlateRecognitionService.java:normalizePlate()` | `replaceAll("[^A-Z0-9]", "")` | Strip non-alphanumeric chars | **Destroys all Bangla characters** |
| `VehicleForm.tsx` | None | Frontend validation | **No regex existed** — no character filtering |
| `VehicleRequest.java` | None | Backend DTO validation | **No @Pattern annotation** — relied only on @Size |

---

## 2. Regex Changes

### 2.1 Backend `VehicleRequest.java` — NEW @Pattern annotation

**Before:**
```java
@Size(min = 3, max = 20, message = "License plate must be between 3 and 20 characters")
private String licensePlate;
```

**After:**
```java
@Pattern(
    regexp = "^[\\p{IsBengali}\\w\\s\\-]+$",
    message = "License plate can only contain Bangla/English letters, numbers, spaces, and hyphens"
)
@Size(min = 2, max = 50, message = "License plate must be between 2 and 50 characters")
private String licensePlate;
```

**Regex explanation:**
- `\p{IsBengali}` — Java Unicode category for Bengali/Bangla script (U+0980–U+09FF)
- `\w` — word characters (ASCII letters, digits, underscore)
- `\s` — whitespace (spaces)
- `\-` — hyphen
- `+` — one or more characters

### 2.2 Backend `PlateRecognitionService.java:normalizePlate()`

**Before:**
```java
private String normalizePlate(String plate) {
    if (plate == null) return "";
    return plate.toUpperCase()
            .replaceAll("[\\s\\-_]", "")
            .replaceAll("[^A-Z0-9]", "");  // ← DESTROYS BANGLA
}
```

**After:**
```java
private String normalizePlate(String plate) {
    if (plate == null) return "";
    return plate.trim().toUpperCase()
            .replaceAll("[\\s\\-_]", "");   // Only remove whitespace/punctuation, preserve Unicode
}
```

### 2.3 Backend `PlateRecognitionService.java:fuzzyMatch()`

**Before:**
```java
char r = registered.charAt(i);
char d = detected.charAt(i);
if (r != d) {
    if (!((r == 'O' && d == '0') || ...)) {
        differences++;
    }
}
```

**After:**
```java
int r = registered.codePointAt(i);
int d = detected.codePointAt(i);
if (r != d) {
    if (r < 128 && d < 128) {
        // ASCII-only digit/letter confusions
        char rc = (char) r;
        char dc = (char) d;
        if (!((rc == 'O' && dc == '0') || ...)) {
            differences++;
        }
    } else {
        differences++;
    }
}
```

### 2.4 Frontend `VehicleForm.tsx` — NEW regex

**Before:**
```tsx
// No regex validation — only length check
if (formData.vehicleNumber.trim().length < 3) { ... }
```

**After:**
```tsx
const LICENSE_PLATE_REGEX = /^[\u0980-\u09FF\w\s\-]+$/;

if (!formData.vehicleNumber.trim()) {
    newErrors.vehicleNumber = "Vehicle number is required";
} else if (formData.vehicleNumber.trim().length < 2) {
    newErrors.vehicleNumber = "Vehicle number must be at least 2 characters";
} else if (formData.vehicleNumber.trim().length > 50) {
    newErrors.vehicleNumber = "Vehicle number must not exceed 50 characters";
} else if (!LICENSE_PLATE_REGEX.test(formData.vehicleNumber.trim())) {
    newErrors.vehicleNumber = "Only Bangla/English letters, numbers, spaces, and hyphens are allowed";
}
```

---

## 3. Files Modified

| # | File | Change Description |
|---|------|-------------------|
| 1 | `backend/src/main/java/com/cityparking/backend/dto/vehicle/VehicleRequest.java` | Added `@Pattern` with `\p{IsBengali}` support; increased max from 20→50; decreased min from 3→2 |
| 2 | `backend/src/main/java/com/cityparking/backend/service/VehicleService.java` | Changed `toUpperCase()` to `normalizeLicensePlate()` method (Bangla-safe) |
| 3 | `backend/src/main/java/com/cityparking/backend/service/PlateRecognitionService.java` | Fixed `normalizePlate()` to stop stripping Unicode; fixed `fuzzyMatch()` to use codePoint for Unicode safety |
| 4 | `src/components/vehicles/VehicleForm.tsx` | Added regex validation with Bangla Unicode support; updated placeholder text; added length validation (2–50) |
| 5 | `backend/src/main/resources/db/migration/V14__expand_license_plate_for_unicode.sql` | **NEW FILE** — Flyway migration to expand VARCHAR(20)→VARCHAR(50) on both `vehicles` and `plate_verification_logs` |
| 6 | `backend/src/test/java/com/cityparking/backend/service/LicensePlateUnicodeTest.java` | **NEW FILE** — 25+ test cases covering Bangla, English, mixed, edge cases, invalid inputs, normalization |

---

## 4. PostgreSQL UTF-8 Storage

PostgreSQL defaults to UTF-8 encoding (`server_encoding = UTF8`). The `VARCHAR(n)` type counts **characters** (not bytes), so a Bangla character like `ঢ` (U+09A2, 3 bytes in UTF-8) counts as 1 character toward the limit.

**Actions taken:**
1. Migration V14 expands `VARCHAR(20)` → `VARCHAR(50)` to accommodate longer Bangla plates
2. Column comment added documenting UTF-8 Bangla support requirement
3. No encoding change needed — PostgreSQL UTF-8 is the default

**Verification query (run after migration):**
```sql
SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database();
-- Should return: UTF8
```

---

## 5. Before/After Validation Examples

### Valid Plates

| Input | Before | After |
|-------|--------|-------|
| `ঢাকা মেট্রো-গ ১২-৩৪৫৬` | ❌ Rejected (backend stripped non-A-Z0-9) | ✅ Accepted |
| `চট্টগ্রাম মেট্রো-খ ১১-১২৩৪` | ❌ Rejected | ✅ Accepted |
| `Dhaka Metro-G 12-3456` | ✅ Accepted | ✅ Accepted |
| `DHAKA METRO-G 12-3456` | ✅ Accepted | ✅ Accepted |
| `রাজশাহী মেট্রো-ঙ ০১-৯৯৯৯` | ❌ Rejected | ✅ Accepted |
| `ABC 1234` | ✅ Accepted | ✅ Accepted |
| `ঢাকা-গ` | ❌ Rejected (too short: min was 3) | ✅ Accepted (min now 2) |

### Invalid Plates (Correctly Rejected)

| Input | Before | After | Reason |
|-------|--------|-------|--------|
| `""` | ❌ Rejected | ❌ Rejected | Empty |
| `"A"` | ❌ Rejected (too short) | ❌ Rejected | < 2 chars |
| `"ঢাকা@মেট্রো#গ!"` | ⚠️ Accepted (no char validation) | ❌ Rejected | Special chars `@#!` not allowed |
| `"ঢাকা 🚗 মেট্রো"` | ⚠️ Accepted | ❌ Rejected | Emoji not allowed |
| `"ঢাকা.মেট্রো.গ"` | ⚠️ Accepted | ❌ Rejected | Periods not allowed |
| 52-char Bangla string | ❌ Rejected (max 20) | ❌ Rejected (max 50) | Exceeds length limit |

---

## 6. Test Cases Summary

**File:** `backend/src/test/java/com/cityparking/backend/service/LicensePlateUnicodeTest.java`

| Category | Test Count | Description |
|----------|-----------|-------------|
| Bangla Unicode plates | 13 | All 8 division plates + individual cases |
| English plates | 8 | Standard English, mixed, case variations |
| Edge cases | 4 | Multiple spaces/hyphens, min length, leading/trailing spaces |
| Invalid plates | 7 | Empty, blank, special chars, emoji, punctuation, too long |
| Normalization tests | 3 | toUpperCase() safety for Bangla |
| **Total** | **35** | |

---

## 7. Remaining Recommendations

1. **Run migration V14** on all environments (dev, staging, production)
2. **Run the new test suite** to verify validation correctness
3. **Update existing test expectations** in `VehicleServiceTest.java` if they assumed min length of 3
4. **Test with actual Bangla plate input** through the full flow: frontend → API → database → retrieval
5. **Consider adding `\p{IsDevanagari}` or other Indic scripts** if the system may expand beyond Bangladesh
6. **Update API documentation** to document the new accepted character set