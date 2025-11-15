// TOTP data adapters - Transform between API and UI formats

export const totpAdapter = {
  // Transform API response to UI format
  toUI(apiTotp) {
    return {
      id: apiTotp.totpId,
      serviceName: apiTotp.serviceName,
      account: apiTotp.account,
      encryptedSecret: apiTotp.encryptedSecret,
      algorithm: apiTotp.algorithm || 'SHA1',
      digits: apiTotp.digits || 6,
      period: apiTotp.period || 30,
      spaceId: apiTotp.spaceId || 'personal',
      isShared: apiTotp.isShared || false,
      createdAt: apiTotp.createdAt,
    };
  },

  // Transform UI format to API format
  toAPI(uiTotp) {
    return {
      serviceName: uiTotp.serviceName,
      account: uiTotp.account,
      encryptedSecret: uiTotp.encryptedSecret,
      algorithm: uiTotp.algorithm || 'SHA1',
      digits: uiTotp.digits || 6,
      period: uiTotp.period || 30,
      spaceId: uiTotp.spaceId || 'personal',
    };
  },

  // Transform array of TOTPs
  toUIArray(apiTotps) {
    return apiTotps.map(totp => this.toUI(totp));
  },
};

