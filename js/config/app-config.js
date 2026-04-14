window.__PTE_ENV__ = window.__PTE_ENV__ || {};
window.APP_CONFIG = window.APP_CONFIG || {};

const hostname = window.location.hostname || '';
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
const fallbackApiBaseUrl = isLocalHost ? 'http://localhost:8000' : '';
const configuredApiBaseUrl =
  window.__PTE_ENV__.PTE_API_BASE_URL ||
  window.APP_CONFIG.API_BASE_URL ||
  window.PTE_API_BASE_URL ||
  fallbackApiBaseUrl;

window.APP_CONFIG.API_BASE_URL = configuredApiBaseUrl;
window.PTE_API_BASE_URL = configuredApiBaseUrl;
