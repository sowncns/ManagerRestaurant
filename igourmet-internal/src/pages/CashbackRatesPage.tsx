import { useEffect, useState } from 'react'
import { cashbackApi, type CashbackRate } from '../api/cashback'
import { errMsg } from '../lib/errMsg'
import { PageHeader, Table, Input, Button, ErrorText, Badge } from '../components/ui'

const RANK_LABELS: Record<string, string> = {
  normal: 'Thường',
  silver: 'Bạc',
  gold: 'Vàng',
  platinum: 'Bạch kim',
}

export default function CashbackRatesPage() {
  const [list, setList] = useState<CashbackRate[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingRank, setSavingRank] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  async function load() {
    try {
      setErr('')
      const rates = await cashbackApi.list()
      setList(rates)
      setDrafts(Object.fromEntries(rates.map((r) => [r.rank, String(r.percent)])))
    } catch (e) {
      setErr(errMsg(e))
    }
  }
  useEffect(() => {
    void load()
  }, [])

  async function save(rank: string) {
    const percent = Number(drafts[rank])
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setErr('% phải trong khoảng 0–100')
      return
    }
    setSavingRank(rank)
    setErr('')
    setOk('')
    try {
      await cashbackApi.update(rank, percent)
      setOk(`Đã lưu ${RANK_LABELS[rank] ?? rank}`)
      await load()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setSavingRank(null)
    }
  }

  return (
    <div>
      <PageHeader title="Cấu hình Cashback" />
      <p className="mb-3 text-sm text-slate-500">
        % hoàn tiền vào ví khách theo hạng thành viên khi thanh toán hóa đơn.
      </p>
      <ErrorText>{err}</ErrorText>
      {ok && <p className="mb-2 text-sm text-green-600">{ok}</p>}
      <Table headers={['Hạng', '% Cashback', '']}>
        {list.map((r) => (
          <tr key={r.rank}>
            <td className="px-4 py-3">
              <Badge className="bg-amber-100 text-amber-700">{RANK_LABELS[r.rank] ?? r.rank}</Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex w-32 items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={drafts[r.rank] ?? ''}
                  onChange={(e) => setDrafts((p) => ({ ...p, [r.rank]: e.target.value }))}
                />
                <span className="text-slate-500">%</span>
              </div>
            </td>
            <td className="px-4 py-3 text-right">
              <Button
                onClick={() => void save(r.rank)}
                disabled={savingRank === r.rank || drafts[r.rank] === String(r.percent)}
              >
                {savingRank === r.rank ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
