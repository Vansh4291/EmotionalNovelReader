import axios from 'axios';
import { Platform } from 'react-native';

const DEVICE_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
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
