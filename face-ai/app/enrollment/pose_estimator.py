"""
CityParking Face AI — Enrollment: Pose Estimator
==================================================
Re-exports head pose estimation from the face_validator module
for convenient access from the enrollment package.
"""

from app.quality.face_validator import estimate_head_pose, validate_head_pose

__all__ = ["estimate_head_pose", "validate_head_pose"]
