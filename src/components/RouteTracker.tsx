import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

export function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only track if consent is granted (we'll read from localStorage)
    const cookieConsent = localStorage.getItem('cookie_consent');
    if (cookieConsent !== 'accepted') return;

    // Google Tag Manager pageview event
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'page_view',
        page_path: location.pathname + location.search,
      });
    }

    // Fallback for direct gtag (GA4) if GTM is not used
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
}
