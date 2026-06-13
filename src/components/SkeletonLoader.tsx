import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'circle' | 'widget';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant = 'card', count = 1, className = '' }) => {
  const variants = {
    card: 'h-32 w-full rounded-2xl',
    text: 'h-4 w-3/4 rounded-lg',
    circle: 'h-12 w-12 rounded-full',
    widget: 'h-48 w-full rounded-2xl',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${variants[variant]} ${className}`}
        />
      ))}
    </>
  );
};

export default SkeletonLoader;