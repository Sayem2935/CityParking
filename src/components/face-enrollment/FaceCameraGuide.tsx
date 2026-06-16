import { useEffect, useState } from "react";

interface FaceCameraGuideProps {
  showTips?: boolean;
  tipText?: string;
  isCapturing?: boolean;
}

const defaultTips = [
  "Position your face inside the circle",
  "Keep a neutral expression",
  "Ensure good lighting on your face",
];

export default function FaceCameraGuide({
  showTips = true,
  tipText,
  isCapturing = false,
}: FaceCameraGuideProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (!showTips || tipText) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % defaultTips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [showTips, tipText]);

  const activeTip = tipText || defaultTips[currentTipIndex];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Circular face guide */}
      <div className="relative flex flex-col items-center">
        <div
          className={`
            w-56 h-56 md:w-64 md:h-64 rounded-full border-[3px] border-dashed
            transition-all duration-500
            ${isCapturing ? "border-green-400 scale-95 animate-pulse" : "border-white/70"}
          `}
        >
          {/* Inner subtle ring */}
          <div
            className={`
              absolute inset-3 rounded-full border-2
              transition-colors duration-300
              ${isCapturing ? "border-green-400/50" : "border-white/30"}
            `}
          />
          {/* Corner markers */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-8 h-1 bg-white/80 rounded-full" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-8 h-1 bg-white/80 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-8 bg-white/80 rounded-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-1 h-8 bg-white/80 rounded-full" />
        </div>

        {/* Tip text */}
        {showTips && (
          <div className="mt-6 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
            <p className="text-white text-sm text-center font-medium animate-fade-in">
              {activeTip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}