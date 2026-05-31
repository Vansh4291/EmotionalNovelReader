import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import HomeScreen from '../screens/HomeScreen.tsx';
import LibraryScreen from '../screens/LibraryScreen.jsx';
import JourneyScreen from '../screens/JourneyScreen.tsx';
import SanctuaryScreen from '../screens/SanctuaryScreen.tsx';
import ImmersionScreen from '../screens/ImmersionScreen.tsx';
import BookDetailScreen from '../screens/BookDetailScreen.jsx';
import PlayerScreen from '../screens/PlayerScreen.jsx';
import SettingsScreen from '../screens/SettingsScreen.jsx';
import StorySpaceScreen from '../screens/StorySpaceScreen.tsx';
import MemoryVaultScreen from '../screens/MemoryVaultScreen.tsx';
import DreamingModeScreen from '../screens/DreamingModeScreen.tsx';
import EchoScreen from '../screens/EchoScreen.tsx';
import { useTheme } from '../utils/themeContext.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = {
    Home: '\u2302',
    Library: '\u2630',
    Journey: '\u2192',
    Sanctuary: '\u25CB',
    Immersion: '\u2699',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '\u25CB'}
    </Text>
  );
}

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: theme.accent || theme.primary,
        tabBarInactiveTintColor: theme.textMuted || '#666',
        tabBarStyle: {
          backgroundColor: theme.surface || '#222',
          borderTopColor: theme.border || '#333',
        },
        headerStyle: {
          backgroundColor: theme.surface || '#222',
        },
        headerTintColor: theme.text || '#fff',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: 'Library' }}
      />
      <Tab.Screen
        name="Journey"
        component={JourneyScreen}
        options={{ title: 'Journey' }}
      />
      <Tab.Screen
        name="Sanctuary"
        component={SanctuaryScreen}
        options={{ title: 'Sanctuary' }}
      />
      <Tab.Screen
        name="Immersion"
        component={ImmersionScreen}
        options={{ title: 'Immersion' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const theme = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.surface || '#222',
      shadowColor: 'transparent',
      elevation: 0,
    },
    headerTintColor: theme.text || '#fff',
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
    },
    cardStyle: {
      backgroundColor: theme.background || '#181818',
    },
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={screenOptions}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
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
          name="StorySpace"
          component={StorySpaceScreen}
          options={{
            title: 'Story Space',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="MemoryVault"
          component={MemoryVaultScreen}
          options={{
            title: 'Memory Vault',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="DreamingMode"
          component={DreamingModeScreen}
          options={{
            title: 'Dreaming Mode',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Echo"
          component={EchoScreen}
          options={{
            title: 'Echo',
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
