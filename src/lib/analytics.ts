/* ── Google Analytics 4 custom events ── */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== "undefined") {
    // Disparo para o Google Analytics 4 direto
    if (window.gtag) {
      window.gtag("event", eventName, params);
    }
    // Disparo explícito para o Google Tag Manager
    if (window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...params
      });
    }
  }
}

/* ── WhatsApp clicks ── */
export const trackWhatsAppClick = (source: string) =>
  trackEvent("whatsapp_click", { source });

/* ── Wishlist ── */
export const trackWishlistAdd = (itemType: string, itemName: string) =>
  trackEvent("wishlist_add", { item_type: itemType, item_name: itemName });

export const trackWishlistRemove = (itemType: string) =>
  trackEvent("wishlist_remove", { item_type: itemType });

/* ── Quote request (B2C) ── */
export const trackQuoteSubmit = (itemCount: number) =>
  trackEvent("quote_submit", { item_count: itemCount });

/* ── Immersion lead (B2B) ── */
export const trackImmersionLeadSubmit = (groupType: string) =>
  trackEvent("immersion_lead_submit", { group_type: groupType });

/* ── CTA clicks ── */
export const trackCtaClick = (ctaLabel: string, page: string) =>
  trackEvent("cta_click", { cta_label: ctaLabel, page });

/* ── Page category views (catalog detail dialogs) ── */
export const trackDetailView = (itemType: string, itemName: string) =>
  trackEvent("detail_view", { item_type: itemType, item_name: itemName });

/* ── Auth ── */
export const trackSignup = () => trackEvent("sign_up", { method: "email" });
export const trackLogin = () => trackEvent("login", { method: "email" });

/* ── Wishlist stepper progress ── */
export const trackWishlistStep = (stepName: string) =>
  trackEvent("wishlist_step", { step_name: stepName });

/* ── Filter usage in catalog pages ── */
export const trackFilterUse = (filterType: string, filterValue: string, page: string) =>
  trackEvent("filter_use", { filter_type: filterType, filter_value: filterValue, page });

/* ── Itinerary detail page view ── */
export const trackItineraryView = (itineraryName: string, category: string, duration: number) =>
  trackEvent("itinerary_view", { itinerary_name: itineraryName, category, duration });

/* ── Public proposal view ── */
export const trackProposalView = (proposalId: string) =>
  trackEvent("proposal_view", { proposal_id: proposalId });

/* ── Questionnaire start (quote or immersion) ── */
export const trackQuestionnaireStart = (mode: string) =>
  trackEvent("questionnaire_start", { mode });

/* ── Scroll depth milestones ── */
export const trackScrollDepth = (percent: number, page: string) =>
  trackEvent("scroll_depth", { percent, page });
