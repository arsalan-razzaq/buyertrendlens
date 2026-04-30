import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'dataset-marketplace-token';
export const USER_STORAGE_KEY = 'dataset-marketplace-user';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const DATA_API_BASE_URL = import.meta.env.VITE_DATA_API_URL || API_BASE_URL;

const attachAuthToken = (client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return client;
};

const http = attachAuthToken(
  axios.create({
    baseURL: API_BASE_URL
  })
);

export const dataHttp = attachAuthToken(
  axios.create({
    baseURL: DATA_API_BASE_URL
  })
);

export const getErrorMessage = (error) =>
  error?.message === 'Network Error'
    ? `Backend API is not reachable at ${error?.config?.baseURL || API_BASE_URL}. Check that the server is running and your client .env is correct.`
    :
  error?.response?.data?.message ||
  error?.response?.data?.errors?.[0]?.message ||
  error.message ||
  'Something went wrong.';

export default http;
