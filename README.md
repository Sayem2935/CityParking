<<<<<<< HEAD
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
=======
# sayem



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/user/project/repository/web_editor/#create-a-file) or [upload](https://docs.gitlab.com/user/project/repository/web_editor/#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/researchpilot-group/sayem.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/researchpilot-group/sayem/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/)
* [Automatically close issues from merge requests](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> 05c2d0b68dc5b7b27c9b25468cb69e50a5b5e217
