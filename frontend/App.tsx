import React from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme, THEMES } from './src/utils/themeContext';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  '`new NativeEventEmitter()` was called with a non-null argument without the required `addListener` method.',
  '`new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method.',
]);

function AppContent() {
  const theme = useTheme();
  
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme === THEMES.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
        translucent={false}
      />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;