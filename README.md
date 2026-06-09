# 🚗 City Parking

**AI-Powered Smart Parking Management System**

A modern, AI-powered smart parking management platform built with React, TypeScript, and Tailwind CSS. City Parking provides intelligent vehicle recognition, face verification, and smart slot allocation for modern urban parking facilities.

## 🚀 Features (Sprint 1)

- **User Authentication** — Secure login and registration system
- **Protected Routes** — Role-based access control
- **User Profile** — Comprehensive profile management with verification status
- **Smart Dashboard** — AI-powered dashboard with real-time metrics and quick actions
- **Responsive Design** — Modern, mobile-first responsive UI
- **State Management** — Zustand-powered global state management
- **Mock API Layer** — Complete mock API for development

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
│   ├── DashboardPage.tsx   # Main dashboard with widgets
│   ├── LoginPage.tsx       # Split-screen login
│   ├── RegisterPage.tsx    # Split-screen registration
│   ├── ProfilePage.tsx     # User profile with verification
│   ├── EditProfilePage.tsx # Profile editing
│   └── NotFoundPage.tsx    # 404 page
├── services/          # API service layer
│   ├── api.ts         # Base API configuration
│   ├── auth.service.ts     # Authentication API
│   └── user.service.ts     # User management API
├── store/             # Zustand state stores
│   ├── authStore.ts   # Authentication state
│   └── userStore.ts   # User state
├── types/             # TypeScript type definitions
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

## 📸 Screenshots

> Capture the following pages for documentation:

1. **Login Page** — `/login` — Split-screen with branding panel
2. **Registration Page** — `/register` — Split-screen with feature highlights
3. **Dashboard** — `/dashboard` — Welcome card, quick actions, system status, metrics
4. **Profile Page** — `/profile` — Personal info, verification status, account details
5. **Edit Profile** — `/profile/edit` — Profile editing form
6. **Mobile View** — Responsive navbar and dashboard on mobile viewport

## 🗺 Roadmap

### Sprint 2 (Planned)
- Vehicle management (add, edit, delete vehicles)
- Parking history with session details
- Face registration with camera integration
- ID document upload

### Sprint 3 (Planned)
- Real-time parking slot visualization
- AI-powered slot allocation
- Parking session management
- Payment integration

### Sprint 4 (Planned)
- Admin dashboard
- Analytics and reporting
- Notification system
- Multi-facility support

## 📄 License

This project is proprietary software. All rights reserved.

---

**City Parking** — Smart parking for modern cities.