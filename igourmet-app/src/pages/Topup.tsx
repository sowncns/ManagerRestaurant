import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, CreditCard } from 'lucide-react';
import api from '../lib/api';
import PinVerification from '../components/PinVerification';
import { useAuth } from '../contexts/AuthContext';

const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const Topup = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    const fetchWallet = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        const [profileRes, txRes]: any = await Promise.all([
          api.get('/customer/profile/me'),
          api.get('/customer/profile/transactions')
        ]);
        
        if (profileRes.profile) {
          setBalance(profileRes.profile.wallet_balance || 0);
          setHasPin(profileRes.profile.has_payment_pin || false);
        }
        if (txRes.transactions) {
          setTransactions(txRes.transactions);
        }
      } catch (err) {
        console.error('Lỗi tải thông tin ví:', err);
      } finally {
        setDataLoaded(true);
      }
    };
    fetchWallet();
  }, [navigate]);

  const handleTopup = async () => {
    const amount = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (!amount || amount < 10000) {
      setError('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const returnUrl = `${window.location.origin}/`;
      const cancelUrl = `${window.location.origin}/topup`;

      const res: any = await api.post('/payment/create', {
        amount,
        description: 'Nạp tiền ví',
        returnUrl: returnUrl,
        cancelUrl: cancelUrl
      });

      if (res.results && res.results.checkoutUrl) {
        // Redirect to PayOS payment link
        window.location.href = res.results.checkoutUrl;
      } else {
        setError('Không thể tạo giao dịch nạp tiền. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo giao dịch.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setSelectedAmount(0);
  };

  if (!dataLoaded) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;

  return (
    <div className="bg-gray-50 min-h-screen font-sans pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 mr-2">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {!isPinVerified ? (hasPin ? 'Xác thực PIN' : 'Thiết lập PIN') : 'Nạp tiền vào ví'}
        </h1>
      </div>

      {!isPinVerified ? (
        <div className="bg-white m-4 rounded-3xl shadow-sm py-8">
          <PinVerification onSuccess={() => setIsPinVerified(true)} hasPin={hasPin} />
        </div>
      ) : (
        <div className="max-w-md mx-auto p-4 space-y-6 mt-4">
          
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-100">
                <Wallet className="w-5 h-5" />
                <span className="font-medium">Số dư hiện tại</span>
              </div>
              <h2 className="text-3xl font-bold mt-1">
                {Number(balance).toLocaleString('vi-VN')} đ
              </h2>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800">Chọn số tiền nạp</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AMOUNTS.map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                    setError('');
                  }}
                  className={`py-3 rounded-xl font-semibold border-2 transition-all ${
                    selectedAmount === amount && !customAmount
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {amount.toLocaleString('vi-VN')} đ
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Hoặc nhập số tiền khác</label>
              <div className="relative">
                <input
                  type="number"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Nhập số tiền..."
                  className={`w-full bg-gray-50 border-2 rounded-xl px-4 py-3 outline-none text-gray-800 font-medium ${
                    customAmount ? 'border-blue-500 bg-blue-50' : 'border-gray-100 focus:border-blue-500'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">VNĐ</span>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm font-medium">{error}</p>
            )}

            <div className="bg-blue-50 rounded-xl p-4 flex gap-3 text-blue-800 items-start">
              <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                Thanh toán an toàn qua cổng PayOS. Hỗ trợ quét mã QR bằng mọi ứng dụng ngân hàng.
              </p>
            </div>

            <button
              onClick={handleTopup}
              disabled={loading || (!selectedAmount && !customAmount)}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all ${
                loading || (!selectedAmount && !customAmount)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {loading ? 'Đang tạo giao dịch...' : 'Nạp tiền ngay'}
            </button>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Lịch sử giao dịch</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có giao dịch nào.</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-800">{tx.transaction_type === 'TOPUP' ? 'Nạp tiền' : 'Thanh toán'}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(tx.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.transaction_type === 'TOPUP' ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {tx.transaction_type === 'TOPUP' ? '+' : '-'}{Number(tx.amount).toLocaleString('vi-VN')} đ
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className={`px-2 py-0.5 rounded-full ${
                          tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                          tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {tx.status}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Topup;
