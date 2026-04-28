import React, {useState, useMemo, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  useWindowDimensions,
  StatusBar,
  Modal,
  RefreshControl,
  FlatList,
  SectionList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ResponsivePanel from '../../components/pos/ResponsivePanel';
import ProductCard from '../../components/pos/ProductCard';
import RoomCard from '../../components/pos/RoomCard';
import RoomDetailBottomSheet from '../../components/booking/ui/RoomDetailBottomSheet';
import CartItemRow from '../../components/pos/CartItemRow';
import {
  Customer,
  ProductVariant,
  Product,
  Room,
  RoomStatus,
  CartItem,
  PosCategory,
} from './types';
import {useTheme} from '../../hooks/useTheme';
import BookingScreen from '../booking/BookingScreen';
import PaymentModal from './PaymentModal';
import RoomDetailScreen from '../booking/RoomDetailScreen';

import {PosQueryService} from '@/services/PosServices/PosQueryService';
import {RoomQueryService} from '@/services/ResidentServices/RoomQueryService';
import CustomerService from '@/services/ResidentServices/CustomerService';

// ─── Constants ──────────────────────────────────────────────────────────────
const GAP = 12;
const formatPrice = (price: number, t: any) =>
  price.toLocaleString('vi-VN') + t('pos.currency_symbol');

// ─── Data fetch happen inside PosResident ───────────────────────────────────

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PosResident({onOpenMenu}: {onOpenMenu: () => void}) {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();

  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [activeSection, setActiveSection] = useState<'pos' | 'stay'>('pos');
  const [activeMainCategory, setActiveMainCategory] =
    useState<string>('__all__'); // '__all__' means all main categories
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all'); // 'all' or specific sub category ID
  const [activeRoomStatus, setActiveRoomStatus] = useState<RoomStatus | 'all'>(
    'all',
  );
  const [searchText, setSearchText] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [rooms, setRooms] = useState<{title: string; data: Room[]}[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [activeRoomType, setActiveRoomType] = useState<string>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Do redux chưa được cài đặt, tạm thời dùng mock storeId.
  // Sau này có thể lấy từ Context hoặc Global State thực tế.
  const activeStoreId = 'store-001';

  const loadData = async () => {
    if (!activeStoreId) {
      return;
    }
    setRefreshing(true);

    try {
      console.log('[PosResident] Loading data for store:', activeStoreId);
      const [prods, cats, roomsData] = await Promise.all([
        PosQueryService.getProducts(),
        PosQueryService.getCategories(),
        RoomQueryService.getRoomsGroupedByFloor(activeStoreId),
      ]);

      console.log('[PosResident] Data Counts:', {
        products: prods.length,
        categories: cats.length,
        rooms: roomsData.length,
      });

      setProducts(prods);
      setCategories(cats);

      // Map RoomGridItem to Room interface
      const mappedRooms = roomsData.map(group => ({
        title: group.title,
        data: group.data.map((item: any): Room => {
          console.log(
            '[PosResident Mapping] item.id:',
            item.id,
            'item.status:',
            item.status,
            'item.contract_id:',
            item.contract_id,
            'item.start_date:',
            item.start_date,
            'item.end_date:',
            item.end_date,
          );
          return {
            id: item.id,
            status: item.status,
            name: item.name,
            label: item.label,
            product_name: item.product_name,
            monthly_price: item.monthly_price,
            displayPriceText: item.displayPriceText,
            floor: item.floor,
            customer_name: item.customer_name,
            product_id: item.product_id,
            attributes: item.attributes,
            borderColor: item.borderColor,
            tag: undefined,
            contract_id: item.contract_id,
            start_date: item.start_date,
            end_date: item.end_date,
            checkInTime: item.checkInTime,
          };
        }),
      }));

      setRooms(mappedRooms);
    } catch (err) {
      console.error('[PosResident] Error in loadData:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeStoreId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoreId]);

  const onRefresh = useCallback(() => {
    loadData();
  }, [activeStoreId]);

  const handleRoomPress = useCallback((room: Room) => {
    console.log('[PosResident] handleRoomPress:', {
      id: room.id,
      status: room.status,
      label: room.label,
    });
    if (room.status === 'available' || room.status === 'booked') {
      setBookingRoom(room);
    } else if (room.status === 'occupied') {
      setSelectedRoom(room);
      setDetailModalVisible(true);
    }
  }, []);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState(t('pos.guest'));
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Room Detail Bottom Sheet
  const [roomDetailVisible, setRoomDetailVisible] = useState(false);
  const [selectedRoomForDetail, setSelectedRoomForDetail] =
    useState<Room | null>(null);

  const [paymentVisible, setPaymentVisible] = useState(false);

  const availableSections = useMemo(() => {
    const rawTypes = Array.from(
      new Set(categories.map(c => c.apply_to).filter(Boolean)),
    );
    // Sắp xếp: POS luôn đứng đầu
    const sortedTypes = rawTypes.sort((a, b) => {
      if (a === 'pos') {
        return -1;
      }
      if (b === 'pos') {
        return 1;
      }
      return String(a).localeCompare(String(b));
    });

    return sortedTypes.map(rawValue => {
      const type = String(rawValue);
      return {
        key: type,
        // Lấy theo intern1/Qanhdev: dùng t() cho tất cả label lưu trú
        label:
          type === 'pos'
            ? t('pos.title')
            : type === 'accommodation'
            ? t('pos.accommodation')
            : type === 'hotel'
            ? t('pos.hotel')
            : type === 'hostel'
            ? t('pos.hostel')
            : type.charAt(0).toUpperCase() + type.slice(1),
        icon: type === 'pos' ? 'shopping-basket' : 'hotel',
      };
    });
  }, [categories, t]);

  const mainCategories = useMemo(() => {
    // Lọc các danh mục chính theo section đang chọn
    return categories.filter(
      c =>
        (!c.parent_id || c.parent_id === c.id) && c.apply_to === activeSection,
    );
  }, [categories, activeSection]);

  const activeCategoryObj = useMemo(
    () => categories.find(c => c.id === activeMainCategory),
    [categories, activeMainCategory],
  );

  const isRoomMode = activeSection !== 'pos';

  const subCategories = useMemo(() => {
    if (!activeMainCategory) {
      return [];
    }
    return categories.filter(
      c => c.parent_id === activeMainCategory && c.id !== c.parent_id,
    );
  }, [categories, activeMainCategory]);

  // Lấy theo intern1/Qanhdev: roomStatuses không có 'cleaning'
  const roomStatuses: {key: RoomStatus | 'all'; label: string}[] = useMemo(
    () => [
      {key: 'all', label: t('pos.status_all')},
      {key: 'available', label: t('pos.status_empty')},
      {key: 'booked', label: t('pos.status_booked')},
      {key: 'occupied', label: t('pos.status_occupied')},
    ],
    [t],
  );

  // Responsive Grid
  const numCols = screenWidth > 700 ? 4 : screenWidth > 500 ? 3 : 2;
  const cardWidth = (screenWidth - 32 - GAP * (numCols - 1)) / numCols;

  const filteredProducts = products.filter(p => {
    if (activeMainCategory === '__all__') {
      return p.name.toLowerCase().includes(searchText.toLowerCase());
    }
    let allowedCategoryIds: string[] = [];
    if (activeSubCategory !== 'all') {
      allowedCategoryIds = [activeSubCategory];
    } else {
      allowedCategoryIds = [
        activeMainCategory,
        ...subCategories.map(c => c.id),
      ];
    }

    const matchCat = allowedCategoryIds.includes(p.category_id);
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  // Lấy theo intern1/Qanhdev: không có minPrice/maxPrice filter
  const filteredRooms = useMemo(() => {
    return rooms
      .map((group: {title: string; data: Room[]}) => ({
        ...group,
        data: group.data.filter((r: Room) => {
          const matchStatus =
            activeRoomStatus === 'all' || r.status === activeRoomStatus;
          const matchSearch = (r.label || '')
            .toLowerCase()
            .includes(searchText.toLowerCase());
          const matchType =
            activeRoomType === 'all' || r.product_name === activeRoomType;

          return matchStatus && matchSearch && matchType;
        }),
      }))
      .filter((group: {title: string; data: Room[]}) => group.data.length > 0);
  }, [rooms, activeRoomStatus, searchText, activeRoomType]);

  const roomTypes = useMemo(() => {
    const types = new Set<string>();
    rooms.forEach(g =>
      g.data.forEach(r => {
        if (r.product_name) {
          types.add(r.product_name);
        }
      }),
    );
    return Array.from(types).sort();
  }, [rooms]);

  const handleAdd = useCallback(
    async (id: string) => {
      const product = products.find(p => p.id === id);
      if (!product) {
        return;
      }

      // Nếu sản phẩm đã có trong giỏ → chỉ tăng số lượng, không fetch lại
      setCartItems(prev => {
        const existing = prev.find(i => i.product.id === id);
        if (existing) {
          return prev.map(i =>
            i.product.id === id ? {...i, quantity: i.quantity + 1} : i,
          );
        }
        // Chưa có → thêm mới với variants rỗng trước, fetch sau
        return [
          ...prev,
          {product, quantity: 1, variants: [], selectedVariant: null},
        ];
      });
      setCartCount(c => c + 1);

      // Fetch variants bất đồng bộ — chỉ chạy lần đầu thêm sản phẩm vào giỏ
      // (nếu đã có trong giỏ thì bỏ qua vì đã có variants rồi)
      setCartItems(prev => {
        const existing = prev.find(i => i.product.id === id);
        // Nếu đã có variants (thêm lần 2+) thì không fetch
        if (existing && existing.variants.length > 0) {
          return prev;
        }
        return prev; // giữ nguyên, fetch dưới đây
      });

      try {
        const data = await PosQueryService.getProductVariants(id);

        // Chọn mặc định variant có giá thấp nhất
        const cheapest =
          data.length > 0
            ? data.reduce((min, v) => (v.price < min.price ? v : min))
            : null;

        setCartItems(prev =>
          prev.map(i => {
            if (i.product.id !== id) {
              return i;
            }
            // Nếu user đã chọn variant thủ công trước khi fetch xong → giữ nguyên
            if (i.selectedVariant) {
              return {...i, variants: data};
            }
            return {
              ...i,
              variants: data,
              selectedVariant: cheapest,
              // Cập nhật giá product theo variant rẻ nhất để hiển thị đúng
              product: cheapest
                ? {...i.product, price: cheapest.price}
                : i.product,
            };
          }),
        );
      } catch {
        // Fetch lỗi → giữ nguyên, variants = [] → chip sẽ ẩn
      }
    },
    [products],
  );

  const handleIncrease = useCallback((id: string) => {
    setCartItems(prev =>
      prev.map(i =>
        i.product.id === id ? {...i, quantity: i.quantity + 1} : i,
      ),
    );
    setCartCount(c => c + 1);
  }, []);

  const handleDecrease = useCallback((id: string) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === id);
      if (!item) {
        return prev;
      }
      if (item.quantity === 1) {
        return prev.filter(i => i.product.id !== id);
      }
      return prev.map(i =>
        i.product.id === id ? {...i, quantity: i.quantity - 1} : i,
      );
    });
    setCartCount(c => Math.max(0, c - 1));
  }, []);

  const handleClearCart = () => {
    setCartItems([]);
    setCartCount(0);
  };

  const handleSetQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      // Xóa khỏi giỏ nếu số lượng = 0
      setCartItems(prev => {
        const item = prev.find(i => i.product.id === id);
        const removed = item ? item.quantity : 0;
        setCartCount(c => Math.max(0, c - removed));
        return prev.filter(i => i.product.id !== id);
      });
    } else {
      setCartItems(prev => {
        const item = prev.find(i => i.product.id === id);
        if (!item) {
          return prev;
        }
        const diff = quantity - item.quantity;
        setCartCount(c => Math.max(0, c + diff));
        return prev.map(i => (i.product.id === id ? {...i, quantity} : i));
      });
    }
  }, []);

  const handleCustomerSearch = useCallback(
    (text: string) => {
      setCustomerSearch(text);
      setSelectedCustomer(null);

      if (customerSearchTimeout.current) {
        clearTimeout(customerSearchTimeout.current);
      }

      if (!text.trim()) {
        setCustomerResults([]);
        return;
      }

      customerSearchTimeout.current = setTimeout(async () => {
        setCustomerLoading(true);
        try {
          const results = await CustomerService.searchCustomers(
            activeStoreId,
            text,
          );

          //  map về format UI cũ
          setCustomerResults(
            results.map(r => ({
              id: r.id as string,
              name: r.full_name,
              phone: r.phone || '',
              customer_code: '',
              customer_group: '',
              email: '',
            })),
          );
        } catch {
          setCustomerResults([]);
        } finally {
          setCustomerLoading(false);
        }
      }, 350);
    },
    [activeStoreId],
  );

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setCustomerResults([]);
  }, []);

  const handleSelectVariant = useCallback(
    (productId: string, variant: ProductVariant) => {
      setCartItems(prev =>
        prev.map(i =>
          i.product.id === productId
            ? {
                ...i,
                selectedVariant: variant,
                product: {
                  ...i.product,
                  price: variant.price || i.product.price,
                },
              }
            : i,
        ),
      );
    },
    [],
  );

  const subtotal = cartItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );

  // Dynamic Styles
  const bgColor = isDark ? '#111827' : '#f5f7fa';
  const headerBg = isDark ? '#1f2937' : '#f5f7fa';
  const cardBg = isDark ? '#2d3748' : '#fff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#374151';
  const borderColor = isDark ? '#374151' : '#c2c2c2';
  const inputBg = isDark ? '#374151' : '#fff';

  return (
    // Giữ HEAD: SafeAreaView + StatusBar
    <SafeAreaView style={{flex: 1, backgroundColor: bgColor}}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header + Tabs ── */}
      <View
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          zIndex: 10,
        }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
          }}>
          <TouchableOpacity onPress={onOpenMenu} style={{padding: 4}}>
            <View style={{gap: 4}}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={{
                    width: i === 2 ? 14 : 20,
                    height: 2,
                    backgroundColor: isDark ? '#f9fafb' : '#374151',
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
          </TouchableOpacity>

          {/* Lấy theo intern1/Qanhdev: title flex khi isRoomMode, search ẩn khi isRoomMode */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: textColor,
              flex: isRoomMode ? 1 : 0,
            }}>
            {t('pos.title')}
          </Text>

          {!isRoomMode && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 7,
                elevation: isDark ? 0 : 2,
                borderWidth: isDark ? 1 : 0,
                borderColor: '#4b5563',
              }}>
              <TextInput
                placeholder={t('pos.search_placeholder')}
                placeholderTextColor="#9ca3af"
                value={searchText}
                onChangeText={setSearchText}
                style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
              />
              <Icon name="search" size={20} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Section Tabs (Adaptive) */}
        {availableSections.length > 0 &&
          (() => {
            const count = availableSections.length;

            // Helper to render a tab item
            const renderTab = (section: any) => {
              const isActive = activeSection === section.key;
              return (
                <TouchableOpacity
                  key={section.key}
                  onPress={() => {
                    setActiveSection(section.key as any);
                    const firstInSec = categories.find(
                      c =>
                        (!c.parent_id || c.parent_id === c.id) &&
                        c.apply_to === section.key,
                    );
                    if (firstInSec) {
                      setActiveMainCategory(firstInSec.id);
                    }
                    setActiveSubCategory('all');
                  }}
                  style={{
                    flex: count === 2 ? 1 : undefined,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: count === 2 ? 0 : 20,
                    borderRadius: 12,
                    backgroundColor: isActive
                      ? isDark
                        ? '#3b82f6'
                        : '#fff'
                      : 'transparent',
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 2},
                    shadowOpacity: isActive ? 0.1 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 4 : 0,
                    gap: 8,
                  }}>
                  <Icon
                    name={section.icon}
                    size={18}
                    color={
                      isActive
                        ? isDark
                          ? '#fff'
                          : '#3b82f6'
                        : isDark
                        ? '#9ca3af'
                        : '#6b7280'
                    }
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isActive
                        ? isDark
                          ? '#fff'
                          : '#1e3a8a'
                        : isDark
                        ? '#9ca3af'
                        : '#6b7280',
                    }}>
                    {section.label}
                  </Text>
                </TouchableOpacity>
              );
            };

            if (count >= 3) {
              return (
                <View style={{paddingBottom: 16}}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingHorizontal: 16, gap: 10}}>
                    <View
                      style={{
                        flexDirection: 'row',
                        backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                        borderRadius: 16,
                        padding: 4,
                      }}>
                      {availableSections.map(renderTab)}
                    </View>
                  </ScrollView>
                </View>
              );
            }

            return (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                  alignItems: count === 1 ? 'center' : 'stretch',
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                    borderRadius: 16,
                    padding: 4,
                    width: count === 2 ? '100%' : undefined,
                  }}>
                  {availableSections.map(renderTab)}
                </View>
              </View>
            );
          })()}

        {/* Categories Menu - Only show for POS as Stay categories contain services */}
        {!isRoomMode && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 10,
              gap: 12,
            }}>
            <TouchableOpacity
              onPress={() => {
                setActiveMainCategory('__all__');
                setActiveSubCategory('all');
              }}
              style={{
                flexDirection: 'row',
                height: 40,
                borderRadius: 12,
                paddingHorizontal: 16,
                backgroundColor:
                  activeMainCategory === '__all__' ? '#3b82f6' : cardBg,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                elevation: activeMainCategory === '__all__' ? 4 : 1,
                borderWidth: activeMainCategory === '__all__' ? 0 : 1,
                borderColor: borderColor,
              }}>
              <Icon
                name="category"
                size={18}
                color={activeMainCategory === '__all__' ? '#fff' : '#3b82f6'}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color:
                    activeMainCategory === '__all__' ? '#fff' : subTextColor,
                }}>
                {t('pos.all')}
              </Text>
            </TouchableOpacity>

            {mainCategories.map(cat => {
              const isActive = activeMainCategory === cat.id;

              let iconName = 'category';
              const code = (cat.category_code || '').toLowerCase();
              const applyTo = (cat.apply_to || '').toLowerCase();

              if (
                code.includes('food') ||
                code.includes('drink') ||
                code.includes('cafe')
              ) {
                iconName = 'restaurant';
              } else if (
                code.includes('room') ||
                code.includes('hotel') ||
                applyTo === 'accommodation' ||
                applyTo === 'hotel' ||
                applyTo === 'hostel'
              ) {
                iconName = 'hotel';
              } else if (code.includes('grocery')) {
                iconName = 'storefront';
              } else if (applyTo === 'pos') {
                iconName = 'shopping-basket';
              }

              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    setActiveMainCategory(cat.id);
                    setActiveSubCategory('all');
                  }}
                  style={{
                    flexDirection: 'row',
                    height: 40,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    backgroundColor: isActive ? '#3b82f6' : cardBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    elevation: isActive ? 4 : 1,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: borderColor,
                  }}>
                  <Icon
                    name={iconName}
                    size={18}
                    color={isActive ? '#fff' : '#3b82f6'}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: isActive ? '#fff' : subTextColor,
                    }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Sub-categories (Chỉ hiện cho POS) */}
        {!isRoomMode && subCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 10,
              gap: 10,
            }}>
            {subCategories.map(cat => {
              const active = activeSubCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveSubCategory(cat.id)}
                  style={{
                    paddingHorizontal: 18,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: active ? '#3b82f6' : cardBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 1,
                    borderWidth: active ? 0 : 1,
                    borderColor: borderColor,
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: active ? '#fff' : subTextColor,
                    }}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Nút mở Modal Bộ lọc - Lấy theo intern1/Qanhdev: search bar + filter button cho room mode */}
        {isRoomMode && (
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 10,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
            }}>
            {/* Thanh tìm kiếm dời xuống đây */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: inputBg,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: borderColor,
              }}>
              <Icon
                name="search"
                size={18}
                color="#9ca3af"
                style={{marginRight: 6}}
              />
              <TextInput
                placeholder={t('pos.search_placeholder')}
                placeholderTextColor="#9ca3af"
                value={searchText}
                onChangeText={setSearchText}
                style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
              />
            </View>

            {/* Nút Bộ lọc */}
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: cardBg,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: borderColor,
                gap: 6,
              }}>
              <Icon name="filter-list" size={18} color={subTextColor} />
              <Text
                style={{fontSize: 13, fontWeight: '600', color: subTextColor}}>
                {t('pos.filter')} {activeRoomType !== 'all' ? '(on)' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Grid Content - Refactored to SectionList/FlatList for performance */}
      {!isRoomMode ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          numColumns={numCols}
          key={`products-grid-${numCols}`} // Force re-render when column count changes
          renderItem={({item}) => {
            const cartItem = cartItems.find(i => i.product.id === item.id);
            return (
              <View style={{margin: GAP / 2}}>
                <ProductCard
                  product={item}
                  onAdd={handleAdd}
                  onDecrease={handleDecrease}
                  onSetQuantity={handleSetQuantity}
                  cardWidth={cardWidth}
                  quantity={cartItem ? cartItem.quantity : 0}
                />
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16 - GAP / 2,
            paddingTop: GAP,
            paddingBottom: insets.bottom + 100,
          }}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                marginTop: 60,
                width: '100%',
              }}>
              <Text style={{color: '#9ca3af', fontSize: 14}}>
                {t('pos.no_products')}
              </Text>
              <TouchableOpacity onPress={loadData} style={styles.reloadBtn}>
                <Text style={styles.reloadBtnText}>{t('pos.reload')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={filteredRooms}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({section: {title}}) => (
            <View
              style={{paddingHorizontal: 16, paddingVertical: 8, marginTop: 4}}>
              <Text style={{fontSize: 16, fontWeight: '700', color: textColor}}>
                {title}
              </Text>
            </View>
          )}
          renderItem={({item, index, section}) => {
            // Because SectionList doesn't support numColumns, we handle the grid manually
            // by only rendering the start of each row.
            if (index % numCols !== 0) {
              return null;
            }

            const rowItems = section.data.slice(index, index + numCols);

            return (
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: 16,
                  gap: GAP,
                  marginBottom: 0,
                }}>
                {rowItems.map(room => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    cardWidth={cardWidth}
                    onPress={() => handleRoomPress(room)}
                    onTimelinePress={() => {
                      console.log(
                        '[PosResident] onTimelinePress - room:',
                        room,
                      );
                      setSelectedRoomForDetail(room);
                      setRoomDetailVisible(true);
                    }}
                  />
                ))}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                marginTop: 60,
                width: '100%',
              }}>
              <Text style={{color: '#9ca3af', fontSize: 14}}>
                {t('pos.no_rooms')}
              </Text>
              <TouchableOpacity onPress={loadData} style={styles.reloadBtn}>
                <Text style={styles.reloadBtnText}>{t('pos.reload')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FAB */}
      {!isRoomMode && (
        <TouchableOpacity
          onPress={() => setPanelVisible(true)}
          style={{
            position: 'absolute',
            bottom: 28,
            right: 20,
            width: 58,
            height: 58,
            backgroundColor: '#3b82f6',
            borderRadius: 29,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#3b82f6',
            elevation: 6,
          }}>
          <Text style={{fontSize: 24}}>🛒</Text>
          {/* Hiển thị badge số lượng nếu có sản phẩm trong giỏ */}
          {cartCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 18,
                height: 18,
                backgroundColor: '#ef4444',
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                borderWidth: 1.5,
                borderColor: '#fff',
              }}>
              <Text style={{color: '#fff', fontSize: 10, fontWeight: '800'}}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Cart Panel */}
      <ResponsivePanel
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}>
        <View style={{flex: 1}}>
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderColor: borderColor,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: cardBg,
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <TouchableOpacity
                onPress={() => setPanelVisible(false)} // Đóng panel khi nhấn nút back
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name="arrow-back" size={20} color={textColor} />
              </TouchableOpacity>

              <Text style={{fontSize: 20, fontWeight: '600', color: textColor}}>
                {t('pos.cart')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClearCart}>
              <Text style={{fontSize: 14, color: '#ef4444', fontWeight: '600'}}>
                {t('payment.clear')}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              margin: 12,
              backgroundColor: isDark ? '#374151' : '#f3f4f6',
              borderRadius: 24,
              padding: 4,
            }}>
            {[t('pos.guest'), t('pos.member')].map(tab => {
              const active = activeCustomerTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => {
                    setActiveCustomerTab(tab);
                    setCustomerSearch('');
                    setCustomerResults([]);
                    setSelectedCustomer(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active
                      ? isDark
                        ? '#4b5563'
                        : '#fff'
                      : 'transparent',
                    alignItems: 'center',
                    elevation: active ? 2 : 0,
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: active ? textColor : subTextColor,
                    }}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Tìm kiếm khách hàng ── */}
          {activeCustomerTab === t('pos.member') && (
            <View style={{marginHorizontal: 12, marginBottom: 6}}>
              {/* Selected customer badge */}
              {selectedCustomer ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#1e3a5f' : '#eff6ff',
                    borderWidth: 1,
                    borderColor: isDark ? '#3b82f6' : '#bfdbfe',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 8,
                  }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: '#3b82f6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text
                      style={{color: '#fff', fontWeight: '700', fontSize: 14}}>
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: textColor,
                      }}>
                      {selectedCustomer.name}
                    </Text>
                    <Text style={{fontSize: 12, color: subTextColor}}>
                      {selectedCustomer.phone}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    hitSlop={{
                      top: 8,
                      bottom: 8,
                      left: 8,
                      right: 8,
                    }}>
                    <Icon name="close" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: inputBg,
                      borderWidth: 1,
                      borderColor: borderColor,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      height: 42,
                    }}>
                    <Icon
                      name="person-search"
                      size={18}
                      color="#9ca3af"
                      style={{marginRight: 6}}
                    />
                    <TextInput
                      placeholder={t('pos.search_customer_placeholder')}
                      placeholderTextColor="#9ca3af"
                      value={customerSearch}
                      onChangeText={handleCustomerSearch}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: textColor,
                        padding: 0,
                      }}
                      returnKeyType="search"
                    />
                    {customerLoading ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : customerSearch.length > 0 ? (
                      <TouchableOpacity
                        onPress={() => {
                          setCustomerSearch('');
                          setCustomerResults([]);
                        }}>
                        <Icon name="close" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Dropdown kết quả */}
                  {customerResults.length > 0 && (
                    <View
                      style={{
                        backgroundColor: isDark ? '#1f2937' : '#fff',
                        borderWidth: 1,
                        borderColor: borderColor,
                        borderRadius: 10,
                        marginTop: 4,
                        maxHeight: 180,
                        overflow: 'hidden',
                        elevation: 6,
                        zIndex: 999,
                      }}>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}>
                        {customerResults.map((c, idx) => (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => handleSelectCustomer(c)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              borderBottomWidth:
                                idx < customerResults.length - 1 ? 1 : 0,
                              borderBottomColor: borderColor,
                              gap: 10,
                            }}>
                            <View
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                backgroundColor: '#3b82f6',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                              <Text
                                style={{
                                  color: '#fff',
                                  fontWeight: '700',
                                  fontSize: 13,
                                }}>
                                {c.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{flex: 1}}>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: '600',
                                  color: textColor,
                                }}>
                                {c.name}
                              </Text>
                              <Text style={{fontSize: 12, color: subTextColor}}>
                                {c.phone}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {customerSearch.length > 1 &&
                    customerResults.length === 0 &&
                    !customerLoading && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: subTextColor,
                          marginTop: 4,
                          paddingLeft: 4,
                        }}>
                        {t('pos.no_customer_found')}
                      </Text>
                    )}
                </View>
              )}
            </View>
          )}

          {/* ── Danh sách giỏ hàng ── */}
          <ScrollView
            style={{flex: 1, backgroundColor: cardBg}}
            contentContainerStyle={{paddingHorizontal: 16, paddingTop: 4}}>
            {cartItems.length === 0 ? (
              <View style={{alignItems: 'center', marginTop: 48}}>
                <Text style={{color: '#9ca3af', fontSize: 14}}>
                  {t('payment.cart_empty')}
                </Text>
              </View>
            ) : (
              cartItems.map(item => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onIncrease={handleIncrease}
                  onDecrease={handleDecrease}
                  onSetQuantity={handleSetQuantity}
                  onSelectVariant={handleSelectVariant} // <-- NEW
                />
              ))
            )}
          </ScrollView>

          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderColor: borderColor,
              marginBottom: 8,
              backgroundColor: cardBg,
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
              <Text style={{fontSize: 14, color: subTextColor}}>
                {t('pos.subtotal')}
              </Text>
              <Text style={{fontSize: 14, color: textColor}}>
                {formatPrice(subtotal, t)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
              <Text style={{fontSize: 14, color: subTextColor}}>
                {t('pos.tax')} (0%)
              </Text>
              <Text style={{fontSize: 14, color: textColor}}>0{t('pos.currency_symbol') || 'đ'}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#3b82f6'}}>
                {t('pos.total')}
              </Text>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#3b82f6'}}>
                {formatPrice(subtotal, t)}
              </Text>
            </View>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                onPress={() => setPaymentVisible(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#fff'}}>
                  {t('payment.title')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ResponsivePanel>

      {/* Payment Modal */}
      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        onSuccess={() => {
          handleClearCart(); // reset giỏ hàng
          setSelectedCustomer(null); // xoá khách hàng đã chọn
          setCustomerSearch(''); // xoá ô tìm kiếm
          setCustomerResults([]); // xoá kết quả tìm kiếm
          setActiveCustomerTab(t('pos.guest')); // về tab Khách vãng lai
          setPanelVisible(false); // đóng panel, về màn hình bán hàng
        }}
        cartItems={cartItems}
        selectedCustomer={selectedCustomer}
      />

      {/* Room Filter Modal - Lấy theo intern1/Qanhdev: TouchableOpacity overlay + roomStatus bên trong modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={{
              backgroundColor: bgColor,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              maxHeight: '85%',
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: textColor}}>
                {t('pos.filter_rooms')}
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            {/* Loại phòng Section */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: textColor,
                marginBottom: 8,
              }}>
              {t('pos.roomType')}
            </Text>
            <View
              style={{
                maxHeight: 180,
                marginBottom: 16,
                borderWidth: 1,
                borderColor,
                borderRadius: 8,
                backgroundColor: cardBg,
              }}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal: 12}}>
                {['all', ...roomTypes].map(type => {
                  const active = activeRoomType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setActiveRoomType(type)}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth:
                          type === roomTypes[roomTypes.length - 1] ? 0 : 1,
                        borderBottomColor: borderColor,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <Text
                        style={{
                          fontSize: 14,
                          color: active ? '#3b82f6' : textColor,
                          fontWeight: active ? '600' : '400',
                        }}>
                        {type === 'all' ? t('pos.allRoomTypes') : type}
                      </Text>
                      {active && (
                        <Icon name="check" size={18} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Trạng thái phòng Section - Lấy theo intern1/Qanhdev */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: textColor,
                marginBottom: 8,
              }}>
              {t('pos.roomStatus')}
            </Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 20}}>
              {roomStatuses.map(status => {
                const active = activeRoomStatus === status.key;
                return (
                  <TouchableOpacity
                    key={status.key}
                    onPress={() => setActiveRoomStatus(status.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: active ? '#3b82f6' : cardBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: active ? '#3b82f6' : borderColor,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: active ? '#fff' : subTextColor,
                      }}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                onPress={() => {
                  setActiveRoomType('all');
                  setActiveRoomStatus('all');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor,
                  alignItems: 'center',
                }}>
                <Text
                  style={{fontSize: 14, fontWeight: '600', color: textColor}}>
                  {t('pos.clearFilter')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#fff'}}>
                  {t('pos.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Booking Modal */}
      <Modal visible={!!bookingRoom} animationType="slide">
        {bookingRoom && (
          <BookingScreen
            room={bookingRoom}
            onClose={() => {
              setBookingRoom(null);
            }}
            onConfirm={() => {
              setBookingRoom(null);
              loadData();
            }}
          />
        )}
      </Modal>

      {/* Room Detail Modal for Occupied Rooms */}
      <Modal visible={detailModalVisible} animationType="slide">
        {selectedRoom && (
          <RoomDetailScreen
            room={selectedRoom}
            onBack={() => {
              setDetailModalVisible(false);
              loadData();
            }}
          />
        )}
      </Modal>

      {/* Room Detail Bottom Sheet */}
      <RoomDetailBottomSheet
        visible={roomDetailVisible}
        room={selectedRoomForDetail}
        onClose={() => setRoomDetailVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reloadBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  reloadBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
