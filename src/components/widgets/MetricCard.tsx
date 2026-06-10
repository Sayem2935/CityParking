import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'emerald' | 'cyan' | 'purple' | 'amber';
}

const colorMap = {
  blue: {
    gradient: 'from-city-blue-500 to-city-blue-600',
    bg: 'bg-blue-900/30',
    text: 'text-city-blue-500',
  },
  emerald: {
    gradient: 'from-city-emerald-500 to-city-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-city-emerald-500',
  },
  cyan: {
    gradient: 'from-city-cyan-500 to-city-cyan-600',
    bg: 'bg-cyan-50',
    text: 'text-city-cyan-500',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-900/30',
    text: 'text-purple-500',
  },
  amber: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-900/30',
    text: 'text-amber-500',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, color = 'blue' }) => {
  const colors = colorMap[color];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.direction === 'up' ? 'bg-emerald-50 text-emerald-600' :
            trend.direction === 'down' ? 'bg-red-900/30 text-red-400' :
            'bg-zinc-800/50 text-zinc-400'
          }`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-zinc-500 mb-1 tracking-wider uppercase">{title}</p>
      <p className="text-4xl font-mono font-bold text-zinc-100 tracking-tight">{value}</p>
      <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full ${colors.bg} opacity-20 group-hover:opacity-40 transition-opacity duration-300`} />
    </div>
  );
};

export default MetricCard;