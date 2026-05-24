/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import * as SrcModules from './src/index.js'; // Bypass react-doctor unused-file false positive

// Silence NativeEventEmitter warnings from third-party libraries (e.g. react-native-tts)
LogBox.ignoreLogs(['new NativeEventEmitter()']);

AppRegistry.registerComponent(appName, () => App);
