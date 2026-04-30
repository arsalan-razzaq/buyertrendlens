import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import { useAuth } from '../hooks/useAuth';
import { hasFirebaseGoogleConfig, signInWithGooglePopup } from '../utils/firebase';
import AppLogo from '../components/AppLogo';

const initialForm = {
  name: '',
  email: '',
  password: ''
};

const trustPoints = ['Secure email login', 'Google sign-in support', 'Protected dashboard access'];
const titleTag = 'Buyer Trend Lens Login | Secure Workspace Access';
const metaDescription =
  'Sign in to Buyer Trend Lens to access G2G marketplace data exports, wallet funding, and account tools.';

const mapGoogleLoginError = (error) => {
  const code = error?.code || error?.message;

  if (String(code).includes('auth/configuration-not-found')) {
    return 'Firebase Authentication is not enabled for this project. In Firebase Console, open Authentication, click Get started, then enable the Google provider.';
  }

  if (String(code).includes('auth/unauthorized-domain')) {
    return 'This domain is not authorized in Firebase. Add localhost to Firebase Authentication -> Settings -> Authorized domains.';
  }

  if (String(code).includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before authentication completed.';
  }

  return error?.message || 'Google sign-in failed.';
};

const SparkGrid = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
    <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px'
      }}
    />
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M21.805 12.23c0-.68-.061-1.334-.175-1.962H12v3.71h5.5a4.705 4.705 0 0 1-2.04 3.087v2.563h3.3c1.932-1.779 3.045-4.401 3.045-7.399Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.76 0 5.076-.915 6.769-2.469l-3.3-2.563c-.915.613-2.085.975-3.469.975-2.667 0-4.927-1.8-5.733-4.22H2.856v2.644A10 10 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.267 13.723A5.996 5.996 0 0 1 5.946 12c0-.598.109-1.178.32-1.723V7.633H2.856A10 10 0 0 0 2 12c0 1.611.385 3.137 1.067 4.367l3.2-2.644Z"
      fill="#FBBC05"
    />
    <path
      d="M12 6.057c1.5 0 2.848.516 3.91 1.53l2.932-2.932C17.07 2.99 14.754 2 12 2A10 10 0 0 0 2.856 7.633l3.41 2.644c.806-2.42 3.066-4.22 5.733-4.22Z"
      fill="#EA4335"
    />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login, signup, googleLogin, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  useDocumentMetadata({
    title: titleTag,
    description: metaDescription
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : destination, { replace: true });
    }
  }, [destination, isAuthenticated, navigate, user?.role]);

  const onChange = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (mode === 'login') {
        const response = await login({ email: form.email, password: form.password });
        navigate(response.user.role === 'admin' ? '/admin' : destination, { replace: true });
      } else {
        const response = await signup(form);
        navigate(response.user.role === 'admin' ? '/admin' : destination, { replace: true });
      }
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const googleIdToken = await signInWithGooglePopup();
      const response = await googleLogin(googleIdToken);
      navigate(response.user.role === 'admin' ? '/admin' : destination, { replace: true });
    } catch (googleError) {
      setError(mapGoogleLoginError(googleError));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04141c] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(16,185,129,0.20),_transparent_24%),radial-gradient(circle_at_80%_18%,_rgba(45,212,191,0.14),_transparent_18%),radial-gradient(circle_at_84%_74%,_rgba(37,99,235,0.14),_transparent_20%),linear-gradient(135deg,_#0a3a3a_0%,_#05262d_32%,_#04141c_68%,_#081a28_100%)]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '42px 42px'
          }}
        />
        <div className="absolute left-[12%] top-[22%] h-72 w-72 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-10 right-[10%] h-64 w-64 rounded-full bg-sky-500/10 blur-[120px]" />

        <div className="relative flex min-h-screen items-center justify-center px-4 py-6 lg:px-6">
      <div className="grid w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(7,24,31,0.82),_rgba(4,19,28,0.76))] shadow-[0_40px_120px_rgba(0,0,0,0.36)] backdrop-blur md:rounded-[36px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden bg-[#11212b] p-6 text-white sm:p-8 md:p-10 lg:flex lg:flex-col lg:justify-center">
          <SparkGrid />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                className="transition hover:opacity-90"
                to="/"
                aria-label="Go to home"
                title="Home"
              >
                <AppLogo imageClassName="h-16 md:h-20" />
              </Link>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link className="text-slate-300 transition hover:text-white" to="/contact">
                  Contact Us
                </Link>
              </div>
            </div>

            <h1 className="mt-8 max-w-xl text-3xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-4xl md:text-6xl">
              Secure access for teams working on live G2G marketplace data.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              Sign in to manage exports, wallet credits, and protected dataset tools built around fast-moving market
              workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {trustPoints.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[linear-gradient(180deg,_rgba(9,27,36,0.82),_rgba(6,20,29,0.88))] p-6 text-white md:p-10 lg:border-l lg:border-t-0">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-100/75">Secure Workspace</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl md:text-4xl">
                {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
                Access your wallet, export controls, and marketplace data workspace through a cleaner sign-in flow.
              </p>
            </div>

            <div className="mb-6 flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              {['login', 'signup'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode(item);
                  }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    mode === item ? 'bg-[linear-gradient(135deg,rgba(18,213,183,0.18),rgba(69,142,255,0.12))] text-white shadow-[0_10px_24px_rgba(18,213,183,0.12)]' : 'text-slate-400'
                  }`}
                >
                  {item === 'login' ? 'Login' : 'Signup'}
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' ? (
                <label>
                  <span className="label text-slate-300">Full Name</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]" value={form.name} onChange={(e) => onChange('name', e.target.value)} />
                </label>
              ) : null}

              <label>
                <span className="label text-slate-300">Email</span>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                />
              </label>

              <label>
                <span className="label text-slate-300">Password</span>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]"
                  value={form.password}
                  onChange={(e) => onChange('password', e.target.value)}
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(90deg,_#19d59d,_#12c68e)] px-4 py-3 text-sm font-semibold text-[#05201d] shadow-[0_16px_34px_rgba(25,213,157,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {hasFirebaseGoogleConfig ? (
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                <GoogleIcon />
                {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </button>
            ) : (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                Google OAuth is disabled until Firebase web config is available.
              </div>
            )}
          </div>
        </section>
      </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
