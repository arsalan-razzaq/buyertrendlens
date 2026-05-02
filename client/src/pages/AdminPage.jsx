import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import http, { getErrorMessage } from '../api/http';
import { useNotifications } from '../hooks/useNotifications';
import { formatCoins, formatDate } from '../utils/format';

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
  const [adjustments, setAdjustments] = useState({});
  const [paymentActionLoading, setPaymentActionLoading] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState('name-asc');
  const [userPage, setUserPage] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const usersPerPage = 5;
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

  const updateAdjustment = (userId, key, value) => {
    setAdjustments((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [key]: value
      }
    }));
  };

  const handleAdjustCoins = async (userId) => {
    setMessage('');
    setError('');

    try {
      await http.patch(`/admin/users/${userId}/coins`, {
        amount: Number(adjustments[userId]?.amount),
        reason: adjustments[userId]?.reason || 'Admin balance change'
      });
      setMessage('User balance updated.');
      await fetchAdminData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
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
        <button type="button" className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:w-auto" onClick={fetchAdminData}>
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Users" value={users.length} />
        <SummaryCard label="Pending Payments" value={payments.length} />
        <SummaryCard label="Admin Accounts" value={adminCount} />
        <SummaryCard label="Coins in Wallets" value={Number(totalCoins).toFixed(2)} />
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
            setUserSort('name-asc');
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
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Reason</th>
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
                    <td className="px-4 py-4">
                      <input
                        className="input min-w-[140px]"
                        placeholder="+50 or -20"
                        value={adjustments[user._id]?.amount || ''}
                        onChange={(event) => updateAdjustment(user._id, 'amount', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="input min-w-[220px]"
                        placeholder="Reason"
                        value={adjustments[user._id]?.reason || ''}
                        onChange={(event) => updateAdjustment(user._id, 'reason', event.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <button type="button" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" onClick={() => handleAdjustCoins(user._id)}>
                        Save
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
                </div>

                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="label">Amount</label>
                    <input
                      className="input"
                      placeholder="+50 or -20"
                      value={adjustments[user._id]?.amount || ''}
                      onChange={(event) => updateAdjustment(user._id, 'amount', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Reason</label>
                    <input
                      className="input"
                      placeholder="Reason"
                      value={adjustments[user._id]?.reason || ''}
                      onChange={(event) => updateAdjustment(user._id, 'reason', event.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={() => handleAdjustCoins(user._id)}
                  >
                    Save Balance Update
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
    </div>
  );
};

export default AdminPage;
