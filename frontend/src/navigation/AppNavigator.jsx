import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

// Real, data-backed screens only. The decorative "Worlds/Sanctuary/Journey/
// Immersion" screens were removed — they read from a store nothing wrote and
// navigated to dead ends (see PRODUCTION_READINESS_BASELINE.md §B6/B7).
import HomeScreen from '../screens/HomeScreen.tsx';
import LibraryScreen from '../screens/LibraryScreen.jsx';
import BookDetailScreen from '../screens/BookDetailScreen.jsx';
import PlayerScreen from '../screens/PlayerScreen.jsx';
import SettingsScreen from '../screens/SettingsScreen.jsx';
import { useTheme } from '../utils/themeContext.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused, color }) {
  const icons = {
    Home: '\u2302',
    Library: '\u2630',
    Settings: '\u2699',
  };
  return (
    <Text
      accessibilityElementsHidden={false}
      style={{ fontSize: 20, color, opacity: focused ? 1 : 0.55 }}
    >
      {icons[name] || '\u25CB'}
    </Text>
  );
}

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.text,
        headerShadowVisible: false,
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
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

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

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
  },
});

export default AppNavigator;
