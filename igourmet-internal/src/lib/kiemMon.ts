import type { KiemMon } from '../api/checkout'

const money = (n: number) => Number(n).toLocaleString('vi-VN')

// In "phieu kiem mon" (pre-bill): mon + gia goc + VAT tung muc + tong. Khong thu tien.
export function printKiemMon(tableLabel: string, data: KiemMon) {
  const vatLines = Object.entries(data.vatByRate)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(
      ([rate, amount]) =>
        `<div class="flex mb"><span>VAT ${rate}%:</span><span>${money(amount)}</span></div>`,
    )
    .join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu kiểm món</title>
  <style>
    @page { size: 58mm auto; margin: 4mm; }
    body { font-family: system-ui, sans-serif; margin: 0; font-size: 13px; color: #000; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 18px; margin: 10px 0; }
    .line { border-bottom: 1px dashed #000; margin: 8px 0; }
    .flex { display: flex; justify-content: space-between; }
    .mb { margin-bottom: 4px; }
    .mt { margin-top: 8px; }
    .item-name { font-weight: 600; margin-top: 4px; }
    .muted { color: #555; font-size: 11px; }
  </style></head><body>
    <div class="center bold title">iGourmet</div>
    <div class="center mb">PHIẾU KIỂM MÓN</div>
    <div class="center muted mb">(Chưa thanh toán — mời khách kiểm tra)</div>
    <div class="line"></div>
    <div class="flex mb"><span>Bàn:</span><span class="bold">${tableLabel}</span></div>
    <div class="flex mb"><span>Ngày:</span><span>${new Date().toLocaleString('vi-VN')}</span></div>
    <div class="line"></div>
    ${data.items
      .map(
        (it) => `
      <div class="item-name">${it.itemName} <span class="muted">(VAT ${it.vat}%)</span></div>
      <div class="flex">
        <span>${it.quantity} x ${money(it.unitPrice)}</span>
        <span>${money(it.lineTotal)}</span>
      </div>`,
      )
      .join('')}
    <div class="line"></div>
    <div class="flex mb"><span>Tạm tính (gốc):</span><span>${money(data.subtotal)}</span></div>
    ${vatLines}
    <div class="flex bold mt" style="font-size: 15px">
      <span>TỔNG (gồm VAT):</span>
      <span>${money(data.total)}đ</span>
    </div>
    <div class="center mt" style="margin-top: 16px; font-style: italic" class="muted">Vui lòng kiểm tra trước khi thanh toán</div>
    <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close() }, 500) }</script>
  </body></html>`
  const w = window.open('', '_blank', 'width=400,height=600')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
