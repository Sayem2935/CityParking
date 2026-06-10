import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useUserStore } from '../store';
import { Button } from '../components';
import { LoadingSpinner } from '../components';
import { ErrorMessage } from '../components';
import { VerificationBadge } from '../components/widgets';

const ProfilePage: React.FC = () => {
  const { user: authUser } = useAuthStore();
  const { profile, isLoading, error, fetchProfile } = useUserStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Use the full profile from the API, fall back to auth store user
  const user = profile || authUser;

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-zinc-800/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-800/50/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-zinc-100">My Profile</h1>
          <p className="mt-1 text-zinc-500">Manage your account and verification status</p>
        </div>

        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-8 mb-6 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-city-blue-500 to-city-cyan-500 text-white text-3xl font-bold shadow-lg">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-zinc-100">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-zinc-500">{user?.email}</p>
              {user?.phone && (
                <p className="text-gray-400 text-sm mt-1">{user.phone}</p>
              )}
            </div>
            <Link to="/profile/edit">
              <Button variant="secondary" size="sm">
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Personal Information */}
        <div className="glass-card rounded-2xl p-6 mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-city-blue-50 text-city-blue-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Personal Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Full Name</p>
              <p className="text-zinc-100 font-medium">{user?.firstName} {user?.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Email Address</p>
              <p className="text-zinc-100 font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Phone Number</p>
              <p className="text-zinc-100 font-medium">{user?.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Account Status</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="glass-card rounded-2xl p-6 mb-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-city-emerald-50 text-city-emerald-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Verification Status</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-city-cyan-50 text-city-cyan-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-100">Face Registration</p>
                  <p className="text-sm text-zinc-500">AI face recognition verification</p>
                </div>
              </div>
              <VerificationBadge status="pending" label="Not Registered" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-900/30 text-purple-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-zinc-100">ID Verification</p>
                  <p className="text-sm text-zinc-500">Government ID document verification</p>
                </div>
              </div>
              <VerificationBadge status="pending" label="Not Uploaded" />
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.63-3.44a.6.6 0 010-1.02l5.63-3.44a.6.6 0 01.9.52v6.84a.6.6 0 01-.9.52z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100">Account Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Member Since</p>
              <p className="text-zinc-100 font-medium">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">User ID</p>
              <p className="text-zinc-100 font-mono text-sm">{user?.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Last Updated</p>
              <p className="text-zinc-100 font-medium">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Account Type</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-city-blue-50 text-city-blue-700 border border-city-blue-200">
                Standard User
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;