import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import {
  LayoutDashboard,
  ParkingSquare,
  Car,
  ScanFace,
  ShieldCheck,
  UserCircle,
  GraduationCap,
  ChevronLeft,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Parking', path: '/parking', icon: ParkingSquare },
  { label: 'My Vehicles', path: '/vehicles', icon: Car },
  { label: 'Face Enrollment', path: '/face-enrollment', icon: ScanFace },
  { label: 'Face Verification', path: '/face-verification', icon: ShieldCheck },
  { label: 'Profile', path: '/profile', icon: UserCircle },
  { label: 'University ID', path: '/university-id', icon: GraduationCap },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();
  const { user } = useAuthStore();

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-screen
        hidden lg:flex flex-col
        bg-[#0c0c0f] border-r border-zinc-800/80
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
      role="navigation"
      aria-label="Sidebar navigation"
    >
      {/* Logo area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white shrink-0">
            <ParkingSquare className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight leading-none">
                CityParking
              </h1>
              <p className="text-2xs text-zinc-500 mt-0.5">Smart Campus</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 border border-transparent'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
                strokeWidth={isActive ? 2 : 1.5}
              />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom — User info */}
      <div className="border-t border-zinc-800/80 p-3">
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/80 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.firstName?.[0] || 'U'}
            {user?.lastName?.[0] || ''}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {user?.firstName || 'User'} {user?.lastName || ''}
              </p>
              <p className="text-2xs text-zinc-500 truncate">{user?.email || ''}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;