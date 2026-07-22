import { useState, useEffect } from 'react';
import { ArrowLeft, User, Gift, FileText, LogOut, ChevronRight, Calendar, MapPin as QrCode, Lock, Eye, EyeOff, Receipt, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import PinVerification from './PinVerification';
import { useAuth } from '../contexts/AuthContext';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  openVoucherModal: () => void;
}



const ProfileDrawer = ({ isOpen, onClose, openVoucherModal }: ProfileDrawerProps) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'main' | 'edit' | 'password' | 'pin'>('main');


  
  const { user, logout, refreshProfile } = useAuth();

  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(user);
  const [resending, setResending] = useState(false);



  const [editForm, setEditForm] = useState({
    name: user?.full_name || 'Khách hàng',
    dob: '',
    phone: '',
    gender: '',
    email: user?.email || ''
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const fetchProfile = async () => {
        setProfileLoading(true);
        try {
          const res: any = await api.get('/customer/profile/me');
          // Backend trả về { message, profile: {...} }
          const data = res.profile || res.customer || res.user || res.data || res;
          
          setUserProfile(data);
          
          // Format date for input type="date"
          let formattedDob = '';
          if (data.birthday || data.dob) {
            const dateStr = data.birthday || data.dob;
            formattedDob = dateStr.split('T')[0];
          }

          setEditForm({
            name: data.full_name || data.name || '',
            dob: formattedDob,
            phone: data.phone || '',
            gender: data.gender || 'Nam',
            email: data.email || ''
          });
        } catch (err) {
          console.error('Lỗi lấy thông tin hồ sơ:', err);
        } finally {
          setProfileLoading(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response: any = await api.put('/customer/profile/me', {
        name: editForm.name,
        email: editForm.email,
        gender: editForm.gender,
        dob: editForm.dob // birthday field
      });

      const updatedProfile = response.profile || response.data || response;
      
      // Update state
      setUserProfile((prev: any) => ({ ...prev, ...updatedProfile, full_name: updatedProfile.name || updatedProfile.full_name }));
      
      // Update context
      await refreshProfile();

      // Return to main view
      setView('main');
    } catch (err: any) {
      console.error('Lỗi cập nhật hồ sơ:', err);
      if (err.response?.status === 403) {
        alert('Bạn cần xác thực email trước khi có thể cập nhật hồ sơ. Vui lòng nhấn "Gửi lại email" ở thông báo trên cùng và làm theo hướng dẫn.');
      } else {
        alert(err.response?.data?.message || "Không thể cập nhật hồ sơ lúc này.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Mật khẩu mới không khớp.");
      return;
    }
    
    setChangingPassword(true);
    try {
      await api.post('/customer/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      alert("Thay đổi mật khẩu thành công!");
      setView('main');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Lỗi đổi mật khẩu', err);
      alert(err.response?.data?.message || "Không thể đổi mật khẩu.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isOpen) {
    if (view !== 'main') setTimeout(() => setView('main'), 300); // reset after close animation
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  const menuSectionClass = "space-y-1 mb-8";
  const sectionTitleClass = "text-[15px] font-semibold text-gray-900 mb-4 px-2";
  const menuItemClass = "flex items-center gap-4 py-3 px-2 cursor-pointer transition-colors group bg-white hover:bg-gray-50 rounded-xl";

  const renderMainView = () => {
    const getCardBg = () => {
      switch(userProfile?.rank) {
        case 'gold':
          return 'from-amber-400 via-yellow-500 to-orange-500';
        case 'platinum':
          return 'from-slate-700 via-gray-600 to-zinc-800';
        default:
          return 'from-blue-500 via-indigo-500 to-blue-400';
      }
    };
    const currentRank = userProfile?.rank || 'normal';
    let nextTierName = "Hạng Vàng";
    let nextTierThreshold = 30000000;
    
    if (currentRank === 'gold') {
      nextTierName = "Hạng Bạch Kim";
      nextTierThreshold = 80000000;
    } else if (currentRank === 'platinum') {
      nextTierName = "Duy trì Hạng Bạch Kim";
      nextTierThreshold = 80000000;
    }

    const currentRankText = currentRank === 'gold' ? "Hạng Vàng" : (currentRank === 'platinum' ? "Hạng Bạch Kim" : "Thành viên");
    const currentPoints = parseInt(userProfile?.points || 0);
    const progressPercent = Math.min((currentPoints / nextTierThreshold) * 100, 100);
    const pointsNeeded = Math.max(nextTierThreshold - currentPoints, 0);

    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center relative border-b border-gray-50 shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full absolute left-4">
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h2 className="text-lg font-bold text-gray-800 w-full text-center">{"Hồ sơ"}</h2>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
          <div className="p-6 space-y-8">
            
            {/* User Info Basic */}
            <div className="flex items-center gap-4 cursor-pointer group px-2 mb-4" onClick={() => setView('edit')}>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 font-bold text-2xl group-hover:bg-emerald-100 transition-colors overflow-hidden">
                <User className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {profileLoading ? "Đang tải..." : (userProfile?.full_name || "Khách hàng")}
                </h3>
                <p className="text-gray-500 text-[15px] mt-0.5">{userProfile?.phone || ''}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>

            {/* Membership Card */}
            <div className={`bg-gradient-to-br ${getCardBg()} rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden mx-2 transition-colors duration-500`}>
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-[22px] font-bold mb-0.5">{userProfile?.full_name || "Khách hàng"}</h3>
                    <p className="text-white/90 text-sm font-medium">{currentRankText}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold tracking-wide">
                    <span>{currentPoints.toLocaleString('vi-VN')}đ</span>
                    <span>{nextTierThreshold.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="h-1 w-full bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-white/90 mt-2 font-medium">
                    {currentRank === 'platinum' ? "Chi tiêu để duy trì hạng thẻ trước ngày" : "Chi tiêu thêm"} {currentRank !== 'platinum' && `${pointsNeeded.toLocaleString('vi-VN')}đ trước ngày`} 26/10/2026 {currentRank !== 'platinum' && `để nâng lên ${nextTierName}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Tài khoản */}
            <div className={menuSectionClass}>
              <h4 className={sectionTitleClass}>{"Tài khoản"}</h4>
              <div>
                {[
                  { icon: User, label: "Thông tin hồ sơ", onClick: () => setView('edit') },
                  { icon: Calendar, label: "Đặt bàn", onClick: () => { onClose(); navigate('/booking'); } },
                  { icon: FileText, label: "Lịch sử đặt bàn",onClick: () => { onClose(); navigate('/booking/history'); } },
                  { icon: Receipt, label: "Hóa đơn thanh toán", onClick: () => { onClose(); navigate('/invoices'); } },
                ].map((item, idx) => (
                  <div key={idx} onClick={item?.onClick} className={menuItemClass}>
                    <item.icon className="w-[22px] h-[22px] text-gray-700" strokeWidth={1.5} />
                    <span className="flex-1 text-[15px] text-gray-800 font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* Cá nhân hóa */}
            <div className={menuSectionClass}>
              <h4 className={sectionTitleClass}>{"Cá nhân hóa"}</h4>
              <div>

                <div 
                  onClick={() => { onClose(); openVoucherModal(); }}
                  className={menuItemClass}
                >
                  <Gift className="w-[22px] h-[22px] text-gray-700" strokeWidth={1.5} />
                  <span className="flex-1 text-[15px] text-gray-800 font-medium">{"Quà tặng"}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>


            <div className={menuSectionClass}>
              <h4 className={sectionTitleClass}>{"Cài đặt"}</h4>
              <div>

                <div 
                  className={menuItemClass}
                  onClick={() => setView('pin')}
                >
                  <Lock className="w-[22px] h-[22px] text-gray-700" strokeWidth={1.5} />
                  <span className="flex-1 text-[15px] text-gray-800 font-medium">
                    {userProfile?.has_payment_pin ? "Đổi mã PIN" : "Thiết lập mã PIN"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <div 
                  onClick={handleLogout}
                  className="flex items-center gap-4 py-3 px-2 mt-2 cursor-pointer group"
                >
                  <LogOut className="w-[22px] h-[22px] text-red-500" strokeWidth={1.5} />
                  <span className="flex-1 text-[15px] text-red-500 font-medium">{"Đăng xuất"}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderEditView = () => {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center relative border-b border-gray-50 shrink-0">
          <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full absolute left-4">
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h2 className="text-lg font-bold text-gray-800 w-full text-center">{"Hồ sơ"}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-24">
          
          {/* Avatar Edit */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 font-bold text-4xl overflow-hidden">
                <User className="w-12 h-12" />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-0">
            <div className="flex justify-between items-center py-5 border-b border-gray-100">
              <span className="text-gray-500 text-[15px]">{"Tên"}</span>
              <input 
                type="text" 
                value={editForm.name} 
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="text-right text-[15px] font-medium text-gray-900 outline-none bg-transparent w-1/2" 
              />
            </div>
            <div className="flex justify-between items-center py-5 border-b border-gray-100 relative">
              <span className="text-gray-500 text-[15px]">{"Ngày sinh"}</span>
              <div className="relative flex justify-end items-center flex-1 ml-4 h-full">
                <span className="text-[15px] font-medium text-gray-900 pointer-events-none">
                  {editForm.dob ? editForm.dob.split('-').reverse().join('/') : "Chọn ngày"}
                </span>
                <input 
                  type="date" 
                  value={editForm.dob} 
                  onChange={(e) => setEditForm({...editForm, dob: e.target.value})}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-full h-[30px] opacity-0 cursor-pointer" 
                />
              </div>
            </div>

            <div className="flex justify-between items-center py-5 border-b border-gray-100">
              <span className="text-gray-500 text-[15px]">{"Giới tính"}</span>
              <select 
                value={editForm.gender} 
                onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                className="text-right text-[15px] font-medium text-gray-900 outline-none bg-transparent appearance-none" 
                dir="rtl"
              >
                <option value="Nam">{"Nam"}</option>
                <option value="Nữ">{"Nữ"}</option>
                <option value="Khác">{"Khác"}</option>
              </select>
            </div>
            
            <div className="flex flex-col py-3 border-b border-gray-100">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 text-[15px] shrink-0">{"Email"}</span>
                <div className="flex items-center gap-2 flex-1 justify-end truncate ml-4">
                  <input 
                    type="email" 
                    value={editForm.email} 
                    disabled={true}
                    className="text-right text-[15px] font-medium outline-none bg-transparent w-full truncate text-gray-400 cursor-not-allowed" 
                  />
                </div>
              </div>
              {userProfile && !userProfile.email_verified && (
                <div className="flex justify-end mt-1 mb-2">
                  <button 
                    onClick={async (e) => {
                      e.preventDefault();
                      if (editForm.email !== userProfile.email) {
                        alert('Vui lòng nhấn Lưu để cập nhật email trước khi xác thực.');
                        return;
                      }
                      if (!user || resending) return;
                      setResending(true);
                      try {
                        await api.post('/customer/auth/request-verification');
                        alert('Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư của bạn.');
                      } catch (err: any) {
                        alert(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi lại email.');
                      } finally {
                        setResending(false);
                      }
                    }}
                    disabled={resending}
                    className="text-[13px] text-amber-600 font-medium hover:underline flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {resending ? 'Đang gửi email...' : 'Nhấn để xác thực email'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center py-5 border-b border-gray-100">
              <span className="text-gray-500 text-[15px]">{"Mật khẩu"}</span>
              <button onClick={() => setView('password')} className="text-[#00a662] text-[15px] font-medium hover:underline">{"Thay đổi mật khẩu"}</button>
            </div>
          </div>
          
          {/* <div className="mt-8 flex justify-end">
            <button className="text-red-500 text-[15px] hover:underline">{"Xóa tài khoản"}</button>
          </div> */}

        </div>

        {/* Footer Fixed Button */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`w-full text-white font-medium py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00a662] hover:bg-[#008f54]'}`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Lưu"
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderPasswordView = () => {
    const isFormValid = passwordForm.oldPassword && passwordForm.newPassword && passwordForm.confirmPassword;
    
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-4 py-4 flex items-center relative shrink-0 mb-2">
          <button onClick={() => setView('edit')} className="p-2 hover:bg-gray-100 rounded-full absolute left-4">
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-24">
          <h2 className="text-[26px] font-bold text-gray-900 mb-2 tracking-tight">{"Thay đổi mật khẩu"}</h2>
          <p className="text-gray-400 text-[15px] mb-8 leading-relaxed">
            {"Hoàn thành biểu mẫu sau để thay đổi mật khẩu"}
          </p>
          
          <div className="space-y-4">
            {/* Old Password */}
            <div className="relative flex items-center bg-[#f8f9fb] rounded-2xl px-4 py-4">
              <Lock className="w-5 h-5 text-gray-400 mr-3 shrink-0" strokeWidth={1.5} />
              <input 
                type={showOldPassword ? "text" : "password"} 
                placeholder={"Mật khẩu hiện tại"}
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                className="bg-transparent flex-1 outline-none text-[15px] text-gray-800 placeholder:text-gray-400"
              />
              <button onClick={() => setShowOldPassword(!showOldPassword)} className="p-1 shrink-0 ml-2">
                {showOldPassword ? <Eye className="w-5 h-5 text-gray-400" strokeWidth={1.5} /> : <EyeOff className="w-5 h-5 text-gray-400" strokeWidth={1.5} />}
              </button>
            </div>
            
            {/* New Password */}
            <div className="relative flex items-center bg-[#f8f9fb] rounded-2xl px-4 py-4">
              <Lock className="w-5 h-5 text-gray-400 mr-3 shrink-0" strokeWidth={1.5} />
              <input 
                type={showNewPassword ? "text" : "password"} 
                placeholder={"Mật khẩu mới"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="bg-transparent flex-1 outline-none text-[15px] text-gray-800 placeholder:text-gray-400"
              />
              <button onClick={() => setShowNewPassword(!showNewPassword)} className="p-1 shrink-0 ml-2">
                {showNewPassword ? <Eye className="w-5 h-5 text-gray-400" strokeWidth={1.5} /> : <EyeOff className="w-5 h-5 text-gray-400" strokeWidth={1.5} />}
              </button>
            </div>
            
            {/* Confirm New Password */}
            <div className="relative flex items-center bg-[#f8f9fb] rounded-2xl px-4 py-4">
              <Lock className="w-5 h-5 text-gray-400 mr-3 shrink-0" strokeWidth={1.5} />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder={"Nhập lại mật khẩu mới"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="bg-transparent flex-1 outline-none text-[15px] text-gray-800 placeholder:text-gray-400"
              />
              <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1 shrink-0 ml-2">
                {showConfirmPassword ? <Eye className="w-5 h-5 text-gray-400" strokeWidth={1.5} /> : <EyeOff className="w-5 h-5 text-gray-400" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Fixed Button */}
        <div className="p-6 shrink-0 bg-white">
          <button 
            disabled={!isFormValid || changingPassword}
            onClick={handleChangePassword}
            className={`w-full font-medium py-4 rounded-[14px] transition-colors shadow-sm flex items-center justify-center 
              ${isFormValid && !changingPassword ? 'bg-[#00a662] text-white hover:bg-[#008f54]' : 'bg-[#e9ecef] text-gray-400 cursor-not-allowed'}`}
          >
            {changingPassword ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Thay đổi mật khẩu"
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderPinView = () => {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="bg-white px-4 py-4 flex items-center relative border-b border-gray-50 shrink-0">
          <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full absolute left-4">
            <ArrowLeft className="w-6 h-6 text-gray-800" />
          </button>
          <h2 className="text-lg font-bold text-gray-800 w-full text-center">
            {userProfile?.has_payment_pin ? "Đổi mã PIN" : "Thiết lập mã PIN"}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PinVerification 
            onSuccess={() => {
              // Refresh profile to update has_payment_pin
              if (!userProfile?.has_payment_pin) {
                setUserProfile({ ...userProfile, has_payment_pin: true });
              }
              setView('main');
            }} 
            hasPin={userProfile?.has_payment_pin || false} 
            mode={userProfile?.has_payment_pin ? 'CHANGE' : 'SETUP'}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 bottom-0 right-0 w-full sm:w-[400px] bg-white z-[70] shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {view === 'main' && renderMainView()}
        {view === 'edit' && renderEditView()}
        {view === 'password' && renderPasswordView()}
        {view === 'pin' && renderPinView()}
      </div>
    </>
  );
};

export default ProfileDrawer;
