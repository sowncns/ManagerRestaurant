import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực (token không hợp lệ).');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        const res: any = await api.post('/customer/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.message || 'Xác thực email thành công!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Xác thực email thất bại. Token có thể đã hết hạn.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đang xác thực...</h2>
            <p className="text-gray-500">Vui lòng đợi trong giây lát</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in zoom-in-95 fade-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thành công!</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <Link 
              to="/"
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-primary/30"
            >
              Về trang chủ
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in zoom-in-95 fade-in">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi xác thực</h2>
            <p className="text-red-500 mb-8 font-medium">{message}</p>
            <Link 
              to="/"
              className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
