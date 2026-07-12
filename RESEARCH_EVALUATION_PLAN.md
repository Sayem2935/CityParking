# Research Evaluation Plan — DIPS Face Recognition System

**System Under Evaluation:** RetinaFace (detection) + ArcFace w600k_r50 (recognition) + Cosine Similarity (matching)
**Target Application:** University parking access control via facial verification
**Document Purpose:** Publication-quality evaluation methodology and protocol

---

## 1. evaluate.py Audit

### 1.1 Current Implementation Summary

The evaluation script (`face-ai/evaluation/evaluate.py`) is a 318-line Python module implementing a `FaceRecognitionEvaluator` class that:

1. Loads InsightFace models via `FaceService`
2. Enrolls test users from directory structure
3. Runs genuine trials (same-user probes vs enrollment)
4. Runs impostor trials (cross-user enrollment comparisons)
5. Computes metrics at a given threshold
6. Finds Equal Error Rate (EER)
7. Prints a formatted report

### 1.2 Correctness Audit

| Component | Status | Analysis |
|-----------|--------|----------|
| **Model loading** | ✅ CORRECT | Uses `FaceService()` + `load_models()`, matches production pipeline |
| **Enrollment** | ✅ CORRECT | Loads image bytes, calls `extract_embedding()`, stores numpy array |
| **Genuine trials** | ✅ CORRECT | Probes vs enrollment of same user, skips enrollment image |
| **Impostor trials** | ✅ CORRECT | `combinations(users, 2)` for cross-user pairs + explicit impostor images |
| **Similarity computation** | ✅ CORRECT | `np.dot(a, b)` on L2-normalized embeddings = cosine similarity |
| **FAR formula** | ✅ CORRECT | `FP / (FP + TN)` — standard biometric formula |
| **FRR formula** | ✅ CORRECT | `FN / (FN + TP)` — standard biometric formula |
| **Accuracy formula** | ✅ CORRECT | `(TP + TN) / total` |
| **Precision formula** | ✅ CORRECT | `TP / (TP + FP)` |
| **Recall formula** | ✅ CORRECT | `TP / (TP + FN)` |
| **F1 formula** | ✅ CORRECT | `2 * P * R / (P + R)` |
| **EER computation** | ⚠️ BUG | See Section 1.3 |

### 1.3 Bug Report

#### BUG #1: EER Search Logic is Incorrect (SEVERITY: HIGH)

**Location:** Lines 200–215

```python
def find_eer(self) -> tuple[float, float]:
    best_eer = 1.0
    best_threshold = 0.0

    for threshold in np.arange(0.0, 1.01, 0.01):
        metrics = self.compute_metrics(threshold)
        diff = abs(metrics["far"] - metrics["frr"])
        eer_approx = (metrics["far"] + metrics["frr"]) / 2

        if diff < abs(best_eer - (best_eer)):  # ← BUG: always True
            if eer_approx < best_eer or diff < 0.02:
                best_eer = eer_approx
                best_threshold = threshold

    return best_threshold, best_eer
```

**Problem:** The condition `diff < abs(best_eer - (best_eer))` is `diff < abs(0)` which is `diff < 0`, which is always `False` for non-negative `diff`. This means the outer `if` is **never true**, and the method always returns `(0.0, 1.0)` — the initial values.

Wait — actually `abs(best_eer - best_eer)` = `abs(0)` = `0`, and `diff` is always ≥ 0. So `diff < 0` is always `False`. The function **never updates** and returns the initial `(0.0, 1.0)`.

**Correct EER algorithm:**

```python
def find_eer(self) -> tuple[float, float]:
    best_threshold = 0.0
    min_diff = float('inf')

    for threshold in np.arange(0.0, 1.01, 0.001):  # finer resolution
        metrics = self.compute_metrics(threshold)
        diff = abs(metrics["far"] - metrics["frr"])
        if diff < min_diff:
            min_diff = diff
            best_threshold = threshold

    eer = (self.compute_metrics(best_threshold)["far"] + 
           self.compute_metrics(best_threshold)["frr"]) / 2
    return best_threshold, eer
```

**Impact:** The reported EER is always `(0.00, 100.00%)` — meaningless. This must be fixed before any evaluation.

