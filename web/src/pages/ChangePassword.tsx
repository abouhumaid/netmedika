import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';

export const ChangePassword: React.FC = () => {
  const { success, error } = useNotification();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      error('Password Error', 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Password Error', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      success('Password Changed', 'Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      error('Password Change Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const fields = [
    { label: 'Current Password', value: currentPassword, setValue: setCurrentPassword, autoComplete: 'current-password' },
    { label: 'New Password', value: newPassword, setValue: setNewPassword, autoComplete: 'new-password' },
    { label: 'Confirm New Password', value: confirmPassword, setValue: setConfirmPassword, autoComplete: 'new-password' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-200">
      <div>
        <Link to="/profile" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"><ArrowLeft className="h-3.5 w-3.5"/>Back to profile</Link>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Change Password</h2>
        <p className="mt-0.5 text-xs text-slate-500">Update the password used to access your administrator account.</p>
      </div>

      <Card title="Security & Authentication" subtitle="Choose a strong password with at least 8 characters.">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.label}>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">{field.label}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input type="password" value={field.value} onChange={(event) => field.setValue(event.target.value)} required autoComplete={field.autoComplete} minLength={field.label === 'Current Password' ? undefined : 8} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500" />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2"><Button type="submit" variant="primary" isLoading={isChangingPassword}>Update Password</Button></div>
        </form>
      </Card>
    </div>
  );
};
