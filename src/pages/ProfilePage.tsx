import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useUserStore } from '../store';
import { Button, ErrorMessage } from '../components';
import { VerificationBadge } from '../components/widgets';
import {
  UserCircle,
  Mail,
  Phone,
  Shield,
  Camera,
  GraduationCap,
  Calendar,
  Hash,
  Clock,
  Edit3,
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user: authUser } = useAuthStore();
  const { profile, isLoading, error, fetchProfile } = useUserStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const user = profile || authUser;

  if (isLoading && !user) {
    return (
      <div className="max-w-4xl mx-auto py-6 animate-fade-in">
        <div className="space-y-6">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-h1">My Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account and verification status</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6 mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold shadow-lg shrink-0">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-zinc-100">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-zinc-500">{user?.email}</p>
            {user?.phone && (
              <p className="text-sm text-zinc-500 mt-0.5">{user.phone}</p>
            )}
          </div>
          <Link to="/profile/edit">
            <Button variant="outline" size="sm">
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card p-6 mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <UserCircle className="h-4 w-4 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">Personal Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-3">
            <UserCircle className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Full Name</p>
              <p className="text-sm text-zinc-200 font-medium">{user?.firstName} {user?.lastName}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Email</p>
              <p className="text-sm text-zinc-200 font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Phone</p>
              <p className="text-sm text-zinc-200 font-medium">{user?.phone || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Status</p>
              <span className="badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      <div className="card p-6 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">Verification Status</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <Camera className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Face Registration</p>
                <p className="text-xs text-zinc-500">Face recognition verification</p>
              </div>
            </div>
            <VerificationBadge status="pending" label="Not Registered" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <GraduationCap className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">ID Verification</p>
                <p className="text-xs text-zinc-500">University ID verification</p>
              </div>
            </div>
            <VerificationBadge status="pending" label="Not Uploaded" />
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="card p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
            <Hash className="h-4 w-4 text-zinc-400" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">Account Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Member Since</p>
              <p className="text-sm text-zinc-200 font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Hash className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">User ID</p>
              <p className="text-sm text-zinc-200 font-mono">{user?.id || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Last Updated</p>
              <p className="text-sm text-zinc-200 font-medium">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 font-medium">Account Type</p>
              <span className="badge-info">Standard User</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;