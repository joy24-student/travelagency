import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { hotelService, HotelStaffMember } from '../services/hotelService';

export function StaffManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 45, active: 38, onLeave: 7, activePercentage: 84 });
  const [departments, setDepartments] = useState<any[]>([]);
  const [staff, setStaff] = useState<HotelStaffMember[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Front Desk Associate');
  const [newStaffPhone, setNewStaffPhone] = useState('+1 (555) 000-0000');

  const loadData = async () => {
    try {
      const data = await hotelService.getStaffDirectory();
      setStats(data.stats);
      setDepartments(data.departments);
      setStaff(data.staff);
    } catch (err) {
      console.warn('Error loading staff directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      Alert.alert('Required Field', 'Please enter staff member full name.');
      return;
    }
    const newMember: HotelStaffMember = {
      id: `st-${Date.now()}`,
      name: newStaffName,
      role: newStaffRole,
      department: 'Front Desk',
      phone: newStaffPhone,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    };
    setStaff((prev) => [newMember, ...prev]);
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      active: prev.active + 1,
      activePercentage: Math.round(((prev.active + 1) / (prev.total + 1)) * 100),
    }));
    setAddModalVisible(false);
    setNewStaffName('');
    Alert.alert('Success', `${newMember.name} has been added to staff roster.`);
  };

  const DepartmentItem = ({ icon, label, count, color, bgColor }: any) => (
    <View className="flex-1 items-center">
      <View className={`w-12 h-12 ${bgColor} rounded-xl items-center justify-center mb-1`}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text className="text-[9px] text-gray-400 text-center" numberOfLines={1}>{label}</Text>
      <Text className="text-xs font-bold text-white">{count}</Text>
    </View>
  );

  const StaffItem = ({ name, role, phone, status, avatar }: any) => (
    <View className="flex-row items-center justify-between mb-4 bg-[#141b2d] p-3 rounded-2xl border border-white/5">
      <View className="flex-row items-center space-x-3">
        <Image
          source={{ uri: avatar }}
          className="w-10 h-10 rounded-full"
        />
        <View className="ms-2">
          <Text className="text-sm font-semibold text-white">{name}</Text>
          <Text className="text-[10px] text-gray-400">{role}</Text>
          <Text className="text-[10px] text-gray-400">{phone}</Text>
        </View>
      </View>
      <View className={`px-2 py-0.5 rounded ${status === 'Active' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
        <Text className={`text-[10px] font-bold ${status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>{status}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0a0f1d]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <View className="flex-row items-center space-x-4">
          <Text className="text-xl font-bold text-white">Staff Management</Text>
        </View>
        <TouchableOpacity className="p-2" onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Operational Overview Card */}
        <View className="bg-[#141b2d] rounded-2xl p-5 mb-6 flex-row justify-between items-center border border-white/5">
          <View className="space-y-4">
            <View>
              <Text className="text-gray-400 text-sm">Total Staff</Text>
              <Text className="text-3xl font-bold text-white">{stats.total}</Text>
            </View>
            <View className="flex-row space-x-8">
              <View>
                <Text className="text-gray-400 text-xs">Active Staff</Text>
                <Text className="text-lg font-semibold text-white">{stats.active}</Text>
              </View>
              <View className="ms-4">
                <Text className="text-gray-400 text-xs">On Leave</Text>
                <Text className="text-lg font-semibold text-white">{stats.onLeave}</Text>
              </View>
            </View>
          </View>

          <View className="items-center justify-center">
            <View className="w-20 h-20 rounded-full border-4 border-[#1e293b] items-center justify-center">
              <View className="absolute w-20 h-20 rounded-full border-4 border-cyan-500" style={{ borderBottomColor: 'transparent', borderLeftColor: 'transparent' }} />
              <Text className="text-lg font-bold text-white">{stats.activePercentage}%</Text>
              <Text className="text-[10px] text-gray-400">Active</Text>
            </View>
          </View>
        </View>

        {/* Departments */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-base text-white">Departments</Text>
            <Text className="text-indigo-400 text-xs font-semibold">{departments.length} Units</Text>
          </View>
          <View className="flex-row space-x-2">
            {departments.map((d, i) => (
              <DepartmentItem
                key={i}
                icon={d.icon}
                label={d.label}
                count={d.count}
                color={d.color}
                bgColor={d.bgColor}
              />
            ))}
          </View>
        </View>

        {/* Active Staff Roster */}
        <View className="mb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-base text-white">Active Staff Roster ({staff.length})</Text>
          </View>

          {staff.map((member) => (
            <StaffItem
              key={member.id}
              name={member.name}
              role={member.role}
              phone={member.phone}
              status={member.status}
              avatar={member.avatar}
            />
          ))}
        </View>
      </ScrollView>

      {/* FAB to Add Staff */}
      <TouchableOpacity
        className="absolute bottom-24 right-6 w-12 h-12 bg-indigo-600 rounded-full items-center justify-center shadow-lg border-2 border-indigo-400"
        onPress={() => setAddModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Add Staff Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>Add Staff Member</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Full Name</Text>
            <TextInput
              style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: 12, borderRadius: 10, marginBottom: 14 }}
              placeholder="e.g. Alex Morgan"
              placeholderTextColor="#64748b"
              value={newStaffName}
              onChangeText={setNewStaffName}
            />

            <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Operational Role</Text>
            <TextInput
              style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: 12, borderRadius: 10, marginBottom: 14 }}
              placeholder="e.g. Front Desk Specialist"
              placeholderTextColor="#64748b"
              value={newStaffRole}
              onChangeText={setNewStaffRole}
            />

            <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Direct Phone</Text>
            <TextInput
              style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: 12, borderRadius: 10, marginBottom: 20 }}
              placeholder="e.g. +1 (555) 123-4567"
              placeholderTextColor="#64748b"
              value={newStaffPhone}
              onChangeText={setNewStaffPhone}
            />

            <TouchableOpacity
              style={{ backgroundColor: '#6366f1', padding: 14, borderRadius: 12, alignItems: 'center' }}
              onPress={handleAddStaff}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Confirm & Onboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
