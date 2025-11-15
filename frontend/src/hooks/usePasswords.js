import { useEffect } from 'react';
import usePasswordStore from '../stores/passwordStore';
import { PASSWORD_CATEGORIES, DEFAULTS } from '../constants';

export const usePasswords = (spaceId = null, includeShared = true) => {
  const {
    passwords,
    filteredPasswords,
    loading,
    error,
    loadPasswords,
    createPassword,
    updatePassword,
    deletePassword,
    filterPasswords,
  } = usePasswordStore();

  useEffect(() => {
    loadPasswords(spaceId, includeShared);
  }, [spaceId, includeShared]);

  return {
    passwords,
    filteredPasswords,
    loading,
    error,
    loadPasswords,
    createPassword,
    updatePassword,
    deletePassword,
    filterPasswords,
    categories: PASSWORD_CATEGORIES,
    defaultCategory: DEFAULTS.PASSWORD_CATEGORY,
  };
};

