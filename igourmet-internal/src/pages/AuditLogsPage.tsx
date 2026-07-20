import { useEffect, useState } from 'react'
import { PageHeader, Button, ErrorText, Input, Select, Badge } from '../components/ui'
import { auditApi, type AuditLog } from '../api/audit'
import { errMsg } from '../lib/errMsg'
import { RefreshCw, Search, History } from 'lucide-react'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setErr('')
    try {
      const data = await auditApi.list({
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
      })
      setLogs(data)
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [actionFilter, entityFilter])

  const filteredLogs = logs.filter((log) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      (log.employee_name && log.employee_name.toLowerCase().includes(term)) ||
      log.action.toLowerCase().includes(term) ||
      log.entity.toLowerCase().includes(term) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(term))
    )
  })

  return (
    <div>
      <PageHeader 
        title="Nhật ký hệ thống" 
        action={
          <Button onClick={load} disabled={loading} variant="secondary">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </Button>
        }
      />
      <ErrorText>{err}</ErrorText>

      <div className="mb-6 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Tìm kiếm</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              className="pl-9"
              placeholder="Tên nhân viên, chi tiết..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label className="mb-1 block text-sm font-medium text-slate-700">Hành động</label>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
          </Select>
        </div>
        <div className="sm:w-48">
          <label className="mb-1 block text-sm font-medium text-slate-700">Đối tượng</label>
          <Input placeholder="VD: order, menu_item..." value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Nhân viên</th>
                <th className="px-4 py-3 font-semibold">Hành động</th>
                <th className="px-4 py-3 font-semibold">Đối tượng</th>
                <th className="px-4 py-3 font-semibold min-w-[200px]">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {loading ? 'Đang tải dữ liệu...' : 'Không có nhật ký nào phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <History size={14} />
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {log.employee_name || <span className="text-slate-400 italic">Hệ thống</span>}
                      {log.ip_address && <div className="text-[11px] text-slate-400 font-normal">{log.ip_address}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {log.entity}
                      </span>
                      {log.entity_id && <span className="ml-1 text-slate-500 text-xs">#{log.entity_id}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.details ? (
                        <div className="max-h-20 overflow-y-auto max-w-sm">
                          <pre className="font-mono text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không có</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
