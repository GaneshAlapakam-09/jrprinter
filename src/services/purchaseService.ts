import api from '../api/axios';

export const purchaseService = {
  getPurchases: async () => {
    return api.get('/api/purchases/');
  },
  createPurchase: async (data: any) => {
    return api.post('/api/purchases/', data);
  },
  getById: async (id: number | string) => {
    return api.get(`/api/purchases/${id}/`);
  },
};
