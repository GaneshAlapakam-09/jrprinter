import api from '../api/axios';

export const inventoryService = {
  getBatches: async () => {
    return api.get('/api/product-batches/');
  },
  createBatch: async (data: any) => {
    return api.post('/api/product-batches/', data);
  },
  getStockMovements: async (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get(`/api/stock-movements/${qs}`);
  },
  createStockMovement: async (data: any) => {
    return api.post('/api/stock-movements/', data);
  },
};
