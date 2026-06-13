import React from 'react';

interface PageSkeletonProps {
  variant?: 'dashboard' | 'cards' | 'form' | 'list';
}

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Welcome card skeleton */}
    <div className="skeleton h-28 rounded-2xl" />
    {/* Tasks skeleton */}
    <div className="skeleton h-20 rounded-2xl" />
    {/* Cards grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="skeleton h-32 rounded-2xl" />
    </div>
    {/* Quick actions */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton h-20 rounded-2xl" />
      ))}
    </div>
  </div>
);

const CardsSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton h-10 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton h-48 rounded-2xl" />
      ))}
    </div>
  </div>
);

const FormSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
    <div className="space-y-2">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton h-4 w-64 rounded" />
    </div>
    <div className="card p-6 space-y-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <div className="skeleton h-11 w-32 rounded-xl" />
        <div className="skeleton h-11 w-24 rounded-xl" />
      </div>
    </div>
  </div>
);

const ListSkeleton: React.FC = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="skeleton h-8 w-48 rounded-lg" />
    <div className="skeleton h-12 rounded-xl" />
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton h-20 rounded-2xl" />
      ))}
    </div>
  </div>
);

const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'dashboard' }) => {
  const skeletons = {
    dashboard: DashboardSkeleton,
    cards: CardsSkeleton,
    form: FormSkeleton,
    list: ListSkeleton,
  };

  const SkeletonComponent = skeletons[variant];
  return (
    <div className="page-container py-6">
      <SkeletonComponent />
    </div>
  );
};

export default PageSkeleton;
