import unittest

import numpy as np

from app.quality.face_validator import get_landmarks_5pt, validate_landmarks_visible


class _InsightFaceResult:
    def __init__(self):
        # InsightFace FaceAnalysis uses kps for five-point landmarks.
        self.kps = np.array([
            [20.0, 20.0], [80.0, 20.0], [50.0, 50.0],
            [30.0, 80.0], [70.0, 80.0],
        ])
        self.landmark = None


class FaceValidatorTest(unittest.TestCase):
    def test_reads_insightface_kps_when_legacy_landmark_is_absent(self):
        face = _InsightFaceResult()

        self.assertIs(get_landmarks_5pt(face), face.kps)
        self.assertEqual((True, "ok"), validate_landmarks_visible(face, 100, 100))


if __name__ == "__main__":
    unittest.main()
