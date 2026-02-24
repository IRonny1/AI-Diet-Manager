import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import DashboardScreen from '@/screens/Dashboard/DashboardScreen';
import ScanScreen from '@/screens/Scan/ScanScreen';
import HistoryScreen from '@/screens/History/HistoryScreen';
import StatisticsScreen from '@/screens/Statistics/StatisticsScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import { useAuthStore } from '@/store/auth.store';
import { COLORS } from '@/constants';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { logout } = useAuthStore();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 15,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
