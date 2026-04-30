import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import http, { getErrorMessage } from '../api/http';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { formatCoins, formatLocalDateTime } from '../utils/format';

const panelClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const defaultWorkspaceOptions = {
  coinsPerUsdt: 100,
  manualBinance: {
    enabled: true,
    accountLabel: 'Wallet ID',
    accountValue: 'User-07d6a',
    payeeName: 'Binance Pay',
    paymentLink: 'https://app.binance.com/uni-qr/W8e94BaB',
    qrCodeImageUrl: '',
    qrCodeValue: 'https://app.binance.com/uni-qr/W8e94BaB',
    instructions:
      'Open the Binance payment link or scan the QR, send the exact amount to this wallet ID, then submit your TX hash or transfer reference for admin approval.'
  }
};

const MetricCard = ({ label, value, helper }) => (
  <div className={`${panelClass} p-5`}>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
    {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
  </div>
);

const SectionHeader = ({ eyebrow, title, description, actions = null }) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p> : null}
    </div>
    {actions}
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-rose-100 text-rose-700',
    rejected: 'bg-rose-100 text-rose-700',
    expired: 'bg-slate-100 text-slate-600'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

const copyToClipboard = async (value, label) => {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied.`);
};

const getPaymentMethodLabel = (payment) => {
  if (payment.paymentMethod === 'binance') {
    return 'Manual Binance payment';
  }

  return 'Recharge request';
};

const PaymentRow = ({ payment }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{payment.reference}</p>
        <p className="mt-1 text-sm text-slate-500">{getPaymentMethodLabel(payment)}</p>
      </div>
      <StatusBadge status={payment.status} />
    </div>

    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Amount</p>
        <p className="mt-1 font-medium text-slate-900">{Number(payment.amount || 0).toFixed(2)} USDT</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coins</p>
        <p className="mt-1 font-medium text-slate-900">{formatCoins(payment.coins || 0)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Network</p>
        <p className="mt-1 font-medium text-slate-900">{payment.network || 'Pending setup'}</p>
      </div>
    </div>

    {payment.walletAddress ? (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Receiver</p>
        <p className="mt-2 break-all">{payment.walletAddress}</p>
      </div>
    ) : null}

    {payment.txHash ? (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Transaction Hash</p>
        <p className="mt-2 break-all">{payment.txHash}</p>
      </div>
    ) : null}

    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">{formatLocalDateTime(payment.createdAt)}</p>
  </div>
);

const WalletPage = () => {
  const { user, refreshProfile } = useAuth();
  const { socket } = useNotifications();
  const [payments, setPayments] = useState([]);
  const [workspaceOptions, setWorkspaceOptions] = useState(defaultWorkspaceOptions);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState('');
  const [amount, setAmount] = useState('50');
  const [paymentProof, setPaymentProof] = useState('');
  const [activePayment, setActivePayment] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const coinsPerUsdt = Number(workspaceOptions.coinsPerUsdt || 100);
  const manualBinance = {
    ...defaultWorkspaceOptions.manualBinance,
    ...(workspaceOptions.manualBinance || {}),
    accountValue: 'User-07d6a'
  };

  const loadWorkspace = async ({ silent = false } = {}) => {
    if (!silent) {
      setWorkspaceLoading(true);
    }

    try {
      const { data } = await http.get('/payment');
      setWorkspaceError('');
      setPayments(data.payments || []);
      setWorkspaceOptions(data.paymentOptions || defaultWorkspaceOptions);
      setActivePayment((current) => {
        if (current?._id) {
          return data.payments?.find((payment) => payment._id === current._id) || current;
        }

        return data.payments?.find((payment) => payment.status === 'pending') || data.payments?.[0] || null;
      });
    } catch (error) {
      setWorkspaceError(getErrorMessage(error));
    } finally {
      if (!silent) {
        setWorkspaceLoading(false);
      }
    }
  };

  useEffect(() => {
    refreshProfile().catch(() => {});
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const upsertPayment = (incomingPayment) => {
      setPayments((current) => {
        const next = [incomingPayment, ...current.filter((payment) => payment._id !== incomingPayment._id)];
        next.sort((firstPayment, secondPayment) => new Date(secondPayment.createdAt) - new Date(firstPayment.createdAt));
        return next;
      });
      setActivePayment((current) => (current?._id === incomingPayment._id ? incomingPayment : current));
    };

    const handlePaymentStatusUpdated = ({ payment, balance }) => {
      if (!payment) {
        return;
      }

      upsertPayment(payment);

      if (typeof balance === 'number') {
        refreshProfile().catch(() => {});
      }
    };

    socket.on('payment:status-updated', handlePaymentStatusUpdated);

    return () => {
      socket.off('payment:status-updated', handlePaymentStatusUpdated);
    };
  }, [refreshProfile, socket]);

  const handleSubmitPayment = async () => {
    if (!paymentProof.trim()) {
      toast.error('TX hash / transfer reference is required.');
      return;
    }

    setSubmittingPayment(true);
    setWorkspaceError('');

    try {
      let paymentId = activePayment?._id;
      let createdPayment = activePayment;

      if (!paymentId || activePayment?.status !== 'pending') {
        const { data } = await http.post('/payment/request', { amount });
        paymentId = data.payment?._id;
        createdPayment = data.payment;
        setWorkspaceOptions(data.paymentOptions || workspaceOptions);
      }

      const { data } = await http.patch(`/payment/${paymentId}/submit-proof`, {
        txHash: paymentProof.trim()
      });

      setActivePayment(data.payment || createdPayment);
      await loadWorkspace({ silent: true });
      toast.success('Payment request submitted for admin approval.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`${panelClass} p-4 sm:p-6`}>
        <SectionHeader
          eyebrow="Wallet"
          title="Recharge"
          description="Create a recharge request, pay through Binance manually, then submit your TX hash for admin approval."
          actions={
            <div className="flex flex-wrap gap-3">
              <button type="button" className="button-secondary" onClick={() => loadWorkspace()} disabled={workspaceLoading}>
                Refresh
              </button>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Balance" value={formatCoins(user?.coins || 0)} helper="Available credits" />
        <MetricCard label="Rate" value={`1 USDT = ${coinsPerUsdt} coins`} helper="Applied automatically on approved recharge" />
        <MetricCard label="Method" value="1" helper="Manual Binance payment" />
        <MetricCard label="Requests" value={String(payments.length)} helper="Recent payment requests" />
      </div>

      {workspaceError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{workspaceError}</div>
      ) : null}

      <div className={`${panelClass} p-4 sm:p-6`}>
        <SectionHeader
          eyebrow="Binance"
          title="Manual Payment"
          description={`Pay manually with Binance, then send amount and TX hash once. Current rate is 1 USDT = ${coinsPerUsdt} coins.`}
        />

        <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{manualBinance.accountLabel || 'Wallet ID'}</p>
                {manualBinance.accountValue ? (
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                    onClick={() => copyToClipboard(manualBinance.accountValue, manualBinance.accountLabel || 'Wallet ID')}
                    aria-label="Copy wallet ID"
                    title="Copy wallet ID"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="9" y="9" width="10" height="10" rx="2" />
                      <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                    </svg>
                  </button>
                ) : null}
              </div>
              <p className="mt-3 break-all text-sm font-medium text-slate-900">{manualBinance.accountValue || 'User-07d6a'}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
              <div>
                <label className="label" htmlFor="manual-binance-amount">
                  Amount (USDT)
                </label>
                <input
                  id="manual-binance-amount"
                  className="input"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="50"
                />
              </div>
              <div>
                <label className="label" htmlFor="payment-proof">
                  TX Hash / Transfer Reference
                </label>
                <input
                  id="payment-proof"
                  className="input"
                  value={paymentProof}
                  onChange={(event) => setPaymentProof(event.target.value)}
                  placeholder="Paste Binance transfer ID, transaction hash, or payment reference"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="button-primary w-full md:w-auto"
                  disabled={submittingPayment || !manualBinance.enabled || !paymentProof.trim()}
                  onClick={handleSubmitPayment}
                >
                  {submittingPayment ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
              1. Open Binance link and send payment. 2. Paste TX hash / transfer reference. 3. Click once to submit for admin approval.
            </div>

            {activePayment ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Latest Request</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{activePayment.reference}</p>
                  </div>
                  <StatusBadge status={activePayment.status} />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Amount</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {Number(activePayment.amount || 0).toFixed(2)} USDT
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coins</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatCoins(activePayment.coins || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Created</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatLocalDateTime(activePayment.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => copyToClipboard(activePayment.reference, 'Payment reference')}
                  >
                    Copy Request Reference
                  </button>
                  {activePayment.txHash ? (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => copyToClipboard(activePayment.txHash, 'Transaction hash')}
                    >
                      Copy TX Hash
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                No payment submitted yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${panelClass} p-4 sm:p-6`}>
        <SectionHeader
          eyebrow="Activity"
          title="Recent Requests"
          description={workspaceLoading ? 'Loading payment activity...' : 'Latest payment requests and status.'}
        />

        <div className="mt-5 space-y-4">
          {recentPayments.length ? (
            recentPayments.map((payment) => <PaymentRow key={payment._id} payment={payment} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No payment requests yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
