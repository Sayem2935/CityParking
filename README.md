# DIU Intelligent Parking System (DIPS)

**AI-Based Smart University Parking Access Control Using Multi-Modal Identity Verification**

> Developed at **Daffodil International University (DIU)**  
> Department of Computer Science and Engineering

---

## 📋 Project Overview

**DIU Intelligent Parking System (DIPS)** is a full-stack AI-powered parking access control system designed for university campuses. The system implements multi-modal identity verification — combining **face recognition**, **university ID extraction**, and **vehicle plate detection** — to automate and secure campus parking operations.

Unlike conventional parking systems that rely on manual gatekeeping or simple RFID tags, DIPS leverages deep learning models to provide contactless, intelligent, and scalable access control. The system integrates a **Raspberry Pi gate controller** for physical barrier automation, making it a complete end-to-end IoT + AI solution.

---

## 🎯 Problem Statement

University parking management in Bangladesh faces several challenges:

- **Manual gatekeeping** is slow, error-prone, and requires dedicated staff
- **Unauthorized parking** by non-students causes congestion and slot shortages
- **No identity verification** at entry/exit points leads to security gaps
- **Lack of real-time data** on parking availability causes inefficient slot utilization
- **Paper-based or RFID systems** are easily bypassed and difficult to scale

DIPS addresses these challenges by implementing AI-driven multi-modal verification at the gate level.

---

## 🏆 Objectives

1. **Design and implement** a multi-modal identity verification system combining face recognition, university ID extraction, and license plate detection
2. **Develop** a real-time parking occupancy monitoring system with heat map visualization
3. **Integrate** edge computing (Raspberry Pi) for autonomous gate control
4. **Achieve** ≥95% face verification accuracy at FAR ≤ 1% for campus access control
5. **Build** a production-grade full-stack web application for parking management

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DIU Intelligent Parking System                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐       │
│  │   Frontend    │    │   Backend    │    │   AI Services     │       │
│  │  React + TS   │◄──►│ Spring Boot  │◄──►│  Python FastAPI   │       │
│  │  Tailwind CSS │    │  PostgreSQL  │    │  InsightFace      │       │
│  │  Zustand      │    │  JWT Auth    │    │  Gemini OCR       │       │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘       │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │  Raspberry Pi     │                            │
│                    │  Gate Controller  │                            │
│                    │  Camera + Servo   │                            │
│                    └───────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework with type safety |
| Vite | Build tool and development server |
| Tailwind CSS 3 | Utility-first styling (dark theme) |
| Zustand | Lightweight state management |
| React Router v6 | Client-side routing with lazy loading |
| Framer Motion | Animations and transitions |
| Recharts | Data visualization |
| React Webcam | Camera integration for face enrollment |

### Backend
| Technology | Purpose |
|---|---|
| Java 17 + Spring Boot 3 | RESTful API server |
| Spring Security + JWT | Authentication and authorization |
| Spring Data JPA + Hibernate | ORM and data access |
| PostgreSQL | Primary database |
| Flyway | Database migration management |
| Lombok | Java boilerplate reduction |
| Resilience4j | Circuit breaker and fault tolerance |

### AI / Machine Learning
| Technology | Purpose |
|---|---|
| InsightFace (RetinaFace + ArcFace) | Face detection and recognition |
| Google Gemini API | University ID document extraction (OCR) |
| YOLOv8 | License plate detection |
| PyTorch | Deep learning inference runtime |
| FastAPI (Python) | AI microservice API |

### Infrastructure
| Technology | Purpose |
|---|---|
| Raspberry Pi 4 | Edge computing for gate control |
| Servo Motor (SG90) | Physical gate barrier actuation |
| Pi Camera Module | Vehicle and face image capture |
| Docker | Containerized deployment |
| Render | Cloud hosting (frontend + backend) |

---

## 🤖 AI Pipeline

### 1. Face Recognition

```
Camera Input → RetinaFace Detection → Face Alignment → ArcFace Embedding (512-D)
     → Cosine Similarity Matching → Accept / Reject Decision
```

