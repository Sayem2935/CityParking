import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'skeleton';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', variant = 'spinner', text }) => {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        {text && <p className="text-sm text-zinc-500">{text}</p>}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-zinc-700 rounded-lg w-3/4" />
        <div className="h-4 bg-zinc-700 rounded-lg w-1/2" />
        <div className="h-4 bg-zinc-700 rounded-lg w-5/6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-2 border-white/10`} />
        <div className={`absolute inset-0 ${sizes[size]} rounded-full border-2 border-transparent border-t-blue-500 animate-spin`} />
      </div>
      {text && <p className="text-sm text-zinc-500 font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;