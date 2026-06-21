import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LogOut, User, ChevronDown, ParkingSquare } from 'lucide-react';
import NotificationDropdown from './notifications/NotificationDropdown';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/60">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left — Mobile logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white">
            <ParkingSquare className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-zinc-100">CityParking</span>
        </div>

        {/* Left — Desktop spacer */}
        <div className="hidden lg:block" />

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationDropdown />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors min-touch"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
                {user?.firstName?.[0] || 'U'}
                {user?.lastName?.[0] || ''}
              </div>
              <span className="hidden sm:block text-sm font-medium text-zinc-200">
                {user?.firstName || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-500 hidden sm:block" />
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#0c0c0f] rounded-2xl shadow-modal border border-zinc-800 py-2 z-50 animate-scale-in"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-100">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                      role="menuitem"
                    >
                      <User className="w-4 h-4" />
                      Your Profile
                    </Link>
                  </div>
                  <div className="border-t border-zinc-800 pt-1">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;