import axios from 'axios';

const apiBaseUrl = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
});

let csrfToken;
let csrfRequest;

api.interceptors.request.use((config) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone) config.headers.set('X-Client-Timezone', timeZone);
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    config.headers.set('X-CSRF-Token', csrfToken);
  }
  return config;
});

export async function refreshCsrfToken(force = false) {
  if (!force && csrfToken) return csrfToken;
  if (!force && csrfRequest) return csrfRequest;

  csrfRequest = api.get('/auth/csrf')
    .then(({ data }) => {
      csrfToken = data.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = undefined;
    });

  return csrfRequest;
}

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallback;
}

export default api;
