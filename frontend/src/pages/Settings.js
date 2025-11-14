import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Bell, Download, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const [settings, setSettings] = useState({
    passkeyEnabled: false,
    autoLock: true,
    loginNotifications: true,
    clipboardAutoClear: true
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Setting updated');
  };

  const handleExportVault = () => {
    toast.info('Export feature coming soon');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion feature coming soon');
    }
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="settings-page">
        {/* Header */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 text-white flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Profile</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {currentUser?.photoURL && (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-purple-200"
                />
              )}
              <div>
                <p className="font-semibold text-lg">{currentUser?.displayName || 'User'}</p>
                <p className="text-gray-600">{currentUser?.email}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Security</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Passkey (WebAuthn)</Label>
                <p className="text-sm text-gray-600">Use biometric authentication</p>
              </div>
              <Switch
                checked={settings.passkeyEnabled}
                onCheckedChange={() => handleToggle('passkeyEnabled')}
                data-testid="passkey-toggle"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Auto-lock</Label>
                <p className="text-sm text-gray-600">Lock app after 5 minutes of inactivity</p>
              </div>
              <Switch
                checked={settings.autoLock}
                onCheckedChange={() => handleToggle('autoLock')}
                data-testid="autolock-toggle"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Clipboard Auto-clear</Label>
                <p className="text-sm text-gray-600">Clear clipboard after 30 seconds</p>
              </div>
              <Switch
                checked={settings.clipboardAutoClear}
                onCheckedChange={() => handleToggle('clipboardAutoClear')}
                data-testid="clipboard-toggle"
              />
            </div>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Notifications</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Login Notifications</Label>
              <p className="text-sm text-gray-600">Get notified of new logins</p>
            </div>
            <Switch
              checked={settings.loginNotifications}
              onCheckedChange={() => handleToggle('loginNotifications')}
              data-testid="login-notifications-toggle"
            />
          </div>
        </motion.div>

        {/* Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Data</h2>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleExportVault}
              variant="outline"
              className="w-full justify-start"
              data-testid="export-vault-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Encrypted Vault
            </Button>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6 shadow-lg border-2 border-red-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-red-600">Danger Zone</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Once you delete your account, there is no going back. All your data will be permanently deleted.
            </p>
            <Button
              onClick={handleDeleteAccount}
              variant="destructive"
              className="w-full"
              data-testid="delete-account-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}