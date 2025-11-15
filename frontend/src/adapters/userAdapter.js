// User data adapters - Transform between API and UI formats

export const userAdapter = {
  // Transform API response to UI format
  toUI(apiUser) {
    return {
      id: apiUser.userId,
      email: apiUser.email,
      displayName: apiUser.displayName || '',
      photoURL: apiUser.photoURL || '',
      createdAt: apiUser.createdAt,
      lastLogin: apiUser.lastLogin,
    };
  },

  // Transform search result to UI format
  searchResultToUI(searchResult) {
    return {
      id: searchResult.userId,
      email: searchResult.email || '',
      displayName: searchResult.displayName || '',
      photoURL: searchResult.photoURL || '',
    };
  },

  // Transform array of users
  toUIArray(apiUsers) {
    return apiUsers.map(user => this.toUI(user));
  },

  // Transform array of search results
  searchResultsToUIArray(searchResults) {
    return searchResults.map(result => this.searchResultToUI(result));
  },
};

