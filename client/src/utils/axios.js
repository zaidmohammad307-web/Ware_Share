import axios from 'axios';

const baseURL =
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');

      if (token) {
        config.headers = config.headers || {};
        if (!config.headers.Authorization && !config.headers.authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired tokens centrally.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      const msg = String(error?.response?.data?.message || '');

      const looksExpired =
        code === 'TOKEN_EXPIRED' || /token\s+expired/i.test(msg);

      if (status === 401 && looksExpired) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('token');
        }
        delete axiosInstance.defaults.headers.common.Authorization;

        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login'
        ) {
          window.location.href = '/login';
        }
      }
    } catch (_) {
      // noop
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
