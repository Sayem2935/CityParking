# Dataset Collection Guide — Face Recognition Evaluation

**Purpose:** Structured guide for collecting a face recognition evaluation dataset suitable for a student research paper.

---

## 1. Dataset Requirements Overview

| Parameter | Minimum | Recommended | Ideal |
|-----------|---------|-------------|-------|
| **Subjects (classes)** | 30 | 50–80 | 100+ |
| **Images per subject** | 4 | 8–10 | 15+ |
| **Total images** | 120 | 400–800 | 1,500+ |
| **Genuine pairs** | 90 | 700–2,000 | 5,000+ |
| **Impostor pairs** | 435 | 1,225–3,160 | 4,950+ |
| **Age range** | 18–30 | 18–50 | 18–65 |
| **Gender balance** | Any | 50/50 | 50/50 |
| **Ethnic diversity** | Any | 3+ groups | 5+ groups |

---

## 2. Directory Structure

```
evaluation_data/
├── README.md                 # Dataset description, consent info
├── metadata.csv              # Subject demographics (anonymized)
├── subjects/
│   ├── S001/                 # Subject ID
│   │   ├── enroll.jpg        # Gallery image (canonical frontal)
│   │   ├── probe_01.jpg      # Genuine probe: same session, different angle
│   │   ├── probe_02.jpg      # Genuine probe: different session/day
│   │   ├── probe_03.jpg      # Genuine probe: different lighting
│   │   ├── probe_04.jpg      # Genuine probe: with/without glasses
│   │   └── probe_05.jpg      # Genuine probe: expression variation
│   ├── S002/
│   │   ├── enroll.jpg
│   │   ├── probe_01.jpg
│   │   └── ...
│   ├── S003/
│   └── ... (S030–S100)
├── impostors/                # External impostor images (not enrolled)
│   ├── imp_001.jpg
│   ├── imp_002.jpg
│   └── ... (20–50 images)
└── annotations.csv           # Ground truth labels for all pairs
```

### metadata.csv Format

```csv
subject_id,age_range,gender,ethnicity,glasses,beard,enrollment_quality
S001,20-25,M,asian,no,no,high
S002,25-30,F,caucasian,yes,no,high
S003,30-35,M,african,no,yes,medium
...
```

### annotations.csv Format

```csv
pair_id,image_a,image_b,label,category,condition
P0001,S001/enroll.jpg,S001/probe_01.jpg,genuine,same_session,angle
P0002,S001/enroll.jpg,S001/probe_02.jpg,genuine,diff_session,lighting
P0003,S001/enroll.jpg,S002/enroll.jpg,impostor,cross_subject,n/a
...
```

---

## 3. Image Capture Protocol

### 3.1 Equipment

| Item | Specification | Notes |
|------|--------------|-------|
| Camera | 5MP+ webcam or phone | Consistent device per session |
| Resolution | 640×480 minimum | 1280×720 preferred |
| Format | JPEG, quality ≥ 80 | PNG acceptable |
| File size | 100KB – 5MB | Matches production upload limits |
| Color space | RGB | No grayscale |

### 3.2 Capture Conditions

**Required variations per subject (at least 4 of 6):**

| # | Condition | Description | Images |
|---|-----------|-------------|--------|
| 1 | **Neutral frontal** | Straight-on, neutral expression, good lighting | 1 (enroll) |
| 2 | **Angle variation** | ±15° yaw, ±10° pitch | 1–2 |
| 3 | **Lighting variation** | Dim, side-lit, back-lit | 1–2 |
| 4 | **Expression variation** | Smiling, surprised, frowning | 1 |
| 5 | **Accessory variation** | With/without glasses, hat, mask (lower face) | 1 |
| 6 | **Temporal variation** | Different day, different clothing | 1–2 |

### 3.3 Capture Environment

```
┌─────────────────────────────────────────┐
│                Room Layout               │
│                                          │
│    [Window/Natural Light]               │
│                                          │
│         ┌───────────┐                   │
│         │  Subject  │                   │
│         │   Chair   │  ← 0.5–1.0m from │
│         └───────────┘     camera        │
│                                          │
│         [  Camera  ]                    │
│         [  Tripod  ]                    │
│                                          │
│    [Overhead Light ON]                   │
│    [Side Light Optional]                 │
└─────────────────────────────────────────┘
```

**Checklist per capture session:**
- [ ] Camera mounted at face height
- [ ] Distance 0.5–1.0 meters
- [ ] Face fills 30–60% of frame
- [ ] Background is plain (wall, no patterns)
- [ ] Lighting is frontal (no harsh shadows)
- [ ] Focus is sharp (not blurry)
- [ ] Subject removes hat/cap for enrollment

---

## 4. Sample Size Justification

### 4.1 For a Student Research Paper (Bachelor/Master)

**Minimum viable dataset:**

| Component | Count | Rationale |
|-----------|-------|-----------|
| Subjects | 50 | Statistical power for pairwise comparisons |
| Images/subject | 6 | 1 enrollment + 5 probes |
| Genuine pairs | 250 | 50 × 5 = 250 genuine trials |
| Impostor pairs | 1,225 | C(50,2) = 1,225 cross-subject pairs |
| Total trials | 1,475 | Sufficient for FAR/FRR estimation |