#### BUG #2: Threshold Sweep Step Size (SEVERITY: LOW)

**Location:** Lines 205, 250

The EER search uses `np.arange(0.0, 1.01, 0.01)` (101 steps) which is adequate for display but coarse for EER determination. For publication, use `0.001` resolution (1,001 steps).

#### BUG #3: No ROC Curve Computation (SEVERITY: MEDIUM)

The script computes FAR/FRR at discrete thresholds but does **not** generate:
- ROC curve (FPR vs TPR)
- AUC (Area Under Curve)
- DET curve (FAR vs FRR)

These are **required** for publication-quality evaluation.

#### BUG #4: No Confidence Intervals (SEVERITY: MEDIUM)

Point estimates for FAR/FRR without confidence intervals are insufficient for publication. Need bootstrap CIs or Wilson score intervals.

#### BUG #5: No Stratified Analysis (SEVERITY: LOW)

The script does not break down metrics by:
- Demographic subgroup (gender, ethnicity, age)
- Image condition (lighting, angle, expression)

This is expected for a student paper but would strengthen the work.

### 1.4 Missing Features for Publication

| Feature | Current | Required | Priority |
|---------|---------|----------|----------|
| ROC curve plot | ❌ | ✅ | HIGH |
| AUC computation | ❌ | ✅ | HIGH |
| DET curve plot | ❌ | ✅ | MEDIUM |
| Confidence intervals | ❌ | ✅ | HIGH |
| CSV/JSON export | ❌ | ✅ | MEDIUM |
| Stratified metrics | ❌ | ✅ | LOW |
| Pair generation script | ❌ | ✅ | HIGH |
| Ground truth file | ❌ | ✅ | MEDIUM |

---

## 2. Evaluation Protocol

### 2.1 Experimental Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVALUATION PIPELINE                           │
│                                                                  │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐             │
│  │ Dataset  │───→│ Enrollment│───→│ Pair         │             │
│  │ (images) │    │ Phase     │    │ Generation   │             │
│  └──────────┘    └───────────┘    └──────┬───────┘             │
│                                          │                      │
│                    ┌─────────────────────┐│                      │
│                    │  Genuine Pairs      ││                      │
│                    │  (same person)      ││                      │
│                    └──────────┬──────────┘│                      │
│                    ┌──────────┴───────────┘                      │
│                    │  Impostor Pairs      │                      │
│                    │  (different person)  │                      │
│                    └──────────┬───────────┘                      │
│                               │                                  │
│                    ┌──────────▼──────────┐                      │
│                    │  Similarity Score    │                      │
│                    │  Computation         │                      │
│                    └──────────┬──────────┘                      │
│                               │                                  │
│                    ┌──────────▼──────────┐                      │
│                    │  Threshold Sweep     │                      │
│                    │  (0.00 → 1.00)       │                      │
│                    └──────────┬──────────┘                      │
│                               │                                  │
│              ┌────────────────┼────────────────┐                │
│              ▼                ▼                ▼                │
│     ┌────────────┐   ┌────────────┐   ┌────────────┐          │
│     │ FAR / FRR  │   │ ROC / AUC  │   │ EER        │          │
│     │ Metrics    │   │ Curves     │   │ Detection  │          │
│     └────────────┘   └────────────┘   └────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Pair Generation Protocol

#### Genuine Pairs

**Definition:** Two images of the **same** person.

**Generation rule:** For each subject `S` with images `{enroll, probe_1, ..., probe_k}`:

```
Genuine pairs = {(enroll, probe_i) for i = 1..k}
```

**Expected count:** `N_subjects × (images_per_subject - 1)`

**Example (50 subjects, 6 images each):**
```
Genuine pairs = 50 × 5 = 250
```

#### Impostor Pairs

**Definition:** Enrollment image of one subject compared against enrollment image of a **different** subject.

**Generation rule:** For all unique subject pairs `(S_a, S_b)` where `a ≠ b`:

```
Impostor pairs = {(enroll_a, enroll_b) for all (a, b) ∈ C(N, 2)}
```

**Expected count:** `C(N_subjects, 2) = N × (N-1) / 2`

**Example (50 subjects):**
```
Impostor pairs = 50 × 49 / 2 = 1,225
```

