import api from '../api/axios';

export const productService = {
  // Products
  getAll: async () => {
    return api.get('/api/products/');
  },
  create: async (data: any) => {
    return api.post('/api/products/', data);
  },
  getById: async (id: number | string) => {
    return api.get(`/api/products/${id}/`);
  },
  update: async (id: number | string, data: any) => {
    return api.patch(`/api/products/${id}/`, data);
  },
  delete: async (id: number | string) => {
    return api.delete(`/api/products/${id}/`);
  },
  getBatches: async (productId: number | string) => {
    return api.get(`/api/product-batches/?product=${productId}`);
  },
  getStockMovements: async (productId: number | string) => {
    return api.get(`/api/stock-movements/?product=${productId}`);
  },
  
  // Categories
  getCategories: async () => {
    return api.get('/api/categories/');
  },
  createCategory: async (data: any) => {
    return api.post('/api/categories/', data);
  },

  // Labels
  getLabelItemDetail: async (targetCode: string) => {
    return api.get(`/api/label/item/detail/${targetCode}/`);
  },
  getPrintedLabels: async () => {
    return api.get('/api/printed-labels/');
  },
  createPrintedLabel: async (data: any) => {
    return api.post('/api/printed-labels/', data);
  },
  getLabelPrinterItems: async (userId: string | number) => {
    return api.get(`/api/label/printer/items/${userId}/`);
  },
  createLabelItem: async (data: any) => {
    return api.post('/api/label-items/', data);
  },
  updateLabelItem: async (id: number | string, data: any) => {
    return api.patch(`/api/label-items/${id}/`, data);
  },
  deleteLabelItem: async (id: number | string) => {
    return api.delete(`/api/label-items/${id}/`);
  }
};


