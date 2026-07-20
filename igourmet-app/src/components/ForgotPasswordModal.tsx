import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../lib/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal = ({ isOpen, onClose }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      await api.post('/customer/auth/forgot-password', { email });
      setMessage('Yêu cầu khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.');
    } catch (err: any) {
      const msg = typeof err.response?.data === 'string' ? err.response.data : err.response?.data?.message;
      setError(msg || err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-bold text-gray-800 mb-2">Quên mật khẩu</h3>
        <p className="text-gray-600 mb-6 text-sm">
          Nhập email của bạn để nhận hướng dẫn khôi phục mật khẩu.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="Nhập email..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-amber-700 transition-colors shadow-md disabled:opacity-70 flex justify-center mt-2"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
