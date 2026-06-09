import React from 'react';

interface StatusCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  subtitle?: string;
}

const statusColors = {
  success: 'from-emerald-500 to-emerald-600',
  warning: 'from-amber-500 to-amber-600',
  danger: 'from-red-500 to-red-600',
  info: 'from-sky-500 to-sky-600',
  neutral: 'from-gray-500 to-gray-600',
};

const StatusCard: React.FC<StatusCardProps> = ({ label, value, icon, status = 'neutral', subtitle }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${statusColors[status]} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${statusColors[status]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
};

export default StatusCard;