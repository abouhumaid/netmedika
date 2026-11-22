import React, { useState, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { success, error } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile fields state
  const [username, setUsername] = useState(user?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [address, setAddress] = useState(user?.address || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      error('Validation Error', 'Username is required.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updated = await api.updateMe({
        username: username.trim(),
        phone_number: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
      });
      updateUser(updated);
      success('Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      error('Update Failed', err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Invalid Image', 'Please choose a PNG or JPEG file.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const updated = await api.updateAvatar(file);
      updateUser(updated);
      success('Avatar Updated', 'Profile photo updated successfully.');
    } catch (err: any) {
      error('Avatar Upload Failed', err.message);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header banner */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Administrator Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your administrator identity and contact information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Overview */}
        <div className="space-y-6">
          <Card className="text-center p-6">
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-24 h-24 rounded-2xl bg-pharmacy-100 text-pharmacy-800 flex items-center justify-center font-bold text-3xl shadow-sm border border-pharmacy-200 overflow-hidden">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.username?.[0] || 'A').toUpperCase()
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-pharmacy-600 hover:bg-pharmacy-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                title="Change Avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </div>

            <h3 className="text-base font-bold text-slate-900">{user?.username}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>System Administrator</span>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 text-left text-xs text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono font-semibold text-slate-700">#{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Access Scope:</span>
                <span className="font-semibold text-emerald-600">Full Clinical Admin</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Update Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Form */}
          <Card title="Account Details" subtitle="Update your administrative contact information">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name / Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(Read-only)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch / Operating Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. NetMedika HQ, Central District, Abuja"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pharmacy-500 text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" isLoading={isUpdatingProfile}>
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </Card>

        </div>
      </div>
    </div>
  );
};
