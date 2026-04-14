import api from '../api/axios';

export const reportService = {
  getTodaySales: async () => {
    return api.get('/api/sales/today/');
  },
  getThisMonthSales: async () => {
    return api.get('/api/sales/this-month/');
  },
  getThisYearSales: async () => {
    return api.get('/api/sales/this-year/');
  },
  getYesterdaySales: async () => {
    return api.get('/api/yesterday-sales/');
  },
  getItemHourlySales: async (itemName: string) => {
    return api.get(`/api/sales/item-hourly/${encodeURIComponent(itemName)}/`);
  },
  getSalesReport: async (period = 'today', startDate?: string, endDate?: string) => {
    let url = `/api/reports/sales/?period=${period}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }
    return api.get(url);
  },
  getTopProducts: async (period = 'today') => {
    return api.get(`/api/reports/top-products/?period=${period}`);
  },
  getInventoryStatus: async () => {
    return api.get('/api/reports/inventory-status/');
  },
  getPurchaseReport: async (period = 'today', startDate?: string, endDate?: string) => {
    let url = `/api/reports/purchases/?period=${period}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }
    return api.get(url);
  },
  getProfitLossReport: async (period = 'today', startDate?: string, endDate?: string) => {
    let url = `/api/reports/profit-loss/?period=${period}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }
    return api.get(url);
  },
  getPaymentReport: async (period = 'today', startDate?: string, endDate?: string) => {
    let url = `/api/reports/payments/?period=${period}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&start_date=${startDate}&end_date=${endDate}`;
    }
    return api.get(url);
  },
};
