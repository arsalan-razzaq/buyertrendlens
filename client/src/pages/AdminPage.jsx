import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import http, { getErrorMessage } from '../api/http';
import { useNotifications } from '../hooks/useNotifications';
import { formatCoins, formatCompactNumber, formatDate } from '../utils/format';

const panelClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

const SummaryCard = ({ label, value }) => (
  <div className={`${panelClass} p-5`}>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
  </div>
);

const SectionHeader = ({ title, action }) => (
  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">{title}</h3>
    {action}
  </div>
);

const MobileField = ({ label, value, valueClassName = '' }) => (
  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
    <p className={`mt-1 text-sm text-slate-700 ${valueClassName}`.trim()}>{value}</p>
  </div>
);

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
};

const UserDetailModal = ({ user, onClose }) => {
  if (!user) {
    return null;
  }

  const detailRows = [
    { label: 'User ID', value: user._id },
    { label: 'Full Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Phone Number', value: user.phoneNumber },
    { label: 'Country', value: user.country },
    { label: 'Company Name', value: user.companyName },
    { label: 'Job Title', value: user.jobTitle },
    { label: 'Use Case', value: user.useCase },
    { label: 'Preferred Contact', value: user.preferredContactMethod },
    { label: 'Messaging Handle', value: user.messagingHandle },
    { label: 'Role', value: user.role },
    { label: 'Wallet Balance', value: formatCoins(user.coins) },
    { label: 'Google Account Linked', value: Boolean(user.googleId) },
    { label: 'Profile Complete', value: Boolean(user.profileComplete) },
    { label: 'Terms Accepted At', value: user.termsAcceptedAt ? formatDate(user.termsAcceptedAt) : '' },
    { label: 'Signup IP', value: user.signupIp },
    { label: 'Last Known IP', value: user.lastKnownIp },
    { label: 'Created At', value: user.createdAt ? formatDate(user.createdAt) : '' },
    { label: 'Updated At', value: user.updatedAt ? formatDate(user.updatedAt) : '' }
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">User Details</p>
            <h3 className="mt-2 truncate text-2xl font-semibold tracking-[-0.03em] text-slate-950">{user.name}</h3>
            <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-96px)] overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {detailRows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{row.label}</p>
                <p className="mt-2 break-words text-sm font-medium text-slate-800">{formatDetailValue(row.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsMetricCard = ({ label, value, hint }) => (
  <div className={`${panelClass} p-5`}>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{hint}</p>
  </div>
);

const AnalyticsSkeletonCard = () => <div className={`${panelClass} h-[132px] animate-pulse bg-slate-100`} />;

const EmptyAnalyticsState = ({ message }) => (
  <div className={`${panelClass} px-5 py-10 text-center`}>
    <p className="text-lg font-semibold text-slate-900">Google Analytics unavailable</p>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{message}</p>
  </div>
);

const LineChartPanel = ({ data }) => {
  const safeData = Array.isArray(data) ? data : [];
  const width = 640;
  const height = 260;
  const padding = 24;
  const maxValue = Math.max(...safeData.map((item) => Number(item.users) || 0), 1);
  const points = safeData.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(safeData.length - 1, 1);
    const y = height - padding - ((Number(item.users) || 0) / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  });
  const fillPoints = [`${padding},${height - padding}`, ...points, `${width - padding},${height - padding}`].join(' ');

  return (
    <div className={`${panelClass} p-5`}>
      <SectionHeader title="Users Trend" />
      {safeData.length ? (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
            <defs>
              <linearGradient id="analyticsLineFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((step) => {
              const y = padding + ((height - padding * 2) / 3) * step;
              return <line key={step} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
            })}
            <polygon points={fillPoints} fill="url(#analyticsLineFill)" />
            <polyline points={points.join(' ')} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {safeData.map((item, index) => {
              const x = padding + (index * (width - padding * 2)) / Math.max(safeData.length - 1, 1);
              const y = height - padding - ((Number(item.users) || 0) / maxValue) * (height - padding * 2);
              return (
                <g key={item.date}>
                  <circle cx={x} cy={y} r="4.5" fill="#fff" stroke="#4f46e5" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4 xl:grid-cols-7">
            {safeData.map((item) => (
              <div key={item.date} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="font-semibold text-slate-700">{item.date}</p>
                <p className="mt-1">{item.users} users</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">No user trend data found for the selected range.</p>
      )}
    </div>
  );
};

const DistributionPanel = ({ title, rows, valueKey, labelKey }) => {
  const maxValue = Math.max(...(rows || []).map((row) => Number(row?.[valueKey]) || 0), 1);

  return (
    <div className={`${panelClass} p-5`}>
      <SectionHeader title={title} />
      {rows?.length ? (
        <div className="space-y-4">
          {rows.map((row) => {
            const value = Number(row?.[valueKey]) || 0;
            const percent = Math.max(6, (value / maxValue) * 100);

            return (
              <div key={`${title}-${row[labelKey]}`}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <p className="truncate font-medium text-slate-700">{row[labelKey]}</p>
                  <p className="shrink-0 font-semibold text-slate-950">{value}</p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-indigo-500" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No data found for this chart.</p>
      )}
    </div>
  );
};

const TopPagesPanel = ({ rows }) => (
  <div className={`${panelClass} p-5`}>
    <SectionHeader title="Top Pages" />
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-slate-500">
          <tr>
            <th className="px-3 py-3 font-medium">Page</th>
            <th className="px-3 py-3 font-medium">Path</th>
            <th className="px-3 py-3 font-medium">Views</th>
            <th className="px-3 py-3 font-medium">Users</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {rows?.length ? (
            rows.map((row) => (
              <tr key={`${row.path}-${row.title}`}>
                <td className="px-3 py-3 font-semibold text-slate-950">{row.title}</td>
                <td className="px-3 py-3 text-slate-500">{row.path}</td>
                <td className="px-3 py-3">{row.pageViews}</td>
                <td className="px-3 py-3">{row.activeUsers}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-3 py-8 text-center text-slate-500">
                No page analytics found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="space-y-3 md:hidden">
      {rows?.length ? (
        rows.map((row) => (
          <div key={`${row.path}-${row.title}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">{row.title}</p>
            <p className="mt-1 text-xs text-slate-500">{row.path}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MobileField label="Views" value={row.pageViews} />
              <MobileField label="Users" value={row.activeUsers} />
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No page analytics found.
        </div>
      )}
    </div>
  </div>
);

const initialAnalyticsState = {
  overview: null,
  realtime: null,
  pages: [],
  traffic: [],
  devices: [],
  countries: []
};

const getPaymentMethodLabel = (payment) => {
  if (payment.paymentMethod === 'binance') {
    return 'Manual Binance';
  }

  if (payment.paymentMethod === 'binance_pay') {
    return 'Binance Pay';
  }

  if (payment.paymentMethod === 'binance_deposit') {
    return 'Binance Deposit';
  }

  if (payment.paymentMethod === 'tron_wallet') {
    return 'TRON Wallet';
  }

  return 'Payment';
};

const AdminPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useNotifications();
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [paymentActionLoading, setPaymentActionLoading] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState('created-desc');
  const [userPage, setUserPage] = useState(1);
  const [analyticsRange, setAnalyticsRange] = useState({
    preset: '7d',
    startDate: '',
    endDate: ''
  });
  const [analyticsData, setAnalyticsData] = useState(initialAnalyticsState);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const usersPerPage = 20;
  const activeTab =
    location.pathname === '/admin/users'
      ? 'users'
      : location.pathname === '/admin/payments'
      ? 'payments'
      : 'overview';

  const changeTab = (tab) => {
    const nextPath =
      tab === 'users'
        ? '/admin/users'
        : tab === 'payments'
        ? '/admin/payments'
        : '/admin';

    navigate(nextPath);
  };

  const buildAnalyticsParams = () => {
    if (analyticsRange.preset === 'custom') {
      return {
        preset: 'custom',
        startDate: analyticsRange.startDate || undefined,
        endDate: analyticsRange.endDate || undefined
      };
    }

    return {
      preset: analyticsRange.preset
    };
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      const [usersResponse, paymentsResponse] = await Promise.all([
        http.get('/admin/users'),
        http.get('/admin/payments/pending')
      ]);

      setUsers(usersResponse.data.users);
      setPayments(paymentsResponse.data.payments);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');

    try {
      const params = buildAnalyticsParams();
      const [overviewResponse, realtimeResponse, pagesResponse, trafficResponse, devicesResponse, countriesResponse] =
        await Promise.all([
          http.get('/admin/analytics/overview', { params }),
          http.get('/admin/analytics/realtime'),
          http.get('/admin/analytics/pages', { params }),
          http.get('/admin/analytics/traffic', { params }),
          http.get('/admin/analytics/devices', { params }),
          http.get('/admin/analytics/countries', { params })
        ]);

      setAnalyticsData({
        overview: overviewResponse.data,
        realtime: realtimeResponse.data,
        pages: pagesResponse.data.rows || [],
        traffic: trafficResponse.data.rows || [],
        devices: devicesResponse.data.rows || [],
        countries: countriesResponse.data.rows || []
      });
    } catch (requestError) {
      setAnalyticsError(getErrorMessage(requestError));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'overview') {
      return;
    }

    if (analyticsRange.preset === 'custom' && (!analyticsRange.startDate || !analyticsRange.endDate)) {
      setAnalyticsLoading(false);
      return;
    }

    fetchAnalyticsData();
  }, [activeTab, analyticsRange.preset, analyticsRange.startDate, analyticsRange.endDate]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await http.get('/admin/analytics/realtime');
        setAnalyticsData((current) => ({
          ...current,
          realtime: response.data
        }));
      } catch (requestError) {
        setAnalyticsError(getErrorMessage(requestError));
      }
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [activeTab]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handlePaymentSubmitted = ({ payment }) => {
      if (!payment) {
        return;
      }

      setPayments((current) => {
        const next = [payment, ...current.filter((item) => item._id !== payment._id)];
        next.sort((firstPayment, secondPayment) => new Date(secondPayment.createdAt) - new Date(firstPayment.createdAt));
        return next;
      });
      setMessage(`New payment request received: ${payment.reference}.`);
      setError('');
    };

    const handlePaymentResolved = ({ paymentId }) => {
      if (!paymentId) {
        return;
      }

      setPayments((current) => current.filter((payment) => payment._id !== paymentId));
    };

    socket.on('payment:submitted', handlePaymentSubmitted);
    socket.on('payment:resolved', handlePaymentResolved);

    return () => {
      socket.off('payment:submitted', handlePaymentSubmitted);
      socket.off('payment:resolved', handlePaymentResolved);
    };
  }, [socket]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter, userSort]);

  const handleDeleteUser = async (userId) => {
    setMessage('');
    setError('');
    setDeleteLoading((current) => ({ ...current, [userId]: true }));

    try {
      await http.delete(`/admin/users/${userId}`);
      setUsers((current) => current.filter((user) => user._id !== userId));
      setMessage('User deleted successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeleteLoading((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
    }
  };

  const openUserDetails = (user) => {
    setSelectedUser(user);
  };

  const handlePaymentAction = async (paymentId, action) => {
    setMessage('');
    setError('');
    setPaymentActionLoading((current) => ({ ...current, [paymentId]: action }));

    try {
      await http.patch(`/admin/payments/${paymentId}/${action}`);
      setMessage(`Payment ${action}d successfully.`);
      await fetchAdminData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPaymentActionLoading((current) => {
        const next = { ...current };
        delete next[paymentId];
        return next;
      });
    }
  };

  const totalCoins = useMemo(
    () => users.reduce((sum, user) => sum + (Number(user.coins) || 0), 0),
    [users]
  );

  const adminCount = useMemo(
    () => users.filter((user) => user.role === 'admin').length,
    [users]
  );

  const pendingPaymentValue = useMemo(
    () => payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [payments]
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const nextUsers = users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);
      const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;

      return matchesSearch && matchesRole;
    });

    nextUsers.sort((firstUser, secondUser) => {
      if (userSort === 'balance-desc') {
        return Number(secondUser.coins || 0) - Number(firstUser.coins || 0);
      }

      if (userSort === 'balance-asc') {
        return Number(firstUser.coins || 0) - Number(secondUser.coins || 0);
      }

      if (userSort === 'name-desc') {
        return (secondUser.name || '').localeCompare(firstUser.name || '');
      }

      if (userSort === 'created-asc') {
        return new Date(firstUser.createdAt || 0) - new Date(secondUser.createdAt || 0);
      }

      if (userSort === 'created-desc') {
        return new Date(secondUser.createdAt || 0) - new Date(firstUser.createdAt || 0);
      }

      return (firstUser.name || '').localeCompare(secondUser.name || '');
    });

    return nextUsers;
  }, [users, userSearch, userRoleFilter, userSort]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));

  const paginatedUsers = useMemo(() => {
    const safePage = Math.min(userPage, totalUserPages);
    const startIndex = (safePage - 1) * usersPerPage;

    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, userPage, totalUserPages, usersPerPage]);

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages);
    }
  }, [userPage, totalUserPages]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto"
          onClick={async () => {
            await fetchAdminData();
            await fetchAnalyticsData();
          }}
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Users" value={users.length} />
        <SummaryCard label="Pending Payments" value={payments.length} />
        <SummaryCard label="Admin Accounts" value={adminCount} />
        <SummaryCard label="Coins in Wallets" value={formatCompactNumber(totalCoins)} />
      </div>

      <div className="space-y-4">
        <SectionHeader
          title="Google Analytics"
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <select
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700"
                value={analyticsRange.preset}
                onChange={(event) =>
                  setAnalyticsRange((current) => ({
                    ...current,
                    preset: event.target.value
                  }))
                }
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
              {analyticsRange.preset === 'custom' ? (
                <>
                  <input
                    type="date"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700"
                    value={analyticsRange.startDate}
                    onChange={(event) =>
                      setAnalyticsRange((current) => ({
                        ...current,
                        startDate: event.target.value
                      }))
                    }
                  />
                  <input
                    type="date"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700"
                    value={analyticsRange.endDate}
                    onChange={(event) =>
                      setAnalyticsRange((current) => ({
                        ...current,
                        endDate: event.target.value
                      }))
                    }
                  />
                </>
              ) : null}
            </div>
          }
        />

        {analyticsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{analyticsError}</div>
        ) : null}

        {analyticsLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <AnalyticsSkeletonCard key={`analytics-card-${index}`} />
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
              <div className={`${panelClass} h-[420px] animate-pulse bg-slate-100`} />
              <div className={`${panelClass} h-[420px] animate-pulse bg-slate-100`} />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className={`${panelClass} h-[320px] animate-pulse bg-slate-100`} />
              <div className={`${panelClass} h-[320px] animate-pulse bg-slate-100`} />
              <div className={`${panelClass} h-[320px] animate-pulse bg-slate-100`} />
            </div>
          </>
        ) : analyticsData.overview?.configured === false ? (
          <EmptyAnalyticsState message={analyticsData.overview.message} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AnalyticsMetricCard
                label="Realtime Active Users"
                value={analyticsData.realtime?.label || '0'}
                hint={analyticsData.realtime?.updatedAt ? `Updated ${formatDate(analyticsData.realtime.updatedAt)}` : 'Realtime report'}
              />
              <AnalyticsMetricCard label="Active Users" value={analyticsData.overview?.metrics?.labels?.activeUsers || '0'} hint="Users in selected range" />
              <AnalyticsMetricCard label="Total Users" value={analyticsData.overview?.metrics?.labels?.totalUsers || '0'} hint="Distinct users" />
              <AnalyticsMetricCard label="New Users" value={analyticsData.overview?.metrics?.labels?.newUsers || '0'} hint="First-time visitors" />
              <AnalyticsMetricCard label="Sessions" value={analyticsData.overview?.metrics?.labels?.sessions || '0'} hint="Total sessions" />
              <AnalyticsMetricCard label="Page Views" value={analyticsData.overview?.metrics?.labels?.pageViews || '0'} hint="Screen/page views" />
              <AnalyticsMetricCard label="Event Count" value={analyticsData.overview?.metrics?.labels?.eventCount || '0'} hint="Tracked events" />
              <AnalyticsMetricCard
                label="Engagement / Avg Session"
                value={`${analyticsData.overview?.metrics?.labels?.engagementRate || '0%'} / ${
                  analyticsData.overview?.metrics?.labels?.averageSessionDuration || '0s'
                }`}
                hint="Rate and session length"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
              <LineChartPanel data={analyticsData.overview?.trend || []} />
              <TopPagesPanel rows={analyticsData.pages} />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <DistributionPanel title="Traffic Sources" rows={analyticsData.traffic} labelKey="source" valueKey="sessions" />
              <DistributionPanel title="Devices" rows={analyticsData.devices} labelKey="device" valueKey="activeUsers" />
              <DistributionPanel title="Countries" rows={analyticsData.countries} labelKey="country" valueKey="activeUsers" />
            </div>
          </>
        )}
      </div>

      <div className={`${panelClass} p-4`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Top Admin Metrics</h4>
            <select className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700">
              <option>All Time</option>
              <option>30 Days</option>
              <option>7 Days</option>
            </select>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Metric</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-3 py-3">Pending recharge value</td>
                  <td className="px-3 py-3 font-semibold">${pendingPaymentValue.toFixed(2)}</td>
                  <td className="px-3 py-3 text-slate-500">Manual approvals waiting in queue.</td>
                </tr>
                <tr>
                  <td className="px-3 py-3">System mode</td>
                  <td className="px-3 py-3 font-semibold">Online</td>
                  <td className="px-3 py-3 text-slate-500">Admin routes and approval actions are active.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Pending recharge value</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">${pendingPaymentValue.toFixed(2)}</p>
              <p className="mt-2 text-sm text-slate-500">Manual approvals waiting in queue.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">System mode</p>
              <p className="mt-2 text-xl font-semibold text-emerald-600">Online</p>
              <p className="mt-2 text-sm text-slate-500">Admin routes and approval actions are active.</p>
            </div>
          </div>
      </div>

      <div className={`${panelClass} p-4`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">Pending Payment Queue</h4>
          <button type="button" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:self-auto" onClick={() => changeTab('payments')}>
            Open Full Queue
          </button>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Reference</th>
                <th className="px-3 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">USDT</th>
                <th className="px-3 py-3 font-medium">Coins</th>
                <th className="px-3 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {payments.length ? (
                payments.slice(0, 8).map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-3 py-3 font-semibold">{payment.reference}</td>
                    <td className="px-3 py-3">{payment.userId?.name || 'Unknown'}</td>
                    <td className="px-3 py-3">{payment.amount}</td>
                    <td className="px-3 py-3">{formatCoins(payment.coins)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDate(payment.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                    {loading ? 'Loading payments...' : 'No pending payments.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {payments.length ? (
            payments.slice(0, 8).map((payment) => (
              <div key={payment._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{payment.reference}</p>
                    <p className="mt-1 text-sm text-slate-500">{payment.userId?.name || 'Unknown'}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-950">{formatCoins(payment.coins)}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MobileField label="USDT" value={payment.amount} />
                  <MobileField label="Created" value={formatDate(payment.createdAt)} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {loading ? 'Loading payments...' : 'No pending payments.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          onClick={() => {
            setUserSearch('');
            setUserRoleFilter('all');
            setUserSort('created-desc');
            setUserPage(1);
          }}
        >
          Clear Filters
        </button>
      </div>
      <div className={`${panelClass} p-4`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_180px]">
          <input
            className="input"
            placeholder="Search by name or email"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
          <select className="input" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select className="input" value={userSort} onChange={(event) => setUserSort(event.target.value)}>
            <option value="created-desc">Newest First</option>
            <option value="created-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="balance-desc">Balance High-Low</option>
            <option value="balance-asc">Balance Low-High</option>
          </select>
        </div>
      </div>
      <div className={`${panelClass} overflow-hidden`}>
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length ? (
                paginatedUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{user.name}</p>
                      <p className="text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="badge bg-slate-100 text-slate-700 capitalize">{user.role}</span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-950">{formatCoins(user.coins)}</td>
                    <td className="px-4 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => openUserDetails(user)}
                      >
                        View Details
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={Boolean(deleteLoading[user._id])}
                      >
                        {deleteLoading[user._id] ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    {loading ? 'Loading users...' : filteredUsers.length ? 'No users on this page.' : 'No matching users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-4 p-4 lg:hidden">
          {paginatedUsers.length ? (
            paginatedUsers.map((user) => (
              <div key={user._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-950">{user.name}</p>
                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span className="badge bg-slate-100 text-slate-700 capitalize">{user.role}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MobileField label="Balance" value={formatCoins(user.coins)} valueClassName="font-semibold text-slate-950" />
                  <MobileField label="Role" value={user.role} valueClassName="capitalize" />
                  <MobileField label="Created At" value={formatDate(user.createdAt)} />
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => openUserDetails(user)}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleDeleteUser(user._id)}
                    disabled={Boolean(deleteLoading[user._id])}
                  >
                    {deleteLoading[user._id] ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {loading ? 'Loading users...' : filteredUsers.length ? 'No users on this page.' : 'No matching users found.'}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredUsers.length ? (userPage - 1) * usersPerPage + 1 : 0}-
            {Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setUserPage((current) => Math.max(1, current - 1))}
              disabled={userPage === 1}
            >
              Previous
            </button>
            <span className="min-w-[88px] text-center text-sm font-medium text-slate-600">
              Page {userPage} / {totalUserPages}
            </span>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setUserPage((current) => Math.min(totalUserPages, current + 1))}
              disabled={userPage === totalUserPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <div className={`${panelClass} overflow-hidden`}>
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">USDT</th>
                <th className="px-4 py-3 font-medium">Coins</th>
                <th className="px-4 py-3 font-medium">Receiver</th>
                <th className="px-4 py-3 font-medium">TX Hash</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length ? (
                payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="px-4 py-4 font-semibold text-slate-950">{payment.reference}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-950">{payment.userId?.name || 'Unknown'}</p>
                      <p className="text-slate-500">{payment.userId?.email}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{getPaymentMethodLabel(payment)}</td>
                    <td className="px-4 py-4">{payment.amount}</td>
                    <td className="px-4 py-4">{formatCoins(payment.coins)}</td>
                    <td className="px-4 py-4 max-w-[220px] truncate text-slate-500">{payment.walletAddress || 'Not set'}</td>
                    <td className="px-4 py-4 max-w-[220px] truncate text-slate-500">{payment.txHash || 'Not submitted yet'}</td>
                    <td className="px-4 py-4 text-slate-500">{formatDate(payment.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {(() => {
                          const activeAction = paymentActionLoading[payment._id];
                          const isLoading = Boolean(activeAction);

                          return (
                            <>
                        <button
                          type="button"
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => handlePaymentAction(payment._id, 'approve')}
                          disabled={isLoading}
                        >
                          {activeAction === 'approve' ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => handlePaymentAction(payment._id, 'reject')}
                          disabled={isLoading}
                        >
                          {activeAction === 'reject' ? 'Rejecting...' : 'Reject'}
                        </button>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                    {loading ? 'Loading payments...' : 'No pending payments.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-4 p-4 lg:hidden">
          {payments.length ? (
            payments.map((payment) => {
              const activeAction = paymentActionLoading[payment._id];
              const isLoading = Boolean(activeAction);

              return (
                <div key={payment._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">{payment.reference}</p>
                      <p className="truncate text-sm text-slate-500">{payment.userId?.name || 'Unknown'}</p>
                      <p className="truncate text-sm text-slate-500">{payment.userId?.email || 'No email'}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-950">{payment.amount} USDT</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MobileField label="Method" value={getPaymentMethodLabel(payment)} />
                    <MobileField label="Coins" value={formatCoins(payment.coins)} valueClassName="font-semibold text-slate-950" />
                    <MobileField label="Receiver" value={payment.walletAddress || 'Not set'} />
                    <MobileField label="TX Hash" value={payment.txHash || 'Not submitted yet'} />
                    <MobileField label="Created" value={formatDate(payment.createdAt)} />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handlePaymentAction(payment._id, 'approve')}
                      disabled={isLoading}
                    >
                      {activeAction === 'approve' ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handlePaymentAction(payment._id, 'reject')}
                      disabled={isLoading}
                    >
                      {activeAction === 'reject' ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {loading ? 'Loading payments...' : 'No pending payments.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {activeTab === 'overview' ? renderOverview() : null}
      {activeTab === 'users' ? renderUsers() : null}
      {activeTab === 'payments' ? renderPayments() : null}
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
};

export default AdminPage;
