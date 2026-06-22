import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchAdminUsers,
  updateUserRole,
  type AdminUser,
  type UserProfile,
} from '@/lib/auth-api';

const TEAL = '#0F766E';

type AdminUsersProps = {
  accessToken: string;
  adminProfile: UserProfile | null;
  onOpenDrawer?: () => void;
  setGlobalError: (msg: string) => void;
  setGlobalSuccess: (msg: string) => void;
};

export default function AdminUsers({
  accessToken,
  adminProfile,
  onOpenDrawer,
  setGlobalError,
  setGlobalSuccess,
}: AdminUsersProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Selected user for role changing
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load all users
  const loadUsers = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetchAdminUsers(accessToken);
        setUsers(response.users);
      } catch (err: any) {
        setGlobalError(err?.message ?? 'Failed to load users.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, setGlobalError]
  );

  useEffect(() => {
    loadUsers(true);
  }, []);

  // Filter users locally by search query
  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      u.username.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  // Handle role change click
  const handleRoleChangeClick = (user: AdminUser) => {
    if (adminProfile && user.id === adminProfile.id) {
      setGlobalError('Security Alert: You cannot demote yourself. Another administrator must change your role.');
      return;
    }
    setSelectedUser(user);
    setConfirmVisible(true);
  };

  // Perform role change
  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    const targetRole = selectedUser.role === 'admin' ? 'customer' : 'admin';

    setActionLoading(true);
    try {
      const res = await updateUserRole(accessToken, selectedUser.id, targetRole);
      setGlobalSuccess(res.message || `User role updated to ${targetRole} successfully!`);
      
      // Update local state
      const updatedUser = res.user;
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setConfirmVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      setGlobalError(err?.message ?? 'Failed to update user role.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F0FDF9]">
      {/* Header bar */}
      <View className="flex-row items-center justify-between bg-teal-800 px-4 py-4 shadow-sm" style={{ minHeight: 64 }}>
        <View className="flex-row items-center gap-3">
          {onOpenDrawer && (
            <Pressable onPress={onOpenDrawer} className="h-9 w-9 items-center justify-center rounded-full bg-teal-900/40">
              <Ionicons name="menu-outline" size={24} color="#fff" />
            </Pressable>
          )}
          <View>
            <Text className="text-[18px] font-black text-white">Users Directory</Text>
            <Text className="text-[11px] text-teal-200">Manage user roles and authorization controls</Text>
          </View>
        </View>
        <Pressable
          onPress={() => loadUsers(true)}
          disabled={loading}
          className="h-9 w-9 items-center justify-center rounded-full bg-teal-900/40 active:bg-teal-950"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* Search Input bar */}
      <View className="bg-white border-b border-slate-100 px-4 py-3 shadow-sm flex-row gap-2 items-center">
        <View className="flex-1 flex-row items-center rounded-full bg-slate-100 px-4 py-2 border border-slate-200">
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or role..."
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            className="ml-2 flex-1 text-[13px] font-semibold text-[#0F172A]"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Users directory list */}
      {loading && users.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={TEAL} />
          <Text className="mt-3 text-[14px] text-slate-400 font-semibold">Loading users database...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={() => {
            setRefreshing(true);
            loadUsers(false);
          }}
          refreshing={refreshing}
          contentContainerStyle={{ padding: 12, paddingBottom: 64, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center py-20 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                <Ionicons name="people-outline" size={28} color="#94A3B8" />
              </View>
              <Text className="text-[16px] font-black text-[#0F172A]">No users found</Text>
              <Text className="mt-1 text-center text-[12px] text-slate-400 max-w-[240px]">
                We could not find any user profiles matching {search}.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const firstLetter = item.username.charAt(0).toUpperCase();
            const isAdmin = item.role === 'admin';
            const isMe = adminProfile?.id === item.id;

            return (
              <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                {/* User Info details */}
                <View className="flex-row items-center gap-3.5 flex-1 mr-3">
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-full
                      ${isAdmin ? 'bg-teal-700' : 'bg-slate-100'}`}
                  >
                    <Text className={`text-[15px] font-black ${isAdmin ? 'text-white' : 'text-slate-500'}`}>
                      {firstLetter}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="text-[14px] font-black text-[#0F172A]">{item.username}</Text>
                      {isMe && (
                        <View className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5">
                          <Text className="text-[9px] font-black text-blue-600 uppercase tracking-wide">You</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[11px] text-slate-400 font-semibold mt-0.5" numberOfLines={1}>
                      {item.email}
                    </Text>

                    {/* Role badge */}
                    <View className="mt-2.5 flex-row">
                      <View
                        className={`flex-row items-center gap-1 rounded-full px-2 py-0.5
                          ${isAdmin ? 'bg-teal-50 border border-teal-100' : 'bg-slate-50 border border-slate-100'}`}
                      >
                        <Ionicons
                          name={isAdmin ? 'shield-checkmark' : 'person-outline'}
                          size={10}
                          color={isAdmin ? '#0F766E' : '#64748B'}
                        />
                        <Text
                          className={`text-[9.5px] font-black uppercase tracking-wider
                            ${isAdmin ? 'text-teal-700' : 'text-slate-500'}`}
                        >
                          {item.role}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Role Switch action button */}
                {!isMe ? (
                  <Pressable
                    onPress={() => handleRoleChangeClick(item)}
                    style={{
                      borderWidth: 1.5,
                      borderColor: isAdmin ? '#FDA4AF' : '#99F6E4',
                      backgroundColor: isAdmin ? '#FFF1F2' : '#F0FDF9',
                    }}
                    className="rounded-xl px-3 py-2 active:opacity-75 items-center justify-center flex-row gap-1"
                  >
                    <Ionicons
                      name={isAdmin ? 'shield-outline' : 'shield-half'}
                      size={13}
                      color={isAdmin ? '#E11D48' : '#0F766E'}
                    />
                    <Text className={`text-[11px] font-black uppercase ${isAdmin ? 'text-rose-600' : 'text-teal-700'}`}>
                      {isAdmin ? 'Demote' : 'Promote'}
                    </Text>
                  </Pressable>
                ) : (
                  <View className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Self locked</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-[24px] p-6 w-full max-w-[340px] shadow-xl">
            <View className="flex-row items-center gap-2.5 mb-2">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-teal-50">
                <Ionicons name="shield" size={18} color={TEAL} />
              </View>
              <Text className="text-[16px] font-black text-[#0F172A]">Change User Role</Text>
            </View>

            <Text className="text-[13px] leading-5 text-slate-500 mb-5">
              Are you sure you want to {selectedUser?.role === 'admin' ? 'demote' : 'promote'}{' '}
              <Text className="font-black text-[#0F172A]">@{selectedUser?.username}</Text> to{' '}
              <Text className="font-black text-teal-800">
                {selectedUser?.role === 'admin' ? 'customer' : 'admin'}
              </Text>
              ?
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setConfirmVisible(false);
                  setSelectedUser(null);
                }}
                className="flex-1 rounded-xl bg-slate-100 py-3 active:bg-slate-200"
              >
                <Text className="text-center text-[12px] font-black text-slate-600 uppercase">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmRoleChange}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-teal-700 py-3 active:bg-teal-800 justify-center"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center text-[12px] font-black text-white uppercase">Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
