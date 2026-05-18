import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { formatLocalDateTime } from '../utils/format';

const BellIcon = ({ ringing = false }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-5 w-5 ${ringing ? 'bell-ring' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6.5 9a5.5 5.5 0 1 1 11 0c0 6 2.5 7 2.5 7h-16s2.5-1 2.5-7" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

const NotificationBell = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    connected,
    permission,
    bellPulse,
    requestBrowserPermission,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      await markAsRead(notification._id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }

    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 ${bellPulse ? 'ring-2 ring-emerald-200' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notifications"
      >
        <BellIcon ringing={bellPulse} />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
        <span
          className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-white ${
            connected ? 'bg-emerald-500' : 'bg-amber-400'
          }`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(92vw,24rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Notifications</p>
                <p className="mt-1 text-xs text-slate-500">
                  {connected ? 'Live updates connected' : 'Realtime reconnecting, fallback sync active'}
                </p>
              </div>
              {unreadCount ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            {permission !== 'granted' ? (
              <button
                type="button"
                className="mt-3 inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={requestBrowserPermission}
              >
                {permission === 'denied' ? 'Browser notifications blocked' : 'Enable browser notifications'}
              </button>
            ) : null}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {notifications.length ? (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${
                    notification.readAt ? 'bg-white' : 'bg-emerald-50/55'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    </div>
                    {!notification.readAt ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" /> : null}
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {formatLocalDateTime(notification.createdAt)}
                  </p>
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
