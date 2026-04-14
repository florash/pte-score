window.__PTE_ENV__ = window.__PTE_ENV__ || {};

// For production, set this to your deployed Cloud Run backend URL.
// Example:
// window.__PTE_ENV__.PTE_API_BASE_URL = 'https://pte-score-api-xxxxx.a.run.app';
//
// Local development can leave this empty because the app falls back to
// http://localhost:8000 when opened on localhost.
window.__PTE_ENV__.PTE_API_BASE_URL =
  window.__PTE_ENV__.PTE_API_BASE_URL || 'https://pte-backend-601251165343.australia-southeast1.run.app';
