import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Copy, Trash2, Smartphone, Upload, Camera, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { encryptData, decryptData } from '../utils/encryption';
import { generateTOTP, getRemainingTime, parseOtpAuthUrl } from '../utils/totp';
import jsQR from 'jsqr';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Authenticator() {
  const { getAuthHeaders, encryptionKey } = useAuth();
  const [totps, setTotps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: '',
    account: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30
  });

  useEffect(() => {
    loadTOTPs();
  }, []);

  const loadTOTPs = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API}/totp`, { headers });
      setTotps(response.data);
    } catch (error) {
      console.error('Failed to load TOTP codes:', error);
      toast.error('Failed to load TOTP codes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTOTP = async () => {
    if (!formData.serviceName || !formData.account || !formData.secret) {
      toast.error('Service name, account, and secret are required');
      return;
    }

    try {
      const encryptedSecret = await encryptData(formData.secret, encryptionKey);
      const headers = await getAuthHeaders();
      
      await axios.post(
        `${API}/totp`,
        {
          ...formData,
          encryptedSecret
        },
        { headers }
      );

      toast.success('TOTP authenticator added');
      setIsAddDialogOpen(false);
      resetForm();
      loadTOTPs();
    } catch (error) {
      console.error('Failed to add TOTP:', error);
      toast.error('Failed to add TOTP');
    }
  };

  const handleDeleteTOTP = async (totpId) => {
    if (!window.confirm('Are you sure you want to delete this authenticator?')) return;

    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API}/totp/${totpId}`, { headers });
      toast.success('Authenticator deleted');
      loadTOTPs();
    } catch (error) {
      toast.error('Failed to delete authenticator');
    }
  };

  const handleQRUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          const parsed = parseOtpAuthUrl(code.data);
          if (parsed) {
            setFormData({
              serviceName: parsed.issuer || parsed.account,
              account: parsed.account,
              secret: parsed.secret,
              algorithm: parsed.algorithm,
              digits: parsed.digits,
              period: parsed.period
            });
            toast.success('QR code scanned successfully');
          } else {
            toast.error('Invalid QR code format');
          }
        } else {
          toast.error('No QR code found in image');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData({
      serviceName: '',
      account: '',
      secret: '',
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="authenticator-page">
        {/* Header */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Authenticator</h1>
              <p className="text-gray-600">{totps.length} TOTP codes</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-orange-600 to-orange-700 text-white"
                data-testid="add-totp-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Authenticator
              </Button>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add TOTP Authenticator</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="manual" className="py-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" data-testid="tab-upload">Upload QR</TabsTrigger>
                    <TabsTrigger value="manual" data-testid="tab-manual">Manual Entry</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-600 mb-4">Upload a QR code image</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleQRUpload}
                        className="max-w-xs mx-auto"
                        data-testid="qr-upload-input"
                      />
                    </div>
                    {formData.secret && (
                      <div className="space-y-4">
                        <div>
                          <Label>Service Name</Label>
                          <Input value={formData.serviceName} onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })} />
                        </div>
                        <div>
                          <Label>Account</Label>
                          <Input value={formData.account} onChange={(e) => setFormData({ ...formData, account: e.target.value })} />
                        </div>
                        <Button onClick={handleAddTOTP} className="w-full" data-testid="save-totp-btn-upload">
                          Save Authenticator
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="manual" className="space-y-4">
                    <div>
                      <Label>Service Name *</Label>
                      <Input
                        value={formData.serviceName}
                        onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                        placeholder="e.g., Google, GitHub"
                        data-testid="totp-service-input"
                      />
                    </div>
                    <div>
                      <Label>Account *</Label>
                      <Input
                        value={formData.account}
                        onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                        placeholder="username@example.com"
                        data-testid="totp-account-input"
                      />
                    </div>
                    <div>
                      <Label>Secret Key *</Label>
                      <Input
                        value={formData.secret}
                        onChange={(e) => setFormData({ ...formData, secret: e.target.value.toUpperCase().replace(/\s/g, '') })}
                        placeholder="JBSWY3DPEHPK3PXP"
                        data-testid="totp-secret-input"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter the secret key provided by the service</p>
                    </div>
                    <Button onClick={handleAddTOTP} className="w-full" data-testid="save-totp-btn-manual">
                      Save Authenticator
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* TOTP Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {totps.map((totp, index) => (
            <TOTPCard
              key={totp.totpId}
              totp={totp}
              index={index}
              encryptionKey={encryptionKey}
              onDelete={handleDeleteTOTP}
            />
          ))}
        </div>

        {totps.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <Smartphone className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">No authenticators yet</h3>
            <p className="text-gray-600 mb-4">Add your first TOTP authenticator to generate 2FA codes</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function TOTPCard({ totp, index, encryptionKey, onDelete }) {
  const [code, setCode] = useState('------');
  const [timeLeft, setTimeLeft] = useState(30);
  const [secret, setSecret] = useState('');

  useEffect(() => {
    decryptSecret();
  }, []);

  useEffect(() => {
    if (!secret) return;

    const updateCode = async () => {
      const newCode = await generateTOTP(secret, totp.period, totp.digits);
      setCode(newCode);
      setTimeLeft(getRemainingTime(totp.period));
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [secret, totp.period, totp.digits]);

  const decryptSecret = async () => {
    try {
      const decrypted = await decryptData(totp.encryptedSecret, encryptionKey);
      setSecret(decrypted);
    } catch (error) {
      console.error('Failed to decrypt TOTP secret:', error);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const progress = (timeLeft / totp.period) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl p-6 shadow-lg hover:shadow-xl smooth-transition"
      data-testid={`totp-card-${index}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-800">{totp.serviceName}</h3>
          <p className="text-sm text-gray-600">{totp.account}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(totp.totpId)}
          className="text-red-600 hover:bg-red-50"
          data-testid={`delete-totp-${index}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative mb-4">
        <div 
          className="absolute top-0 left-0 w-full h-1 bg-orange-200 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      </div>

      <div 
        className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 mb-4 cursor-pointer hover:scale-105 smooth-transition"
        onClick={handleCopyCode}
        data-testid={`copy-code-${index}`}
      >
        <div className="text-4xl font-mono font-bold text-center tracking-wider text-gray-800">
          {code.match(/.{1,3}/g)?.join(' ') || code}
        </div>
        <div className="text-center text-sm text-gray-600 mt-2">
          {timeLeft}s remaining
        </div>
      </div>

      <Button
        onClick={handleCopyCode}
        variant="outline"
        className="w-full"
        data-testid={`copy-code-btn-${index}`}
      >
        <Copy className="w-3 h-3 mr-2" />
        Copy Code
      </Button>
    </motion.div>
  );
}