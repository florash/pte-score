window.__PTE_ENV__ = window.__PTE_ENV__ || {};
window.APP_CONFIG = window.APP_CONFIG || {};

window.APP_CONFIG.API_BASE_URL =
  window.__PTE_ENV__.PTE_API_BASE_URL ||
  window.APP_CONFIG.API_BASE_URL ||
  window.PTE_API_BASE_URL ||
  'http://localhost:8000';

window.PTE_API_BASE_URL =
  window.__PTE_ENV__.PTE_API_BASE_URL ||
  window.APP_CONFIG.API_BASE_URL ||
  window.PTE_API_BASE_URL ||
  'http://localhost:8000';