#### Pair Balance Analysis

| Component | 50 Subjects | Ratio |
|-----------|-------------|-------|
| Genuine pairs | 250 | 17.0% |
| Impostor pairs | 1,225 | 83.0% |
| **Total** | **1,475** | 100% |

**Note:** The impostor-to-genuine ratio (~5:1) reflects the natural open-world scenario where most verification attempts are legitimate. For metric computation, this imbalance is acceptable because FAR and FRR are computed independently.

---

## 3. Metrics Definitions

### 3.1 Confusion Matrix

| | Predicted Match | Predicted No Match |
|---|---|---|
| **Actually Same Person** | TP (True Positive) | FN (False Negative) |
| **Actually Different Person** | FP (False Positive) | TN (True Negative) |

### 3.2 Biometric Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **FAR** (False Accept Rate) | `FP / (FP + TN)` | Probability that an impostor is accepted. **Lower is better.** |
| **FRR** (False Reject Rate) | `FN / (FN + TP)` | Probability that a genuine user is rejected. **Lower is better.** |
| **Accuracy** | `(TP + TN) / (TP + TN + FP + FN)` | Overall correctness. |
| **Precision** | `TP / (TP + FP)` | Of all matches predicted, how many are correct. |
| **Recall** | `TP / (TP + FN)` | Of all actual matches, how many were detected. |
| **F1 Score** | `2 × P × R / (P + R)` | Harmonic mean of precision and recall. |
| **EER** (Equal Error Rate) | Threshold where `FAR = FRR` | Single-number summary of system accuracy. **Lower is better.** |
| **AUC** (Area Under ROC) | Integral of ROC curve | Probability that a random genuine scores higher than a random impostor. **Higher is better.** |

### 3.3 ROC Curve

**Axes:**
- X-axis: False Positive Rate (FPR) = `FP / (FP + TN)` = FAR
- Y-axis: True Positive Rate (TPR) = `TP / (TP + FN)` = 1 - FRR

**Plotting:** Sweep threshold from 1.0 to 0.0, compute (FPR, TPR) at each point.

**Reference diagonal:** Random classifier (AUC = 0.5)
**Perfect classifier:** Upper-left corner (FPR=0, TPR=1, AUC=1.0)

### 3.4 DET Curve (Detection Error Tradeoff)

**Axes:**
- X-axis: FAR (False Accept Rate)
- Y-axis: FRR (False Reject Rate)

**Purpose:** Shows the tradeoff between security (low FAR) and usability (low FRR). The EER is the intersection with the line `y = x`.

---

## 4. Threshold Analysis

### 4.1 Threshold Sweep Results (Expected)

Based on ArcFace literature and the w600k_r50 model:

| Threshold | FAR (est.) | FRR (est.) | Accuracy | F1 | Use Case |
|-----------|-----------|-----------|----------|-----|----------|
| 0.20 | 8.0% | 0.2% | 94.2% | 0.62 | Maximum convenience |
| 0.30 | 3.5% | 0.5% | 96.0% | 0.75 | Low security |
| 0.35 | 2.0% | 1.0% | 96.8% | 0.82 | Moderate |
| 0.40 | 1.2% | 1.5% | 97.0% | 0.86 | Current default |
| 0.45 | 0.6% | 2.5% | 97.2% | 0.88 | Balanced |
| **0.50** | **0.3%** | **4.0%** | **97.1%** | **0.87** | **RECOMMENDED** |
| 0.55 | 0.1% | 6.5% | 96.5% | 0.84 | High security |
| 0.60 | 0.05% | 10.0% | 95.5% | 0.80 | Maximum security |

### 4.2 Threshold Recommendation

**For university parking access control:**

```
RECOMMENDED THRESHOLD: 0.50
```

**Justification:**
1. **FAR ≤ 0.3%** — Less than 1 in 333 impostor attempts succeed. Acceptable for parking (not vault access).
2. **FRR ~ 4.0%** — 1 in 25 genuine users may need to retry. Acceptable with a retry mechanism.
3. **EER region** — Typically falls between 0.40–0.50 for ArcFace. A threshold of 0.50 is slightly to the right of EER, favoring security over convenience.
4. **Industry precedent** — Commercial face recognition systems (e.g., FaceTec, iProov) typically operate at FAR ≤ 0.1% for access control, which corresponds to ~0.55 for ArcFace.

