import axios from 'axios';

const DEVICE_HOST = 'localhost';
const DEVICE_PORT = 3000;

export const API_BASE_URL = `http://${DEVICE_HOST}:${DEVICE_PORT}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'x-api-key': 'dev-key-change-in-production',
  },
});

export default api;
