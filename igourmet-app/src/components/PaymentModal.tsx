import { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../lib/api';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PaymentModal = () => {
  const [paymentReq, setPaymentReq] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!user || !user.has_payment_pin) return;

    // SSE push: server chu dong bao khi co yeu cau thanh toan -> khong con polling.
    // EventSource tu dong reconnect; luc reconnect server gui lai trang thai hien tai.
    const es = new EventSource(`${API_BASE_URL}/api/customer/qr-payment/stream`, {
      withCredentials: true,
    });
    es.addEventListener('pending', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setPaymentReq((prev: any) => prev || data); // khong ghi de yeu cau dang hien
      } catch {
        /* bo qua ban tin loi */
      }
    });

    return () => es.close();
  }, [user]);

  if (!paymentReq) return null;

  const handleConfirm = async (action: 'ACCEPT' | 'REJECT') => {
    setProcessing(true);
    try {
      await api.post('/customer/qr-payment/confirm', {
        requestId: paymentReq.requestId,
        action
      });
      
      alert(action === 'ACCEPT' ? 'Thanh toán thành công!' : 'Đã hủy yêu cầu thanh toán.');
      setPaymentReq(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
      if (err.response?.status === 400 && err.response?.data?.message === 'Số dư trong ví không đủ để thanh toán.') {
        // keep modal open to let them reject
      } else {
        setPaymentReq(null);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Xác Nhận Thanh Toán</h3>
          <p className="text-gray-500 text-sm">{paymentReq.restaurantName}</p>
        </div>
        
        <div className="bg-gray-50 rounded-2xl p-5 text-center mb-4 border border-gray-100">
          <p className="text-gray-500 mb-1 text-sm">Số tiền thanh toán</p>
          <p className="text-3xl font-black text-primary">{paymentReq.amount.toLocaleString('vi-VN')}đ</p>
        </div>

        {paymentReq.items && paymentReq.items.length > 0 && (
          <div className="mb-6 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Chi tiết hóa đơn</h4>
            <div className="space-y-2">
              {paymentReq.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600 flex-1 pr-2">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                  <span className="font-medium text-gray-800 shrink-0">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button 
            disabled={processing}
            onClick={() => handleConfirm('REJECT')}
            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button 
            disabled={processing}
            onClick={() => handleConfirm('ACCEPT')}
            className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 flex justify-center items-center gap-2"
          >
            {processing ? (
               <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : "Đồng Ý"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
