import React from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: 'blue' | 'emerald' | 'cyan' | 'purple';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    icon: 'from-city-blue-500 to-city-blue-600',
    border: 'border-blue-100 hover:border-blue-200',
  },
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    icon: 'from-city-emerald-500 to-city-emerald-600',
    border: 'border-emerald-100 hover:border-emerald-200',
  },
  cyan: {
    bg: 'bg-cyan-50 hover:bg-cyan-100',
    icon: 'from-city-cyan-500 to-city-cyan-600',
    border: 'border-cyan-100 hover:border-cyan-200',
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100',
    icon: 'from-purple-500 to-purple-600',
    border: 'border-purple-100 hover:border-purple-200',
  },
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon, onClick, color = 'blue' }) => {
  const colors = colorMap[color];

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 text-left transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 cursor-pointer`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors.icon} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </button>
  );
};

export default QuickActionCard;