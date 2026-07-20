import { useEffect, useRef } from 'react'
import { API_BASE_URL } from './api'

// Mo SSE toi backend (cookie auth qua withCredentials) va goi onChange moi khi co su kien "change".
// Backend chi phat su kien cua chi nhanh user -> nhan gan realtime, thay/bo sung cho polling.
// EventSource tu reconnect khi mat ket noi; ref giu onChange moi nhat de khong re-subscribe moi render.
export function useRealtime(path: string, onChange: () => void) {
  const cb = useRef(onChange)
  cb.current = onChange
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/api${path}`, { withCredentials: true })
    es.addEventListener('change', () => cb.current())
    return () => es.close()
  }, [path])
}
