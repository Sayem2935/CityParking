import React, { useRef, useEffect } from "react";
import { useFaceEnrollmentStore } from "@/store/faceEnrollmentStore";

const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    currentSession,
    uploadStatus,
    uploadProgress,
    uploadSession,
    retryUpload,
    resetSession,
    error,
    enrollmentRecord,
    retryCount,
  } = useFaceEnrollmentStore();

  useEffect(() => {
    if (videoRef.current && currentSession?.videoUrl) {
      videoRef.current.src = currentSession.videoUrl;
    }
  }, [currentSession?.videoUrl]);

  if (!currentSession?.videoUrl) return null;

  const isUploading = uploadStatus === "uploading";
  const isSuccess = uploadStatus === "success";
  const isFailed = uploadStatus === "failed";

  return (
    <div className="space-y-5">
      {/* Video playback */}
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          controls
          playsInline
          className="w-full h-auto"
          style={{ maxHeight: "400px" }}
        />
        {/* Duration badge */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-mono px-2.5 py-1 rounded-lg">
          {currentSession.duration}s
        </div>
      </div>

      {/* Success state */}
      {isSuccess && (
        <div className="rounded-xl bg-green-900/30 border border-green-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-800">Upload Successful!</h4>
              <p className="text-xs text-green-400">Your face enrollment video has been submitted for processing.</p>
              {enrollmentRecord && (
                <div className="mt-2 text-xs text-green-700 space-y-0.5">
                  <p>Enrollment ID: <span className="font-mono font-semibold">#{enrollmentRecord.id}</span></p>
                  <p>Status: <span className="font-semibold capitalize">{enrollmentRecord.status.toLowerCase()}</span></p>
                  <p>Video size: <span className="font-semibold">{(enrollmentRecord.videoSize / (1024 * 1024)).toFixed(2)} MB</span></p>
                  <p>Duration: <span className="font-semibold">{enrollmentRecord.durationSeconds}s</span></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {(isFailed || error) && (
        <div className="rounded-xl bg-red-900/30 border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800">Upload Failed</h4>
              <p className="text-xs text-red-400">{error || "Something went wrong. Please try again."}</p>
              {retryCount > 0 && (
                <p className="text-xs text-red-500 mt-1">Retry attempt {retryCount} of 3</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-300">Uploading video...</span>
            <span className="font-semibold text-blue-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isSuccess && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={resetSession}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/10 bg-zinc-900/80 backdrop-blur-md px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:bg-zinc-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Retake Video
          </button>

          {isFailed ? (
            <button
              onClick={retryUpload}
              disabled={isUploading || retryCount >= 3}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              {retryCount >= 3 ? "Max Retries Reached" : `Retry Upload (${3 - retryCount} left)`}
            </button>
          ) : (
            <button
              onClick={uploadSession}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            >
              {isUploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload Video
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* After success: new enrollment button */}
      {isSuccess && (
        <div className="flex justify-center">
          <button
            onClick={resetSession}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Record New Enrollment
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;