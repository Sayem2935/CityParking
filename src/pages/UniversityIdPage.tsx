import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { documentService } from '../services/document.service';
import { DocumentExtractionResult } from '../types/document.types';
import { useProfile } from '../hooks/useProfile';
import { Upload, CheckCircle2, FileImage, X, ArrowRight } from 'lucide-react';

const UniversityIdPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useProfile();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selected: File) => {
    setFile(selected);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      handleFile(dropped);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image of your university ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await documentService.extractDocument(file);
      if (response.success && response.data) {
        setResult(response.data);
        if (response.data.success) {
          await fetchProfile();
        } else {
          setError(response.data.errorMessage || 'Extraction failed');
        }
      } else {
        setError(response.message || 'Document extraction failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Document extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-h1">University ID Verification</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload your university ID card to verify your student information.
        </p>
      </div>

      {/* Current Profile Info */}
      {profile?.studentName && (
        <div className="card p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-emerald-400">Verified Student Info</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Name', value: profile.studentName },
              { label: 'Student ID', value: profile.studentId },
              { label: 'University', value: profile.universityName },
              { label: 'Department', value: profile.department },
              { label: 'Session', value: profile.session },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-zinc-500 text-xs">{item.label}</span>
                <p className="font-medium text-zinc-200">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {/* Upload Area */}
      <div className="card p-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-500/5'
              : preview
              ? 'border-zinc-700 bg-zinc-800/30'
              : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          aria-label="Upload university ID image"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />
          {preview ? (
            <div className="relative inline-block">
              <img
                src={preview}
                alt="University ID Preview"
                className="max-h-56 mx-auto rounded-xl object-contain"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mx-auto">
                <Upload className="w-8 h-8 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">
                  {isDragging ? 'Drop your image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  PNG, JPG, JPEG up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload progress / actions */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            fullWidth
            size="lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Extracting Information...
              </span>
            ) : (
              <>
                <FileImage className="w-4 h-4" />
                Extract & Save
              </>
            )}
          </Button>
          {file && !loading && (
            <Button variant="outline" onClick={handleReset} size="lg">
              Reset
            </Button>
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">Processing your university ID...</p>
          </div>
        )}
      </div>

      {/* Extraction Result */}
      {result && result.success && (
        <div className="card p-5 border-emerald-500/20 bg-emerald-500/5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400">
              Information Extracted & Saved
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Name', value: result.studentName },
              { label: 'Student ID', value: result.studentId },
              { label: 'University', value: result.universityName },
              { label: 'Department', value: result.department },
              { label: 'Session', value: result.session },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-emerald-400/60 text-xs">{item.label}</span>
                <p className="font-medium text-emerald-200">{item.value}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/profile')}
          >
            View Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default UniversityIdPage;