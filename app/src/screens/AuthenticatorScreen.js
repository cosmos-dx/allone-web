import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import useTOTPStore from '../stores/totpStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../components/ui/Card';
import TOTPCard from '../components/authenticator/TOTPCard';
import { Input } from '../components/ui/Input';
import { createSquircleStyle } from '../utils/squircle';
import { encryptData } from '../utils/encryption';
import { parseOtpAuthUrl } from '../utils/totp';
import { toast } from '../utils/toast';

export default function AuthenticatorScreen() {
  const { getAuthHeaders, encryptionKey, currentUser } = useAuth();
  const { totps, loadTOTPs, createTOTP, deleteTOTP, loading } = useTOTPStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    serviceName: '',
    account: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTOTPs(null, true, false, getAuthHeaders);
  }, []);

  const handleAddTOTP = async () => {
    if (!formData.serviceName || !formData.account || !formData.secret) {
      toast.error('Service name, account, and secret are required');
      return;
    }

    setSubmitting(true);
    try {
      const encryptedSecret = await encryptData(formData.secret, encryptionKey);
      
      await createTOTP({
        serviceName: formData.serviceName,
        account: formData.account,
        encryptedSecret,
        algorithm: formData.algorithm || 'SHA1',
        digits: formData.digits || 6,
        period: formData.period || 30,
        spaceId: 'personal',
      }, getAuthHeaders);

      toast.success('Authenticator added successfully');
      setIsAddModalOpen(false);
      resetForm();
      loadTOTPs(null, true, true, getAuthHeaders);
    } catch (error) {
      console.error('Failed to add TOTP:', error);
      toast.error('Failed to add authenticator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTOTP = async (totpId) => {
    Alert.alert(
      'Delete Authenticator',
      'Are you sure you want to delete this authenticator?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTOTP(totpId, getAuthHeaders);
              toast.success('Authenticator deleted');
              loadTOTPs(null, true, true, getAuthHeaders);
            } catch (error) {
              console.error('Failed to delete authenticator:', error);
              toast.error('Failed to delete authenticator');
            }
          },
        },
      ]
    );
  };

  const handleQRScan = () => {
    // QR scanning would be implemented with expo-camera or similar
    toast.info('QR scanning coming soon');
  };

  const handleSecretChange = (text) => {
    // Auto-format secret (uppercase, remove spaces)
    const formatted = text.toUpperCase().replace(/\s/g, '');
    setFormData({ ...formData, secret: formatted });
  };

  const resetForm = () => {
    setFormData({
      serviceName: '',
      account: '',
      secret: '',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
  };

  if (loading) {
    return (
      <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#faf5ff', '#fff7ed', '#fefce8']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Authenticator</Text>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          style={[styles.addButton, createSquircleStyle('xl')]}
        >
          <LinearGradient
            colors={['#ea580c', '#f59e0b']}
            style={styles.addButtonGradient}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={totps}
        renderItem={({ item }) => (
          <TOTPCard
            totp={item}
            encryptionKey={encryptionKey}
            userId={currentUser?.userId ?? currentUser?.uid}
            onDelete={handleDeleteTOTP}
          />
        )}
        keyExtractor={(item) => item.totpId}
        contentContainerStyle={styles.listContent}
        numColumns={1}
        ListEmptyComponent={
          <Card glass style={styles.emptyCard} radius="xl">
            <MaterialCommunityIcons name="cellphone-key" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No authenticators yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first authenticator to generate 2FA codes
            </Text>
          </Card>
        }
      />

      {/* Add Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card glass style={styles.modalCard} radius="xl">
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <Text style={styles.formTitle}>Add Authenticator</Text>

                <TouchableOpacity
                  onPress={handleQRScan}
                  style={[styles.qrButton, createSquircleStyle('xl')]}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={24} color="#ea580c" />
                  <Text style={styles.qrButtonText}>Scan QR Code</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Service Name *</Text>
                  <Input
                    placeholder="e.g., Google, GitHub"
                    value={formData.serviceName}
                    onChangeText={(text) => setFormData({ ...formData, serviceName: text })}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Account *</Text>
                  <Input
                    placeholder="username@example.com"
                    value={formData.account}
                    onChangeText={(text) => setFormData({ ...formData, account: text })}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.label}>Secret Key *</Text>
                  <Input
                    placeholder="JBSWY3DPEHPK3PXP"
                    value={formData.secret}
                    onChangeText={handleSecretChange}
                    autoCapitalize="characters"
                  />
                  <Text style={styles.helperText}>
                    Enter the secret key provided by the service
                  </Text>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAddModalOpen(false);
                      resetForm();
                    }}
                    style={[styles.cancelButton, createSquircleStyle('xl')]}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddTOTP}
                    disabled={submitting}
                    style={[styles.submitButton, createSquircleStyle('xl')]}
                  >
                    <LinearGradient
                      colors={['#ea580c', '#f59e0b']}
                      style={styles.submitGradient}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Add Authenticator</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    width: 56,
    height: 56,
    overflow: 'hidden',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalContent: {
    maxHeight: '90%',
  },
  form: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    marginBottom: 24,
    gap: 12,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ea580c',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
