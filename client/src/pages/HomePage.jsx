import { Link } from 'react-router-dom';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import AppLogo from '../components/AppLogo';

const titleTag = 'Buyer Trend Lens | G2G Listings, Exports, and Wallet Control';
const metaDescription =
  'Buyer Trend Lens helps teams filter G2G listings, export results, manage wallet credits, and handle admin approvals in one place.';

const heroStats = [
  { value: '13+', label: 'Listing filters' },
  { value: '3', label: 'Export formats' },
  { value: '2', label: 'User roles' }
];

const lowerPanels = [
  {
    eyebrow: 'Listing workflow',
    title: 'Filter G2G listings without the extra noise.',
    body:
      'Search by game, seller, price, rating, rank, score, groups, and orders sold, then export only the rows you need.'
  },
  {
    eyebrow: 'Wallet and admin',
    title: 'Keep exports, recharges, users, and approvals in one flow.',
    body:
      'Users can recharge coins and export data, while admins review payments, manage balances, and monitor accounts.'
  }
];

const BarChart = () => (
  <div className="grid h-32 grid-cols-12 items-end gap-1.5 rounded-[16px] border border-white/8 bg-[#081521] px-3 pb-3 pt-4">
    {[46, 72, 94, 58, 112, 124, 88, 134, 102, 118, 126, 76].map((height, index) => (
      <div
        key={`${height}-${index}`}
        className="rounded-t-full bg-[linear-gradient(180deg,_#12dbc9_0%,_#1ea8ff_100%)] shadow-[0_0_18px_rgba(30,168,255,0.16)]"
        style={{ height }}
      />
    ))}
  </div>
);

const LineChart = () => (
  <div className="rounded-[16px] border border-white/8 bg-[#081521] p-3">
    <svg viewBox="0 0 280 132" className="h-32 w-full">
      {[32, 92, 152, 212].map((x) => (
        <line key={x} x1={x} y1="10" x2={x} y2="122" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 7" />
      ))}
      {[30, 62, 94].map((y) => (
        <line key={y} x1="8" y1={y} x2="272" y2={y} stroke="rgba(255,255,255,0.05)" />
      ))}
      <path
        d="M14 88 C34 66, 54 70, 74 60 S116 42, 142 56 S188 88, 220 72 S250 54, 266 34"
        fill="none"
        stroke="#11dbc6"
        strokeLinecap="round"
        strokeWidth="3.5"
      />
      <path
        d="M14 100 C40 92, 60 90, 82 82 S126 72, 150 84 S192 98, 220 92 S250 84, 266 74"
        fill="none"
        stroke="rgba(120,196,255,0.72)"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  </div>
);

const StatPill = ({ value, label }) => (
  <div className="min-w-[110px]">
    <p className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-white">{value}</p>
    <p className="mt-2 text-sm text-slate-400">{label}</p>
  </div>
);

