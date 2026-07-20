import { useEffect, useState } from 'react';
import { MapPin, Star, Building2, Store, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Company {
  id: number;
  name: string;
  code: string;
  tax_code: string;
  email: string;
  phone: string;
  address: string;
  image_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
}

const Brands = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBrand, setSelectedBrand] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response: any = await api.get('/public/companies');
        if (response.companies) {
          setBrands(response.companies);
        }
      } catch (error) {
        console.error('Lỗi tải danh sách thương hiệu', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  const handleBrandClick = async (brand: Company) => {
    setSelectedBrand(brand);
    setLoadingBranches(true);
    setBranches([]);
    try {
      const response: any = await api.get(`/public/companies/${brand.id}/branches`);
      if (response.branches) {
        setBranches(response.branches);
      }
    } catch (error) {
      console.error('Lỗi tải chi nhánh', error);
    } finally {
      setLoadingBranches(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Thương hiệu của chúng tôi</h1>
        <p className="text-gray-600">Khám phá các nhà hàng đẳng cấp mang phong cách ẩm thực đa dạng.</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p>Hiện tại chưa có thương hiệu nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {brands.map((brand) => (
            <div 
              key={brand.id} 
              onClick={() => handleBrandClick(brand)}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer border border-gray-100 flex flex-col"
            >
              <div className="h-48 overflow-hidden relative bg-gray-100 flex items-center justify-center">
                {brand.image_url ? (
                  <img 
                    src={brand.image_url} 
                    alt={brand.name} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600&h=400';
                    }}
                  />
                ) : (
                  <Building2 className="w-16 h-16 text-gray-300 transform group-hover:scale-110 transition-transform duration-700" />
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-bold text-gray-800">4.8</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-primary text-xs font-bold uppercase tracking-wider">{brand.code}</span>
                <h3 className="text-xl font-bold text-gray-800 mt-2 mb-3 line-clamp-2 group-hover:text-primary transition-colors">{brand.name}</h3>
                
                <div className="mt-auto space-y-2">
                  <div className="flex items-start gap-2 text-gray-500 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{brand.address || 'Đang cập nhật địa chỉ...'}</span>
                  </div>
                  {brand.phone && (
                    <div className="text-sm font-medium text-gray-600 mt-2">
                      Hotline: <span className="text-primary">{brand.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Details & Branches Modal */}
      {selectedBrand && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setSelectedBrand(null)} 
          />
          <div className="relative bg-[#f9fafb] w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header Cover */}
            <div className="relative h-48 md:h-56 bg-gray-200 shrink-0">
               {selectedBrand.image_url ? (
                 <img src={selectedBrand.image_url} className="w-full h-full object-cover" alt="Cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                   <Building2 className="w-20 h-20 text-gray-300" />
                 </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
               
               <button 
                 onClick={() => setSelectedBrand(null)} 
                 className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full backdrop-blur-md transition-colors"
               >
                 <X className="w-6 h-6 text-white" />
               </button>

               <div className="absolute bottom-6 left-6 right-6">
                  <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block shadow-sm">
                    {selectedBrand.code}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 drop-shadow-md">{selectedBrand.name}</h2>
               </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div className="flex items-start gap-3 text-gray-600 mb-3">
                  <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-primary" /> 
                  <span className="text-[15px] leading-relaxed">{selectedBrand.address || 'Đang cập nhật địa chỉ...'}</span>
                </div>
                {selectedBrand.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                     <div className="w-5 h-5 flex items-center justify-center shrink-0">
                       <Store className="w-4 h-4 text-primary" />
                     </div>
                     <span className="text-[15px]">Hotline: <strong className="text-gray-800">{selectedBrand.phone}</strong></span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-bold text-gray-800">Hệ thống chi nhánh</h3>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{branches.length} cửa hàng</span>
              </div>

              {loadingBranches ? (
                <div className="flex justify-center py-10">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : branches.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                   <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                   <p className="text-gray-500 font-medium">Thương hiệu này hiện chưa cập nhật chi nhánh.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {branches.map(b => (
                    <div key={b.id} className="group bg-white p-4 border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 group-hover:text-primary transition-colors flex items-center gap-2">
                          {b.name}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1.5 flex items-start gap-1.5 leading-snug">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                          {b.address}
                        </p>
                      </div>
                      <div className="w-full sm:w-auto shrink-0 flex flex-col sm:flex-row gap-2">

                        <button 
                          onClick={() => {
                            const companyId = selectedBrand.id;
                            setSelectedBrand(null);
                            navigate(`/delivery/${companyId}/${b.id}`); 
                          }} 
                          className="w-full sm:w-auto shrink-0 bg-amber-50 text-amber-600 px-5 py-2.5 rounded-xl font-bold hover:bg-amber-100 transition-colors text-[13px] flex items-center justify-center gap-1 border border-amber-100"
                        >
                           Xem thực đơn
                        </button>
                        <button 
                          onClick={() => {
                            const companyId = selectedBrand.id;
                            setSelectedBrand(null);
                            navigate('/booking', { state: { companyId, branchId: b.id } }); 
                          }} 
                          className="w-full sm:w-auto shrink-0 bg-primary/10 text-primary px-5 py-2.5 rounded-xl font-bold hover:bg-primary hover:text-white transition-colors text-[13px] flex items-center justify-center gap-1"
                        >
                           Đặt bàn <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;
