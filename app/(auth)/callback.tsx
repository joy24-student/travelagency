import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/hooks/useAuth';

export default function OAuthCallback() {
  const { t } = useTranslation();
  const { loading, refreshSession } = useAuth();

  useEffect(() => {
    const completeAuthFlow = async () => {
      // Refresh the session to ensure it's properly loaded
      try {
        await refreshSession();
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
      
      // Navigate to the appropriate screen after a short delay to ensure state is updated
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    };

    if (!loading) {
      completeAuthFlow();
    }
  }, [loading, refreshSession]);

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>{t('completingAuth', 'Completing authentication...')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
