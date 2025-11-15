import { useState, useCallback } from 'react';
import { userService } from '../services/userService';
import { userAdapter } from '../adapters/userAdapter';
import { UI } from '../constants';

export const useUsers = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await userService.search(query);
      const uiResults = userAdapter.searchResultsToUIArray(results);
      setSearchResults(uiResults);
    } catch (error) {
      console.error('User search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    searchResults,
    searching,
    searchUsers,
    clearSearch,
  };
};

