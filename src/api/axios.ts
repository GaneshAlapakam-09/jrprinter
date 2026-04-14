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

// Avoid infinite loop if refresh fails
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('auth/login') || originalRequest.url?.includes('auth/refresh')) {
        return Promise.reject(error); // Don't retry auth endpoints
      }

      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${BASE_URL}api/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        await AsyncStorage.setItem('access_token', newAccessToken);
        
        if (response.data.refresh) {
          await AsyncStorage.setItem('refresh_token', response.data.refresh);
        }

        api.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        
        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
