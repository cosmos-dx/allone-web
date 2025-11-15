import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shield, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiClient, { getApiUrl } from '../services/api';

export default function PasskeyDialog({ open, onOpenChange, required = false }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentUser, getAuthHeaders } = useAuth();

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'text-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'text-orange-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'text-yellow-500' };
    return { strength, label: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isValid = password.length >= 8 && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Please ensure password is at least 8 characters and passwords match');
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await apiClient.post(
        getApiUrl('/api/auth/set-password'),
        { password },
        { headers }
      );

      if (response.data.passwordEnabled) {
        toast.success('Passkey set successfully!');
        // Update current user state
        if (currentUser) {
          currentUser.passwordEnabled = true;
        }
        setPassword('');
        setConfirmPassword('');
        onOpenChange(false);
        // Reload page to refresh user data
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to set passkey:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to set passkey';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (required) {
      toast.info('Passkey is required for enhanced security');
      return;
    }
    toast.info('You can set a passkey later in Settings');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={required ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => required && e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 text-white flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Set Up Your Passkey</DialogTitle>
              <DialogDescription className="mt-1">
                Create a secure passkey to protect your vault and enable password downloads
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Passkey</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your passkey (min 8 characters)"
                className="pr-10"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-2 text-sm">
                <span className={passwordStrength.color}>{passwordStrength.label}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength.strength <= 2
                        ? 'bg-red-500'
                        : passwordStrength.strength <= 3
                        ? 'bg-orange-500'
                        : passwordStrength.strength <= 4
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Passkey</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your passkey"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && (
              <div className="flex items-center gap-2 text-sm">
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-green-500">Passwords match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!required && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="w-full sm:w-auto"
              >
                Skip for Now
              </Button>
            )}
            <Button
              type="submit"
              disabled={!isValid || loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Setting Passkey...' : 'Set Passkey'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