**If the evaluation dataset shows a different EER, adjust accordingly:**
```
Recommended threshold = EER_threshold + 0.05 (favor security)
```

### 4.3 Threshold Selection Methodology

For the paper, present threshold selection as a **design decision** informed by the application's security-convenience tradeoff:

```
Cost model:
  - Cost of false accept (unauthorized entry) = C_fa = HIGH
  - Cost of false reject (denied legitimate user) = C_fr = LOW
  - Optimal threshold minimizes: C_fa × FAR + C_fr × FRR
  
  Since C_fa >> C_fr, shift threshold right (toward lower FAR).
```

---

## 5. ROC/AUC Computation Protocol

### 5.1 Algorithm

```python
# Pseudocode for ROC computation
def compute_roc(genuine_scores, impostor_scores):
    thresholds = sorted(set(genuine_scores + impostor_scores), reverse=True)
    roc_points = []
    
    # Add (1.0, 1.0) point (threshold = 0, accept everything)
    total_genuine = len(genuine_scores)
    total_impostor = len(impostor_scores)
    
    for threshold in thresholds:
        tp = sum(1 for s in genuine_scores if s >= threshold)
        fp = sum(1 for s in impostor_scores if s >= threshold)
        tpr = tp / total_genuine  # = 1 - FRR
        fpr = fp / total_impostor  # = FAR
        roc_points.append((fpr, tpr))
    
    # Add (0.0, 0.0) point (threshold = 1, reject everything)
    roc_points.append((0.0, 0.0))
    
    return roc_points

def compute_auc(roc_points):
    # Trapezoidal integration
    auc = 0.0
    for i in range(1, len(roc_points)):
        x1, y1 = roc_points[i-1]
        x2, y2 = roc_points[i]
        auc += (x1 - x2) * (y1 + y2) / 2
    return auc
```

### 5.2 Expected AUC Values

| System Quality | AUC Range | Interpretation |
|---------------|-----------|----------------|
| Random | 0.50 | No discriminative power |
| Poor | 0.60–0.75 | Barely useful |
| Fair | 0.75–0.85 | Acceptable for low-security |
| Good | 0.85–0.95 | Suitable for access control |
| Excellent | 0.95–0.99 | Publication-worthy |
| **ArcFace w600k_r50** | **0.98–0.99+** | **State-of-the-art** |

---

## 6. Confidence Intervals

### 6.1 Method: Wilson Score Interval

For a proportion `p` observed from `n` trials, the 95% CI is:

```
CI = (p̂ + z²/2n ± z × √(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)

where z = 1.96 for 95% confidence
```

### 6.2 Application to Metrics

```python
def wilson_ci(successes, total, z=1.96):
    if total == 0:
        return (0.0, 0.0)
    p = successes / total
    denominator = 1 + z**2 / total
    center = (p + z**2 / (2 * total)) / denominator
    spread = z * ((p * (1 - p) / total + z**2 / (4 * total**2)) ** 0.5) / denominator
    return (max(0, center - spread), min(1, center + spread))
```

**Example for FAR with 1,225 impostor trials:**
- If FAR = 0.012 (15 false accepts out of 1,225)
- 95% CI = (0.007, 0.020)

**Example for FRR with 250 genuine trials:**
- If FRR = 0.040 (10 false rejects out of 250)
- 95% CI = (0.021, 0.074)

### 6.3 Required Sample Sizes for Tight CIs

| Metric | Observed Rate | Desired CI Width | Required n |
|--------|--------------|------------------|------------|
| FAR | 1.0% | ±0.5% | ~1,521 |
| FRR | 2.0% | ±1.0% | ~753 |
| Accuracy | 97.0% | ±1.0% | ~1,128 |

---

## 7. Statistical Validity Concerns

### 7.1 Internal Validity

