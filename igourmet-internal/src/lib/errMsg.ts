import { AxiosError } from 'axios'

export function errMsg(e: unknown): string {
  if (e instanceof AxiosError) {
    return (
      (e.response?.data as { message?: string } | undefined)?.message ??
      e.message ??
      'Đã có lỗi xảy ra'
    )
  }
  if (e instanceof Error) return e.message
  return 'Đã có lỗi xảy ra'
}
