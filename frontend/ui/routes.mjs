export const pages = {
  landing: 'index.html',
  assistant: 'ai-assistant/AiAssistant.html',
  dashboard: 'user-dashboard/UserDashboard.html',
  results: 'scheme-results/SchemeResults.html',
  details: 'scheme-details/SchemeDetails.html',
  documents: 'document-checker/DocumentChecker.html',
  tracker: 'application-tracker/ApplicationTracker.html',
  profile: 'user-profile/UserProfile.html',
};

export const pageHref = (key) => (key === 'landing' ? '/' : `/${pages[key]}`);
export const schemeHref = (key, id) => `${pageHref(key)}?scheme=${encodeURIComponent(id)}`;
