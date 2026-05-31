/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Suppress NativeEventEmitter warnings from react-native-tts (RN 0.76+ strict mode)
const origError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && /NativeEventEmitter/i.test(args[0])) return;
  if (args[0] && typeof args[0] === 'string' && /react-native-tts/i.test(args[0])) return;
  origError(...args);
};
LogBox.ignoreLogs(['NativeEventEmitter', 'react-native-tts']);

AppRegistry.registerComponent(appName, () => App);
