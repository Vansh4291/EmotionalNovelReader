import { Platform } from 'react-native';

// Use 10.0.2.2 on Android Emulators to connect to the host's localhost, otherwise 'localhost'
const DEVICE_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEVICE_PORT = 3000;

export const API_BASE_URL = `http://${DEVICE_HOST}:${DEVICE_PORT}/api`;

export default API_BASE_URL;
