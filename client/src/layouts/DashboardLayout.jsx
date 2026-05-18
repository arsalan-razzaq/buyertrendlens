import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatCoins } from '../utils/format';
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

const DataIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19V9" />
    <path d="M10 19V5" />
    <path d="M16 19v-8" />
    <path d="M22 19V3" />
  </svg>
);

const MarketplaceAltIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16" />
    <path d="M6 11h12" />
    <path d="M8 15h8" />
    <path d="M10 19h4" />
  </svg>
);

const RocketIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 19c2.5-.5 4.5-2.5 5-5" />
    <path d="M15 9l-3 3" />
    <path d="M12 12 7 17l-2 2" />
    <path d="M14 4c2.8 0 5 2.2 5 5 0 4-3 7-7 7h-1l-5 5v-5l-1-1c0-4 3-7 7-7h2Z" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1H5.5A2.5 2.5 0 0 0 3 10.5v-3Z" />
    <path d="M3 10.5A2.5 2.5 0 0 1 5.5 8H21v8.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-6Z" />
    <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const SupportIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 18h.01" />
    <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
    <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" />
  </svg>
);

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 4v5c0 4.2-2.5 7.5-7 9-4.5-1.5-7-4.8-7-9V7l7-4Z" />
    <path d="M9.5 12l1.7 1.7L14.8 10" />
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

const WalletChipIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1H5.5A2.5 2.5 0 0 0 3 10.5v-3Z" />
    <path d="M3 10.5A2.5 2.5 0 0 1 5.5 8H21v8.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-6Z" />
    <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const userNavItems = [
  { label: 'Dashboard', path: '/dashboard', hint: 'Overview', icon: <DashboardIcon /> },
  { label: 'G2g', path: '/g2g', hint: 'Data', icon: <DataIcon /> },
  { label: 'Eldorado', path: '/eldorado', hint: 'Data', icon: <MarketplaceAltIcon /> },
  { label: 'Player Auction', hint: 'Data', icon: <RocketIcon />, comingSoon: true },
  { label: 'Gameboost', hint: 'Data', icon: <RocketIcon />, comingSoon: true },
  { label: 'Wallet', path: '/wallet', hint: 'Connection', icon: <WalletIcon /> },
  { label: 'Support', path: '/support', hint: 'Help', icon: <SupportIcon /> }
];

const getUserInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

const DashboardLayout = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [comingSoonItem, setComingSoonItem] = useState(null);
  const currentTitle = userNavItems.find((item) => item.path === location.pathname)?.label || 'Dashboard';
  const userInitials = getUserInitials(user?.name);
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
      {comingSoonItem ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 px-4" onClick={() => setComingSoonItem(null)}>
          <div
            className="w-full max-w-sm rounded-[28px] border border-slate-200/10 bg-[#081127] p-6 text-white shadow-[0_32px_80px_rgba(2,6,23,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-200">
              <RocketIcon />
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">{comingSoonItem.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This section is coming soon. We will enable it once the dataset and flow are ready.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15"
              onClick={() => setComingSoonItem(null)}
            >
              Close
            </button>
          </div>
        </div>
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
              {userNavItems.map((item) => (
                item.comingSoon ? (
                  <button
                    type="button"
                    key={item.label}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                    onClick={() => setComingSoonItem(item)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className="text-xs text-slate-500">{item.hint}</span>
                    </div>
                  </button>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={navItemClassName}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`${location.pathname === item.path ? 'text-[#8cebdd]' : 'text-slate-500'}`}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className={`${location.pathname === item.path ? 'text-[#8cebdd]' : 'text-slate-500'} text-xs`}>
                        {item.hint}
                      </span>
                    </div>
                  </NavLink>
                )
              ))}

              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={navItemClassName}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`${location.pathname.startsWith('/admin') ? 'text-[#8cebdd]' : 'text-slate-500'}`}>
                        <AdminIcon />
                      </span>
                      <span>Admin Panel</span>
                    </div>
                    <span className={`${location.pathname.startsWith('/admin') ? 'text-[#8cebdd]' : 'text-slate-500'} text-xs`}>
                      Control
                    </span>
                  </div>
                </NavLink>
              ) : null}
            </div>
          </div>

          <div className="mt-auto border-t border-slate-800 px-4 py-4 sm:px-5 sm:py-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700/40 text-sm font-bold text-white">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
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
          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 xl:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation"
                >
                  <MenuIcon />
                </button>
                <div className="min-w-0">
                  <p className="hidden text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 sm:block">Current View</p>
                  <h2 className="truncate text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-950 sm:mt-1.5 sm:text-[1.8rem]">{currentTitle}</h2>
                </div>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-3">
                  <NotificationBell />
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 shadow-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <WalletChipIcon />
                    </span>
                    <div className="leading-tight">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Wallet</p>
                      <p className="text-xs font-semibold text-slate-950 sm:text-sm">{formatCoins(user?.coins)}</p>
                    </div>
                  </div>
                </div>
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

export default DashboardLayout;
