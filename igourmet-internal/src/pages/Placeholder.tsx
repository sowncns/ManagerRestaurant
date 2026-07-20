export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="text-slate-500">Trang đang được xây dựng.</p>
    </div>
  )
}
