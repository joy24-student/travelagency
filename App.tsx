import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/context';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/locales/i18n';
import { LanguageProvider } from './src/context/LanguageContext';

// Import the global CSS file
import './global.css';

/**
 * Fallback standalone root component.
 * Note: Under Expo Router, execution starts via index.js -> app/_layout.tsx.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRootView}>
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <View style={styles.container} />
            </AuthProvider>
          </SafeAreaProvider>
        </LanguageProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRootView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
