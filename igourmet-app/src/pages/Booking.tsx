import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, MapPin, Building2, User, Phone, Mail } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PinVerification from '../components/PinVerification';

interface Company {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
}

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  const [selectedCompany, setSelectedCompany] = useState<string>(location.state?.companyId?.toString() || '');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  
  const initialBranchId = useRef<string | null>(location.state?.branchId?.toString() || null);

  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');
  const [tableNumber, setTableNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // New Modal states for pre-ordering
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [preorderCart, setPreorderCart] = useState<{ [id: string]: { item: any; quantity: number } }>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<any>(null);

  const { user } = useAuth();

  // Lấy thông tin khách hàng nếu đã đăng nhập
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const res: any = await api.get('/customer/profile/me');
          if (res.profile) {
            setCustomerName(res.profile.fullname || res.profile.name || '');
            setCustomerPhone(res.profile.phone || '');
            setCustomerEmail(res.profile.email || '');
          }
        } catch (error) {
          console.error('Không thể lấy thông tin profile', error);
        }
      }
    };
    fetchProfile();
  }, []);

  // Lấy danh sách thương hiệu (công ty)
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response: any = await api.get('/public/companies');
        if (response.companies) {
          setCompanies(response.companies);
        }
      } catch (error) {
        console.error('Lỗi tải danh sách thương hiệu', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Lấy danh sách chi nhánh khi chọn thương hiệu
  useEffect(() => {
    if (!selectedCompany) {
      setBranches([]);
      setSelectedBranch('');
      return;
    }

    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const response: any = await api.get(`/public/companies/${selectedCompany}/branches`);
        if (response.branches) {
          setBranches(response.branches);
          
          // Auto-select branch if passed from router state
          if (initialBranchId.current) {
            setSelectedBranch(initialBranchId.current);
            initialBranchId.current = null; // Clear it so it only runs once
          }
        }
      } catch (error) {
        console.error('Lỗi tải danh sách chi nhánh', error);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [selectedCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Validation
    if (!selectedBranch || !customerName || !customerPhone || !reservationDate || !reservationTime || !guestCount) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin bắt buộc (Chi nhánh, Tên, Số điện thoại, Ngày, Giờ, Số khách).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const gCount = parseInt(guestCount);
      
      let finalNotes = specialRequest;
      if (tableNumber) {
        finalNotes = finalNotes ? `BÀN: ${tableNumber} | ${finalNotes}` : `BÀN: ${tableNumber}`;
      }

      let reservationPayload: any = {
        branch_id: selectedBranch,
        customer_name: customerName,
        customer_phone: customerPhone,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        guest_count: gCount
      };

      if (customerEmail) {
        reservationPayload.customer_email = customerEmail;
      }
      
      if (finalNotes) {
        reservationPayload.note = finalNotes;
      }

      // Add preorder items to reservation payload
      const customPreorder = Object.values(preorderCart).filter(c => c.quantity > 0);
      if (customPreorder.length > 0) {
        reservationPayload.items = customPreorder.map(c => ({
          menu_item_id: c.item.id || c.item.menu_item_id || c.item.branch_menu_item_id,
          quantity: c.quantity
        }));
        
        const totalAmount = customPreorder.reduce((sum, c) => sum + (Number(c.item.price) * c.quantity), 0);
        const depositAmount = totalAmount * 0.3; // 30% deposit rate
        reservationPayload.display_deposit_amount = depositAmount;
        reservationPayload.display_total_amount = totalAmount;
        
        // Cần thanh toán cọc -> Hiện PIN Modal
        setPendingReservation(reservationPayload);
        setShowPinModal(true);
        setIsSubmitting(false);
        return;
      }

      await submitReservation(reservationPayload);
    } catch (error: any) {
      console.error('Lỗi đặt bàn:', error);
      setErrorMessage(error.response?.data?.message || 'Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại sau.');
      setIsSubmitting(false);
    }
  };

  const submitReservation = async (payload: any) => {
    try {
      setIsSubmitting(true);
      // Da dang nhap -> route customer (ho tro dat mon truoc). Khach vang lai -> route public (chi dat ban).
      const endpoint = user ? '/customer/reservations' : '/public/reservations';
      await api.post(endpoint, payload);
      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Có lỗi xảy ra khi đặt bàn. Vui lòng thử lại.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinComplete = async (pin: string) => {
    setShowPinModal(false);
    if (!pendingReservation) return;
    
    // Thêm mã PIN vào payload
    const payload = { ...pendingReservation, pin };
    await submitReservation(payload);
    setPendingReservation(null);
  };

  const handleOpenMenuModal = async () => {
    if (!selectedCompany || !selectedBranch) {
      setErrorMessage('Vui lòng chọn Thương hiệu và Chi nhánh trước khi xem thực đơn.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErrorMessage('');
    setShowMenuModal(true);
    if (menuItems.length === 0) {
      setLoadingMenu(true);
      try {
        const response: any = await api.get(`/public/companies/${selectedCompany}/menu`);
        let items = response.menuItems || response.menu || [];
        
        let flatItems = items;
        if (items.length > 0 && items[0].items) {
          flatItems = items.flatMap((cat: any) => 
            cat.items.map((i: any) => ({ ...i, category_name: cat.category_name }))
          );
        }
        
        if (flatItems) {
          setMenuItems(flatItems);
          const cats = new Set(flatItems.map((item: any) => item.category_name).filter(Boolean));
          setCategories(['Tất cả', ...Array.from(cats)] as string[]);
        }
      } catch (err) {
        console.error('Lỗi tải menu', err);
      } finally {
        setLoadingMenu(false);
      }
    }
  };

  const updatePreorderQuantity = (item: any, delta: number) => {
    const id = item.id || item.menu_item_id || item.branch_menu_item_id;
    setPreorderCart(prev => {
      const existing = prev[id] || { item, quantity: 0 };
      const newQuantity = Math.max(0, existing.quantity + delta);
      const newCart = { ...prev };
      if (newQuantity === 0) {
        delete newCart[id];
      } else {
        newCart[id] = { item, quantity: newQuantity };
      }
      return newCart;
    });
  };

  if (submitSuccess) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-lg text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Đặt bàn thành công!</h2>
          <p className="text-gray-600">
            Yêu cầu đặt bàn của bạn đã được gửi. Chúng tôi sẽ sớm liên hệ để xác nhận.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 inline-block bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-amber-700 transition-colors shadow-md"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Đặt bàn trực tuyến</h1>
        <p className="text-gray-500 text-center mb-10">Vui lòng điền thông tin chi tiết để chúng tôi phục vụ tốt nhất.</p>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Chọn Thương hiệu */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Thương hiệu (Nhà hàng) *
              </label>
              <select 
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none text-gray-700"
                disabled={loading}
              >
                <option value="">{loading ? 'Đang tải...' : '-- Chọn thương hiệu --'}</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Chọn Chi nhánh */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Chi nhánh *
              </label>
              <select 
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none text-gray-700"
                disabled={!selectedCompany || loadingBranches}
              >
                <option value="">
                  {!selectedCompany 
                    ? '-- Vui lòng chọn thương hiệu trước --' 
                    : loadingBranches 
                      ? 'Đang tải chi nhánh...' 
                      : '-- Chọn chi nhánh --'}
                </option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} - {b.address}</option>
                ))}
              </select>
            </div>

            {/* Tên khách hàng */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Tên khách hàng *
              </label>
              <input 
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nhập họ và tên"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
              />
            </div>

            {/* Số điện thoại */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Số điện thoại *
              </label>
              <input 
                type="tel" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
              />
            </div>

            {/* Email */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Email (Không bắt buộc)
              </label>
              <input 
                type="email" 
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Nhập địa chỉ email"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
              />
            </div>

            {/* Số người */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Số khách *
              </label>
              <select 
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none text-gray-700"
              >
                {[1,2,3,4,5,6,7,8,9,10,15,20].map(n => (
                  <option key={n} value={n}>{n} Người</option>
                ))}
              </select>
            </div>

            {/* Ngày & Giờ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Ngày đặt *
                </label>
                <input 
                  type="date" 
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Giờ đến *
                </label>
                <input 
                  type="time" 
                  value={reservationTime}
                  onChange={(e) => setReservationTime(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
                />
              </div>
            </div>

            {/* Số bàn */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Số bàn muốn đặt (Không bắt buộc)
              </label>
              <input 
                type="text" 
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Nhập số bàn (nếu có)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
              />
            </div>

          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-gray-700">Ghi chú thêm (Không bắt buộc)</label>
            <textarea 
              rows={3}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-700"
              placeholder="Ví dụ: Cần ghế trẻ em, dị ứng hải sản, tổ chức sinh nhật..."
            />
          </div>

          {/* Dat mon truoc chi danh cho khach da dang nhap (can vi + PIN de dat coc) */}
          {user && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">Món ăn đặt trước</h3>
                <button
                  type="button"
                  onClick={handleOpenMenuModal}
                  className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl font-bold hover:bg-amber-100 transition-colors border border-amber-100 flex items-center gap-2 text-sm"
                >
                  + Thêm món ăn
                </button>
              </div>

              {Object.values(preorderCart).filter(c => c.quantity > 0).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                  {Object.values(preorderCart).filter(c => c.quantity > 0).map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-800 font-medium">{c.item.name || c.item.item_name}</span>
                      <span className="text-gray-600">x{c.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full bg-primary text-white text-lg font-bold py-4 rounded-xl transition-colors shadow-lg mt-4 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-700 hover:shadow-xl'}`}
          >
            {isSubmitting ? 'Đang gửi yêu cầu...' : 'Xác nhận đặt bàn'}
          </button>
        </form>
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMenuModal(false)} />
          <div className="relative bg-white w-full max-w-2xl mx-auto rounded-t-3xl shadow-2xl flex flex-col h-[90vh] animate-in slide-in-from-bottom-full duration-300">
            <div className="p-4 border-b border-gray-100 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl text-gray-800">Chọn món trước</h3>
                <button onClick={() => setShowMenuModal(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Tìm kiếm món ăn..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              {/* Categories */}
              {categories.length > 1 && (
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 snap-x">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCategory(cat)}
                      className={`snap-start shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                        activeCategory === cat 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loadingMenu ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Thực đơn đang cập nhật...</div>
              ) : (
                <div className="space-y-4">
                  {menuItems
                    .filter(item => activeCategory === 'Tất cả' || item.category_name === activeCategory)
                    .filter(item => !searchQuery || (item.name || item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(item => {
                    const id = item.id || item.menu_item_id || item.branch_menu_item_id;
                    const quantity = preorderCart[id]?.quantity || 0;
                    return (
                      <div key={id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3 flex-1">
                          <img 
                            src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=100&h=100'} 
                            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100"
                            alt={item.name || item.item_name}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=100&h=100'; }}
                          />
                          <div>
                            <h4 className="font-bold text-gray-800 text-[15px]">{item.name || item.item_name}</h4>
                            <p className="text-primary font-bold text-sm mt-1">{new Intl.NumberFormat('vi-VN').format(Number(item.price))}đ</p>
                          </div>
                        </div>
                        {quantity > 0 ? (
                          <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                            <button type="button" onClick={() => updatePreorderQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-full font-medium">-</button>
                            <span className="w-4 text-center font-bold text-gray-800 text-sm">{quantity}</span>
                            <button type="button" onClick={() => updatePreorderQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center text-primary hover:bg-primary/10 rounded-full font-medium">+</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => updatePreorderQuantity(item, 1)} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform">
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0">
              <button type="button" onClick={() => setShowMenuModal(false)} className="w-full bg-primary text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-amber-700">
                Xong ({Object.values(preorderCart).reduce((sum, c) => sum + c.quantity, 0)} món)
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowPinModal(false);
            setIsSubmitting(false);
          }} />
          <div className="relative bg-white w-full max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 pt-8 pb-4">
            <button 
              onClick={() => {
                setShowPinModal(false);
                setIsSubmitting(false);
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 z-10"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="text-center px-6 mb-2">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận đặt cọc</h3>
              <p className="text-sm text-gray-500 mb-4">
                Nhà hàng yêu cầu thanh toán cọc 30% cho đơn đặt trước. Nhập mã PIN để tiếp tục.
              </p>
              
              {pendingReservation?.display_deposit_amount && (
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex flex-col mb-4 mx-4">
                  <span className="text-xs text-amber-700/70 uppercase font-bold tracking-wider mb-1">Số tiền cọc cần thanh toán</span>
                  <span className="text-[26px] font-black text-amber-600">
                    {new Intl.NumberFormat('vi-VN').format(pendingReservation.display_deposit_amount)}đ
                  </span>
                  <span className="text-[11px] text-amber-700/50 mt-1 font-medium">
                    (Tổng món: {new Intl.NumberFormat('vi-VN').format(pendingReservation.display_total_amount)}đ)
                  </span>
                </div>
              )}
            </div>
            
            <PinVerification 
              onSubmitPin={handlePinComplete}
              mode="VERIFY"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
