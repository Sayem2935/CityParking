"""
InsightFace Environment Verification Script
============================================
Tests that InsightFace (RetinaFace + ArcFace) loads correctly.
Run with: face-ai/venv/bin/python face-ai/test_model.py
"""

import sys
import os
import time
import platform


def test_imports():
    """Step 1: Verify all required packages import correctly."""
    print("=" * 60)
    print("STEP 1: Testing Package Imports")
    print("=" * 60)
    
    results = {}
    
    # insightface
    try:
        import insightface
        results["insightface"] = {"status": "OK", "version": insightface.__version__}
        print(f"  ✅ insightface         v{insightface.__version__}")
    except ImportError as e:
        results["insightface"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ insightface         FAILED: {e}")

    # onnxruntime
    try:
        import onnxruntime as ort
        results["onnxruntime"] = {"status": "OK", "version": ort.__version__}
        print(f"  ✅ onnxruntime         v{ort.__version__}")
    except ImportError as e:
        results["onnxruntime"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ onnxruntime         FAILED: {e}")

    # opencv-python
    try:
        import cv2
        results["opencv-python"] = {"status": "OK", "version": cv2.__version__}
        print(f"  ✅ opencv-python       v{cv2.__version__}")
    except ImportError as e:
        results["opencv-python"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ opencv-python       FAILED: {e}")

    # fastapi
    try:
        import fastapi
        results["fastapi"] = {"status": "OK", "version": fastapi.__version__}
        print(f"  ✅ fastapi             v{fastapi.__version__}")
    except ImportError as e:
        results["fastapi"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ fastapi             FAILED: {e}")

    # uvicorn
    try:
        import uvicorn
        results["uvicorn"] = {"status": "OK", "version": uvicorn.__version__}
        print(f"  ✅ uvicorn             v{uvicorn.__version__}")
    except ImportError as e:
        results["uvicorn"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ uvicorn             FAILED: {e}")

    # pillow
    try:
        from PIL import Image
        import PIL
        results["pillow"] = {"status": "OK", "version": PIL.__version__}
        print(f"  ✅ pillow              v{PIL.__version__}")
    except ImportError as e:
        results["pillow"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ pillow              FAILED: {e}")

    # numpy
    try:
        import numpy as np
        results["numpy"] = {"status": "OK", "version": np.__version__}
        print(f"  ✅ numpy               v{np.__version__}")
    except ImportError as e:
        results["numpy"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ numpy               FAILED: {e}")

    # onnx
    try:
        import onnx
        results["onnx"] = {"status": "OK", "version": onnx.__version__}
        print(f"  ✅ onnx                v{onnx.__version__}")
    except ImportError as e:
        results["onnx"] = {"status": "FAIL", "error": str(e)}
        print(f"  ❌ onnx                FAILED: {e}")

    all_ok = all(r["status"] == "OK" for r in results.values())
    print(f"\n  Import Summary: {'ALL PASSED ✅' if all_ok else 'SOME FAILED ❌'}")
    return results, all_ok


def test_arcface_model():
    """Step 2: Load ArcFace model via InsightFace FaceAnalysis."""
    print("\n" + "=" * 60)
    print("STEP 2: Testing ArcFace Model Loading")
    print("=" * 60)

    try:
        from insightface.app import FaceAnalysis
        import insightface

        # Determine model directory
        home_dir = os.path.expanduser("~")
        model_dir = os.path.join(home_dir, ".insightface", "models")
        os.makedirs(model_dir, exist_ok=True)
        print(f"  📁 Model directory: {model_dir}")

        print("  ⏳ Initializing FaceAnalysis with 'buffalo_l' (includes ArcFace)...")
        start = time.time()

        # Try buffalo_l first (includes ArcFace-R50 with 512-d embeddings)
        try:
            app = FaceAnalysis(
                name="buffalo_l",
                root=model_dir,
                providers=["CPUExecutionProvider"],
            )
            app.prepare(ctx_id=-1, det_size=(640, 640))
            elapsed = time.time() - start
            print(f"  ✅ ArcFace (buffalo_l) loaded in {elapsed:.2f}s")
            print(f"  📐 Detection size: 640x640")
            return True, model_dir, "buffalo_l"
        except Exception as e:
            print(f"  ⚠️  buffalo_l failed: {e}")
            print("  ⏳ Trying 'buffalo_s' as fallback...")
            start = time.time()
            app = FaceAnalysis(
                name="buffalo_s",
                root=model_dir,
                providers=["CPUExecutionProvider"],
            )
            app.prepare(ctx_id=-1, det_size=(640, 640))
            elapsed = time.time() - start
            print(f"  ✅ ArcFace (buffalo_s) loaded in {elapsed:.2f}s")
            return True, model_dir, "buffalo_s"

    except Exception as e:
        print(f"  ❌ ArcFace model loading FAILED: {e}")
        return False, None, None


def test_retinaface_detection(model_dir, model_pack):
    """Step 3: Test RetinaFace face detection on a synthetic image."""
    print("\n" + "=" * 60)
    print("STEP 3: Testing RetinaFace Face Detection")
    print("=" * 60)

    try:
        import numpy as np
        import cv2
        from insightface.app import FaceAnalysis

        print("  ⏳ Initializing FaceAnalysis for detection test...")
        app = FaceAnalysis(
            name=model_pack,
            root=model_dir,
            providers=["CPUExecutionProvider"],
        )
        app.prepare(ctx_id=-1, det_size=(640, 640))

        # Create a synthetic test image (blank image with noise - no face expected)
        print("  ⏳ Running RetinaFace detection on synthetic image...")
        test_img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        faces = app.get(test_img)
        print(f"  ✅ RetinaFace detection completed (found {len(faces)} faces in noise image)")

        # Test with a real image-like pattern
        test_img2 = np.ones((480, 640, 3), dtype=np.uint8) * 128
        faces2 = app.get(test_img2)
        print(f"  ✅ RetinaFace detection on uniform image: {len(faces2)} faces")

        print("  ✅ RetinaFace model is operational")
        return True

    except Exception as e:
        print(f"  ❌ RetinaFace detection FAILED: {e}")
        return False


def check_model_files(model_dir):
    """Step 4: Check downloaded model files and their sizes."""
    print("\n" + "=" * 60)
    print("STEP 4: Model File Inventory")
    print("=" * 60)

    model_files = []
    total_size = 0

    if not os.path.exists(model_dir):
        print(f"  ⚠️  Model directory not found: {model_dir}")
        return model_files, total_size

    for root, dirs, files in os.walk(model_dir):
        for fname in files:
            fpath = os.path.join(root, fname)
            size_bytes = os.path.getsize(fpath)
            size_mb = size_bytes / (1024 * 1024)
            rel_path = os.path.relpath(fpath, model_dir)
            model_files.append({"path": rel_path, "size_mb": round(size_mb, 2)})
            total_size += size_bytes
            print(f"  📄 {rel_path:50s} {size_mb:8.2f} MB")

    total_mb = total_size / (1024 * 1024)
    print(f"\n  📊 Total models: {len(model_files)} files, {total_mb:.2f} MB")
    return model_files, total_mb


def print_environment_info():
    """Print environment information."""
    print("\n" + "=" * 60)
    print("ENVIRONMENT INFORMATION")
    print("=" * 60)
    print(f"  Python Version:  {sys.version}")
    print(f"  Python Path:     {sys.executable}")
    print(f"  Platform:        {platform.platform()}")
    print(f"  Machine:         {platform.machine()}")
    print(f"  Processor:       {platform.processor()}")


def main():
    """Run all verification tests."""
    print("\n🔬 CityParking Face AI - Environment Verification")
    print("=" * 60)

    print_environment_info()

    # Test 1: Imports
    import_results, imports_ok = test_imports()
    if not imports_ok:
        print("\n❌ CRITICAL: Package imports failed. Install missing packages.")
        sys.exit(1)

    # Test 2: ArcFace model loading
    arcface_ok, model_dir, model_pack = test_arcface_model()
    if not arcface_ok:
        print("\n❌ CRITICAL: ArcFace model failed to load.")
        sys.exit(1)

    # Test 3: RetinaFace detection
    retinaface_ok = test_retinaface_detection(model_dir, model_pack)

    # Test 4: Model file inventory
    model_files, total_size_mb = check_model_files(model_dir)

    # Final Summary
    print("\n" + "=" * 60)
    print("FINAL VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"  Package Imports:   {'✅ PASS' if imports_ok else '❌ FAIL'}")
    print(f"  ArcFace Model:     {'✅ PASS' if arcface_ok else '❌ FAIL'}")
    print(f"  RetinaFace Model:  {'✅ PASS' if retinaface_ok else '❌ FAIL'}")
    print(f"  Model Pack:        {model_pack if model_pack else 'N/A'}")
    print(f"  Model Directory:   {model_dir if model_dir else 'N/A'}")
    print(f"  Model Files:       {len(model_files)}")
    print(f"  Total Model Size:  {total_size_mb:.2f} MB")
    print(f"  CPU Provider:      CPUExecutionProvider")

    if imports_ok and arcface_ok and retinaface_ok:
        print("\n✅ ALL TESTS PASSED - Environment is READY for Face AI development!")
    else:
        print("\n⚠️  SOME TESTS FAILED - Review issues above before proceeding.")

    print("=" * 60)
    return 0 if (imports_ok and arcface_ok and retinaface_ok) else 1


if __name__ == "__main__":
    sys.exit(main())