import { useEffect } from 'react';
import useSpaceStore from '../stores/spaceStore';
import { SPACE_TYPES } from '../constants';

export const useSpaces = () => {
  const {
    spaces,
    selectedSpace,
    spaceMembers,
    loading,
    error,
    loadSpaces,
    createSpace,
    updateSpace,
    deleteSpace,
    addMember,
    removeMember,
    transferOwnership,
    addAdmin,
    removeAdmin,
    setSelectedSpace,
    setSpaceMembers,
  } = useSpaceStore();

  useEffect(() => {
    loadSpaces();
  }, []);

  return {
    spaces,
    selectedSpace,
    spaceMembers,
    loading,
    error,
    loadSpaces,
    createSpace,
    updateSpace,
    deleteSpace,
    addMember,
    removeMember,
    transferOwnership,
    addAdmin,
    removeAdmin,
    setSelectedSpace,
    setSpaceMembers,
    spaceTypes: SPACE_TYPES,
  };
};

