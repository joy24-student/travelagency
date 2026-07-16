/**
 * Settings Screen
 * Global configuration and preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  SafeAreaView,
  Modal,
  Dimensions,
  TextInput,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../App';
import { Card, SectionHeader } from '../ui/UIComponents';

export default function SettingsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isTwoFactorModalVisible, setIsTwoFactorModalVisible] = useState(false);
  const [isLoginActivityModalVisible, setIsLoginActivityModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'selection' | 'sms' | 'passkey'>('selection');
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');
  const [verificationCode, setVerificationCode] = useState('');

  const theme = {
    background: darkMode ? '#0B1326' : '#F8FAFC',
    surface: darkMode ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
    text: darkMode ? '#DAE2FD' : '#1E293B',
    textTertiary: darkMode ? '#918fa0' : '#64748B',
    border: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    overlay: darkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.4)',
    inputBg: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  };

  const closeTwoFactorModal = () => {
    setIsTwoFactorModalVisible(false);
    setTwoFactorStep('selection');
    setVerificationCode('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { borderBottomWidth: 0 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'PlusJakartaSans-Bold' }]}>System Preferences</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Notifications */}
          <View style={styles.section}>
            <SectionHeader title="Notifications" />
            <View style={[styles.glassGroup, { backgroundColor: theme.surface }]}>
              <BlurView intensity={10} tint={darkMode ? "dark" : "light"}>
              <View style={styles.settingItem}>
                <View style={[styles.iconWrapper, { backgroundColor: '#c3c0ff20' }]}>
                  <MaterialCommunityIcons name="bell-badge-outline" size={20} color="#c3c0ff" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text, fontWeight: '700' }]}>Push Notifications</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>Receive app notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: 'rgba(0,0,0,0.1)', true: COLORS.primary }}
                />
              </View>
              <View style={styles.separator} />
              <View style={styles.settingItem}>
                <View style={[styles.iconWrapper, { backgroundColor: '#4cd7f620' }]}>
                  <MaterialCommunityIcons name="email-fast-outline" size={20} color="#4cd7f6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Email Notifications</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>Booking and payment emails</Text>
                </View>
                <Switch value={true} disabled trackColor={{ false: 'rgba(0,0,0,0.1)', true: COLORS.primary }} />
              </View>
              </BlurView>
            </View>
          </View>

          {/* Security */}
          <View style={styles.section}>
            <SectionHeader title="Security" />
          <Card style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setIsTwoFactorModalVisible(true)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#10B98120' }]}>
                  <MaterialCommunityIcons name="shield-check-outline" size={22} color="#10B981" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Two-Factor Authentication</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>{twoFactor ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </Card>
          <Card style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setIsLoginActivityModalVisible(true)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#F59E0B20' }]}>
                  <MaterialCommunityIcons name="history" size={22} color="#F59E0B" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Login Activity</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>View recent login history</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </Card>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <SectionHeader title="Preferences" />
          <Card style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <View style={styles.settingItem}>
                <View style={[styles.iconWrapper, { backgroundColor: '#8B5CF620' }]}>
                  <MaterialCommunityIcons name="theme-light-dark" size={22} color="#8B5CF6" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Dark Mode</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>Automatic theme switching</Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: 'rgba(0,0,0,0.1)', true: COLORS.primary }}
                />
              </View>
            </Card>
          <Card style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => setIsLanguageModalVisible(true)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#EC489920' }]}>
                  <MaterialCommunityIcons name="translate" size={22} color="#EC4899" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Language</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>{selectedLanguage}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </Card>
          </View>

          {/* API & Integration */}
          <View style={styles.section}>
            <SectionHeader title="API & Integration" />
          <Card style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.iconWrapper, { backgroundColor: '#EF444420' }]}>
                  <MaterialCommunityIcons name="key-outline" size={22} color="#EF4444" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>API Keys</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>Manage integration keys</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </Card>
          <Card style={StyleSheet.flatten([styles.card, { backgroundColor: theme.surface }])}>
              <TouchableOpacity style={styles.settingItem}>
                <View style={[styles.iconWrapper, { backgroundColor: '#6366f120' }]}>
                  <MaterialCommunityIcons name="webhook" size={22} color="#6366f1" />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Webhooks</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>Configure event triggers</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </Card>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Two-Factor Authentication Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isTwoFactorModalVisible}
          onRequestClose={closeTwoFactorModal}
        >
          <TouchableOpacity 
            style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} 
            activeOpacity={1} 
            onPress={closeTwoFactorModal}
          >
            <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                {twoFactorStep !== 'selection' && (
                  <TouchableOpacity onPress={() => setTwoFactorStep('selection')} style={{ marginRight: 12 }}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
                  </TouchableOpacity>
                )}
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {twoFactorStep === 'selection' ? 'Security Verification' : 
                   twoFactorStep === 'sms' ? 'SMS Verification' : 'Passkey Setup'}
                </Text>
                <TouchableOpacity onPress={closeTwoFactorModal}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {twoFactorStep === 'selection' && (
                <View style={styles.modalBody}>
                  <View style={styles.modalSettingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>Enable 2FA</Text>
                      <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>Protect your account with extra security</Text>
                    </View>
                    <Switch
                      value={twoFactor}
                      onValueChange={setTwoFactor}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.primary }}
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.modalActionItem}
                    onPress={() => setTwoFactorStep('sms')}
                  >
                    <MaterialCommunityIcons name="cellphone-text" size={24} color={COLORS.primary} />
                    <Text style={[styles.modalActionText, { color: theme.text }]}>SMS Verification</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.modalActionItem}
                    onPress={() => setTwoFactorStep('passkey')}
                  >
                    <MaterialCommunityIcons name="fingerprint" size={24} color={COLORS.primary} />
                    <Text style={[styles.modalActionText, { color: theme.text }]}>Passkey</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}

              {twoFactorStep === 'sms' && (
                <View style={styles.modalBody}>
                  <Text style={[styles.settingSubtitle, { marginBottom: 20, color: theme.textTertiary }]}>
                    We've sent a 6-digit code to your registered mobile number.
                  </Text>
                  <TextInput
                    style={[styles.verificationInput, { backgroundColor: theme.inputBg, color: theme.text }]}
                    placeholder="000 000"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                  />
                  <TouchableOpacity style={styles.modalPrimaryButton}>
                    <Text style={styles.modalPrimaryButtonText}>Verify Code</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ alignSelf: 'center', marginTop: 16 }}>
                    <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Resend SMS</Text>
                  </TouchableOpacity>
                </View>
              )}

              {twoFactorStep === 'passkey' && (
                <View style={styles.modalBody}>
                  <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <View style={[styles.iconWrapper, { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '20' }]}>
                      <MaterialCommunityIcons name="fingerprint" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={[styles.settingTitle, { marginTop: 16, fontSize: 18, color: theme.text }]}>Secure your device</Text>
                    <Text style={[styles.settingSubtitle, { textAlign: 'center', marginTop: 8, color: theme.textTertiary }]}>
                      Passkeys are a safer and easier replacement for passwords. Use your biometric login for instant access.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.modalPrimaryButton}>
                    <Text style={styles.modalPrimaryButtonText}>Register this device</Text>
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>

        {/* Login Activity Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isLoginActivityModalVisible}
          onRequestClose={() => setIsLoginActivityModalVisible(false)}
        >
          <TouchableOpacity 
            style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} 
            activeOpacity={1} 
            onPress={() => setIsLoginActivityModalVisible(false)}
          >
            <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Recent Login Activity</Text>
                <TouchableOpacity onPress={() => setIsLoginActivityModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                {[
                  { device: 'iPhone 14 Pro', location: 'Dhaka, Bangladesh', time: 'Active now', icon: 'cellphone' },
                  { device: 'Chrome on MacOS', location: 'London, UK', time: '2 hours ago', icon: 'laptop' },
                  { device: 'Safari on iPad', location: 'Paris, France', time: 'Yesterday', icon: 'tablet-android' },
                ].map((item, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.inputBg }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={COLORS.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.settingTitle, { color: theme.text }]}>{item.device}</Text>
                      <Text style={[styles.settingSubtitle, { color: theme.textTertiary }]}>{item.location} • {item.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>

        {/* Language Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isLanguageModalVisible}
          onRequestClose={() => setIsLanguageModalVisible(false)}
        >
          <TouchableOpacity 
            style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} 
            activeOpacity={1} 
            onPress={() => setIsLanguageModalVisible(false)}
          >
            <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Language</Text>
                <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                {[
                  { name: 'English (US)', code: 'en' },
                  { name: 'Spanish', code: 'es' },
                  { name: 'French', code: 'fr' },
                  { name: 'Arabic', code: 'ar' },
                  { name: 'German', code: 'de' },
                ].map((lang, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.modalActionItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedLanguage(lang.name);
                      setIsLanguageModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalActionText, { color: theme.text }, selectedLanguage === lang.name && { color: COLORS.primary, fontWeight: '700' }]}>
                      {lang.name}
                    </Text>
                    {selectedLanguage === lang.name && (
                      <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  section: {
    marginBottom: 24,
  },

  card: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  settingContent: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  settingSubtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: Dimensions.get('window').height * 0.85,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  modalBody: {
    padding: 24,
  },

  modalSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  modalActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },

  modalActionText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  verificationInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
  },

  modalPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalPrimaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
