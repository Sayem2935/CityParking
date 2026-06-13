# Auth Service Import Fix Report

**Date:** 2026-06-12  
**Trigger:** Frontend crash after Home Dashboard redesign  
**Console Error:**
```
Uncaught SyntaxError: The requested module '/src/services/auth.service.ts' does not provide an export named 'AuthService'
```

---

## Root Cause

`src/services/auth.service.ts` exports `authService` (lowercase, named export) but `src/services/index.ts` re-exported it as `AuthService` (PascalCase), creating a name mismatch that caused a module resolution failure at runtime.

---

## Files Causing the Error

### 1. `src/services/index.ts`

| | Incorrect Import | Correct Import |
|---|---|---|
| **Line** | `import { AuthService } from './auth.service';` | `import { authService } from './auth.service';` |
| **Re-export** | `export { AuthService }` | `export { authService }` |

### 2. `src/pages/DashboardPage.tsx` (secondary — stale API usage from dashboard redesign)

The newly added `DashboardPage.tsx` referenced store methods and type properties that don't exist, causing **15 TypeScript build errors**:

#### Store API Mismatches
| Store | Incorrect Usage | Correct Usage |
|---|---|---|
| `useVehicleStore` | `fetchVehicles`, `isLoading` | `getVehicles`, `isLoading` (already existed) |
| `useParkingStore` | `zones`, `isLoading` | `zoneBreakdown` (nested in `availability`), `loading` |

#### Vehicle Type Property Mismatches
| Incorrect Property | Correct Property (from `Vehicle` interface) |
|---|---|
| `vehicle.make` | `vehicle.vehicleBrand` |
| `vehicle.model` | `vehicle.vehicleModel` |
| `vehicle.licensePlate` | `vehicle.vehicleNumber` |
| `vehicle.type` | `vehicle.vehicleType` |
| `vehicle.year` | *(removed — no `year` field on `Vehicle` type)* |
| `vehicle.color` | `vehicle.vehicleColor` |

#### User Type Property Mismatches
| Incorrect Property | Correct Access |
|---|---|
| `user.universityIdVerified` | `!!user.studentId` |
| `user.faceVerified` | `false` (no field exists on `User` type yet) |

---

## Changes Made

| # | File | Change |
|---|---|---|
| 1 | `src/services/index.ts` | Changed `import { AuthService }` → `import { authService }` and `export { AuthService }` → `export { authService }` |
| 2 | `src/pages/DashboardPage.tsx` | Fixed all store API calls (`fetchVehicles`→`getVehicles`, `zones`→`zoneBreakdown`, `isLoading`→`loading`), corrected all `Vehicle` property names, and corrected `User` property access |

---

## Build Verification

```
$ npm run build

> tsc -b && vite build
✓ 562 modules transformed
✓ built in 1.39s

dist/index.html                   0.93 kB │ gzip:   0.49 kB
dist/assets/index-BdvGy7hq.css   61.33 kB │ gzip:  10.54 kB
dist/assets/index-uD1iDiq-.js   506.37 kB │ gzip: 149.30 kB
```

**Result:** ✅ TypeScript compilation and Vite production build both pass with **zero errors**.

---

## Key Takeaway

After any refactor, always verify that **export names match import names** exactly (case-sensitive). The `auth.service.ts` file uses `camelCase` (`authService`) while the dashboard code imported `PascalCase` (`AuthService`), which is a valid JavaScript identifier but a different export entirely.