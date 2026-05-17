// We use 'localhost' and ADB port forwarding (adb reverse tcp:3000 tcp:3000)
// to support both physical devices (USB/Wi-Fi) and emulators seamlessly.
const DEVICE_HOST = 'localhost';
const DEVICE_PORT = 3000;

export const API_BASE_URL = `http://${DEVICE_HOST}:${DEVICE_PORT}/api`;

export default API_BASE_URL;
