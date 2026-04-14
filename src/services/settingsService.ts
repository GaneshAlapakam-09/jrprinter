import api from '../api/axios';

export const settingsService = {
  // Store identity (name, address, gstin, receipt header/footer)
  getStore: async (storeId: number = 1) => {
    return api.get(`/api/stores/${storeId}/`);
  },
  updateStore: async (storeId: number, data: any) => {
    return api.patch(`/api/stores/${storeId}/`, data);
  },

  // Store operational settings (tax, prefix, printer)
  getStoreSettings: async () => {
    return api.get('/api/store-settings/');
  },
  updateStoreSettings: async (id: number, data: any) => {
    return api.put(`/api/store-settings/${id}/`, data);
  },

  // Sync
  getSyncStatus: async () => {
    return api.get('/api/sync/status/');
  },
  pullSync: async () => {
    return api.post('/api/sync/pull/');
  },
};
