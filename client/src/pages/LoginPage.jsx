import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import { useAuth } from '../hooks/useAuth';
import { hasFirebaseGoogleConfig, signInWithGooglePopup } from '../utils/firebase';
import AppLogo from '../components/AppLogo';

const initialForm = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  country: '',
  countryCode: '',
  countryIso: '',
  companyName: '',
  jobTitle: '',
  useCase: '',
  preferredContactMethod: 'email',
  messagingHandle: '',
  isWhatsAppNumber: false,
  termsAccepted: false
};

const trustPoints = ['Secure email login', 'Google sign-in support', 'Protected dashboard access'];
const titleTag = 'Buyer Trend Lens Login | Secure Workspace Access';
const metaDescription =
  'Sign in to Buyer Trend Lens to access G2G marketplace data exports, wallet funding, and account tools.';

const signupSteps = [
  {
    id: 'identity',
    eyebrow: 'Step 1',
    title: 'Account basics',
    description: 'Set the core identity used across your workspace and support flows.',
    fields: ['name', 'email', 'password']
  },
  {
    id: 'contact',
    eyebrow: 'Step 2',
    title: 'Contact details',
    description: 'Add the fastest path support can use when payment or export issues appear.',
    fields: ['phoneNumber', 'isWhatsAppNumber']
  },
  {
    id: 'workspace',
    eyebrow: 'Step 3',
    title: 'Workspace fit',
    description: 'Tell us how you plan to use the platform so the account starts with better context.',
    fields: ['companyName', 'jobTitle', 'useCase', 'termsAccepted']
  }
];

const useCaseOptions = [
  'Reseller operations',
  'Market research',
  'Pricing analysis',
  'Account sourcing',
  'Agency / team access'
];

const countryOptions = [
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'QA', name: 'Qatar', dialCode: '+974' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'OM', name: 'Oman', dialCode: '+968' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973' },
  { code: 'TR', name: 'Turkey', dialCode: '+90' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'DE', name: 'Germany', dialCode: '+49' }
];

const fallbackCountry = countryOptions[0];

const timeZoneCountryMap = {
  'Asia/Karachi': 'PK',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Kolkata': 'IN',
  'Asia/Dhaka': 'BD',
  'Europe/London': 'GB',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'Australia/Sydney': 'AU',
  'Europe/Berlin': 'DE'
};

const getCountryByCode = (countryCode) =>
  countryOptions.find((item) => item.code === String(countryCode || '').toUpperCase()) || fallbackCountry;

const getFlagUrl = (countryCode) => `https://flagcdn.com/24x18/${String(countryCode || '').toLowerCase()}.png`;

