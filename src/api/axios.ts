import axios from 'axios';

const api = axios.create({
  baseURL: 'http://66.103.210.129:8777',
  timeout: 50000,
});

export default api;
