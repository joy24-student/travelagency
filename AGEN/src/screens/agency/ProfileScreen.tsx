/**
 * Profile Screen
 * Agency profile management and navigation hub
 * Displays agency information and provides access to management features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, ProfileStackParamList } from '../../App';
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');

const UI_COLORS = {
  background: '#0b1326',
  primary: '#c3c0ff',
  secondary: '#4cd7f6',
  tertiary: '#d0bcff',
  surfaceContainer: '#171f33',
  surfaceHighest: '#2d3449',
  text: '#dae2fd',
  textVariant: '#c7c4d7',
  outline: '#918fa0',
  primaryContainer: '#4338ca',
  onPrimaryContainer: '#c1beff',
  glassBg: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  error: '#ffb4ab',
};

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export default function ProfileScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark

  const theme = {
    background: isDarkMode ? '#0b1326' : '#F8FAFC',
    surface: isDarkMode ? '#171f33' : '#FFFFFF',
    text: isDarkMode ? '#dae2fd' : '#1E293B',
    textVariant: isDarkMode ? '#c7c4d7' : '#64748B',
    outline: isDarkMode ? '#918fa0' : '#94A3B8',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)',
  };

  const [agency, setAgency] = useState({
    name: 'Global Travels Ltd.',
    type: 'Premium Enterprise Luxury Travel',
    rating: 4.9,
    tours: '4.8k',
    years: '12+',
    teamSize: '24',
    badge: 'Verified Agency',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBknWrbLNwJGZEiw1Y3EFeccvy69rGTa-A2L5PC9IAS1-BahV3Vpkk6I_BU88r4Bmq0XzfHcf4MYfg0C5jb2XF4i4n9vl0S_vnJ9cL239qysfbnpd-LNq2gR6rSYTrxwTsJ2S5HX0jQ-KIlCiId5ghjt4_tr5rtugaRtLcuGACpK_myK8SpPF7NTvLUVMmdKR3rcRp51YjgMQ-iErlC6X_fE_LhEdGPJ2LhJ_w8513buF0t-CJUQn4lQp3t3DO7ZpaZjI94uFZOPMk',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(19, 27, 46, 0.9)', 'transparent']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoBox}>
              <MaterialIcons name="travel-explore" size={20} color={UI_COLORS.onPrimaryContainer} />
            </View>
            <Text style={styles.headerTitle}>ShopnoJatra Ultra</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn}>
              <MaterialIcons name="search" size={22} color={UI_COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn}>
              <MaterialIcons name="smart-toy" size={22} color={UI_COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9i2arsElPnSuXxBaJJKj6B3UYV8qYmcM68hNLpl0Iy9MdykSGe-KHixmlzipXjqy4qAl1wqzRQqfW7zoNlwxXhAr2EpA4FaDVD5dSe7Qw9z7u6jHGN5M2lha5U0z1IdFFDQcqZxq_1YG60YR1eQ6C2lJYLud-FJtUYndfk2RSfizvTcTdH-YzppPxTktKFSxYjtWBGbrzc4pTFUnFx8AcH01B7ozerdQz0c-yxhAKvBXHDJx4qWhSVNKc1Kun5QqTiO1OeSwoJs4' }}
            style={[styles.coverImage, { opacity: isDarkMode ? 0.5 : 0.8 }]}
          />
          <LinearGradient
            colors={['transparent', theme.background]}
            style={styles.heroOverlay}
          />
          
          <View style={styles.heroIdentity}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoFrame, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Image source={{ uri: agency.logo }} style={styles.fullLogo} />
              </View>
              <View style={[styles.verifiedBadge, { borderColor: theme.background }]}>
                <MaterialIcons name="verified" size={14} color={theme.background} />
              </View>
            </View>
            
            <View style={styles.identityText}>
              <Text style={[styles.agencyName, { color: theme.text }]}>{agency.name}</Text>
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={14} color={UI_COLORS.primary} />
                <Text style={[styles.descriptionText, { color: theme.textVariant }]}>{agency.type}</Text>
              </View>
              <View style={styles.tagRow}>
                <View style={styles.statusTag}>
                  <Text style={styles.statusTagText}>Verified Agency</Text>
                </View>
                <View style={[styles.statusTag, styles.eliteTag]}>
                  <Text style={[styles.statusTagText, { color: UI_COLORS.secondary }]}>Elite Partner</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.editFab}
              onPress={() => setIsEditModalVisible(true)}
            >
              <MaterialIcons name="edit" size={20} color={theme.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="history" size={20} color={UI_COLORS.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{agency.years} Years</Text>
            <Text style={styles.statLabel}>ACTIVE SERVICE</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="map" size={20} color={UI_COLORS.secondary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{agency.tours}</Text>
            <Text style={styles.statLabel}>TOTAL TOURS</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="star" size={20} color={UI_COLORS.tertiary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{agency.rating}</Text>
            <Text style={styles.statLabel}>AVG RATING</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="groups" size={20} color={UI_COLORS.primary} />
            <Text style={[styles.statValue, { color: theme.text }]}>{agency.teamSize}</Text>
            <Text style={styles.statLabel}>TEAM SIZE</Text>
          </View>
        </View>

        {/* Management Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Agency Management</Text>
          <View style={[styles.glassList, { backgroundColor: isDarkMode ? UI_COLORS.glassBg : 'rgba(0,0,0,0.03)' }]}>
            <NavListItem
              title="Agency Information"
              subtitle="General details, mission, and vision"
              icon="info"
              color={UI_COLORS.primary}
              onPress={() => navigation.navigate('AgencyInfo')}
            />
            <View style={styles.separator} />
            <NavListItem
              title="Verification Documents"
              subtitle="License, certificates, and tax info"
              icon="verified-user"
              color={UI_COLORS.secondary}
              onPress={() => navigation.navigate('Verification')}
            />
            <View style={styles.separator} />
            <NavListItem
              title="Team Management"
              subtitle="Staff roles, permissions, and attendance"
              icon="badge"
              color={UI_COLORS.onPrimaryContainer}
              onPress={() => navigation.navigate('TeamManagement')}
            />
          </View>
        </View>

        {/* Operational Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Operational Settings</Text>
          <View style={[styles.glassList, { backgroundColor: isDarkMode ? UI_COLORS.glassBg : 'rgba(0,0,0,0.03)' }]}>
            <NavListItem
              title="Bank Accounts"
              subtitle="Payout settings and withdrawal history"
              icon="account-balance"
              color={UI_COLORS.primary}
              onPress={() => navigation.navigate('BankAccounts')}
            />
            <View style={styles.separator} />
            <NavListItem
              title="Global Settings"
              subtitle="Notifications and regional API"
              icon="settings-applications"
              color={UI_COLORS.secondary}
              onPress={() => navigation.navigate('Settings')}
            />
            <View style={styles.separator} />
            <NavListItem
              title="Support Center"
              subtitle="Help desk, tickets, and live assistance"
              icon="support-agent"
              color={UI_COLORS.tertiary}
              theme={theme}
              onPress={() => navigation.navigate('SupportCenter')}
            />
          </View>
        </View>

        {/* Account */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
            <MaterialCommunityIcons name="logout" size={20} color={UI_COLORS.error} />
            <Text style={styles.logoutText}>Logout from Agency Console</Text>
          </TouchableOpacity>
          <Text style={styles.version}>Version 2.1.0 • {agency.name} Enterprise ID: GTL-8821</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Media Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsEditModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? UI_COLORS.surfaceContainer : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Update Media</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TouchableOpacity style={styles.modalActionItem}>
                <View style={[styles.modalIconBox, { backgroundColor: `${UI_COLORS.primary}20` }]}>
                  <MaterialIcons name="add-a-photo" size={22} color={UI_COLORS.primary} />
                </View>
                <Text style={[styles.modalActionText, { color: theme.text }]}>Upload Profile Photo</Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.outline} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActionItem}>
                <View style={[styles.modalIconBox, { backgroundColor: `${UI_COLORS.secondary}20` }]}>
                  <MaterialIcons name="image" size={22} color={UI_COLORS.secondary} />
                </View>
                <Text style={[styles.modalActionText, { color: theme.text }]}>Upload Cover Photo</Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.outline} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const NavListItem = ({ title, subtitle, icon, color, onPress, theme }: any) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <View style={styles.navItemLeft}>
      <View style={[styles.navIconBox, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={[styles.navTitle, { color: theme?.text || 'white' }]}>{title}</Text>
        <Text style={[styles.navSubtitle, { color: theme?.outline || UI_COLORS.outline }]}>{subtitle}</Text>
      </View>
    </View>
    <MaterialIcons name="chevron-right" size={24} color={theme?.outline || UI_COLORS.outline} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 100,
    height: 80,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI_COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: UI_COLORS.primary,
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerIconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: { flex: 1 },
  heroSection: { height: 340, width: '100%', overflow: 'hidden' },
  coverImage: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroIdentity: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoContainer: { position: 'relative' },
  logoFrame: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: UI_COLORS.surfaceContainer,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullLogo: { width: '100%', height: '100%' },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: UI_COLORS.secondary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: UI_COLORS.background,
  },
  identityText: { flex: 1, gap: 4 },
  agencyName: { fontSize: 22, fontWeight: '800', color: 'white' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  descriptionText: { fontSize: 13, color: UI_COLORS.textVariant },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(67, 56, 202, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(195, 192, 255, 0.2)',
  },
  statusTagText: { fontSize: 10, fontWeight: '700', color: UI_COLORS.primary },
  eliteTag: { backgroundColor: 'rgba(3, 181, 211, 0.2)', borderColor: 'rgba(76, 215, 246, 0.2)' },
  editFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    backgroundColor: UI_COLORS.glassBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.glassBorder,
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: 'white' },
  statLabel: { fontSize: 10, fontWeight: '700', color: UI_COLORS.outline, letterSpacing: 1 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  glassList: {
    backgroundColor: UI_COLORS.glassBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: UI_COLORS.glassBorder,
    overflow: 'hidden',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  navItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: 'white' },
  navSubtitle: { fontSize: 12, color: UI_COLORS.outline, marginTop: 2 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 76 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.2)',
    backgroundColor: 'rgba(255, 180, 171, 0.05)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: UI_COLORS.error,
  },
  version: {
    fontSize: 11,
    color: UI_COLORS.outline,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: UI_COLORS.surfaceContainer,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
    color: 'white',
  },
  modalBody: {
    padding: 24,
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
    color: 'white',
    marginLeft: 12,
    flex: 1,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
