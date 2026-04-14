import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@offline_sync_queue';

export interface SyncJob {
  id: string;
  entityType: 'sale' | 'purchase' | 'customer' | 'stock_adjustment';
  action: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'failed' | 'conflict';
  errorMessage?: string;
  conflictDetails?: any;
}

export const queueManager = {
  getQueue: async (): Promise<SyncJob[]> => {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setQueue: async (queue: SyncJob[]) => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  },

  enqueue: async (entityType: SyncJob['entityType'], action: SyncJob['action'], payload: any): Promise<SyncJob> => {
    // Generate UUID natively or mock it
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Check if payload has offline_uuid already, else attach this wrapper id
    if (!payload.offline_uuid) payload.offline_uuid = id;

    const job: SyncJob = {
      id, entityType, action, payload,
      createdAt: new Date().toISOString(),
      retryCount: 0, status: 'pending'
    };

    const queue = await queueManager.getQueue();
    queue.push(job);
    await queueManager.setQueue(queue);
    
    return job;
  },

  updateJobStatus: async (id: string, status: SyncJob['status'], errorMessage?: string, conflictDetails?: any) => {
    const queue = await queueManager.getQueue();
    const idx = queue.findIndex(j => j.id === id);
    if (idx > -1) {
      queue[idx].status = status;
      if (status === 'failed') queue[idx].retryCount += 1;
      if (errorMessage) queue[idx].errorMessage = errorMessage;
      if (conflictDetails) queue[idx].conflictDetails = conflictDetails;
      await queueManager.setQueue(queue);
    }
  },

  removeJob: async (id: string) => {
    const queue = await queueManager.getQueue();
    const filtered = queue.filter(j => j.id !== id);
    await queueManager.setQueue(filtered);
  },

  clearCompleted: async () => {
    // Usually handled by removeJob implicitly upon success, but clean up failsafe.
    const queue = await queueManager.getQueue();
    const pending = queue.filter(j => j.status !== 'conflict'); // Conflicts sit until resolved manually.
    await queueManager.setQueue(pending);
  }
};
