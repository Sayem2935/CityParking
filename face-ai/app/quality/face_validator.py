"""
CityParking Face AI — Quality Pipeline: Face Validator
========================================================
Validates detected faces meet enrollment quality requirements:
  - Single face present
  - Detection confidence above threshold
  - Face size sufficient relative to image
  - All 5 landmarks visible within frame
  - Head pose within acceptable range
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

# Thresholds
MIN_FACE_SCORE = 0.50
MIN_FACE_AREA_RATIO = 0.02  # Face bbox must be ≥ 2% of image area
MAX_YAW = 85.0              # degrees — relaxed for "turn left/right" poses
MAX_PITCH = 60.0            # degrees — relaxed for "look up/down" poses


def validate_face_count(faces: list, expected: int = 1) -> tuple[bool, str]:
    """
    Validate that at least one face is detected.
    (If multiple faces, we will later pick the largest one)
    """
    count = len(faces)
    if count == 0:
        return False, "no_face_detected"
    # We no longer reject multiple faces here, we will just warn and pick the largest later
    return True, f"multiple_faces_detected_{count}" if count > 1 else "ok"


def validate_face_score(face, min_score: float = MIN_FACE_SCORE) -> tuple[bool, str, float]:
    """
    Validate face detection confidence.

    Args:
        face: InsightFace Face object
        min_score: Minimum detection confidence

    Returns:
        (passed, reason, score)
    """
    score = float(face.det_score)
    if score < min_score:
        return False, f"low_face_score_{score:.2f}", score
    return True, "ok", score


def validate_face_size(
    face, image_height: int, image_width: int,
    min_ratio: float = MIN_FACE_AREA_RATIO
) -> tuple[bool, str, float]:
    """
    Validate face is large enough relative to image dimensions.

    Args:
        face: InsightFace Face object
        image_height: Image height in pixels
        image_width: Image width in pixels
        min_ratio: Minimum face area / image area ratio

    Returns:
        (passed, reason, area_ratio)
    """
    bbox = face.bbox.astype(int)
    face_w = bbox[2] - bbox[0]
    face_h = bbox[3] - bbox[1]
    face_area = face_w * face_h
    image_area = image_height * image_width

    if image_area == 0:
        return False, "invalid_image_dimensions", 0.0

    ratio = face_area / image_area
    if ratio < min_ratio:
        return False, f"face_too_small_{ratio:.3f}", ratio
    return True, "ok", ratio


def validate_landmarks_visible(
    face, image_height: int, image_width: int
) -> tuple[bool, str]:
    """
    Validate all 5 facial landmarks are within frame boundaries.

    Args:
        face: InsightFace Face object with landmark attribute
        image_height: Image height in pixels
        image_width: Image width in pixels

    Returns:
        (passed, reason)
    """
    if face.landmark is None:
        return False, "no_landmarks"

    landmarks = face.landmark  # shape: (5, 2)
    for i, (x, y) in enumerate(landmarks):
        if x < 0 or x >= image_width or y < 0 or y >= image_height:
            return False, f"landmark_{i}_out_of_frame"
    return True, "ok"


def estimate_head_pose(landmarks_5pt: np.ndarray) -> dict:
    """
    Estimate head pose (yaw, pitch, roll) from 5-point facial landmarks.

    Landmark order (InsightFace convention):
        0: left eye center
        1: right eye center
        2: nose tip
        3: left mouth corner
        4: right mouth corner

    Uses geometric heuristics based on landmark positions.
    Not as accurate as a dedicated head pose model, but sufficient
    for filtering extreme angles.

    Args:
        landmarks_5pt: numpy array of shape (5, 2)

    Returns:
        {"yaw": float, "pitch": float, "roll": float} in degrees
    """
    left_eye = landmarks_5pt[0]
    right_eye = landmarks_5pt[1]
    nose = landmarks_5pt[2]
    left_mouth = landmarks_5pt[3]
    right_mouth = landmarks_5pt[4]

    # Eye center
    eye_center = (left_eye + right_eye) / 2.0
    eye_width = np.linalg.norm(right_eye - left_eye)

    if eye_width < 1e-6:
        return {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}

    # Yaw estimation: nose horizontal offset from eye center, normalized by eye width
    # Positive yaw = looking right, negative = looking left
    nose_offset_x = nose[0] - eye_center[0]
    yaw = float(np.arctan2(nose_offset_x, eye_width) * 180.0 / np.pi) * 2.0

    # Pitch estimation: nose vertical offset from expected position
    # Expected nose Y is between eyes and mouth
    mouth_center = (left_mouth + right_mouth) / 2.0
    face_height = mouth_center[1] - eye_center[1]
    if face_height > 1e-6:
        expected_nose_y = eye_center[1] + face_height * 0.45
        nose_offset_y = nose[1] - expected_nose_y
        pitch = float(np.arctan2(nose_offset_y, face_height) * 180.0 / np.pi) * 2.0
    else:
        pitch = 0.0

    # Roll estimation: angle of eye line
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    roll = float(np.arctan2(dy, dx) * 180.0 / np.pi)

    return {
        "yaw": round(yaw, 2),
        "pitch": round(pitch, 2),
        "roll": round(roll, 2),
    }


def validate_head_pose(
    landmarks_5pt: np.ndarray,
    max_yaw: float = MAX_YAW,
    max_pitch: float = MAX_PITCH,
) -> tuple[bool, str, dict]:
    """
    Validate head pose is within acceptable range.

    Args:
        landmarks_5pt: 5-point landmarks array
        max_yaw: Maximum absolute yaw angle (degrees)
        max_pitch: Maximum absolute pitch angle (degrees)

    Returns:
        (passed, reason, pose_dict)
    """
    pose = estimate_head_pose(landmarks_5pt)

    if abs(pose["yaw"]) > max_yaw:
        return False, f"extreme_yaw_{pose['yaw']:.1f}", pose
    if abs(pose["pitch"]) > max_pitch:
        return False, f"extreme_pitch_{pose['pitch']:.1f}", pose

    return True, "ok", pose
