import React, { useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  GraduationCap,
  Car,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useNotificationStore, type Notification, type NotificationType } from '@/store/notificationStore';

/* ── Icon + Color mapping ── */

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  university_verified: { icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  vehicle_registered: { icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  face_enrollment_completed: { icon: ScanFace, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  face_verification_successful: { icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  account_active: { icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  success: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

/* ── Relative time helper ── */

function getRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

/* ── Notification item ── */

const NotificationItem: React.FC<{
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ notification, onRead, onRemove }) => {
  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer group ${
        notification.read
          ? 'opacity-60 hover:opacity-80'
          : 'hover:bg-zinc-800/50'
      }`}
      onClick={() => !notification.read && onRead(notification.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!notification.read) onRead(notification.id);
        }
      }}
    >
      {/* Icon */}
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg} shrink-0 mt-0.5`}>
        <Icon className={`w-4.5 h-4.5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-tight ${notification.read ? 'text-zinc-400' : 'text-zinc-100'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
          {notification.description}
        </p>
        <p className="text-2xs text-zinc-600 mt-1">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-all shrink-0"
        aria-label="Remove notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* ── Main dropdown ── */

const NotificationDropdown: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, removeNotification, unreadCount } =
    useNotificationStore();

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const count = unreadCount();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // Delay to avoid the current click from immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors min-touch"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-2xs font-bold ring-2 ring-[#09090b]">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-[#0c0c0f] rounded-2xl shadow-modal border border-zinc-800 z-50 animate-scale-in overflow-hidden"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
                {count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500/15 text-blue-400 text-2xs font-semibold">
                    {count}
                  </span>
                )}
              </div>
              {count > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto overscroll-contain scrollbar-thin">
              {notifications.length > 0 ? (
                <div className="divide-y divide-zinc-800/50">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onRemove={removeNotification}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/50 mb-3">
                    <Bell className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">No notifications</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    You're all caught up!
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-zinc-800 px-4 py-2.5">
                <button
                  onClick={() => {
                    useNotificationStore.getState().clearAll();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;