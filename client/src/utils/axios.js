import axios from 'axios';

const baseURL =
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000';

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

export default axiosInstance;
