import api from '../api/axios';

export const syncService = {
  pullUpdates: async () => {
    return api.get('/api/sync/pull/');
  },
  getSyncStatus: async () => {
    return api.get('/api/sync/status/');
  },
};
