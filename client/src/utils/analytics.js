import { getAnalytics, isSupported, logEvent, setCurrentScreen } from 'firebase/analytics';
import firebaseApp from './firebase';

let analyticsPromise = null;

const getMeasurementId = () =>
  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4KTEGRYMPB';

export const analyticsEnabled = () => {
  const measurementId = getMeasurementId();
  return typeof window !== 'undefined' && typeof measurementId === 'string' && measurementId.trim().length > 0;
};

export const getAnalyticsInstance = () => {
  if (!analyticsEnabled()) {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }

  return analyticsPromise;
};

export const trackPageView = async (path, title) => {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;

  const pagePath = path || window.location.pathname + window.location.search;
  const pageTitle = title || document.title || 'Untitled';

  setCurrentScreen(analytics, pageTitle);
  logEvent(analytics, 'page_view', {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: pagePath,
  });
};
