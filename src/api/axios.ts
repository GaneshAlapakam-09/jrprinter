import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// export const BASE_URL = 'http://148.230.82.6:8999';
export const BASE_URL = 'https://p1787ms1-8000.inc1.devtunnels.ms/';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 50000,
});

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear stored tokens so the app can redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    }
    return Promise.reject(error);
  }
);

export default api;
