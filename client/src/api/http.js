import axios from "axios";
import { runtimeConfig } from "../config/runtime";

export const http = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("portal_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