| Concern | Risk | Mitigation |
|---------|------|------------|
| **Data leakage** | Genuine probes from same session as enrollment | Capture probes on different days/sessions |
| **Selection bias** | All subjects are young university students | Document demographic limitations |
| **Evaluation bias** | Same data used for threshold tuning and evaluation | Use k-fold cross-validation or hold-out test set |
| **Image quality bias** | Controlled studio conditions vs real-world | Include at least some "wild" images (varying conditions) |

### 7.2 External Validity

| Concern | Risk | Mitigation |
|---------|------|------------|
| **Population generalization** | Results apply only to similar demographics | Acknowledge limitation in paper |
| **Environment generalization** | Indoor-only evaluation | Document capture conditions |
| **Device generalization** | Single camera used | Test with 2–3 different cameras if possible |
| **Temporal generalization** | Short evaluation period | Acknowledge limitation; suggest longitudinal study |

### 7.3 Threats to Validity

1. **Small sample size (n<50):** Confidence intervals will be wide; FAR/FRR estimates unreliable. **Minimum 50 subjects.**
2. **Class imbalance:** 5:1 impostor-to-genuine ratio affects precision. Report metrics independently (FAR, FRR) not just accuracy.
3. **Repeated measures:** Multiple probes per subject are not independent. Use per-subject averaging for genuine scores.
4. **Multiple comparisons:** Sweeping 100+ thresholds inflates Type I error. Report EER as primary metric, threshold sweep as secondary.
5. **Model overfitting to test set:** If threshold is tuned on the same data used for evaluation, results are optimistically biased. **Split data: 60% development, 40% evaluation.**

### 7.4 Recommended Evaluation Protocol

```
┌─────────────────────────────────────────────────────┐
│              RECOMMENDED SPLIT                       │
│                                                      │
│  Total: 50 subjects, 6 images each                  │
│                                                      │
│  Development set (60%): 30 subjects                  │
│    → Threshold tuning                                │
│    → EER finding                                     │
│    → Parameter optimization                          │
│                                                      │
│  Evaluation set (40%): 20 subjects                   │
│    → Final FAR/FRR/AUC reporting                     │
│    → No parameter tuning on this set                 │
│    → Results reported in paper                       │
│                                                      │
│  Impostor pairs: All cross-subject pairs from        │
│  BOTH sets (50 × 49 / 2 = 1,225)                    │
│                                                      │
│  Genuine pairs: Per-subject probes (50 × 5 = 250)   │
└─────────────────────────────────────────────────────┘
```

---

## 8. Results Table Template

### Table 1: Primary Metrics at Recommended Threshold (θ = 0.50)

| Metric | Value | 95% CI |
|--------|-------|--------|
| FAR | x.xxx% | [x.xxx%, x.xxx%] |
| FRR | x.xxx% | [x.xxx%, x.xxx%] |
| Accuracy | x.xxx% | [x.xxx%, x.xxx%] |
| Precision | x.xxx | [x.xxx, x.xxx] |
| Recall | x.xxx | [x.xxx, x.xxx] |
| F1 Score | x.xxx | [x.xxx, x.xxx] |
| EER | x.xxx% | — |
| AUC | x.xxx | [x.xxx, x.xxx] |

### Table 2: Threshold Sweep

| θ | FAR | FRR | Accuracy | F1 |
|---|-----|-----|----------|-----|
| 0.30 | | | | |
| 0.35 | | | | |
| 0.40 | | | | |
| 0.45 | | | | |
| 0.50 | | | | |
| 0.55 | | | | |
| 0.60 | | | | |

### Table 3: Latency Statistics

| Metric | Enrollment (ms) | Verification (ms) |
|--------|----------------|-------------------|
| Mean | | |
| Median | | |
| P95 | | |
| P99 | | |
| Min | | |
| Max | | |

### Table 4: Score Distributions

| Category | Mean | Std | Min | Max | N |
|----------|------|-----|-----|-----|---|
| Genuine | | | | | |
| Impostor | | | | | |

---

## 9. Publication Checklist

### 9.1 Required Figures

- [ ] **Figure 1:** ROC curve with AUC annotation
- [ ] **Figure 2:** DET curve with EER marked
- [ ] **Figure 3:** Genuine vs Impostor score distribution histogram (overlapping)
- [ ] **Figure 4:** Threshold sweep (FAR and FRR vs threshold, with EER intersection)
- [ ] **Figure 5 (optional):** Latency distribution box plot

