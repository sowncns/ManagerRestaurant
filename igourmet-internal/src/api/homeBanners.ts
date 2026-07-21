import { api } from '../lib/api'

export type BannerType = 1 | 2 // 1 = slide, 2 = "Hôm nay ăn gì"

export interface HomeBanner {
  id: number
  image_url: string
  type: BannerType
  sort_order: number
  created_at: string
}

export const homeBannersApi = {
  async list(): Promise<HomeBanner[]> {
    const { data } = await api.get('/internal/home-banners')
    return data.banners
  },
  async create(image_url: string, type: BannerType): Promise<HomeBanner> {
    const { data } = await api.post('/internal/home-banners', { image_url, type })
    return data.banner
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/internal/home-banners/${id}`)
  },
}
