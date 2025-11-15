// Password data adapters - Transform between API and UI formats

export const passwordAdapter = {
  // Transform API response to UI format
  toUI(apiPassword) {
    return {
      id: apiPassword.passwordId,
      displayName: apiPassword.displayName,
      username: apiPassword.username || '',
      website: apiPassword.website || '',
      category: apiPassword.category || 'Other',
      encryptedPassword: apiPassword.encryptedPassword,
      notes: apiPassword.notes || '',
      strength: apiPassword.strength || 0,
      spaceId: apiPassword.spaceId || 'personal',
      tags: apiPassword.tags || [],
      isShared: apiPassword.isShared || false,
      createdAt: apiPassword.createdAt,
      updatedAt: apiPassword.updatedAt,
      lastUsed: apiPassword.lastUsed,
    };
  },

  // Transform UI format to API format
  toAPI(uiPassword) {
    return {
      displayName: uiPassword.displayName,
      username: uiPassword.username || '',
      website: uiPassword.website || '',
      category: uiPassword.category || 'Other',
      encryptedPassword: uiPassword.encryptedPassword,
      notes: uiPassword.notes || '',
      strength: uiPassword.strength || 0,
      spaceId: uiPassword.spaceId || 'personal',
      tags: uiPassword.tags || [],
    };
  },

  // Transform array of passwords
  toUIArray(apiPasswords) {
    return apiPasswords.map(pwd => this.toUI(pwd));
  },
};

