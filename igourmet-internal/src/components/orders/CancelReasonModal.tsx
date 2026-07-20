import { useEffect, useState } from 'react'
import { Modal, Button } from '../ui'
import type { CancelReason } from '../../api/orders'

const REASONS: { code: CancelReason; label: string }[] = [
  { code: 'WRONG_ORDER', label: 'Gọi nhầm món' },
  { code: 'OUT_OF_STOCK', label: 'Hết nguyên liệu' },
  { code: 'CUSTOMER_CHANGE', label: 'Khách đổi ý' },
  { code: 'QUALITY', label: 'Vấn đề chất lượng' },
  { code: 'OTHER', label: 'Lý do khác' },
]

export default function CancelReasonModal({
  open,
  itemName,
  onClose,
  onSubmit,
}: {
  open: boolean
  itemName: string
  onClose: () => void
  onSubmit: (reason: CancelReason, note: string) => void
}) {
  const [reason, setReason] = useState<CancelReason>('WRONG_ORDER')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setReason('WRONG_ORDER')
      setNote('')
    }
  }, [open])

  const needNote = reason === 'OTHER'
  const invalid = needNote && !note.trim()

  return (
    <Modal open={open} title={`Yêu cầu hủy: ${itemName}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Yêu cầu sẽ gửi xuống bếp. Bếp chấp nhận (chưa làm) thì hủy món; nếu đã làm thì món được đánh dấu
        nhầm lẫn.
      </p>
      <div className="space-y-2">
        {REASONS.map((r) => (
          <label
            key={r.code}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name="cancel-reason"
              checked={reason === r.code}
              onChange={() => setReason(r.code)}
            />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={needNote ? 'Nhập lý do cụ thể (bắt buộc)' : 'Ghi chú thêm (tùy chọn)'}
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        <Button
          variant="danger"
          disabled={invalid}
          onClick={() => {
            onSubmit(reason, note.trim())
            onClose()
          }}
        >
          Gửi yêu cầu hủy
        </Button>
      </div>
    </Modal>
  )
}
