import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// API cong khai: khong can cookie/dang nhap.
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use((response) => response.data);

export default api;

// ---- Kieu du lieu tra ve tu /api/public ----
export interface Company {
  id: number;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Branch {
  id: number;
  company_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number | string;
}

export interface MenuCategory {
  category_id: number;
  category_name: string;
  items: MenuItem[];
}