const HomePage = () => {
  useDocumentMetadata({
    title: titleTag,
    description: metaDescription
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-[#04141c] text-white">
      <section className="relative overflow-x-clip overflow-y-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(16,185,129,0.22),_transparent_24%),radial-gradient(circle_at_66%_24%,_rgba(45,212,191,0.14),_transparent_18%),radial-gradient(circle_at_84%_74%,_rgba(37,99,235,0.14),_transparent_20%),linear-gradient(135deg,_#0a3a3a_0%,_#05262d_32%,_#04141c_68%,_#081a28_100%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px'
          }}
        />
        <div className="absolute left-[14%] top-[34%] h-72 w-72 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-10 right-[14%] h-64 w-64 rounded-full bg-sky-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-4 md:px-6 md:py-8 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,_rgba(7,24,31,0.8),_rgba(4,19,28,0.7))] px-4 py-5 shadow-[0_40px_120px_rgba(0,0,0,0.36)] backdrop-blur sm:px-6 md:rounded-[34px] md:px-8 md:py-7 lg:px-10 lg:py-10">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center">
                <AppLogo imageClassName="h-9 drop-shadow-[0_10px_24px_rgba(0,0,0,0.22)] sm:h-11" />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link className="text-slate-300 transition hover:text-white" to="/contact">
                  Contact Us
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="grid min-w-0 gap-8 py-7 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-center lg:gap-10 lg:py-10">
              <div className="max-w-[37rem]">
                <h1 className="max-w-[11ch] text-[2rem] font-semibold leading-[0.95] tracking-[-0.075em] text-white sm:max-w-[9.5ch] sm:text-[4rem] lg:text-[4.85rem]">
                  Filter G2G listings and export only what matters
                </h1>

                <div className="mt-4 h-[4px] w-full max-w-[25rem] rounded-full bg-[linear-gradient(90deg,_#12d5b7_0%,_#21d7c2_32%,_#458eff_100%)] shadow-[0_0_24px_rgba(33,215,194,0.32)]" />

                <p className="mt-6 max-w-[35rem] text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                  Buyer Trend Lens gives you a cleaner way to search marketplace data, check seller details, manage wallet
                  credits, and export filtered results.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(90deg,_#19d59d,_#12c68e)] px-6 py-3 text-sm font-semibold text-[#05201d] shadow-[0_16px_34px_rgba(25,213,157,0.24)] transition hover:brightness-110"
                  >
                    Open Dashboard
                    <span className="ml-3">-&gt;</span>
                  </Link>
                </div>

                <div className="mt-8 border-t border-white/8 pt-6">
                  <div className="grid gap-6 sm:grid-cols-3">
                    {heroStats.map((item) => (
                      <StatPill key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mx-auto w-full min-w-0 max-w-full sm:max-w-[39rem]">
                <div className="overflow-hidden rounded-[24px] border border-[#253a58] bg-[#121e39] p-3 shadow-[0_35px_100px_rgba(0,0,0,0.52)] sm:rounded-[28px] sm:p-4">
                  <div className="flex items-center gap-2 border-b border-white/8 pb-3">
                    <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                    <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                    <span className="h-3 w-3 rounded-full bg-[#10b981]" />
                    <div className="ml-2 min-w-0 flex-1 truncate rounded-xl bg-[#1a2744] px-3 py-2 text-[11px] text-slate-500 sm:ml-4 sm:px-4 sm:text-xs">
                      buyertrendlens.app/g2g
                    </div>
                  </div>

                  <div className="mt-4 rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.02),_rgba(255,255,255,0.01))] p-3 sm:rounded-[22px] sm:p-4">
                    <div className="rounded-[16px] border border-white/8 bg-[radial-gradient(circle_at_18%_18%,_rgba(34,197,94,0.18),_transparent_22%),linear-gradient(180deg,_#08131f_0%,_#05101b_100%)] p-3 sm:rounded-[18px] sm:p-4">
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
                            G2G listing workspace
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Search listings, review sellers, and prepare exports.</p>
                        </div>
                        <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                          Export ready
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
                        <BarChart />
                        <LineChart />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ['13+', 'Filter fields'],
                          ['3', 'Export formats'],
                          ['Wallet', 'Coin balance'],
                          ['Admin', 'Users & payments']
                        ].map(([value, label]) => (
                          <div key={label} className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-3">
                            <p className="text-lg font-semibold text-white">{value}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden rounded-[18px] border border-cyan-300/12 bg-[#10233a] px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur md:absolute md:-left-3 md:bottom-20 md:block">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#11d7c3] text-sm font-bold text-[#052733]">
                      ^
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">Exports</p>
                      <p className="mt-1 text-xl font-semibold tracking-[-0.05em] text-emerald-300 sm:text-2xl">CSV / JSON / TSV</p>
                    </div>
                  </div>
                </div>

                <div className="hidden rounded-[18px] border border-white/10 bg-[#10233a] px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur md:absolute md:-right-3 md:top-14 md:block">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    Rows
                  </div>
                  <p className="mt-2 text-[2rem] font-semibold leading-none tracking-[-0.05em] text-white">1M</p>
                  <p className="mt-1 text-sm text-slate-400">Rows available in the dataset</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 md:px-6 md:pb-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          {lowerPanels.map((panel) => (
            <article
              key={panel.title}
              className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.02))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-7"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-100/72">{panel.eyebrow}</p>
              <h2 className="mt-4 max-w-[16ch] text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">{panel.title}</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{panel.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
