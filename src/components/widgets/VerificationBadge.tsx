import React from 'react';

interface VerificationBadgeProps {
  label: string;
  status: 'verified' | 'pending' | 'not_started';
  icon?: React.ReactNode;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ label, status, icon }) => {
  const statusConfig = {
    verified: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Verified',
    },
    pending: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Pending',
    },
    not_started: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      label: 'Not Started',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-3 rounded-xl ${config.bg} border ${config.border} px-4 py-3 transition-all duration-200`}>
      {icon && <span className={`${config.text}`}>{icon}</span>}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    </div>
  );
};

export default VerificationBadge;