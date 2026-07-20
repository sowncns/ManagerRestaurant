import { useState, useEffect } from 'react';
import { Receipt, X, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import PinVerification from '../components/PinVerification';

export default function Invoices() {
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'wallet'>('pending');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, historyRes, transRes] = await Promise.all([
        api.get('/customer/qr-payment/pending'),
        api.get('/customer/qr-payment/invoices'),
        api.get('/customer/profile/transactions').catch(() => ({ data: { transactions: [] } }))
      ]);
      if ((pendingRes as any).hasPending) {
        setPendingPayment(pendingRes);
      } else {
        setPendingPayment(null);
      }
      setInvoices(historyRes as any);
      
      const t = (transRes as any)?.transactions || (transRes as any)?.data?.transactions || [];
      setTransactions(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (pin: string) => {
    if (!pendingPayment) return;
    try {
      await api.post('/customer/qr-payment/confirm', {
        requestId: pendingPayment.requestId,
        action: 'ACCEPT',
        pin: pin
      });
      alert('Thanh toán thành công!');
      setShowPinModal(false);
      setPendingPayment(null);
      setActiveTab('history');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleRejectPayment = async () => {
    try {
      await api.post('/customer/qr-payment/confirm', {
        requestId: pendingPayment.requestId,
        action: 'REJECT'
      });
      alert("Đã từ chối thanh toán");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi");
    }
  };

  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const res: any = await api.get(`/customer/qr-payment/invoices/${invoiceId}`);
      setSelectedInvoice(res);
    } catch (err) {
      alert("Không thể tải chi tiết hóa đơn");
    }
  };

  if (loading) return <div className="p-4 text-center mt-10">Đang tải...</div>;

  return (
    <div className="pb-24 pt-4 px-4 max-w-lg mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
        <Receipt className="w-6 h-6 text-indigo-600" />
        Hóa đơn của bạn
      </h1>

      <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Chờ T.Toán
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Hóa đơn
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === 'wallet' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Biến động số dư
        </button>
      </div>

      {activeTab === 'pending' ? (
        pendingPayment ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-100 border-2 border-indigo-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10"></div>
            
            <div className="flex items-center gap-2 text-indigo-600 font-bold mb-4 bg-indigo-50 w-fit px-3 py-1 rounded-full text-sm">
              <AlertCircle className="w-4 h-4 animate-pulse" />
              Yêu cầu thanh toán mới
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-1">{pendingPayment.restaurantName}</h3>
            <p className="text-gray-500 text-sm mb-4">Bàn: {pendingPayment.tableId} • Yêu cầu từ Thu ngân</p>
            
            <div className="text-4xl font-black text-indigo-600 mb-4">
              {Number(pendingPayment.amount).toLocaleString('vi-VN')}đ
            </div>

            {pendingPayment.items && pendingPayment.items.length > 0 && (
              <div className="mb-6 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Chi tiết món ăn</h4>
                <div className="space-y-2">
                  {pendingPayment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600 flex-1 pr-2">{item.name} <span className="text-gray-400 font-medium">x{item.quantity}</span></span>
                      <span className="font-medium text-gray-800 shrink-0">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={handleRejectPayment}
                className="flex-1 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors"
              >
                Từ chối
              </button>
              <button 
                onClick={() => setShowPinModal(true)}
                className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                Thanh toán ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
            <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Bạn không có hóa đơn nào cần thanh toán</p>
          </div>
        )
      ) : activeTab === 'history' ? (
        <div>
          {invoices.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
              <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Chưa có hóa đơn nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div 
                  key={inv.id} 
                  onClick={() => handleViewInvoice(inv.id)}
                  className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-gray-900">{inv.restaurantName || inv.company_name}</h4>
                    {inv.branch_name && <p className="text-xs text-gray-500 mb-1">{inv.branch_name}</p>}
                    <p className="text-xs text-gray-400">{new Date(inv.createdAt || inv.created_at).toLocaleString('vi-VN')}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{inv.invoiceCode || inv.invoice_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{Number(inv.amount).toLocaleString('vi-VN')}đ</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1 flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3" /> Đã thanh toán
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'wallet' ? (
        <div>
          {transactions.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
              <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Chưa có giao dịch ví nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isPositive = tx.transaction_type === 'TOPUP' || tx.transaction_type === 'REFUND' || tx.transaction_type === 'CASHBACK';
                return (
                  <div 
                    key={tx.transaction_id || tx.transaction_code} 
                    className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 line-clamp-1">{tx.description || 'Giao dịch iGourmet'}</h4>
                      <p className="text-xs text-gray-500 mb-1">{tx.transaction_type}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{tx.transaction_code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : '-'}{Number(tx.amount).toLocaleString('vi-VN')}đ
                      </p>
                      <p className="text-xs font-medium text-gray-500 mt-1">
                        Sd: {Number(tx.balance_after).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative">
            <button 
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="p-6">
              <PinVerification 
                mode="VERIFY"
                onSuccess={() => {}}
                onSubmitPin={(pin: string) => handleConfirmPayment(pin)}
              />
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end p-4">
          <div className="bg-white rounded-t-3xl rounded-b-xl w-full max-h-[80vh] overflow-hidden relative shadow-2xl animate-in slide-in-from-bottom-10">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="p-6 border-b border-dashed border-gray-200 text-center">
              <h3 className="font-bold text-xl text-gray-900">{selectedInvoice.restaurantName}</h3>
              <p className="text-gray-500 text-sm mt-1">{new Date(selectedInvoice.createdAt).toLocaleString('vi-VN')}</p>
              <p className="text-xs text-gray-400 mt-1">Mã hóa đơn: {selectedInvoice.invoiceCode}</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[40vh]">
              {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                <div className="space-y-4">
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {(item.quantity * item.price).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-4">Hóa đơn này được tạo trước khi hệ thống hỗ trợ lưu chi tiết món ăn.</p>
              )}
            </div>

            <div className="bg-gray-50 p-6 border-t border-dashed border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 font-medium">Trạng thái</span>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg uppercase">
                  Đã thanh toán
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-bold text-lg">Tổng cộng</span>
                <span className="text-indigo-600 font-black text-2xl">{Number(selectedInvoice.amount).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
