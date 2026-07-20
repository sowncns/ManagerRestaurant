import { useEffect, useState } from 'react'
import { PageHeader, Badge, Button } from '../components/ui'
import { api } from '../lib/api'
import { errMsg } from '../lib/errMsg'
import { Check, Clock, Search } from 'lucide-react'

interface Invoice {
  id: number
  invoice_code: string
  amount: string
  status: 'PAID' | 'UNPAID' | 'CANCELLED' | 'DEBT'
  created_at: string
  customer_id: number | null
  customer_name: string | null
  customer_phone: string | null
  table_name: string | null
  table_number: string | null
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('UNPAID')

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`
      const res = await api.get('/internal/checkout/invoices' + qs)
      setInvoices(res.data)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  async function markPaid(id: number) {
    if (!confirm('Xác nhận khách đã thanh toán hóa đơn này?')) return
    try {
      await api.post(`/internal/checkout/invoices/${id}/pay`)
      load()
    } catch (e) {
      alert(errMsg(e))
    }
  }

  return (
    <div>
      <PageHeader 
        title="Quản lý Hóa Đơn / Công Nợ" 
        action={
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === 'ALL' ? 'bg-white shadow' : 'text-slate-600'}`}
              onClick={() => setFilter('ALL')}
            >
              Tất cả
            </button>
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === 'UNPAID' ? 'bg-white shadow text-red-600' : 'text-slate-600'}`}
              onClick={() => setFilter('UNPAID')}
            >
              Chưa TT (Ghi nợ)
            </button>
            <button 
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === 'PAID' ? 'bg-white shadow text-emerald-600' : 'text-slate-600'}`}
              onClick={() => setFilter('PAID')}
            >
              Đã thu
            </button>
          </div>
        }
      />
      {err && <div className="mb-4 text-red-600 text-sm">{err}</div>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <Search size={32} className="mb-3 text-slate-300" />
            Không tìm thấy hóa đơn nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Mã HĐ</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Bàn</th>
                  <th className="px-4 py-3 font-medium">Khách hàng</th>
                  <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                  <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{inv.invoice_code}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {new Date(inv.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.table_name || `Bàn ${inv.table_number || '?'}`}</td>
                    <td className="px-4 py-3">
                      {inv.customer_name ? (
                        <div>
                          <div className="font-medium text-slate-800">{inv.customer_name}</div>
                          {inv.customer_phone && <div className="text-xs text-slate-500">{inv.customer_phone}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Khách vãng lai</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {Number(inv.amount).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.status === 'PAID' ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Đã thanh toán</Badge>
                      ) : inv.status === 'UNPAID' || inv.status === 'DEBT' ? (
                        <Badge className="bg-red-100 text-red-800">Chưa TT (Nợ)</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800">{inv.status}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(inv.status === 'UNPAID' || inv.status === 'DEBT') && (
                        <Button onClick={() => markPaid(inv.id)} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
                          <Check size={14} className="mr-1" /> Thu tiền
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
