#!/usr/bin/env python3
"""
CityParking Face Recognition — Evaluation Script
==================================================
Evaluates the face recognition system's performance metrics:

  - FAR  (False Accept Rate)
  - FRR  (False Reject Rate)
  - Accuracy
  - Precision / Recall / F1
  - EER  (Equal Error Rate)
  - Latency statistics

Usage:
    cd face-ai
    venv/bin/python evaluation/evaluate.py --data-dir /path/to/test/images

Test data structure:
    test_data/
    ├── enrolled/
    │   ├── user_001/
    │   │   ├── enroll.jpg      # Image used for enrollment
    │   │   ├── probe_1.jpg     # Genuine probe image
    │   │   ├── probe_2.jpg     # Genuine probe image
    │   │   └── ...
    │   ├── user_002/
    │   │   └── ...
    │   └── ...
    └── impostors/              # Optional impostor images
        ├── impostor_01.jpg
        └── ...
"""

import os
import sys
import time
import argparse
import logging
from pathlib import Path
from itertools import combinations

import numpy as np

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.face_service import FaceService
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class FaceRecognitionEvaluator:
    """
    Evaluation pipeline for the face recognition system.

    Steps:
    1. Load face service (InsightFace models)
    2. Enroll test users (extract embeddings from enrollment images)
    3. Run genuine verification attempts (probe images of same user)
    4. Run impostor verification attempts (probe images of different users)
    5. Compute metrics across a threshold sweep
    6. Find EER
    7. Print report
    """

    def __init__(self, face_service: FaceService):
        self.face_service = face_service
        self.enrolled: dict[str, np.ndarray] = {}  # user_id -> embedding
        self.genuine_scores: list[float] = []
        self.impostor_scores: list[float] = []
        self.latencies: list[float] = []

    def load_image(self, image_path: str) -> bytes:
        """Load an image file as bytes."""
        with open(image_path, "rb") as f:
            return f.read()

    def extract_embedding(self, image_path: str) -> np.ndarray | None:
        """Extract embedding from an image, returning None on failure."""
        start = time.time()
        image_bytes = self.load_image(image_path)
        result = self.face_service.extract_embedding(image_bytes)
        elapsed_ms = (time.time() - start) * 1000
        self.latencies.append(elapsed_ms)

        if not result["success"]:
            logger.warning("Failed to extract embedding from %s: %s", image_path, result.get("error"))
            return None

        return np.array(result["embedding"], dtype=np.float32)

    def enroll_users(self, data_dir: str) -> None:
        """Enroll all users from the test data directory."""
        enrolled_dir = os.path.join(data_dir, "enrolled")
        if not os.path.exists(enrolled_dir):
            logger.error("Enrolled directory not found: %s", enrolled_dir)
            return

        for user_dir in sorted(Path(enrolled_dir).iterdir()):
            if not user_dir.is_dir():
                continue

            user_id = user_dir.name
            enroll_image = user_dir / "enroll.jpg"

            if not enroll_image.exists():
                # Use the first image in the directory
                images = sorted(user_dir.glob("*.jpg")) + sorted(user_dir.glob("*.png"))
                if not images:
                    logger.warning("No images found for user %s", user_id)
                    continue
                enroll_image = images[0]

            embedding = self.extract_embedding(str(enroll_image))
            if embedding is not None:
                self.enrolled[user_id] = embedding
                logger.info("Enrolled user: %s (from %s)", user_id, enroll_image.name)

        logger.info("Total enrolled users: %d", len(self.enrolled))

    def run_genuine_trials(self, data_dir: str) -> None:
        """Run genuine (same-user) verification trials."""
        enrolled_dir = os.path.join(data_dir, "enrolled")

        for user_id, enrolled_embedding in self.enrolled.items():
            user_dir = Path(enrolled_dir) / user_id

            # Find probe images (all images except the enrollment image)
            all_images = sorted(user_dir.glob("*.jpg")) + sorted(user_dir.glob("*.png"))
            probe_images = [img for img in all_images if img.name != "enroll.jpg"]

            if not probe_images:
                # If no separate probes, skip (we already used the only image for enrollment)
                continue

            for probe_path in probe_images:
                probe_embedding = self.extract_embedding(str(probe_path))
                if probe_embedding is None:
                    continue

                similarity = float(np.dot(enrolled_embedding, probe_embedding))
                self.genuine_scores.append(similarity)

        logger.info("Genuine trials: %d", len(self.genuine_scores))

    def run_impostor_trials(self, data_dir: str) -> None:
        """Run impostor (different-user) verification trials."""
        # Cross-user comparisons using enrolled embeddings
        user_ids = list(self.enrolled.keys())

        for user_a, user_b in combinations(user_ids, 2):
            similarity = float(np.dot(self.enrolled[user_a], self.enrolled[user_b]))
            self.impostor_scores.append(similarity)

        # Also use explicit impostor images if available
        impostor_dir = os.path.join(data_dir, "impostors")
        if os.path.exists(impostor_dir):
            impostor_images = sorted(Path(impostor_dir).glob("*.jpg")) + sorted(
                Path(impostor_dir).glob("*.png")
            )
            for img_path in impostor_images:
                probe_embedding = self.extract_embedding(str(img_path))
                if probe_embedding is None:
                    continue

                for user_id, enrolled_embedding in self.enrolled.items():
                    similarity = float(np.dot(enrolled_embedding, probe_embedding))
                    self.impostor_scores.append(similarity)

        logger.info("Impostor trials: %d", len(self.impostor_scores))

    def compute_metrics(self, threshold: float) -> dict:
        """Compute FAR, FRR, Accuracy, Precision, Recall, F1 at a given threshold."""
        tp = sum(1 for s in self.genuine_scores if s >= threshold)
        fn = sum(1 for s in self.genuine_scores if s < threshold)
        fp = sum(1 for s in self.impostor_scores if s >= threshold)
        tn = sum(1 for s in self.impostor_scores if s < threshold)

        total = tp + tn + fp + fn
        accuracy = (tp + tn) / total if total > 0 else 0
        far = fp / (fp + tn) if (fp + tn) > 0 else 0
        frr = fn / (fn + tp) if (fn + tp) > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return {
            "threshold": threshold,
            "tp": tp, "tn": tn, "fp": fp, "fn": fn,
            "accuracy": accuracy,
            "far": far,
            "frr": frr,
            "precision": precision,
            "recall": recall,
            "f1": f1,
        }

    def find_eer(self) -> tuple[float, float]:
        """Find the Equal Error Rate (where FAR ≈ FRR)."""
        best_eer = 1.0
        best_threshold = 0.0

        for threshold in np.arange(0.0, 1.01, 0.01):
            metrics = self.compute_metrics(threshold)
            diff = abs(metrics["far"] - metrics["frr"])
            eer_approx = (metrics["far"] + metrics["frr"]) / 2

            if diff < abs(best_eer - (best_eer)):
                if eer_approx < best_eer or diff < 0.02:
                    best_eer = eer_approx
                    best_threshold = threshold

        return best_threshold, best_eer

    def print_report(self, default_threshold: float = 0.45) -> None:
        """Print the complete evaluation report."""
        print("\n" + "=" * 70)
        print("  FACE RECOGNITION EVALUATION REPORT")
        print("=" * 70)
        print(f"  Model       : ArcFace w600k_r50 (ResNet-50, 512-d)")
        print(f"  Detection   : RetinaFace det_10g")
        print(f"  Enrolled    : {len(self.enrolled)} users")
        print(f"  Genuine     : {len(self.genuine_scores)} trials")
        print(f"  Impostor    : {len(self.impostor_scores)} trials")
        print(f"  Threshold   : {default_threshold}")
        print("=" * 70)

        # Metrics at default threshold
        metrics = self.compute_metrics(default_threshold)
        print(f"\n  Results at threshold = {default_threshold}")
        print(f"  {'Metric':<15} {'Value':>10}")
        print(f"  {'-' * 25}")
        print(f"  {'FAR':<15} {metrics['far']:>9.4%}")
        print(f"  {'FRR':<15} {metrics['frr']:>9.4%}")
        print(f"  {'Accuracy':<15} {metrics['accuracy']:>9.4%}")
        print(f"  {'Precision':<15} {metrics['precision']:>9.4%}")
        print(f"  {'Recall':<15} {metrics['recall']:>9.4%}")
        print(f"  {'F1 Score':<15} {metrics['f1']:>9.4f}")

        # EER
        eer_threshold, eer_value = self.find_eer()
        print(f"\n  EER          : {eer_value:.4%} (at threshold {eer_threshold:.2f})")

        # Threshold sweep
        print(f"\n  Threshold Sweep")
        print(f"  {'Threshold':>10} {'FAR':>8} {'FRR':>8} {'Accuracy':>10} {'F1':>8}")
        print(f"  {'-' * 44}")
        for t in [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]:
            m = self.compute_metrics(t)
            print(f"  {t:>10.2f} {m['far']:>7.3%} {m['frr']:>7.3%} {m['accuracy']:>9.3%} {m['f1']:>7.4f}")

        # Latency statistics
        if self.latencies:
            latencies = np.array(self.latencies)
            print(f"\n  Latency Statistics (ms)")
            print(f"  {'Metric':<10} {'Value':>10}")
            print(f"  {'-' * 20}")
            print(f"  {'Mean':<10} {np.mean(latencies):>9.1f}")
            print(f"  {'Median':<10} {np.median(latencies):>9.1f}")
            print(f"  {'P95':<10} {np.percentile(latencies, 95):>9.1f}")
            print(f"  {'P99':<10} {np.percentile(latencies, 99):>9.1f}")
            print(f"  {'Min':<10} {np.min(latencies):>9.1f}")
            print(f"  {'Max':<10} {np.max(latencies):>9.1f}")

        # Score distributions
        if self.genuine_scores and self.impostor_scores:
            genuine = np.array(self.genuine_scores)
            impostor = np.array(self.impostor_scores)
            print(f"\n  Score Distributions")
            print(f"  {'':>15} {'Mean':>8} {'Std':>8} {'Min':>8} {'Max':>8}")
            print(f"  {'-' * 47}")
            print(f"  {'Genuine':<15} {np.mean(genuine):>7.4f} {np.std(genuine):>7.4f} {np.min(genuine):>7.4f} {np.max(genuine):>7.4f}")
            print(f"  {'Impostor':<15} {np.mean(impostor):>7.4f} {np.std(impostor):>7.4f} {np.min(impostor):>7.4f} {np.max(impostor):>7.4f}")

        print("\n" + "=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="CityParking Face Recognition Evaluation"
    )
    parser.add_argument(
        "--data-dir", required=True,
        help="Path to test data directory (see docstring for structure)"
    )
    parser.add_argument(
        "--threshold", type=float, default=0.45,
        help="Default similarity threshold (default: 0.45)"
    )
    args = parser.parse_args()

    # Load models
    logger.info("Loading InsightFace models...")
    service = FaceService()
    service.load_models()

    # Run evaluation
    evaluator = FaceRecognitionEvaluator(service)
    evaluator.enroll_users(args.data_dir)

    if len(evaluator.enrolled) < 2:
        logger.error("Need at least 2 enrolled users for evaluation")
        sys.exit(1)

    evaluator.run_genuine_trials(args.data_dir)
    evaluator.run_impostor_trials(args.data_dir)

    if not evaluator.genuine_scores and not evaluator.impostor_scores:
        logger.error("No trials completed. Check your test data.")
        sys.exit(1)

    evaluator.print_report(args.threshold)


if __name__ == "__main__":
    main()
