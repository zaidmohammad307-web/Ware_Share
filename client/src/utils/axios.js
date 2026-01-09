import axios from 'axios';

const baseURL =
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000';

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// Always attach token (if exists) to every request.
// This fixes refresh/new-tab cases where defaults are not set anymore.
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('token');

      if (token) {
        config.headers = config.headers || {};

        // Don’t overwrite if caller already set it
        if (!config.headers.Authorization && !config.headers.authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
