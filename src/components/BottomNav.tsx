import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, ParkingSquare, Car, User } from 'lucide-react';

interface NavTab {
  label: string;
  path: string;
  icon: React.ElementType;
  matchPaths?: string[];
}

const tabs: NavTab[] = [
  {
    label: 'Home',
    path: '/dashboard',
    icon: Home,
  },
  {
    label: 'Parking',
    path: '/parking',
    icon: ParkingSquare,
  },
  {
    label: 'Vehicle',
    path: '/vehicles',
    icon: Car,
    matchPaths: ['/vehicles', '/vehicles/add'],
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: User,
    matchPaths: ['/profile', '/profile/edit'],
  },
];

const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (tab: NavTab) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some(p => location.pathname.startsWith(p));
    }
    return location.pathname === tab.path;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center justify-center flex-1 min-w-[64px] min-h-[44px] transition-colors duration-200 group relative"
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
            >
              {/* Active indicator dot */}
              {active && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-blue-500 animate-scale-in" />
              )}
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  active
                    ? 'text-blue-500'
                    : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span
                className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  active
                    ? 'text-blue-500'
                    : 'text-zinc-500 group-hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
