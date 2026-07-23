import axios from 'axios';

// Khởi tạo instance của axios
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`, // Địa chỉ gốc của Backend
  timeout: 10000, // Timeout 10 giây
  withCredentials: true, // BẮT BUỘC - gửi/nhận cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  return config;
});

let refreshing: Promise<any> | null = null;

api.interceptors.response.use(
  (response) => {
    return response.data; // Chỉ lấy phần data của response
  },
  async (error) => {
    const original = error.config;
    const isAuthCall = original.url?.includes('/auth/');

    // Tự động refresh token khi hết hạn (401)
    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        // Gộp nhiều request 401 cùng lúc vào 1 lần refresh
        refreshing = refreshing || axios.post(`${API_BASE_URL}/api/customer/auth/refresh-token`, {}, { withCredentials: true });
        await refreshing;
        refreshing = null;
        
        return api(original); // Thử lại request gốc
      } catch (e) {
        refreshing = null;
        return Promise.reject(e);
      }
    }

    if (!isAuthCall && error.response?.status !== 401 && error.response?.status !== 403) {
      console.error('API Error:', error.response?.data || error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
