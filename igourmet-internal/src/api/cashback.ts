import { api } from '../lib/api'

export interface CashbackRate {
  rank: string
  percent: number
  updatedAt: string
}

export const cashbackApi = {
  async list(): Promise<CashbackRate[]> {
    const { data } = await api.get('/internal/cashback-rates')
    return data.rates
  },
  async update(rank: string, percent: number): Promise<CashbackRate> {
    const { data } = await api.put(`/internal/cashback-rates/${rank}`, { percent })
    return data.rate
  },
}
