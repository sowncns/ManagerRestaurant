import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';
import api from '../lib/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Lỗi xác thực</h2>
            <p className="text-red-500 mb-8 font-medium">Không tìm thấy mã xác thực (token không hợp lệ).</p>
            <Link 
              to="/"
              className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Mật khẩu nhập lại không khớp.');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res: any = await api.post('/customer/auth/reset-password', { token, newPassword: password });
      setStatus('success');
      setMessage(res.message || 'Mật khẩu của bạn đã được cập nhật thành công!');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Có lỗi xảy ra, mã xác thực có thể đã hết hạn.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8">
        
        {status === 'success' ? (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 fade-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thành công!</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-primary/30"
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt lại mật khẩu</h2>
              <p className="text-gray-500">Vui lòng nhập mật khẩu mới của bạn bên dưới.</p>
            </div>

            {status === 'error' && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-start gap-2">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Nhập mật khẩu mới"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Xác nhận mật khẩu mới
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-amber-700 transition-colors shadow-lg shadow-primary/30 disabled:opacity-70 flex justify-center mt-6"
              >
                {status === 'loading' ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  'Cập nhật mật khẩu'
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResetPassword;
