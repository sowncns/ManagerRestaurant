export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1920&h=1280';

// Bo anh du phong dep khi mon chua co hinh; chon theo id de moi mon mot ve khac nhau.
const FALLBACK_FOODS = [
  'https://images.unsplash.com/photo-1544025162-831e7fce95af?auto=format&fit=crop&q=80&w=800&h=600', // do nuong
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800&h=600', // hai san
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800&h=600', // mon an dep
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=800&h=600', // lau/canh
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=800&h=600', // trang mieng
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=800&h=600', // do uong/ngot
  'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=800&h=600', // steak/thit
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800&h=600', // salad/khai vi
];

// Anh du phong on dinh theo id (khong random moi lan render).
export const fallbackFood = (id: number) => FALLBACK_FOODS[Math.abs(id) % FALLBACK_FOODS.length];

// Anh mac dinh chung (vd onError khong biet id).
export const FALLBACK_FOOD = FALLBACK_FOODS[0];

export const formatPrice = (v: number | string) =>
  new Intl.NumberFormat('vi-VN').format(Number(v || 0)) + 'đ';

// "HH:mm:ss" -> "HH:mm"
export const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : '');

export const fullAddress = (b: {
  address?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
}) => [b.address, b.ward, b.district, b.city].filter(Boolean).join(', ');
