import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface PinVerificationProps {
  onSuccess?: () => void;
  onSubmitPin?: (pin: string) => void;
  hasPin?: boolean;
  mode?: 'VERIFY' | 'SETUP' | 'CHANGE';
}

const PinVerification: React.FC<PinVerificationProps> = ({ onSuccess, onSubmitPin, hasPin, mode }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const initialStep = mode === 'SETUP' ? 'SETUP_1' : 
                      mode === 'VERIFY' ? 'VERIFY' : 
                      mode === 'CHANGE' ? 'VERIFY' : 
                      hasPin ? 'VERIFY' : 'SETUP_1';

  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { user } = useAuth();

  const handleNumberClick = (num: string) => {
    if (error) setError('');
    if (step === 'VERIFY' || step === 'SETUP_1') {
      if (pin.length < 6) setPin(prev => prev + num);
    } else if (step === 'SETUP_2') {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (error) setError('');
    if (step === 'VERIFY' || step === 'SETUP_1') {
      setPin(prev => prev.slice(0, -1));
    } else if (step === 'SETUP_2') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    if (step === 'SETUP_1' && pin.length === 6) {
      setTimeout(() => setStep('SETUP_2'), 300);
    } else if (step === 'SETUP_2' && confirmPin.length === 6) {
      if (pin === confirmPin) {
        handleSetupPin();
      } else {
        setError('Mã PIN không khớp. Vui lòng nhập lại.');
        setConfirmPin('');
        setStep('SETUP_1');
        setPin('');
      }
    } else if (step === 'VERIFY' && pin.length === 6) {
      handleVerifyPin();
    }
  }, [pin, confirmPin, step]);

  const handleSetupPin = async () => {
    setLoading(true);
    try {
      await api.post('/customer/profile/setup-pin', { pin });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
      setPin('');
      setConfirmPin('');
      setStep('SETUP_1');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (onSubmitPin) {
      onSubmitPin(pin);
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/customer/profile/verify-pin', { pin });
      if (mode === 'CHANGE') {
        // Switch to setup flow
        setStep('SETUP_1');
        setPin('');
        setConfirmPin('');
      } else {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const renderDots = (currentLength: number) => {
    return (
      <div className="flex justify-center gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              i < currentLength ? 'bg-primary scale-110' : 'bg-gray-200'
            }`} 
          />
        ))}
      </div>
    );
  };

  const keypad = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'];

  if (user && !user.email_verified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Yêu cầu xác thực Email</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          Để thực hiện các chức năng yêu cầu mã PIN hoặc thanh toán, bạn cần xác thực địa chỉ email của mình trước.
        </p>
        <button
          onClick={async () => {
            if (resending) return;
            setResending(true);
            try {
              await api.post('/customer/auth/request-verification');
              alert('Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư của bạn (cả hộp thư rác).');
            } catch (err: any) {
              alert(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi lại email.');
            } finally {
              setResending(false);
            }
          }}
          disabled={resending}
          className="w-full max-w-[280px] bg-amber-500 hover:bg-amber-600 text-white font-medium py-3.5 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
          {resending ? 'Đang gửi email...' : 'Gửi email xác thực'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-blue-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {step === 'VERIFY' ? 'Nhập mã PIN bảo mật' : 
         step === 'SETUP_1' ? 'Thiết lập mã PIN' : 'Xác nhận mã PIN'}
      </h2>
      
      <p className="text-gray-500 text-center mb-8 max-w-sm">
        {step === 'VERIFY' 
          ? 'Vui lòng nhập mã PIN 6 số để tiếp tục giao dịch.' 
          : 'Bảo vệ tài khoản và các giao dịch thanh toán bằng mã PIN 6 số.'}
      </p>

      {step === 'VERIFY' || step === 'SETUP_1' ? renderDots(pin.length) : renderDots(confirmPin.length)}

      {error && (
        <div className="flex items-center gap-2 text-red-500 mb-6 bg-red-50 px-4 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {loading && (
        <p className="text-primary font-medium mb-4">Đang xử lý...</p>
      )}

      <div className="grid grid-cols-3 gap-4 max-w-[280px] w-full">
        {keypad.map((num, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => num === 'del' ? handleDelete() : (num !== '' ? handleNumberClick(num.toString()) : null)}
            className={`h-14 rounded-full text-2xl font-medium transition-colors ${
              num === '' ? 'invisible' :
              num === 'del' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center' :
              'bg-gray-50 text-gray-800 hover:bg-gray-100 active:bg-gray-200 border border-gray-100'
            }`}
          >
            {num === 'del' ? '⌫' : num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PinVerification;
