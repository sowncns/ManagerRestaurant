import { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const MyQr = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMemberToken = async () => {
      setGenerating(true);
      try {
        const res: any = await api.post('/customer/qr-payment/scan-token', { kind: 'member' });
        setMemberToken(res.token);
      } catch (err: any) {
        console.error('Failed to generate member token', err);
      } finally {
        setGenerating(false);
      }
    };

    fetchMemberToken();
  }, [user]);

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Mã Định Danh Của Bạn</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* QR Code Container */}
        <div className="w-full max-w-sm rounded-3xl p-8 text-center bg-white shadow-xl border border-gray-100">
          <p className="text-gray-600 font-medium mb-6 text-sm">
            Đưa mã này cho nhân viên để định danh & tích điểm
          </p>
          
          <div className="bg-primary/5 p-6 rounded-3xl inline-block relative border border-primary/20 min-w-[240px] min-h-[240px] flex items-center justify-center">
            {generating ? (
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
            ) : user?.id ? (
              <QRCodeSVG 
                value={memberToken || ''} 
                size={200} 
                level="H" 
                fgColor="#00a662" 
              />
            ) : (
              <div className="w-[200px] h-[200px] bg-white flex items-center justify-center text-sm text-gray-400 rounded-2xl shadow-inner">
                Vui lòng đăng nhập
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-800 text-lg mb-1">{user?.full_name || 'Khách hàng'}</h3>
            <p className="text-sm text-gray-500">{user?.phone || 'Thành viên iGourmet'}</p>
            {user?.id && (
              <p className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-mono text-gray-600 tracking-wider">
                ID: {String(user.id).padStart(6, '0')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyQr;
