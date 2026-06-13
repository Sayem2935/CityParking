import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
}) => {
  const variants = {
    default: 'bg-zinc-900/80 backdrop-blur-md border border-zinc-800',
    glass: 'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-2xl shadow-card ${variants[variant]} ${paddings[padding]} ${
        hover ? 'hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;