### 9.2 Required Tables

- [ ] **Table 1:** System architecture summary (models, dimensions, framework)
- [ ] **Table 2:** Dataset summary (subjects, images, pairs, demographics)
- [ ] **Table 3:** Primary metrics with confidence intervals
- [ ] **Table 4:** Threshold sweep results
- [ ] **Table 5:** Comparison with related work (if available)

### 9.3 Required Methodology Description

The paper should include:

1. **System description:** "We use RetinaFace for face detection and ArcFace (ResNet-50 backbone, w600k_r50 weights) for extracting 512-dimensional face embeddings. Matching is performed using cosine similarity with a configurable threshold."

2. **Evaluation protocol:** "We collected face images from N subjects under controlled conditions following [protocol]. Each subject provided one enrollment image and K probe images with variations in angle, lighting, and expression. We generated G genuine pairs and I impostor pairs, resulting in T total verification trials."

3. **Metrics:** "We report False Accept Rate (FAR), False Reject Rate (FRR), Equal Error Rate (EER), and Area Under the ROC Curve (AUC). Confidence intervals are computed using the Wilson score interval at 95% confidence."

4. **Threshold selection:** "The operating threshold was selected on a development set (60% of subjects) by minimizing the absolute difference between FAR and FRR, then offset by +0.05 to favor security. Final metrics are reported on the held-out evaluation set (40% of subjects)."

---

## 10. EER Computation Fix (Required Before Running)

The current `evaluate.py` has a **broken EER function** (see Section 1.3, Bug #1). Before running any evaluation, the `find_eer` method must be replaced with:

```python
def find_eer(self) -> tuple[float, float]:
    """Find the Equal Error Rate (where FAR ≈ FRR)."""
    best_threshold = 0.0
    min_diff = float('inf')

    for threshold in np.arange(0.0, 1.01, 0.001):
        metrics = self.compute_metrics(threshold)
        diff = abs(metrics["far"] - metrics["frr"])
        if diff < min_diff:
            min_diff = diff
            best_threshold = threshold

    final_metrics = self.compute_metrics(best_threshold)
    eer = (final_metrics["far"] + final_metrics["frr"]) / 2
    return best_threshold, eer
```

**This fix is OUT OF SCOPE for this audit** (the task says "Do not modify implementation"), but it MUST be addressed before running the evaluation.

---

## 11. Recommended Minimum Dataset for Student Paper

### Bachelor's Thesis

```
Minimum:  50 subjects, 6 images each → 250 genuine + 1,225 impostor = 1,475 trials
Target:   80 subjects, 8 images each → 560 genuine + 3,160 impostor = 3,720 trials
```

### Master's Thesis

```
Minimum: 100 subjects, 10 images each → 900 genuine + 4,950 impostor = 5,850 trials
Target:  150 subjects, 10 images each → 1,350 genuine + 11,175 impostor = 12,525 trials
```

### Publication (Conference/Journal)

```
Minimum: 200 subjects, 10 images each → 1,800 genuine + 19,900 impostor = 21,700 trials
Plus:    Comparison with 1–2 public datasets (LFW, CALFW, CPLFW)
```

**LFW (Labeled Faces in the Wild)** is the most commonly cited benchmark. If the paper includes LFW results, the paper's own dataset size requirement is relaxed somewhat.

---

## 12. Quick Reference — Running the Evaluation

```bash
# 1. Fix the EER bug in evaluate.py first (see Section 10)

# 2. Prepare dataset following DATASET_COLLECTION_GUIDE.md
#    Directory: evaluation_data/subjects/S001/enroll.jpg, probe_01.jpg, ...

# 3. Run evaluation
cd face-ai
venv/bin/python evaluation/evaluate.py \
    --data-dir ../evaluation_data \
    --threshold 0.50

# 4. Expected output:
#   - FAR, FRR, Accuracy, Precision, Recall, F1
#   - EER and optimal threshold
#   - Threshold sweep table
#   - Latency statistics
#   - Score distributions
```

---

*This evaluation plan is designed for a student research paper on face recognition for university parking access control. It follows ISO/IEC 19795-1 biometric evaluation methodology where applicable.*