import api from '../api/axios';

export const customerService = {
  getCustomers: async () => {
    return api.get('/api/customers/');
  },
  createCustomer: async (data: any) => {
    return api.post('/api/customers/', data);
  },
  getById: async (id: number | string) => {
    return api.get(`/api/customers/${id}/`);
  },
  updateCustomer: async (id: number | string, data: any) => {
    return api.patch(`/api/customers/${id}/`, data);
  },
  deleteCustomer: async (id: number | string) => {
    return api.delete(`/api/customers/${id}/`);
  },
  getHistory: async (id: number | string) => {
    return api.get(`/api/customers/${id}/history/`);
  },
  recordPayment: async (id: number | string, data: any) => {
    return api.post(`/api/customers/${id}/record_payment/`, data);
  },
};
