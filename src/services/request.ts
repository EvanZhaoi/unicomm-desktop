import axios, { type AxiosInstance, type AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth.store";

const BASE_URL = "http://localhost:28080/api/v1";

const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

request.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  }
);

export default request;