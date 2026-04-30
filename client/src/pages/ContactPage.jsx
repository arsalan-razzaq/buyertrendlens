import { useState } from 'react';
import { Link } from 'react-router-dom';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import http, { getErrorMessage } from '../api/http';
import AppLogo from '../components/AppLogo';

const supportEmail = 'info@buyertrendlens.com';
const titleTag = 'Contact Us | Buyer Trend Lens';
const metaDescription =
  'Contact Buyer Trend Lens for G2G marketplace data access, pricing, technical help, and custom delivery requests.';

const contactReasons = [
  'Custom G2G data feeds',
  'Pricing and plan discussion',
  'Technical or account support',
  'Delivery format requests'
];

const ContactPage = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [copyLabel, setCopyLabel] = useState('Copy Email');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useDocumentMetadata({
    title: titleTag,
    description: metaDescription
  });

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
      const { data } = await http.post('/contact', formState);
      setStatus({
        type: 'success',
        message: data.message || 'Your message has been sent successfully.'
      });
      setFormState({
        name: '',
        email: '',
        company: '',
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopyLabel('Copied');
      window.setTimeout(() => setCopyLabel('Copy Email'), 1800);
    } catch {
      setCopyLabel('Copy Failed');
      window.setTimeout(() => setCopyLabel('Copy Email'), 1800);
    }
  };

  return (
    <div className="min-h-screen bg-[#06161d] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,_rgba(16,185,129,0.22),_transparent_24%),radial-gradient(circle_at_82%_26%,_rgba(59,130,246,0.16),_transparent_18%),linear-gradient(135deg,_#0a3537_0%,_#072028_40%,_#06161d_100%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '38px 38px'
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,_rgba(7,24,31,0.86),_rgba(4,19,28,0.78))] shadow-[0_40px_120px_rgba(0,0,0,0.34)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 px-6 py-5 md:px-8">
              <div>
                <AppLogo imageClassName="h-14 md:h-16" />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link className="text-slate-300 transition hover:text-white" to="/">
                  Home
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 font-semibold text-white transition hover:bg-white/[0.1]"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="grid gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-8 lg:py-10">
              <div className="space-y-6">
                <div>
                  <h1 className="mt-4 max-w-[11ch] text-4xl font-semibold leading-[0.94] tracking-[-0.065em] text-white sm:text-5xl md:text-6xl">
                    Let&apos;s talk about your data workflow.
                  </h1>
                  <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
                    Reach out for marketplace data access, custom monitoring requests, delivery options, or account
                    support. Keep the message clear and we&apos;ll keep the reply useful.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {contactReasons.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.02))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100/75">Direct Inbox</p>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="mt-4 block text-2xl font-semibold tracking-[-0.04em] text-white transition hover:text-emerald-100"
                  >
                    {supportEmail}
                  </a>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Best for pricing requests, support issues, account questions, and custom data feed discussions.
                  </p>

                </div>
              </div>

              <div className="rounded-[30px] border border-[#253a58] bg-[#121e39] p-4 text-white shadow-[0_35px_100px_rgba(0,0,0,0.42)] sm:p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-100/70">Message Builder</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl md:text-4xl">
                      Send us the right details
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Reply Route</p>
                    <p className="mt-1 text-sm font-semibold text-white">Email Support</p>
                  </div>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
                  Fill the form and we&apos;ll send it directly to our inbox. That keeps the message structured and reduces
                  back-and-forth.
                </p>

                <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                  <div>
                    <label className="label text-slate-300" htmlFor="name">
                      Name
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                      id="name"
                      name="name"
                      onChange={handleChange}
                      required
                      value={formState.name}
                    />
                  </div>

                  <div>
                    <label className="label text-slate-300" htmlFor="email">
                      Email
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                      id="email"
                      name="email"
                      onChange={handleChange}
                      required
                      type="email"
                      value={formState.email}
                    />
                  </div>

                  <div>
                    <label className="label text-slate-300" htmlFor="company">
                      Company
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                      id="company"
                      name="company"
                      onChange={handleChange}
                      value={formState.company}
                    />
                  </div>

                  <div>
                    <label className="label text-slate-300" htmlFor="subject">
                      Subject
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                      id="subject"
                      name="subject"
                      onChange={handleChange}
                      value={formState.subject}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label text-slate-300" htmlFor="message">
                      Message
                    </label>
                    <textarea
                      className="min-h-44 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                      id="message"
                      name="message"
                      onChange={handleChange}
                      required
                      placeholder="Tell us what you need, what problem you're seeing, or what feed/output format you're asking for."
                      value={formState.message}
                    />
                  </div>

                  {status.message ? (
                    <div
                      className={`md:col-span-2 rounded-2xl px-4 py-3 text-sm ${
                        status.type === 'success'
                          ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                          : 'border border-rose-400/30 bg-rose-400/10 text-rose-100'
                      }`}
                    >
                      {status.message}
                    </div>
                  ) : null}

                  <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                    <button
                      className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(90deg,_#19d59d,_#12c68e)] px-6 py-3 text-sm font-semibold text-[#05201d] transition hover:brightness-110"
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
