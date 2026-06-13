import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { useVehicleStore } from '../store/vehicleStore';
import { useParkingStore } from '../store/parkingStore';
import {
  Car,
  GraduationCap,
  ScanFace,
  MapPin,
  UserCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

/* ── Helpers ── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

function getAvailabilityColor(
  available: number,
  total: number,
): 'green' | 'yellow' | 'red' {
  if (total === 0) return 'red';
  const ratio = available / total;
  if (ratio > 0.5) return 'green';
  if (ratio > 0.2) return 'yellow';
  return 'red';
}

const statusStyles = {
  green: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
  },
  yellow: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    dot: 'bg-red-400',
    bar: 'bg-red-500',
  },
} as const;

/* ── Quick Actions ── */

const quickActions = [
  { to: '/vehicles/add', icon: Car, label: 'Register Vehicle', color: 'text-blue-400' },
  { to: '/university-id', icon: GraduationCap, label: 'University ID', color: 'text-purple-400' },
  { to: '/face-enrollment', icon: ScanFace, label: 'Face Verify', color: 'text-cyan-400' },
  { to: '/parking', icon: MapPin, label: 'Parking Map', color: 'text-emerald-400' },
  { to: '/profile', icon: UserCircle, label: 'Profile', color: 'text-amber-400' },
] as const;

/* ── DashboardPage ── */

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { profile, fetchProfile, isLoading: profileLoading } = useUserStore();
  const { vehicles, getVehicles, isLoading: vehiclesLoading } = useVehicleStore();
  const {
    availability,
    fetchAvailability,
    loading: parkingLoading,
    error: parkingError,
  } = useParkingStore();

  useEffect(() => {
    fetchProfile();
    getVehicles();
    fetchAvailability();
  }, [fetchProfile, getVehicles, fetchAvailability]);

  const firstName = profile?.firstName || user?.firstName || 'User';
  const greeting = getGreeting();
  const isUniversityVerified = !!profile?.studentId;
  const isFaceVerified = false;
  const hasVehicle = vehicles && vehicles.length > 0;
  const primaryVehicle = hasVehicle ? vehicles[0] : null;

  const completedSteps = (isUniversityVerified ? 1 : 0) + (isFaceVerified ? 1 : 0) + (hasVehicle ? 1 : 0);
  const totalSteps = 3;
  const isFullySetup = completedSteps === totalSteps;

  /* ── Notifications ── */
  const notifications = useMemo(() => {
    const list: { id: string; title: string; desc: string; icon: React.ElementType; color: string }[] = [];

    if (isUniversityVerified) {
      list.push({ id: 'uni', title: 'University ID Verified', desc: 'Your student ID has been confirmed.', icon: GraduationCap, color: 'text-emerald-400' });
    }
    if (primaryVehicle) {
      list.push({
        id: 'vehicle',
        title: 'Vehicle Registered',
        desc: `${primaryVehicle.vehicleBrand ?? ''} ${primaryVehicle.vehicleModel ?? ''} (${primaryVehicle.vehicleNumber})`.trim(),
        icon: Car,
        color: 'text-blue-400',
      });
    }
    if (isFullySetup) {
      list.push({ id: 'active', title: 'Account Active', desc: 'You\'re all set for campus parking.', icon: Sparkles, color: 'text-emerald-400' });
    }
    return list;
  }, [isUniversityVerified, primaryVehicle, isFullySetup]);

  /* ── Loading ── */
  const isPageLoading = profileLoading || vehiclesLoading;
  if (isPageLoading && !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* ── 1. WELCOME CARD ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white animate-fade-in">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-blue-100/80 text-sm">
            Welcome to Smart Campus Parking
          </p>

          {/* Verification badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isUniversityVerified
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-blue-200'
            }`}>
              {isUniversityVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              Student ID {isUniversityVerified ? 'Verified' : 'Pending'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              hasVehicle
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-blue-200'
            }`}>
              {hasVehicle ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              Vehicle {hasVehicle ? 'Registered' : 'Pending'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isFaceVerified
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-blue-200'
            }`}>
              {isFaceVerified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              Face {isFaceVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. PENDING TASKS ── */}
      {!isFullySetup && (
        <section className="card p-5 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-100">Complete Your Setup</h2>
            <span className="text-xs text-zinc-500 font-medium">{completedSteps}/{totalSteps}</span>
          </div>

          <div className="space-y-2">
            {!isUniversityVerified && (
              <Link
                to="/university-id"
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors min-h-[44px] group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">Verify University ID</p>
                  <p className="text-xs text-zinc-500">Upload your student card</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            )}

            {!isFaceVerified && (
              <Link
                to="/face-enrollment"
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors min-h-[44px] group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 shrink-0">
                  <ScanFace className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">Face Verification</p>
                  <p className="text-xs text-zinc-500">Record a short video</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            )}

            {!hasVehicle && (
              <Link
                to="/vehicles/add"
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors min-h-[44px] group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                  <Car className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">Register Vehicle</p>
                  <p className="text-xs text-zinc-500">Add your car or motorcycle</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {isFullySetup && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-emerald-300">
            Account fully set up — you're ready for campus parking!
          </span>
        </div>
      )}

      {/* ── 3. PARKING AVAILABILITY ── */}
      <section className="space-y-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="section-title">Parking Availability</h2>
          <Link to="/parking" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
            View Map →
          </Link>
        </div>

        {parkingLoading && !availability ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-32 rounded-2xl" />
          </div>
        ) : parkingError ? (
          <div className="card p-6 text-center">
            <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Unable to load parking data</p>
          </div>
        ) : availability?.zoneBreakdown && Object.keys(availability.zoneBreakdown).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(availability.zoneBreakdown).map(([zoneName, zone]) => {
              const status = getAvailabilityColor(zone.free, zone.total);
              const s = statusStyles[status];
              const pct = zone.total > 0 ? ((zone.total - zone.free) / zone.total) * 100 : 0;

              return (
                <Link
                  key={zoneName}
                  to="/parking"
                  className={`${s.bg} border ${s.border} rounded-2xl p-5 hover:brightness-110 transition-all`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <h3 className="font-semibold text-zinc-100 text-sm">{zoneName}</h3>
                  </div>

                  <div className="flex items-end gap-1 mb-1">
                    <span className={`text-3xl font-bold ${s.text}`}>{zone.free}</span>
                    <span className="text-sm text-zinc-500 mb-1">/ {zone.total} available</span>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.bar} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{pct.toFixed(0)}% occupied</p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No parking data available</p>
          </div>
        )}
      </section>

      {/* ── 4. QUICK ACTIONS ── */}
      <section className="space-y-3 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-center justify-center gap-2 p-4 card hover:bg-zinc-800/80 transition-all min-h-[44px]"
              >
                <Icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-xs text-zinc-400 text-center leading-tight font-medium">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 5. MY VEHICLE ── */}
      <section className="space-y-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <h2 className="section-title">My Vehicle</h2>

        {vehiclesLoading ? (
          <div className="skeleton h-24 rounded-2xl" />
        ) : primaryVehicle ? (
          <Link to="/vehicles" className="card p-5 block hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 shrink-0">
                <Car className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-100">{primaryVehicle.vehicleNumber}</p>
                  <span className="badge-info">{primaryVehicle.vehicleType}</span>
                </div>
                {(primaryVehicle.vehicleBrand || primaryVehicle.vehicleModel) && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[primaryVehicle.vehicleBrand, primaryVehicle.vehicleModel].filter(Boolean).join(' ')}
                    {primaryVehicle.vehicleColor ? ` • ${primaryVehicle.vehicleColor}` : ''}
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0" />
            </div>
          </Link>
        ) : (
          <div className="card p-6 text-center">
            <Car className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 mb-4">No Vehicle Registered</p>
            <Link
              to="/vehicles/add"
              className="btn-primary"
            >
              Register Vehicle
            </Link>
          </div>
        )}
      </section>

      {/* ── 6. NOTIFICATIONS ── */}
      <section className="space-y-3 animate-fade-in" style={{ animationDelay: '250ms' }}>
        <h2 className="section-title">Notifications</h2>

        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <div key={n.id} className="card p-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
                    <Icon className={`w-5 h-5 ${n.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.color}`}>{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{n.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center">
            <p className="text-sm text-zinc-500">No notifications yet</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;