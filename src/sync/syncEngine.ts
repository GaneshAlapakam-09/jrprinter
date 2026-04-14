import { queueManager, SyncJob } from './queueManager';
import api from '../api/axios';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const syncEngine = {
  isSyncing: false,

  uploadQueue: async (): Promise<void> => {
    if (syncEngine.isSyncing) return;
    
    const state = await NetInfo.fetch();
    if (!state.isConnected) return; // Wait for network

    syncEngine.isSyncing = true;
    const queue = await queueManager.getQueue();
    const pendingJobs = queue.filter(j => j.status === 'pending' || j.status === 'failed');

    for (let job of pendingJobs) {
      if (job.retryCount > 5) continue; // Backoff completely, require manual intervention.

      try {
        let endpoint = '';
        if (job.entityType === 'sale') endpoint = '/api/bills/';
        else if (job.entityType === 'purchase') endpoint = '/api/purchases/';
        else if (job.entityType === 'stock_adjustment') endpoint = '/api/stock-movements/';
        else if (job.entityType === 'customer') endpoint = '/api/customers/';

        const res = await api.post(endpoint, job.payload);
        
        // Success: Item is matched matching offline_uuid on server and created.
        if (res.status === 200 || res.status === 201) {
           await queueManager.removeJob(job.id);
        }

      } catch (err: any) {
        let status: SyncJob['status'] = 'failed';
        let errStr = err.message;
        let conflictData = null;

        if (err.response) {
          if (err.response.status === 409 || err.response.data?.conflict) {
             status = 'conflict';
             conflictData = err.response.data; // Actionable conflicts like price change
          } else if (err.response.status >= 500) {
             // Server error, keep failed.
          } else {
             errStr = JSON.stringify(err.response.data);
          }
        }

        await queueManager.updateJobStatus(job.id, status, errStr, conflictData);
        // Implement simple exponential backoff by sleeping if necessary or letting the interval re-trigger it
      }
    }

    syncEngine.isSyncing = false;
    await AsyncStorage.setItem('@last_sync_upload', new Date().toISOString());
  },

  downloadMasterData: async (): Promise<void> => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    try {
      // Typically fires a call to /api/sync/pull/ which handles returning massive chunks or pushes to sqlite.
      await api.post('/api/sync/pull/');
      await AsyncStorage.setItem('@last_sync_download', new Date().toISOString());
    } catch (e) {
      console.warn("Pull Sync failed", e);
    }
  },

  startAutoSync: (intervalMs = 60000) => {
    setInterval(() => {
       syncEngine.uploadQueue();
    }, intervalMs);
  }
};
