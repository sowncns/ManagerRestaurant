import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Search, Plus, ShoppingBag } from 'lucide-react';
import api from '../lib/api';

const DeliveryMenu = () => {
  const { companyId, branchId } = useParams();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [id: string]: { item: any; quantity: number } }>({});
  const [cartId, setCartId] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let currentMenuItems: any[] = [];
    const fetchMenu = async () => {
      try {
        const response: any = await api.get(`/public/companies/${companyId}/menu`);
        let items = response.menuItems || response.menu || [];
        if (items.length > 0 && items[0].items) {
          // Flatten if it's an array of categories
          items = items.flatMap((cat: any) => 
            cat.items.map((i: any) => ({ ...i, category_name: cat.category_name }))
          );
        }
        
        if (items) {
          setMenuItems(items);
          currentMenuItems = items;
          
          if (items.length > 0) {
            // Extract categories
            const cats = new Set(items.map((item: any) => item.category_name).filter(Boolean));
            setCategories(['Tất cả', ...Array.from(cats)] as string[]);
          }
        }

        // Fetch Cart from API
        try {
          const cartResponse: any = await api.get('/customer/cart');
          if (cartResponse.cart) {
            setCartId(cartResponse.cart.id);
            if (cartResponse.cart.items) {
               const newCart: any = {};
               cartResponse.cart.items.forEach((cartItem: any) => {
                  const menuItem = currentMenuItems.find(m => m.menu_item_id === cartItem.menu_item_id);
                  if (menuItem) {
                     newCart[menuItem.menu_item_id] = { item: menuItem, quantity: cartItem.quantity };
                  }
               });
               setCart(newCart);
            }
          }
        } catch (cartError: any) {
          // If cart not found, create one
          if (cartError.response?.status === 404 || cartError.response?.status === 400) {
            try {
              const createResponse: any = await api.post('/customer/cart/create');
              if (createResponse.cart) {
                setCartId(createResponse.cart.id);
              }
            } catch (createErr) {
              console.error('Lỗi tạo giỏ hàng', createErr);
            }
          } else if (cartError.response?.status !== 401) {
             console.error('Lỗi tải giỏ hàng', cartError);
          }
        }
      } catch (error) {
        console.error('Lỗi tải menu', error);
        
        setMenuItems([]);
        setCategories(['Tất cả']);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [companyId, branchId]);

  const displayedItems = activeCategory === 'Tất cả' 
    ? menuItems 
    : menuItems.filter(item => item.category_name === activeCategory);

  const cartItemsList = Object.values(cart).filter(c => c.quantity > 0);
  const totalQuantity = cartItemsList.reduce((sum, c) => sum + c.quantity, 0);
  const totalPrice = cartItemsList.reduce((sum, c) => sum + Number(c.item.price || 0) * c.quantity, 0);

  const updateQuantity = async (item: any, delta: number) => {
    const id = item.id || item.menu_item_id || item.branch_menu_item_id;
    const existing = cart[id] || { item, quantity: 0 };
    const newQuantity = Math.max(0, existing.quantity + delta);
    
    // Cập nhật giao diện ngay lập tức (Optimistic UI)
    setCart(prev => {
      const newCart = { ...prev };
      if (newQuantity === 0) {
        delete newCart[id];
      } else {
        newCart[id] = { item, quantity: newQuantity };
      }
      return newCart;
    });

    // Đồng bộ API nếu đã có cartId (người dùng đã đăng nhập)
    if (cartId) {
      try {
        if (existing.quantity === 0 && newQuantity > 0) {
          await api.post('/customer/cart/add', { cartId, menuItemId: id, quantity: newQuantity });
        } else if (newQuantity === 0) {
          await api.delete('/customer/cart/remove', { data: { cartId, menuItemId: id } });
        } else {
          await api.put('/customer/cart/update', { cartId, menuItemId: id, quantity: newQuantity });
        }
      } catch (error) {
        console.error('Lỗi đồng bộ giỏ hàng với API', error);
      }
    }
  };

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('vi-VN').format(Number(price)) + 'đ';
  };

  return (
    <div className="min-h-screen bg-white pb-24 relative max-w-2xl mx-auto border-x border-gray-100">
      {/* Hero Header */}
      <div className="relative h-48 bg-gray-900">
        <img 
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000&h=400" 
          alt="Cover" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
          <button onClick={() => navigate(-1)} className="p-2 bg-black/20 rounded-full backdrop-blur-md text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-white/80 text-xs uppercase font-bold tracking-wider">Thực đơn</span>
            <div className="flex items-center gap-1 text-white font-medium text-sm">
              <MapPin className="w-3.5 h-3.5" /> Dùng tại nhà hàng
            </div>
          </div>
          <button 
            onClick={() => totalQuantity > 0 && setIsCartOpen(true)}
            className="p-2 bg-black/20 rounded-full backdrop-blur-md text-white relative"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalQuantity > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {totalQuantity}
              </span>
            )}
          </button>
        </div>
        
        {/* Search Bar overlaps hero and content */}
        <div className="absolute -bottom-6 left-6 right-6">
          <div className="bg-white rounded-2xl shadow-lg flex items-center px-4 py-3 border border-gray-100">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder="Bạn đang thèm món gì?" 
              className="flex-1 outline-none text-gray-700 bg-transparent text-sm placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="pt-12 px-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Danh mục</h2>
        
        {/* Category Scroll */}
        <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 mb-2 snap-x">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border ${
                activeCategory === cat 
                  ? 'bg-[#00a662] text-white border-[#00a662] shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a662]"></div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p>Nhà hàng này hiện chưa có món ăn nào.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* If "Tất cả", group by category. Otherwise just show active category */}
            {activeCategory === 'Tất cả' ? (
              categories.filter(c => c !== 'Tất cả').map(cat => {
                const itemsInCat = menuItems.filter(i => i.category_name === cat);
                if (itemsInCat.length === 0) return null;
                return (
                  <div key={cat} className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">{cat}</h3>
                    {itemsInCat.map(item => {
                      const id = item.id || item.menu_item_id || item.branch_menu_item_id;
                      const quantity = cart[id]?.quantity || 0;
                      return (
                        <MenuItemCard 
                          key={id} 
                          item={item} 
                          quantity={quantity}
                          onUpdate={(delta) => updateQuantity(item, delta)} 
                          formatPrice={formatPrice} 
                        />
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">{activeCategory}</h3>
                {displayedItems.map(item => {
                  const id = item.id || item.menu_item_id || item.branch_menu_item_id;
                  const quantity = cart[id]?.quantity || 0;
                  return (
                    <MenuItemCard 
                      key={id} 
                      item={item} 
                      quantity={quantity}
                      onUpdate={(delta) => updateQuantity(item, delta)} 
                      formatPrice={formatPrice} 
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart floating button */}
      {totalQuantity > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-md z-50 animate-in slide-in-from-bottom-10">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#00a662] text-white rounded-2xl p-4 shadow-xl flex items-center justify-between font-bold hover:bg-[#008f55] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">
                {totalQuantity}
              </div>
              <span>Xem giỏ hàng</span>
            </div>
            <span>{formatPrice(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsCartOpen(false)} 
          />
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-full duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800">Giỏ hàng của bạn</h3>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded-full text-sm font-medium"
              >
                Đóng
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1 space-y-4">
              {cartItemsList.map(c => {
                const item = c.item;
                const id = item.id || item.menu_item_id || item.branch_menu_item_id;
                return (
                  <div key={id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 pr-2">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        <img 
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200&h=200'} 
                          alt={item.name || item.item_name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.name || item.item_name}</h4>
                        <span className="text-[#38bdf8] font-bold text-xs">{formatPrice(item.price)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 shrink-0 border border-gray-100">
                      <button onClick={() => updateQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-full text-lg font-medium">-</button>
                      <span className="w-4 text-center font-bold text-gray-800 text-sm">{c.quantity}</span>
                      <button onClick={() => updateQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-full text-lg font-medium">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 font-medium">Tổng cộng ({totalQuantity} món)</span>
                <span className="text-xl font-bold text-gray-800">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => navigate('/booking', { state: { companyId, branchId } })}
                  className="w-full bg-[#00a662] text-white rounded-2xl p-4 font-bold hover:bg-[#008f55] transition-colors shadow-lg flex justify-center items-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" /> Đặt bàn kèm thực đơn này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuItemCard = ({ item, quantity, onUpdate, formatPrice }: { item: any, quantity: number, onUpdate: (delta: number) => void, formatPrice: (p: number | string) => string }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 group">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-50">
        <img 
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200&h=200'} 
          alt={item.name || item.item_name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200&h=200'; }}
        />
      </div>
      <div className="flex-1 pr-4">
        <h4 className="font-bold text-gray-800 text-[15px] leading-snug mb-1">{item.name || item.item_name}</h4>
        {item.description && <p className="text-xs text-gray-500 line-clamp-1 mb-2">{item.description}</p>}
        <span className="text-[#38bdf8] font-bold text-sm">{formatPrice(item.price)}</span>
      </div>
    </div>
    
    {quantity > 0 ? (
      <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1 shrink-0 border border-gray-100 shadow-sm">
        <button onClick={() => onUpdate(-1)} className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-full text-lg font-medium">-</button>
        <span className="w-4 text-center font-bold text-gray-800 text-sm">{quantity}</span>
        <button onClick={() => onUpdate(1)} className="w-7 h-7 flex items-center justify-center text-[#00a662] hover:bg-green-100 rounded-full text-lg font-medium">+</button>
      </div>
    ) : (
      <button 
        onClick={() => onUpdate(1)}
        className="w-8 h-8 rounded-full bg-[#00a662] text-white flex items-center justify-center shrink-0 hover:scale-110 transition-transform shadow-md"
      >
        <Plus className="w-5 h-5" />
      </button>
    )}
  </div>
);

export default DeliveryMenu;
