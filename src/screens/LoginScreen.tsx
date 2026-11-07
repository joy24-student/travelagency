import React from 'react';
import {
  View, Text, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleLoginButton } from '../components';
import { useAuth } from '../hooks/useAuth';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, signIn, signOut, user, loading } = useAuth();

  const handleGoogleLogin = async (result: any) => {
    console.log('Google login successful:', result);
    Alert.alert('Success', 'Successfully logged in with Google!');
  };

  const handleGoogleLoginError = (error: any) => {
    console.error('Google login error:', error);
    Alert.alert('Error', error.message || 'An error occurred during Google login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.loginOptions}>
          <GoogleLoginButton
            onSuccess={handleGoogleLogin}
            onError={handleGoogleLoginError}
            size="wide"
            color="dark"
          />
          
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.userInfoText}>Logged in as: {user.email || user.id}</Text>
              <Text style={styles.userInfoText}>Provider: {user.app_metadata?.provider}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.otherOptions}>
          <Text style={styles.otherOptionText}>Continue with Email</Text>
          <Text style={styles.otherOptionText}>Continue with Facebook</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  loginOptions: {
    alignItems: 'center',
    marginBottom: 30,
  },
  userInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    paddingHorizontal: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  otherOptions: {
    alignItems: 'center',
  },
  otherOptionText: {
    fontSize: 16,
    color: '#4285F4',
    marginBottom: 15,
    fontWeight: '500',
  },
});

export default LoginScreen;