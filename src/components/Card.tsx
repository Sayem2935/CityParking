import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', padding = 'md', hover = false }) => {
  const variants = {
    default: 'bg-white border border-gray-100 shadow-card',
    glass: 'glass-card',
    gradient: 'gradient-city-light border border-white/50 shadow-card',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${hover ? 'hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;