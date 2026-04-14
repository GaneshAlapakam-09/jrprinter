import api from '../api/axios';

export const billingService = {
  createBill: async (data: any) => {
    return api.post('/api/bills/', data);
  },
  getBills: async () => {
    return api.get('/api/bills/');
  },
  getBillById: async (id: number | string) => {
    return api.get(`/api/bills/${id}/`);
  },
};
