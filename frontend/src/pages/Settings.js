import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Bell, Download, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import PasskeyDialog from '../components/PasskeyDialog';
import apiClient, { getApiUrl } from '../services/api';
import { passwordService } from '../services/passwordService';
import { decryptData } from '../utils/encryption';

export default function Settings() {
  const { currentUser, logout, getAuthHeaders, encryptionKey } = useAuth();
  const [settings, setSettings] = useState({
    passwordEnabled: false,
    autoLock: true,
    exportFormat: 'json',
    loginNotifications: true,
    clipboardAutoClear: true
  });
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load settings from currentUser
    if (currentUser) {
      setSettings(prev => ({
        ...prev,
        passwordEnabled: currentUser.passwordEnabled || false,
        autoLock: currentUser.preferences?.autoLock !== false,
        loginNotifications: currentUser.preferences?.loginNotifications !== false,
        clipboardAutoClear: currentUser.preferences?.clipboardAutoClear !== false
      }));
    }
  }, [currentUser]);

  const handleToggle = async (key) => {
    if (key === 'passwordEnabled') {
      // If enabling passkey, show dialog
      if (!settings.passwordEnabled) {
        setShowPasskeyDialog(true);
      } else {
        // If disabling, show confirmation
        if (window.confirm('Are you sure you want to disable your passkey? This will prevent you from downloading passwords.')) {
          // Note: Backend doesn't have a disable endpoint yet, so we'll just show a message
          toast.info('To disable passkey, please contact support or use the account deletion feature');
        }
      }
    } else {
      // For other settings, just update local state
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
      toast.success('Setting updated');
    }
  };

  const handlePasskeySet = () => {
    setSettings(prev => ({ ...prev, passwordEnabled: true }));
    setShowPasskeyDialog(false);
  };

  const handleExportVault = async (format = 'json') => {
    if (!currentUser?.passwordEnabled) {
      toast.error('Please enable passkey first to download passwords');
      return;
    }

    try {
      if (!encryptionKey) {
        toast.error('Encryption key not available');
        return;
      }

      toast.loading(`Preparing ${format.toUpperCase()} download...`, { id: 'export' });
      const headers = await getAuthHeaders();
      const exportData = await passwordService.exportPasswords(headers);
      
      // Decrypt passwords
      const decryptedPasswords = await Promise.all(
        exportData.passwords.map(async (pwd) => {
          try {
            const decryptedPassword = pwd.encryptedPassword 
              ? await decryptData(pwd.encryptedPassword, encryptionKey)
              : '';
            const decryptedNotes = pwd.encryptedNotes 
              ? await decryptData(pwd.encryptedNotes, encryptionKey)
              : '';
            
            return {
              ...pwd,
              password: decryptedPassword,
              notes: decryptedNotes,
              encryptedPassword: undefined,
              encryptedNotes: undefined
            };
          } catch (error) {
            console.error('Failed to decrypt password:', error);
            return {
              ...pwd,
              password: '[Decryption Failed]',
              notes: pwd.encryptedNotes ? '[Decryption Failed]' : '',
              encryptedPassword: undefined,
              encryptedNotes: undefined
            };
          }
        })
      );

      // Use export utility
      const { exportPasswords: exportUtil } = await import('../utils/passwordExport');
      exportUtil(decryptedPasswords, exportData, format);

      toast.success(`Passwords downloaded as ${format.toUpperCase()} successfully`, { id: 'export' });
    } catch (error) {
      console.error('Failed to export passwords:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to export passwords';
      toast.error(errorMessage, { id: 'export' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? Your data will be retained for 30 days, but you will not be able to access it. This action cannot be undone.')) {
      return;
    }

    // Second confirmation
    if (!window.confirm('This is your last chance. Are you absolutely sure you want to delete your account?')) {
      return;
    }

    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      await apiClient.delete(getApiUrl('/api/users/me'), { headers });
      
      toast.success('Account deleted successfully');
      // Logout user after deletion
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      console.error('Failed to delete account:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete account';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
                <Label className="text-base">Enable Passkey</Label>
                <p className="text-sm text-gray-600">Set a passkey to protect your vault and enable password downloads</p>
              </div>
              <Switch
                checked={settings.passwordEnabled}
                onCheckedChange={() => handleToggle('passwordEnabled')}
                data-testid="password-toggle"
                disabled={loading}
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
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                defaultValue="json"
                onValueChange={(value) => {
                  // Store selected format for export
                  setSettings(prev => ({ ...prev, exportFormat: value }));
                }}
              >
                <SelectTrigger className="w-full" data-testid="export-format-select">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF (Text)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleExportVault(settings.exportFormat || 'json')}
              variant="outline"
              className="w-full justify-start"
              data-testid="export-vault-btn"
              disabled={!currentUser?.passwordEnabled}
              title={!currentUser?.passwordEnabled ? 'Enable passkey to download passwords' : ''}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Passwords ({settings.exportFormat?.toUpperCase() || 'JSON'})
            </Button>
            {!currentUser?.passwordEnabled && (
              <p className="text-sm text-gray-500 italic">
                Enable passkey in Security settings to download your passwords
              </p>
            )}
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

      {/* Passkey Dialog */}
      <PasskeyDialog
        open={showPasskeyDialog}
        onOpenChange={(open) => {
          setShowPasskeyDialog(open);
          if (!open) {
            // If dialog is closed without setting passkey, reset toggle
            setSettings(prev => ({ ...prev, passwordEnabled: false }));
          }
        }}
        required={false}
      />
    </Layout>
  );
}