// Space data adapters - Transform between API and UI formats

export const spaceAdapter = {
  // Transform API response to UI format
  toUI(apiSpace) {
    return {
      id: apiSpace.spaceId,
      name: apiSpace.name,
      type: apiSpace.type || 'personal',
      ownerId: apiSpace.ownerId,
      members: apiSpace.members || [],
      admins: apiSpace.admins || [],
      createdAt: apiSpace.createdAt,
    };
  },

  // Transform UI format to API format
  toAPI(uiSpace) {
    return {
      name: uiSpace.name,
      type: uiSpace.type || 'personal',
      members: uiSpace.members || [],
      admins: uiSpace.admins || [],
    };
  },

  // Transform array of spaces
  toUIArray(apiSpaces) {
    return apiSpaces.map(space => this.toUI(space));
  },
};

