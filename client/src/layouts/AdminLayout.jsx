import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AppLogo from '../components/AppLogo';
import NotificationBell from '../components/NotificationBell';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4" />
    <circle cx="12" cy="9" r="3" />
    <path d="M20 19c0-1.6-.9-3-2.3-3.7" />
    <path d="M4 19c0-1.6.9-3 2.3-3.7" />
  </svg>
);

const QueueIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="5" width="16" height="4" rx="1.5" />
    <rect x="4" y="10" width="16" height="4" rx="1.5" />
    <rect x="4" y="15" width="10" height="4" rx="1.5" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);

const adminNavItems = [
  { label: 'Dashboard', path: '/admin', icon: <DashboardIcon /> },
  { label: 'User Management', path: '/admin/users', icon: <UsersIcon /> },
  { label: 'Payments Queue', path: '/admin/payments', icon: <QueueIcon /> }
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentTitle =
    adminNavItems.find((item) => item.path === location.pathname)?.label || 'Dashboard';
  const navItemClassName = ({ isActive }) =>
    `rounded-2xl px-4 py-3 text-sm transition ${
      isActive
        ? 'border border-[#4de2c5]/35 bg-[linear-gradient(135deg,rgba(18,213,183,0.18),rgba(69,142,255,0.12))] font-semibold text-white shadow-[0_10px_24px_rgba(18,213,183,0.14)]'
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/55 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <div className="grid min-h-screen xl:grid-cols-[255px_minmax(0,1fr)]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[285px] max-w-[88vw] flex-col border-r border-slate-800 bg-[#050a1c] text-white transition-transform duration-300 xl:sticky xl:top-0 xl:w-auto xl:max-w-none xl:translate-x-0 xl:overflow-hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex items-center justify-between gap-3 xl:block">
              <AppLogo className="justify-start xl:justify-center" imageClassName="h-12 sm:h-14 xl:h-16" />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 xl:hidden"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 xl:px-4 xl:py-6">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Navigation</p>
            <div className="mt-4 grid gap-1">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={navItemClassName}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${location.pathname === item.path ? 'text-[#8cebdd]' : 'text-slate-500'}`}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-slate-800 px-4 py-4 sm:px-5 sm:py-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[#4de2c5]/20 bg-[linear-gradient(135deg,rgba(18,213,183,0.16),rgba(69,142,255,0.10))] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#4de2c5]/35 hover:bg-[linear-gradient(135deg,rgba(18,213,183,0.22),rgba(69,142,255,0.14))]"
              onClick={logout}
            >
              Sign Out
            </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 xl:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation"
                >
                  <MenuIcon />
                </button>
                <div>
                  <h2 className="text-[1.65rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">{currentTitle}</h2>
                  <p className="text-sm text-slate-500 xl:hidden">Admin Panel</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <p className="text-base font-semibold text-slate-950 sm:text-lg">{user?.name}</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
