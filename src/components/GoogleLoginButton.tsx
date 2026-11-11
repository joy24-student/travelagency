import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { signInWithGoogle } from '../services/oauth';

interface GoogleLoginButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  onLoading?: (isLoading: boolean) => void;
  size?: 'standard' | 'wide' | 'icon';
  color?: 'light' | 'dark';
  style?: object;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  onLoading,
  size = 'wide',
  color = 'dark',
  style,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [GoogleSigninButton, setGoogleSigninButton] = React.useState<any>(null);

  React.useEffect(() => {
    import('@react-native-google-signin/google-signin')
      .then((module) => setGoogleSigninButton(module.GoogleSigninButton))
      .catch(() => {
        console.warn('Google Sign-In native module not available. Use expo run:android/ios for native auth.');
      });
  }, []);

  const handlePress = async () => {
    try {
      setLoading(true);
      if (onLoading) onLoading(true);

      const result = await signInWithGoogle();

      if (result.error) {
        if (onError) onError(result.error);
      } else {
        if (onSuccess) onSuccess(result.data);
      }
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  // Map the size prop to the GoogleSigninButton.Size enum
  const getSize = () => {
    if (!GoogleSigninButton) return 0;
    switch (size) {
      case 'standard':
        return GoogleSigninButton.Size.Standard;
      case 'icon':
        return GoogleSigninButton.Size.Icon;
      case 'wide':
      default:
        return GoogleSigninButton.Size.Wide;
    }
  };

  // Map the color prop to the GoogleSigninButton.Color enum
  const getColor = () => {
    if (!GoogleSigninButton) return 0;
    switch (color) {
      case 'light':
        return GoogleSigninButton.Color.Light;
      case 'dark':
      default:
        return GoogleSigninButton.Color.Dark;
    }
  };

  if (!GoogleSigninButton) {
    return (
      <TouchableOpacity 
        onPress={handlePress} 
        disabled={loading}
        style={[styles.container, styles.fallbackButton, style, loading && { opacity: 0.6 }]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        ) : (
          <Text style={styles.fallbackText}>Sign in with Google</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      disabled={loading}
      style={[styles.container, style, loading && { opacity: 0.6 }]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      ) : (
        <GoogleSigninButton
          size={getSize()}
          color={getColor()}
          onPress={handlePress}
          disabled={loading}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#4285F4',
    borderRadius: 4,
  },
  loadingText: {
    color: '#fff',
    marginStart: 10,
    fontWeight: 'bold',
  },
  fallbackButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  fallbackText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GoogleLoginButton;