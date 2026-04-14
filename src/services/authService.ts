import api from '../api/axios';

export const authService = {
  login: async (credentials: any) => {
    return api.post('/api/auth/login/', credentials);
  },
  register: async (data: any) => {
    return api.post('/api/auth/register/', data);
  },
};
