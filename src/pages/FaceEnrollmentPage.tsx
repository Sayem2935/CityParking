import React from "react";
import GuidedEnrollment from "@/components/enrollment/GuidedEnrollment";

const FaceEnrollmentPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* Header */}
      <div className="bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
              <span className="text-xl">📸</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">
                Face Enrollment
              </h1>
              <p className="text-xs text-zinc-400">
                Create a robust biometric profile for secure parking access
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          
          {/* Enrollment Component */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 pointer-events-none" />
            <GuidedEnrollment />
          </div>

          {/* Sidebar / Information Panel */}
          <div className="space-y-6">
            
            {/* Why Multi-Pose? */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-indigo-400">
                <span className="h-5 w-5 rounded bg-indigo-500/20 flex items-center justify-center text-xs">✨</span>
                Why a Guided Session?
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                Instead of a single photo, we capture your face from multiple angles and expressions. This creates a highly accurate, 3D-aware profile that works reliably across different lighting conditions and angles at the parking gate.
              </p>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">✓</span>
                  Faster recognition at the gate
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">✓</span>
                  Works with sunglasses & hats
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">✓</span>
                  Built-in anti-spoofing security
                </li>
              </ul>
            </div>

            {/* Preparation Tips */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-amber-400">
                <span className="h-5 w-5 rounded bg-amber-500/20 flex items-center justify-center text-xs">💡</span>
                Preparation Tips
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="text-lg">☀️</div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Good Lighting</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Ensure your face is evenly lit without harsh shadows.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="text-lg">🎯</div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Stay Centered</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Keep your head inside the frame during the process.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="text-lg">🕶️</div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Clear View</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Remove heavy glasses or face coverings before starting.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Promise */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
                🔒
              </div>
              <h4 className="text-xs font-semibold text-zinc-300 mb-1">Privacy First</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Photos are only used to generate mathematical embeddings and are immediately deleted. Your data never leaves our secure campus servers.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default FaceEnrollmentPage;