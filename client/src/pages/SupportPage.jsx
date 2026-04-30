import { useState } from 'react';
import http, { getErrorMessage } from '../api/http';

const supportEmail = 'info@buyertrendlens.com';

const issueTags = ['Payment help', 'Wallet issue', 'Export support', 'Account access'];

const SupportIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 18h.01" />
    <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
    <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" />
  </svg>
);

const ResponseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 4v5c0 4.2-2.5 7.5-7 9-4.5-1.5-7-4.8-7-9V7l7-4Z" />
    <path d="M9.5 12l1.7 1.7L14.8 10" />
  </svg>
);

const SupportPage = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setStatus({ type: '', message: '' });
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const { data } = await http.post('/contact', {
        ...formState,
        company: 'Buyer Trend Lens User'
      });

      setStatus({
        type: 'success',
        message: data.message || 'Your support request has been sent to info@buyertrendlens.com.'
      });
      setFormState({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getErrorMessage(error)
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbfd_100%)] shadow-sm">
        <div className="border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Support Desk</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-3xl">Contact Support</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
            Reach our team for payment issues, wallet questions, export troubleshooting, or account-related help.
          </p>
        </div>

        <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Direct Inbox</p>
            <p className="mt-3 break-all text-[1.6rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2rem]">{supportEmail}</p>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Every support form submission is delivered directly to this inbox.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <SupportIcon />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-950">Structured support intake</p>
                  <p className="mt-1 text-sm leading-7 text-slate-500">
                    Include payment references, wallet details, or export context so the team can resolve issues faster.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <ResponseIcon />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-950">Faster reply flow</p>
                  <p className="mt-1 text-sm leading-7 text-slate-500">
                    Clear subject lines and issue summaries help us route your request to the right person quickly.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <ShieldIcon />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-950">Account-safe communication</p>
                  <p className="mt-1 text-sm leading-7 text-slate-500">
                    Use the email address tied to your account when possible so support can verify your request safely.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {issueTags.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Message Builder</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-3xl">Tell us what you need</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
            Share the problem clearly and include any reference numbers, wallet details, or export issues that support should review.
          </p>
        </div>

        <form className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="support-name">
              Name
            </label>
            <input
              id="support-name"
              name="name"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
              value={formState.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="support-email">
              Email
            </label>
            <input
              id="support-email"
              name="email"
              type="email"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
              value={formState.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="support-subject">
              Subject
            </label>
            <input
              id="support-subject"
              name="subject"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
              value={formState.subject}
              onChange={handleChange}
              placeholder="Example: Payment pending, wallet balance issue, export problem"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="support-message">
              Message
            </label>
            <textarea
              id="support-message"
              name="message"
              className="min-h-48 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
              value={formState.message}
              onChange={handleChange}
              placeholder="Describe the issue, add payment references, transaction hashes, or any detail that will help support review your case."
              required
            />
          </div>

          {status.message ? (
            <div
              className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {status.message}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Messages from this page are sent directly to {supportEmail}.</p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(90deg,_#19d59d,_#12c68e)] px-6 py-3 text-sm font-semibold text-[#05201d] shadow-[0_16px_34px_rgba(25,213,157,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SupportPage;
