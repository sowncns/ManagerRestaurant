import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Gift, QrCode } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';



const IGoCard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'normal' | 'silver' | 'gold' | 'platinum'>('normal');
  const [profile, setProfile] = useState<any>(null);
  
  const { user } = useAuth();
  



  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const res: any = await api.get('/customer/profile/me');
          if (res.profile) {
            setProfile(res.profile);
            setActiveTab(res.profile.rank || 'normal');
          }
        } catch (error) {
          console.error('Không thể lấy thông tin profile', error);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const tabs: ('normal' | 'silver' | 'gold' | 'platinum')[] = ['normal', 'silver', 'gold', 'platinum'];
  const tabLabels = {
    normal: "Hạng Thường",
    silver: "Hạng Bạc",
    gold: "Hạng Vàng",
    platinum: "Hạng Bạch Kim"
  };

  const rankInfo: Record<string, { upgrade: string[]; keep: string[]; perks: string[] }> = {
    normal: {
      upgrade: [
        "Khách hàng đăng ký chương trình thành viên miễn phí trên ứng dụng iGourmet.",
        "Tổng tiêu dùng: < 10 triệu VND",
      ],
      keep: ["Không tích đủ điểm trong thời gian quy định thì điểm quay về mặc định bằng 0 điểm"],
      perks: ["Không áp dụng cashback"],
    },
    silver: {
      upgrade: ["Tổng tiêu dùng đạt 10 triệu VND trong 12 tháng"],
      keep: [
        "Tổng tiêu dùng đạt 10 triệu VND trong 12 tháng tính từ thời điểm nâng hạng sẽ được gia hạn Hạng Bạc.",
        "Không đạt 10 triệu VND, thẻ trở về Hạng Thường 0 VNĐ.",
      ],
      perks: ["Cashback 1% giá trị hoá đơn (số tiền sẽ được cập nhật trong ví của bạn)"],
    },
    gold: {
      upgrade: ["Tổng tiêu dùng đạt 30 triệu VND trong 12 tháng"],
      keep: [
        "Tổng tiêu dùng đạt 30 triệu VND trong 12 tháng tính từ thời điểm nâng hạng sẽ được gia hạn Hạng Vàng.",
        "Tiêu dùng từ 10 đến dưới 30 triệu VND, thẻ trở về Hạng Bạc 0 VNĐ.",
        "Tiêu dùng dưới 10 triệu VND, thẻ trở về Hạng Thường 0 VNĐ.",
      ],
      perks: ["Cashback 3% giá trị hoá đơn (số tiền sẽ được cập nhật trong ví của bạn)"],
    },
    platinum: {
      upgrade: ["Tổng tiêu dùng đạt 80 triệu VND trong 12 tháng"],
      keep: [
        "Tổng tiêu dùng đạt 80 triệu VND trong 12 tháng tính từ thời điểm nâng hạng sẽ được gia hạn Hạng Bạch Kim.",
        "Tiêu dùng từ 30 đến dưới 80 triệu VND, thẻ trở về Hạng Vàng 0 VNĐ.",
        "Tiêu dùng từ 10 đến dưới 30 triệu VND, thẻ trở về Hạng Bạc 0 VNĐ.",
        "Tiêu dùng dưới 10 triệu VND, thẻ trở về Hạng Thường 0 VNĐ.",
      ],
      perks: ["Cashback 5% giá trị hoá đơn (số tiền sẽ được cập nhật trong ví của bạn)"],
    },
  };

  const getCardBg = () => {
    switch(profile?.rank) {
      case 'silver':
        return 'from-slate-400 via-gray-400 to-zinc-500';
      case 'gold':
        return 'from-amber-400 via-yellow-500 to-orange-500';
      case 'platinum':
        return 'from-slate-700 via-gray-600 to-zinc-800';
      default:
        return 'from-rose-500 via-pink-500 to-rose-400';
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{"Thẻ iGo"}</h1>
        <button className="p-2 -mr-2 rounded-full hover:bg-gray-100">
          <History className="w-6 h-6 text-gray-800" />
        </button>
      </div>

      <div className="px-4 mt-4">
        {/* Card */}
        <div className={`relative bg-gradient-to-br ${getCardBg()} rounded-2xl p-5 text-white shadow-lg overflow-hidden transition-colors duration-500`}>
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

          <div className="relative z-10 flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                {{ platinum: "Hạng Bạch Kim", gold: "Hạng Vàng", silver: "Hạng Bạc", normal: "Hạng Thường" }[profile?.rank as string] || "Hạng Thường"}
              </h2>
            </div>
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <QrCode className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between text-sm mb-2 text-white/90">
              <span>{profile?.points ? Number(profile.points).toLocaleString('vi-VN') : '0'}đ</span>
              <span>30.000.000đ</span>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(((profile?.points || 0) / 30000000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-white/80 mt-3 leading-relaxed">
              {"Chỉ tiêu thêm"} {Math.max(30000000 - (profile?.points || 0), 0).toLocaleString('vi-VN')}đ {"trước ngày 26/10/2026 để nâng lên hạng"} {"Hạng Vàng"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mt-6 bg-white px-2 sticky top-[60px] z-40">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors relative ${
              activeTab === tab ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            {tabLabels[tab]}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white mt-2 px-4 py-4 space-y-6">
        
        {/* Tổng chi tiêu đạt (Only for Vàng and Bạch Kim) */}
        {activeTab === 'gold' && (
          <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center text-emerald-800 font-medium">
            <span>{"Tổng chi tiêu đạt"}</span>
            <span>30.000.000đ</span>
          </div>
        )}
        
        {activeTab === 'platinum' && (
          <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center text-emerald-800 font-medium">
            <span>{"Tổng chi tiêu đạt"}</span>
            <span>110.000.000đ</span>
          </div>
        )}

        {([
          { title: "Điều kiện nâng hạng thẻ", lines: rankInfo[activeTab].upgrade },
          { title: "Điều kiện duy trì hạng thẻ", lines: rankInfo[activeTab].keep },
          { title: "Quyền lợi", lines: rankInfo[activeTab].perks },
        ]).map((section, i) => (
          <div key={section.title}>
            {i > 0 && <div className="border-b border-gray-100 mb-6"></div>}
            <div className="flex gap-4">
              <Gift className="w-6 h-6 text-gray-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">{section.title}</h3>
                <div className="text-gray-600 text-sm leading-relaxed space-y-2">
                  {section.lines.map((line, j) => <p key={j}>{`- ${line}`}</p>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating QR Button */}
      <button 
        onClick={() => navigate('/my-qr')}
        className="fixed bottom-6 right-6 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 hover:scale-105 transition-transform z-50"
      >
        <QrCode className="w-8 h-8 text-emerald-600" />
      </button>
    </div>
  );
};

export default IGoCard;