- **Detection**: RetinaFace with MobileNet backbone for real-time face detection
- **Embedding**: ArcFace with ResNet-50 backbone (w600k_r50 weights), producing 512-dimensional face embeddings
- **Matching**: Cosine similarity with configurable threshold (default: 0.45)
- **Liveness**: Multi-pose enrollment (straight, left, right, up, down) for anti-spoofing

### 2. University ID Verification

```
ID Card Image → Google Gemini OCR → Structured Data Extraction
     → Student Name, ID, Department, Session → Profile Update
```

- **Extraction**: Gemini 1.5 Flash with prompt-based structured output
- **Fields**: Student name, student ID, university name, department, session
- **Validation**: Cross-referencing extracted data with user profile

### 3. Vehicle Registration & Plate Detection

```
Vehicle Image → YOLOv8 Detection → License Plate ROI
     → OCR (Bangla + English) → Plate Matching → Vehicle Verification
```

- **Detection**: YOLOv8 trained for Bangladeshi license plates
- **OCR**: Unicode-safe processing supporting Bangla and English characters
- **Matching**: Fuzzy matching with normalization for plate verification

---

## 🚪 Gate Automation (Raspberry Pi)

The Raspberry Pi gate controller operates autonomously:

1. **Camera captures** vehicle approaching the gate
2. **Face image** and **plate image** are sent to the backend API
3. **Backend runs** multi-modal verification:
   - Face verification against enrolled embeddings
   - Plate verification against registered vehicles
   - Access decision engine combines results
4. **Gate opens** automatically if verification passes
5. **Parking slot** is assigned and occupancy is updated in real-time

---

## 📸 Screenshots

> Screenshots of the following pages are available in the `/docs` directory:

1. **Landing Page** — Research-grade public-facing page with system architecture
2. **Login / Register** — Split-screen authentication with DIPS branding
3. **Dashboard** — Welcome card, parking availability, quick actions
4. **Face Enrollment** — Multi-pose guided video recording
5. **Face Verification** — Real-time face matching interface
6. **University ID** — Document upload and AI extraction
7. **Parking Map** — Real-time heat map visualization
8. **Vehicle Management** — CRUD interface for registered vehicles

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Java 17+ and Maven
- PostgreSQL 15+
- Python 3.10+ (for AI microservice)

### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend
```bash
cd backend

# Build with Maven
./mvnw clean package -DskipTests

# Run
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

### AI Microservice
```bash
cd face-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8001
```

---

## 🔬 Future Work

- **Benchmark evaluation** on LFW, CALFW, and CPLFW datasets for publication
- **Attendance integration** — Linking parking entry/exit to class attendance
- **Mobile app** — React Native companion app for students
- **Multi-gate support** — Scaling to multiple campus entry points
- **Anomaly detection** — ML-based detection of suspicious access patterns
- **Energy optimization** — Solar-powered Raspberry Pi gate units
- **Longitudinal study** — Performance evaluation over 6-12 months with real campus data

---

## 📄 Research Publications

> Paper in preparation:
>
> **"AI-Based Smart University Parking Access Control Using Multi-Modal Identity Verification"**  
> Submitted to: [Target Conference/Journal]  
> Authors: [To be specified]

---

## 📁 Repository Structure

```
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   ├── store/              # Zustand state stores
│   └── types/              # TypeScript definitions
├── backend/                # Spring Boot backend
│   └── src/main/java/      # Java source (com.cityparking.backend)
├── face-ai/                # Python AI microservice
│   ├── main.py             # FastAPI entry point
│   └── evaluation/         # Research evaluation scripts
├── pi-client/              # Raspberry Pi client
├── raspberry-pi-gate/      # Gate controller code
├── docs/                   # Documentation
├── public/                 # Static assets & logos
└── SYSTEM_ARCHITECTURE.md  # Complete architecture document
```

---

## 📜 License

This project is proprietary software developed for Daffodil International University. All rights reserved.

---

**DIU Intelligent Parking System (DIPS)** — AI-Based Smart University Parking Access Control  
Daffodil International University · Department of Computer Science and Engineering
