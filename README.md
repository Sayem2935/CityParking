# 🚗 City Parking

**AI-Powered Smart Parking Management System**

A modern, AI-powered smart parking management platform built with React, TypeScript, and Tailwind CSS. City Parking provides intelligent vehicle recognition, face verification, and smart slot allocation for modern urban parking facilities.

## 🚀 Features

### Sprint 1
- **User Authentication** — Secure login and registration system
- **Protected Routes** — Role-based access control
- **User Profile** — Comprehensive profile management with verification status
- **Smart Dashboard** — AI-powered dashboard with real-time metrics and quick actions
- **Responsive Design** — Modern, mobile-first responsive UI
- **State Management** — Zustand-powered global state management
- **Mock API Layer** — Complete mock API for development

### Sprint 2
- **Vehicle Management** — Add, edit, and delete vehicles
- **Vehicle Types** — Support for Sedan, SUV, Truck, Motorcycle, Van, and Bus

### Sprint 3
- **Face Enrollment** — Record face enrollment video for future face recognition
- **Camera Access** — Request and manage camera permissions with graceful error handling
- **Live Camera Preview** — Real-time front-facing camera preview
- **Video Recording** — Start/stop recording with timer (10s min, 30s max, auto-stop)
- **Video Preview** — Playback recorded video with retake and upload options
- **Enrollment Guidance** — Visual cues for face positioning (look straight, turn left/right, look up/down)
- **Enrollment Progress** — Step-by-step progress indicator during enrollment
- **Mock Upload Service** — Simulated upload with progress tracking, success, and failure states
- **Session Persistence** — Enrollment session metadata saved in localStorage

## 🛠 Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **Routing:** React Router v7
- **Linting:** ESLint + TypeScript-ESLint

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🏗 Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── widgets/       # Dashboard widgets (StatusCard, MetricCard, etc.)
│   ├── vehicles/      # Vehicle management components
│   ├── face-enrollment/ # Face enrollment components
│   │   ├── CameraPermission.tsx   # Camera permission handler
│   │   ├── FaceCamera.tsx         # Live camera preview
│   │   ├── VideoRecorder.tsx      # Recording controls & timer
│   │   ├── VideoPreview.tsx       # Playback, retake & upload
│   │   ├── EnrollmentProgress.tsx # Step-by-step progress
│   │   └── index.ts               # Barrel exports
│   ├── Button.tsx     # Button component with variants
│   ├── Card.tsx       # Card component with glassmorphism
│   ├── Input.tsx      # Form input with validation
│   ├── Navbar.tsx     # Navigation bar with user dropdown
│   ├── SkeletonLoader.tsx  # Skeleton loading states
│   ├── LoadingSpinner.tsx  # Animated loading spinner
│   └── ProtectedRoute.tsx  # Route protection wrapper
├── hooks/             # Custom React hooks
│   ├── useAuth.ts     # Authentication hook
│   ├── useForm.ts     # Form management hook
│   └── useProfile.ts  # Profile management hook
├── pages/             # Page components
│   ├── DashboardPage.tsx      # Main dashboard with widgets
│   ├── LoginPage.tsx          # Split-screen login
│   ├── RegisterPage.tsx       # Split-screen registration
│   ├── ProfilePage.tsx        # User profile with verification
│   ├── EditProfilePage.tsx    # Profile editing
│   ├── VehiclesPage.tsx       # Vehicle list
│   ├── AddVehiclePage.tsx     # Add new vehicle
│   ├── EditVehiclePage.tsx    # Edit vehicle
│   ├── FaceEnrollmentPage.tsx # Face enrollment workflow
│   └── NotFoundPage.tsx       # 404 page
├── services/          # API service layer
│   ├── api.ts                   # Base API configuration
│   ├── auth.service.ts         # Authentication API
│   ├── user.service.ts         # User management API
│   ├── vehicle.service.ts      # Vehicle management API
│   └── face-enrollment.service.ts # Mock face enrollment upload
├── store/             # Zustand state stores
│   ├── authStore.ts           # Authentication state
│   ├── userStore.ts           # User state
│   ├── vehicleStore.ts        # Vehicle state
│   └── faceEnrollmentStore.ts # Face enrollment state
├── types/             # TypeScript type definitions
│   ├── auth.types.ts          # Auth types
│   ├── api.types.ts           # API types
│   ├── vehicle.types.ts       # Vehicle types
│   └── face-enrollment.types.ts # Enrollment types
└── utils/             # Utility functions
    ├── storage.ts     # Local storage helpers
    ├── formatters.ts  # Data formatting utilities
    └── validation.ts  # Form validation utilities
```

## 🎨 Design System

City Parking uses a professional design language:

| Element | Color |
|---------|-------|
| **Primary** | Deep Blue (`#1e40af`) |
| **Secondary** | Emerald Green (`#10b981`) |
| **Accent** | Smart City Cyan (`#06b6d4`) |

### Design Principles
- Modern cards with soft shadows
- Glassmorphism effects
- Smooth transitions and animations
- Responsive mobile-first layout

