import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LibraryScreen from '../screens/LibraryScreen.jsx';
import BookDetailScreen from '../screens/BookDetailScreen.jsx';
import PlayerScreen from '../screens/PlayerScreen.jsx';
import SettingsScreen from '../screens/SettingsScreen.jsx';
import { useTheme } from '../utils/themeContext.js';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const theme = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.surface,
      shadowColor: 'transparent',
      elevation: 0,
    },
    headerTintColor: theme.text,
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
    },
    cardStyle: {
      backgroundColor: theme.background,
    },
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Library"
        screenOptions={screenOptions}
      >
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            title: 'My Library',
          }}
        />
        <Stack.Screen
          name="BookDetail"
          component={BookDetailScreen}
          options={({ route }) => ({
            title: route.params?.bookTitle || 'Book Details',
          })}
        />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            title: 'Now Playing',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;