### 4.2 Statistical Power Analysis

For detecting a FAR of 1% with ±0.5% margin of error at 95% confidence:

```
n = (Z² × p × (1 - p)) / E²
n = (1.96² × 0.01 × 0.99) / 0.005²
n ≈ 1,521 impostor trials
```

For detecting a FRR of 2% with ±1% margin of error at 95% confidence:

```
n = (1.96² × 0.02 × 0.98) / 0.01²
n ≈ 753 genuine trials
```

**Minimum recommended:** 1,500+ impostor trials, 750+ genuine trials.

### 4.3 Scaling Formula

```
Genuine pairs = Subjects × (Images_per_subject - 1)
Impostor pairs = C(Subjects, 2) = Subjects × (Subjects - 1) / 2

Example: 50 subjects, 8 images each
  Genuine  = 50 × 7 = 350
  Impostor = 50 × 49 / 2 = 1,225
  Total    = 1,575
```

| Subjects | Images/Subject | Genuine | Impostor | Total | Paper Level |
|----------|---------------|---------|----------|-------|-------------|
| 30 | 4 | 90 | 435 | 525 | Minimum (weak) |
| 50 | 6 | 250 | 1,225 | 1,475 | Bachelor |
| 80 | 8 | 560 | 3,160 | 3,720 | Strong Bachelor |
| 100 | 10 | 900 | 4,950 | 5,850 | Master |
| 200 | 10 | 1,800 | 19,900 | 21,700 | Publication |

---

## 5. Impostor Strategy

### 5.1 Intra-class impostors (hard negatives)
Pairs of different subjects who look similar (similar age, ethnicity, gender). These test the system's discriminative power.

### 5.2 Inter-class impostors (standard negatives)
Random cross-subject pairs from `enrolled/` directory. Automatically generated by `evaluate.py` via `combinations(enrolled_users, 2)`.

### 5.3 External impostors (attack scenario)
Images of people NOT in the enrolled set. Tests open-set recognition. Place in `impostors/` directory.

**Recommended ratio:**
- 80% inter-class impostors (auto-generated)
- 10% hard negatives (manually curated similar-looking pairs)
- 10% external impostors (unseen individuals)

---

## 6. Ethical & Legal Requirements

### 6.1 Informed Consent Form (Template)

```
FACE IMAGE COLLECTION — INFORMED CONSENT

I, _______________, voluntarily agree to participate in face image 
collection for academic research on face recognition systems.

I understand that:
1. My face images will be used solely for evaluating a face recognition 
   algorithm for a university parking access system.
2. Images will be stored securely and deleted after the research is complete.
3. My identity will be anonymized (subject ID, not real name).
4. Images will NOT be shared publicly, sold, or used for any other purpose.
5. I may withdraw at any time and request deletion of my images.

Subject ID: ____________
Date: _________________
Signature: _____________
```

### 6.2 IRB/Ethics Approval

For university research involving biometric data:
- **Required:** Institutional Review Board (IRB) or Ethics Committee approval
- **Data protection:** GDPR/FERPA compliance (depending on jurisdiction)
- **Storage:** Encrypted storage, access-controlled
- **Retention:** Delete within 6 months of publication
- **Publication:** Never include identifiable face images in the paper

### 6.3 Anonymization

| Field | Anonymization |
|-------|--------------|
| Subject name | Replace with S001, S002, ... |
| Filename | Keep as-is (already anonymized) |
| metadata.csv | No real names, only demographics |
| Paper figures | Use silhouette overlays or synthetic examples |

---

## 7. Data Quality Checklist

Before running evaluation, verify:

- [ ] All images are valid JPEG/PNG (no corrupt files)
- [ ] All images contain exactly one detectable face
- [ ] Enrollment images are high quality (frontal, good lighting)
- [ ] Probe images have intentional variation (angle, lighting, expression)
- [ ] No duplicate images (exact copies)
- [ ] No images from the internet (must be original captures)
- [ ] Consent forms signed for all subjects
- [ ] metadata.csv is complete (all subjects have demographics)
- [ ] File naming follows the convention (S001/enroll.jpg, S001/probe_01.jpg)
- [ ] Total dataset size matches expectations (see Section 4)

---

## 8. Quick Start — Collecting 50 Subjects

**Time estimate:** 3–5 hours total

| Step | Task | Time |
|------|------|------|
| 1 | Print consent forms | 15 min |
| 2 | Set up capture station | 30 min |
| 3 | Capture 50 subjects (6 images each) | 3–4 hours |
| 4 | Organize files into directory structure | 30 min |
| 5 | Create metadata.csv | 30 min |
| 6 | Run `evaluate.py` to verify data quality | 15 min |
| **Total** | | **5–6 hours** |

**Per subject:** ~4–5 minutes
- 30 seconds: consent + demographic info
- 30 seconds: explain instructions
- 2 minutes: capture 6 images with variations
- 1 minute: verify images on screen

---

*This guide is part of the CityParking Face Recognition Research Evaluation.*