import api from '../api/axios';

export const supplierService = {
  getSuppliers: async () => {
    return api.get('/api/suppliers/');
  },
  createSupplier: async (data: any) => {
    return api.post('/api/suppliers/', data);
  },
  getById: async (id: number | string) => {
    return api.get(`/api/suppliers/${id}/`);
  },
  updateSupplier: async (id: number | string, data: any) => {
    return api.patch(`/api/suppliers/${id}/`, data);
  },
  deleteSupplier: async (id: number | string) => {
    return api.delete(`/api/suppliers/${id}/`);
  },
  getHistory: async (id: number | string) => {
    return api.get(`/api/suppliers/${id}/history/`);
  },
  recordPayment: async (id: number | string, data: any) => {
    return api.post(`/api/suppliers/${id}/record_payment/`, data);
  },
};
