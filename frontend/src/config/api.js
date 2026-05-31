import axios from 'axios';
import { Platform } from 'react-native';

const DEVICE_PORT = 3000;

function getHost() {
  if (Platform.OS === 'ios') return 'localhost';
  if (Platform.OS === 'android') return '192.168.2.4';
  return 'localhost';
}

const DEVICE_HOST = getHost();
export const API_BASE_URL = `http://${DEVICE_HOST}:${DEVICE_PORT}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'x-api-key': 'dev-key-change-in-production',
  },
  transformRequest: [(data, headers) => {
    if (data instanceof FormData) {
      delete headers['Content-Type'];
      return data;
    }
    return data;
  }],
});

api.interceptors.request.use(req => {
  console.log('[API REQUEST]', req.method, req.url);
  if (req.data instanceof FormData) {
    console.log('[API REQUEST] FormData detected, headers:', Object.keys(req.headers));
  }
  return req;
});

api.interceptors.response.use(
  res => {
    console.log('[API RESPONSE]', res.status, res.config.url);
    return res;
  },
  err => {
    console.log('[API ERROR]', err.message, err.config?.url, err.response?.status);
    return Promise.reject(err);
  }
);

export default api;
