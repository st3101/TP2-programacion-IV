// Local Angular uses proxy.conf.json; deployed frontend calls the separate backend project.
let apiBaseUrl = 'https://backend-gamma-flame-61.vercel.app';

if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  apiBaseUrl = '';
}

export const API_BASE_URL = apiBaseUrl;