## 🧪 Testing Sprint 3 — Face Enrollment

### Prerequisites
- A browser with webcam support (Chrome, Firefox, Safari, Edge)
- A working webcam/camera connected to your device
- Development server running (`npm run dev`)

### Test Cases

#### 1. Camera Permission Flow
1. Navigate to `/face-enrollment` (or click **Face Enrollment** in the navbar)
2. **Grant permission:** Click "Allow" when the browser prompts for camera access → Camera preview should appear
3. **Deny permission:** Click "Block" when prompted → A permission denied state should display with a retry button
4. **Camera unavailable:** Disable/block camera in OS settings → An unavailable state should display
5. **Retry:** After denying, click "Try Again" → Browser should re-prompt for permission

#### 2. Live Camera Preview
1. After granting camera permission, verify the live video feed is visible
2. The video should be mirrored (front-facing camera)
3. Verify the "Look Straight" guidance text appears during preview
4. On mobile, verify the camera preview fills the screen appropriately

#### 3. Video Recording
1. Click the **Record** button → Recording should start, timer should begin counting
2. Verify the timer shows elapsed seconds (e.g., 00:05)
3. Verify recording indicator (red dot) is visible during recording
4. Wait at least 10 seconds before stopping → The stop button should be disabled until 10s
5. After 10 seconds, click **Stop** → Recording should stop, preview should appear
6. **Auto-stop:** Start a new recording and wait 30 seconds → Recording should auto-stop at 30s
7. Verify the timer displays correctly in `MM:SS` format

#### 4. Video Preview
1. After recording, verify the video preview plays back the recorded content
2. Click **Play/Pause** → Video should toggle playback
3. Click **Retake** → Should return to camera preview for a new recording
4. Click **Upload** → Upload flow should begin

#### 5. Enrollment Guidance
1. During recording, verify guidance text cycles through:
   - Look Straight
   - Turn Left
   - Turn Right
   - Look Up
   - Look Down
2. Each guidance step should be visible for approximately 5 seconds
3. The guidance text should have an accompanying icon

#### 6. Enrollment Progress
1. After clicking Upload, verify the progress stepper displays steps:
   - Record Video (completed)
   - Upload Video (in progress)
   - Processing (pending)
   - Complete (pending)
2. Verify upload progress percentage is displayed
3. After upload completes (simulated ~5s), verify success state appears
4. On success, verify a "Start New Enrollment" button is available

#### 7. Upload States
1. **Success:** Complete the upload flow → Green success message with checkmark
2. **Failure:** To test failure, the mock service has a 10% random failure rate. If upload fails:
   - Red error message should appear
   - "Try Again" button should be visible
   - Click "Try Again" to retry upload
3. **Loading:** During upload, verify a spinner/progress indicator is visible

#### 8. Session Persistence
1. Record and upload a video successfully
2. Refresh the page → The session data should be persisted in localStorage
3. Open DevTools → Application → Local Storage → Verify `faceEnrollmentSession` key exists

#### 9. Responsive UI
1. Resize browser to mobile width (< 640px) → Verify layout adapts
2. Verify camera preview, controls, and cards are properly stacked on mobile
3. Verify buttons are full-width on mobile
4. Test on an actual mobile device if possible

#### 10. State Reset
1. After a successful upload, click "Start New Enrollment"
2. Verify the store resets to initial state
3. Verify camera permission prompt appears again

### Quick Smoke Test
```bash
# 1. Start the dev server
npm run dev

# 2. Open http://localhost:5173 in your browser

# 3. Log in (or register a new account)

# 4. Click "Face Enrollment" in the navbar

# 5. Allow camera access

# 6. Click Record, wait 10+ seconds, click Stop

# 7. Preview the video, then click Upload

# 8. Wait for upload to complete → Verify success state
```

## 📸 Screenshots

> Capture the following pages for documentation:

1. **Login Page** — `/login` — Split-screen with branding panel
2. **Registration Page** — `/register` — Split-screen with feature highlights
3. **Dashboard** — `/dashboard` — Welcome card, quick actions, system status, metrics
4. **Profile Page** — `/profile` — Personal info, verification status, account details
5. **Edit Profile** — `/profile/edit` — Profile editing form
6. **Vehicles Page** — `/vehicles` — Vehicle list with cards
7. **Face Enrollment** — `/face-enrollment` — Camera preview, recording, and upload workflow
8. **Mobile View** — Responsive navbar and dashboard on mobile viewport

## 🗺 Roadmap

### Sprint 1 ✅
- User authentication and profile management
- Dashboard with widgets

### Sprint 2 ✅
- Vehicle management (add, edit, delete)

### Sprint 3 ✅
- Face enrollment with video recording and upload

### Sprint 4 (Planned)
- Admin dashboard
- Analytics and reporting
- Notification system
- Multi-facility support

## 📄 License

This project is proprietary software. All rights reserved.

---

**City Parking** — Smart parking for modern cities.