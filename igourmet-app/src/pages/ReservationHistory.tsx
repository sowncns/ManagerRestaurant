import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Calendar, Users, History, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ReservationHistory = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<{ [id: string]: boolean }>({});
  const navigate = useNavigate();

  const { user } = useAuth();

  const fetchReservations = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res: any = await api.get('/customer/reservations');
      const sortedReservations = (res.reservations || []).sort((a: any, b: any) => {
        return new Date(b.created_at || b.reservation_date).getTime() - new Date(a.created_at || a.reservation_date).getTime();
      });
      setReservations(sortedReservations);
    } catch (error) {
      console.error('Lỗi tải lịch sử đặt bàn:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchReservations();
    
    // Auto refresh every 10 seconds to get status updates
    const intervalId = setInterval(() => {
      fetchReservations();
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [navigate, user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200"><Clock className="w-3.5 h-3.5" /> Đang chờ xác nhận</span>;
      case 'CONFIRMED':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Đã xác nhận</span>;
      case 'CHECKED_IN':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200"><CheckCircle2 className="w-3.5 h-3.5" /> Đã đến</span>;
      case 'COMPLETED':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider border border-green-200"><CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider border border-red-200"><XCircle className="w-3.5 h-3.5" /> Đã hủy</span>;
      case 'NO_SHOW':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-200"><XCircle className="w-3.5 h-3.5" /> Không đến</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider border border-gray-200">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Đang tải lịch sử đặt bàn...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <History className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Lịch sử Đặt bàn</h1>
          <p className="text-gray-500 mt-1">Theo dõi trạng thái các yêu cầu đặt bàn của bạn.</p>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Calendar className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có lịch sử đặt bàn</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Bạn chưa thực hiện bất kỳ giao dịch đặt bàn nào trên hệ thống.</p>
          <button 
            onClick={() => navigate('/booking')}
            className="bg-primary hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all hover:-translate-y-1"
          >
            Đặt bàn ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((rsv) => (
            <div key={rsv.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase tracking-widest border border-gray-100">
                      #{rsv.reservation_code}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      Đặt lúc: {rsv.created_at ? new Date(rsv.created_at).toLocaleString('vi-VN') : new Date().toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{rsv.branch_name || 'Chi nhánh nhà hàng'}</h3>
                </div>
                <div>
                  {getStatusBadge(rsv.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ngày đến</p>
                    <p className="font-bold text-gray-800">{new Date(rsv.reservation_date).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Giờ đến</p>
                    <p className="font-bold text-gray-800">{rsv.reservation_time}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Số khách</p>
                    <p className="font-bold text-gray-800">{rsv.guest_count} người</p>
                  </div>
                </div>
              </div>

              {rsv.special_request && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
                  <span className="font-semibold text-gray-600">Ghi chú: </span>
                  <span className="italic text-gray-500">"{rsv.special_request}"</span>
                </div>
              )}
              {rsv.preorder && rsv.preorder.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => setExpandedOrders(prev => ({ ...prev, [rsv.id]: !prev[rsv.id] }))}
                  >
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 group-hover:text-primary transition-colors">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Đã đặt trước {rsv.preorder.reduce((sum: number, item: any) => sum + item.quantity, 0)} món
                    </h4>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary text-sm">
                        Tiền cọc: {new Intl.NumberFormat('vi-VN').format(Number(rsv.deposit_amount) || 0)}đ
                      </span>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedOrders[rsv.id] ? 'rotate-180' : ''}`} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {expandedOrders[rsv.id] && (
                    <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {rsv.preorder.map((item: any, index: number) => {
                          const price = Number(item.unit_price || item.price || 0);
                          return (
                            <div key={index} className="flex justify-between items-center text-sm bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                              <span className="text-gray-800 font-medium">{item.item_name || item.name}</span>
                              <div className="flex items-center gap-3 text-gray-600">
                                <span className="text-xs bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">x{item.quantity}</span>
                                <span className="font-bold text-amber-600 w-16 text-right">
                                  {new Intl.NumberFormat('vi-VN').format(price * item.quantity)}đ
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReservationHistory;
