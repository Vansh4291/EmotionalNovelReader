/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Silence NativeEventEmitter warnings from third-party libraries (e.g. react-native-tts)
LogBox.ignoreLogs(['new NativeEventEmitter()']);

AppRegistry.registerComponent(appName, () => App);
