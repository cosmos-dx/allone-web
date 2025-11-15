import { useEffect } from 'react';
import useTOTPStore from '../stores/totpStore';
import { TOTP_DEFAULTS } from '../constants';

export const useTOTPs = (spaceId = null, includeShared = true) => {
  const {
    totps,
    loading,
    error,
    loadTOTPs,
    createTOTP,
    updateTOTP,
    deleteTOTP,
  } = useTOTPStore();

  useEffect(() => {
    loadTOTPs(spaceId, includeShared);
  }, [spaceId, includeShared]);

  return {
    totps,
    loading,
    error,
    loadTOTPs,
    createTOTP,
    updateTOTP,
    deleteTOTP,
    defaults: TOTP_DEFAULTS,
  };
};

