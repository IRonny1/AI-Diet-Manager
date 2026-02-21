import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { healthCheck } from './src/services/api';

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Test API connection on app start
    healthCheck()
      .then((data) => setApiStatus(`API: ${data.status}`))
      .catch(() => setApiStatus('API: Offline'));
  }, []);

  return (
    <View style={styles.container}>
      <AppNavigator />
      <Text style={styles.apiStatus}>{apiStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  apiStatus: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    fontSize: 10,
    color: '#666',
  },
});
