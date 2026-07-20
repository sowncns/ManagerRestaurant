import { useEffect, useState } from 'react'
import { Modal, Button } from '../ui'

export default function ItemNoteModal({
  open,
  itemName,
  initialNote,
  onClose,
  onSave,
}: {
  open: boolean
  itemName: string
  initialNote: string
  onClose: () => void
  onSave: (note: string) => void
}) {
  const [note, setNote] = useState(initialNote)

  useEffect(() => {
    if (open) setNote(initialNote)
  }, [open, initialNote])

  return (
    <Modal open={open} title={`Ghi chú: ${itemName}`} onClose={onClose}>
      <textarea
        autoFocus
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="VD: ít cay, không hành, ra trước..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button
          onClick={() => {
            onSave(note.trim())
            onClose()
          }}
        >
          Lưu ghi chú
        </Button>
      </div>
    </Modal>
  )
}