const getBrowserCountry = () => {
  if (typeof navigator === 'undefined') {
    return fallbackCountry;
  }

  const language = navigator.language || navigator.languages?.[0] || '';
  let region = '';

  try {
    region = new Intl.Locale(language).region || '';
  } catch {
    region = language.split('-')[1] || '';
  }

  if (region) {
    return countryOptions.find((item) => item.code === String(region).toUpperCase()) || fallbackCountry;
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return getCountryByCode(timeZoneCountryMap[timeZone] || fallbackCountry.code);
};

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

const SparkGrid = ({ signupMode = false }) => (
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
    <div
      className={`absolute right-8 top-12 h-24 w-24 rounded-[28px] border border-white/15 bg-white/[0.05] shadow-[0_18px_50px_rgba(0,0,0,0.2)] transition-all duration-700 ${
        signupMode ? 'translate-y-0 rotate-6 opacity-100' : '-translate-y-8 rotate-12 opacity-35'
      }`}
    />
    <div
      className={`absolute right-28 top-28 h-20 w-20 rounded-[24px] border border-emerald-300/20 bg-emerald-300/[0.06] transition-all duration-700 ${
        signupMode ? 'translate-x-0 translate-y-0 -rotate-6 opacity-100' : 'translate-x-8 translate-y-3 rotate-3 opacity-30'
      }`}
    />
    <div
      className={`absolute bottom-20 right-14 h-16 w-28 rounded-[22px] border border-cyan-200/15 bg-cyan-200/[0.05] transition-all duration-700 ${
        signupMode ? 'translate-y-0 -rotate-3 opacity-100' : 'translate-y-6 rotate-6 opacity-25'
      }`}
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

const BackIcon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
    <path
      d="M12.75 4.75 7.5 10l5.25 5.25M8 10h7.25"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const FieldLabel = ({ children }) => <span className="mb-2 block text-sm text-slate-300">{children}</span>;

const inputClassName =
  'w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:bg-white/[0.08]';

const ModeBackdrop = ({ mode }) => (
  <>
     
    <div
      className={`pointer-events-none absolute -right-10 top-24 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl transition-all duration-700 ${
        mode === 'signup' ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}
    />
    <div
      className={`pointer-events-none absolute bottom-10 left-8 h-20 w-20 rounded-[24px] border border-cyan-200/10 bg-cyan-300/[0.04] transition-all duration-700 ${
        mode === 'signup' ? 'translate-y-0 rotate-6 opacity-100' : 'translate-y-6 rotate-12 opacity-0'
      }`}
    />
  </>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login, signup, googleLogin, loading } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef(null);

  const destination = location.state?.from?.pathname || '/dashboard';
  const activeSignupStep = signupSteps[signupStep];

  useDocumentMetadata({
    title: titleTag,
    description: metaDescription
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/admin' : destination, { replace: true });
    }
  }, [destination, isAuthenticated, navigate, user?.role]);

  useEffect(() => {
    if (mode === 'login') {
      setSignupStep(0);
    }
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    const applyDetectedCountry = (detectedCountry) => {
      if (cancelled) {
        return;
      }

      setForm((current) => {
        if (current.country || current.countryCode) {
          return current;
        }

        return {
          ...current,
          country: detectedCountry.name,
          countryCode: detectedCountry.dialCode,
          countryIso: detectedCountry.code
        };
      });
    };

    fetch('/api/auth/signup-context')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Signup context unavailable');
        }

        const payload = await response.json();
        const requestCountry = payload?.country?.code ? getCountryByCode(payload.country.code) : getBrowserCountry();
        applyDetectedCountry(requestCountry);
      })
      .catch(() => {
        applyDetectedCountry(getBrowserCountry());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (countryMenuRef.current && !countryMenuRef.current.contains(event.target)) {
        setCountryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [countryMenuOpen]);

  const onChange = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const signupValidationErrors = useMemo(
    () => ({
      0: [
        !form.name.trim() && 'Full name is required.',
        !form.email.trim() && 'Email is required.',
        !form.password.trim() && 'Password is required.',
        form.password && form.password.length < 6 && 'Password must be at least 6 characters.'
      ].filter(Boolean),
      1: [
        !form.phoneNumber.trim() && 'Phone number is required.'
      ].filter(Boolean),
      2: [
        !form.useCase.trim() && 'Use case is required.',
        !form.termsAccepted && 'You must accept the terms to continue.'
      ].filter(Boolean)
    }),
    [form]
  );

  const moveToNextSignupStep = () => {
    const currentErrors = signupValidationErrors[signupStep] || [];
    if (currentErrors.length) {
      setError(currentErrors[0]);
      return;
    }

    setError('');
    setSignupStep((current) => Math.min(current + 1, signupSteps.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (mode === 'login') {
        const response = await login({ email: form.email, password: form.password });
        navigate(response.user.role === 'admin' ? '/admin' : destination, { replace: true });
        return;
      }

      const currentErrors = signupValidationErrors[signupStep] || [];
      if (currentErrors.length) {
        setError(currentErrors[0]);
        return;
      }

      if (signupStep < signupSteps.length - 1) {
        moveToNextSignupStep();
        return;
      }

      const signupPayload = {
        ...form,
        country: form.country || fallbackCountry.name,
        preferredContactMethod: form.isWhatsAppNumber ? 'whatsapp' : 'email',
        messagingHandle: form.isWhatsAppNumber ? `${form.countryCode} ${form.phoneNumber}`.trim() : '',
        phoneNumber: `${form.countryCode} ${form.phoneNumber}`.trim()
      };

      const response = await signup(signupPayload);
      navigate(response.user.role === 'admin' ? '/admin' : destination, { replace: true });
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

  const renderSignupStep = () => {
    if (signupStep === 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <FieldLabel>Full Name</FieldLabel>
            <input className={inputClassName} value={form.name} onChange={(e) => onChange('name', e.target.value)} />
          </label>

          <label className="md:col-span-2">
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              className={inputClassName}
              value={form.email}
              onChange={(e) => onChange('email', e.target.value)}
            />
          </label>

          <label className="md:col-span-2">
            <FieldLabel>Password</FieldLabel>
            <input
              type="password"
              className={inputClassName}
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
            />
          </label>
        </div>
      );
    }

    if (signupStep === 1) {
      const selectedCountry = getCountryByCode(form.countryIso || fallbackCountry.code);

      return (
        <div className="grid gap-4">
          <label>
            <FieldLabel>Phone Number</FieldLabel>
            <div
              ref={countryMenuRef}
              className="relative flex overflow-visible rounded-2xl border border-white/10 bg-white/[0.06] transition focus-within:border-emerald-300/70 focus-within:bg-white/[0.08]"
            >
              <button
                type="button"
                className="inline-flex min-w-[154px] items-center justify-between gap-3 border-r border-white/10 px-4 py-3 text-sm font-semibold text-emerald-100"
                onClick={() => setCountryMenuOpen((current) => !current)}
              >
                <span className="inline-flex items-center gap-2">
                  <img
                    src={getFlagUrl(selectedCountry.code)}
                    alt={selectedCountry.name}
                    className="h-[14px] w-5 rounded-[2px] object-cover"
                  />
                  <span>{selectedCountry.dialCode}</span>
                </span>
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-slate-400">
                  <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </button>

              {countryMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+10px)] z-20 max-h-72 w-64 overflow-y-auto rounded-2xl bg-[#0d1d29] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                  {countryOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        option.code === selectedCountry.code ? 'bg-white/[0.08] text-white' : 'text-slate-300 hover:bg-white/[0.05]'
                      }`}
                      onClick={() => {
                        setCountryMenuOpen(false);
                        setError('');
                        setForm((current) => ({
                          ...current,
                          country: option.name,
                          countryCode: option.dialCode,
                          countryIso: option.code
                        }));
                      }}
                    >
                      <span className="inline-flex items-center gap-3">
                        <img
                          src={getFlagUrl(option.code)}
                          alt={option.name}
                          className="h-[14px] w-5 rounded-[2px] object-cover"
                        />
                        <span>{option.name}</span>
                      </span>
                      <span className="text-emerald-100">{option.dialCode}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <input
                className="w-full bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-500"
                value={form.phoneNumber}
                onChange={(e) => onChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="3001234567"
                inputMode="numeric"
              />
            </div>
          </label>

          <label className="rounded-2xl bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400"
                checked={form.isWhatsAppNumber}
                onChange={(e) => onChange('isWhatsAppNumber', e.target.checked)}
              />
              <div>
                <span className="block font-medium text-white">This number is on WhatsApp</span>
                <span className="mt-1 block text-xs text-slate-400">We will use the same number if support ever needs a faster reply path.</span>
              </div>
            </div>
          </label>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <FieldLabel>Company Name</FieldLabel>
          <input
            className={inputClassName}
            value={form.companyName}
            onChange={(e) => onChange('companyName', e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label>
          <FieldLabel>Job Title</FieldLabel>
          <input
            className={inputClassName}
            value={form.jobTitle}
            onChange={(e) => onChange('jobTitle', e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="md:col-span-2">
          <FieldLabel>Primary Use Case</FieldLabel>
          <select className={inputClassName} value={form.useCase} onChange={(e) => onChange('useCase', e.target.value)}>
            <option value="" className="bg-slate-900">
              Select use case
            </option>
            {useCaseOptions.map((option) => (
              <option key={option} value={option} className="bg-slate-900">
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400"
              checked={form.termsAccepted}
              onChange={(e) => onChange('termsAccepted', e.target.checked)}
            />
            <span>I agree to account verification, support contact, and platform usage terms.</span>
          </div>
        </label>
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#04141c] text-white">
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
          <div className="grid w-full max-w-7xl overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(7,24,31,0.82),_rgba(4,19,28,0.76))] shadow-[0_40px_120px_rgba(0,0,0,0.36)] backdrop-blur md:rounded-[36px]">
            {mode === 'signup' ? (
              <section className="relative overflow-hidden p-6 text-white sm:p-8 md:p-10">
                <SparkGrid signupMode />
                <ModeBackdrop mode={mode} />

                <div
                  key="signup-shell"
                  className="relative z-10"
                  style={{ animation: 'panel-expand 520ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                >
                  <div className="relative w-full">
                    <div className="mb-6 mt-6 rounded-[30px] bg-[#0b212b]/95 px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:mt-8 md:px-8 md:py-7">
                      <div className="max-w-3xl">
                        <p className="text-xs uppercase tracking-[0.34em] text-emerald-100/70">Secure Workspace</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Create your account</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">{activeSignupStep.description}</p>
                      </div>
                    </div>

                    <div className="mb-5 flex rounded-2xl bg-white/[0.04] p-1">
                      {['login', 'signup'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setError('');
                            setMode(item);
                          }}
                          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                            mode === item
                              ? 'bg-[linear-gradient(135deg,rgba(18,213,183,0.18),rgba(69,142,255,0.12))] text-white shadow-[0_10px_24px_rgba(18,213,183,0.12)]'
                              : 'text-slate-400'
                          }`}
                        >
                          {item === 'login' ? 'Login' : 'Signup'}
                        </button>
                      ))}
                    </div>

                    <div className="mb-4 flex justify-start md:-mt-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                        onClick={() => {
                          setError('');
                          if (signupStep === 0) {
                            setMode('login');
                            return;
                          }

                          setSignupStep((current) => Math.max(current - 1, 0));
                        }}
                      >
                        <BackIcon />
                        Back
                      </button>
                    </div>

                    <div className="mb-6 rounded-[26px] bg-white/[0.03] p-4">
                      <div className="mb-4 flex items-center gap-2">
                        {signupSteps.map((step, index) => (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => setSignupStep(index)}
                            className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                              index === signupStep ? 'bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.35)]' : 'bg-white/10'
                            }`}
                            aria-label={`Open ${step.title}`}
                          />
                        ))}
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        {signupSteps.map((step, index) => (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => setSignupStep(index)}
                            className={`rounded-2xl px-4 py-3 text-left transition ${
                              index === signupStep
                                ? 'bg-[linear-gradient(135deg,rgba(18,213,183,0.16),rgba(69,142,255,0.12))] text-white'
                                : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]'
                            }`}
                          >
                            <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-400">{step.eyebrow}</span>
                            <span className="mt-1 block text-sm font-medium">{step.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div
                        className="overflow-hidden rounded-[30px] bg-[linear-gradient(180deg,rgba(18,38,48,0.96),rgba(9,26,36,0.92))] p-5 shadow-[0_26px_70px_rgba(16,185,129,0.10)] md:p-6"
                        style={{ boxShadow: '0 22px 60px rgba(6, 182, 212, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}
                      >
                        <div className="mb-5 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/70">{activeSignupStep.eyebrow}</p>
                            <h2 className="mt-2 text-xl font-semibold text-white">{activeSignupStep.title}</h2>
                          </div>
                        </div>

                        <div key={`signup-${signupStep}`} className="space-y-4" style={{ animation: 'fade-slide 420ms ease' }}>
                          {renderSignupStep()}
                        </div>
                      </div>

                      {error ? (
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-200">
                          {error}
                        </div>
                      ) : null}

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="ml-auto inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,_#19d59d,_#12c68e)] px-5 py-3 text-sm font-semibold text-[#05201d] shadow-[0_16px_34px_rgba(25,213,157,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={loading}
                        >
                          <span>{loading ? 'Please wait...' : signupStep < signupSteps.length - 1 ? 'Continue' : 'Create Account'}</span>
                          {!loading ? (
                            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                              <path
                                d="M4.75 10h9.19m0 0-3.22-3.22M13.94 10l-3.22 3.22"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                              />
                            </svg>
                          ) : null}
                        </button>
                      </div>
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
                </div>
              </section>
            ) : (
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <section className="relative overflow-hidden bg-[#11212b] p-6 text-white sm:p-8 md:p-10 lg:flex lg:flex-col lg:justify-center">
                  <SparkGrid signupMode={false} />

                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Link className="transition hover:opacity-90" to="/" aria-label="Go to home" title="Home">
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
                      Sign in to manage exports, wallet credits, and protected dataset tools built around fast-moving market workflows.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                      {trustPoints.map((item) => (
                        <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="relative border-t border-white/8 bg-[linear-gradient(180deg,_rgba(9,27,36,0.82),_rgba(6,20,29,0.88))] p-6 text-white md:p-10 lg:border-l lg:border-t-0">
                  <div key="login-shell" className="relative mx-auto w-full max-w-md" style={{ animation: 'panel-settle 360ms ease' }}>
                    <div className="mb-8">
                      <p className="text-sm uppercase tracking-[0.3em] text-emerald-100/75">Secure Workspace</p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl md:text-4xl">Sign in to your account</h2>
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
                            mode === item
                              ? 'bg-[linear-gradient(135deg,rgba(18,213,183,0.18),rgba(69,142,255,0.12))] text-white shadow-[0_10px_24px_rgba(18,213,183,0.12)]'
                              : 'text-slate-400'
                          }`}
                        >
                          {item === 'login' ? 'Login' : 'Signup'}
                        </button>
                      ))}
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div className="overflow-hidden rounded-[28px] bg-white/[0.03] p-4" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                        <div key="login" className="space-y-4" style={{ animation: 'fade-slide 420ms ease' }}>
                          <label>
                            <FieldLabel>Email</FieldLabel>
                            <input type="email" className={inputClassName} value={form.email} onChange={(e) => onChange('email', e.target.value)} />
                          </label>

                          <label>
                            <FieldLabel>Password</FieldLabel>
                            <input
                              type="password"
                              className={inputClassName}
                              value={form.password}
                              onChange={(e) => onChange('password', e.target.value)}
                            />
                          </label>
                        </div>
                      </div>

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
                        {loading ? 'Please wait...' : 'Login'}
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
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-slide {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes panel-expand {
          0% {
            opacity: 0.72;
            transform: translateY(20px) scale(0.96);
            filter: blur(3px);
          }
          55% {
            opacity: 1;
            transform: translateY(-4px) scale(1.01);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes panel-settle {
          0% {
            opacity: 0.88;
            transform: translateY(8px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
