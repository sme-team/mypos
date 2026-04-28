/**
 * src/screens/pos/PosResident.tsx
 *
 * Màn hình chính POS – bán hàng (sale) và quản lý phòng (accommodation).
 *
 * Cấu trúc:
 *   - usePosData          → load products / categories / rooms từ service
 *   - useCartManager      → quản lý giỏ hàng (thêm, bớt, xoá, chọn variant)
 *   - useCustomerSearch   → debounced search khách hàng
 *   - PosResident         → màn hình chính, ghép các phần lại
 *
 * Sections:
 *   'pos'  → FlatList sản phẩm + giỏ hàng (ResponsivePanel)
 *   'stay' → SectionList phòng theo tầng + modal đặt phòng / chi tiết
 */

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
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
import BookingScreen from '../booking/BookingScreen';
import PaymentModal from './PaymentModal';
import RoomDetailScreen from '../booking/RoomDetailScreen';

import {useTheme} from '../../hooks/useTheme';
import {useAuth} from '../../store/authStore';
import {PosQueryService} from '@/services/PosServices/PosQueryService';
import {RoomQueryService} from '@/services/ResidentServices/RoomQueryService';
import CustomerService from '@/services/ResidentServices/CustomerService';

import {
  Customer,
  ProductVariant,
  Product,
  Room,
  RoomStatus,
  CartItem,
  PosCategory,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const GAP = 12;
const CUSTOMER_SEARCH_DEBOUNCE_MS = 350;
const STORE_ID = 'store-001'; // TODO: lấy từ auth context khi BE hỗ trợ

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

// ─── Hook: load dữ liệu POS ───────────────────────────────────────────────────

function usePosData(defaultSection: 'pos' | 'stay') {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [rooms, setRooms] = useState<{title: string; data: Room[]}[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMainCategory, setActiveMainCategory] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [prods, cats, roomsData] = await Promise.all([
        PosQueryService.getProducts(),
        PosQueryService.getCategories(),
        RoomQueryService.getRoomsGroupedByFloor(STORE_ID),
      ]);

      setProducts(prods);
      setCategories(cats);

      // Tự chọn category đầu tiên phù hợp với section
      if (cats.length > 0 && !activeMainCategory) {
        const applyKey = defaultSection === 'pos' ? 'pos' : 'accommodation';
        const rootCats = cats.filter(c => !c.parent_id || c.parent_id === c.id);
        const firstMatch = rootCats.find(c => c.apply_to === applyKey) ?? rootCats[0];
        if (firstMatch) {
          setActiveMainCategory(firstMatch.id);
        }
      }

      // Map RoomGridItem → Room
      setRooms(
        roomsData.map(group => ({
          title: group.title,
          data: group.data.map((item: any): Room => ({
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
          })),
        })),
      );
    } catch (err) {
      console.error('[PosResident] loadData error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [activeMainCategory, defaultSection]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    categories,
    rooms,
    refreshing,
    activeMainCategory,
    setActiveMainCategory,
    loadData,
  };
}

// ─── Hook: quản lý giỏ hàng ──────────────────────────────────────────────────

function useCartManager(products: Product[]) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems],
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [cartItems],
  );

  const handleAdd = useCallback(
    async (id: string) => {
      const product = products.find(p => p.id === id);
      if (!product) return;

      setCartItems(prev => {
        const existing = prev.find(i => i.product.id === id);
        if (existing) {
          return prev.map(i =>
            i.product.id === id ? {...i, quantity: i.quantity + 1} : i,
          );
        }
        return [...prev, {product, quantity: 1, variants: [], selectedVariant: null}];
      });

      // Fetch variants chỉ lần đầu thêm vào giỏ
      try {
        const data = await PosQueryService.getProductVariants(id);
        const cheapest =
          data.length > 0
            ? data.reduce((min, v) => (v.price < min.price ? v : min))
            : null;

        setCartItems(prev =>
          prev.map(i => {
            if (i.product.id !== id) return i;
            if (i.selectedVariant) return {...i, variants: data};
            return {
              ...i,
              variants: data,
              selectedVariant: cheapest,
              product: cheapest ? {...i.product, price: cheapest.price} : i.product,
            };
          }),
        );
      } catch {
        // Không critical – giỏ hàng vẫn hoạt động
      }
    },
    [products],
  );

  const handleIncrease = useCallback((id: string) => {
    setCartItems(prev =>
      prev.map(i => (i.product.id === id ? {...i, quantity: i.quantity + 1} : i)),
    );
  }, []);

  const handleDecrease = useCallback((id: string) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === id);
      if (!item) return prev;
      if (item.quantity === 1) return prev.filter(i => i.product.id !== id);
      return prev.map(i =>
        i.product.id === id ? {...i, quantity: i.quantity - 1} : i,
      );
    });
  }, []);

  const handleSetQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.product.id !== id));
    } else {
      setCartItems(prev =>
        prev.map(i => (i.product.id === id ? {...i, quantity} : i)),
      );
    }
  }, []);

  const handleSelectVariant = useCallback(
    (productId: string, variant: ProductVariant) => {
      setCartItems(prev =>
        prev.map(i =>
          i.product.id === productId
            ? {
                ...i,
                selectedVariant: variant,
                product: {...i.product, price: variant.price || i.product.price},
              }
            : i,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setCartItems([]), []);

  return {
    cartItems,
    cartCount,
    subtotal,
    handleAdd,
    handleIncrease,
    handleDecrease,
    handleSetQuantity,
    handleSelectVariant,
    clearCart,
  };
}

// ─── Hook: tìm kiếm khách hàng (debounced) ───────────────────────────────────

function useCustomerSearch() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCustomerSearch = useCallback((text: string) => {
    setCustomerSearch(text);
    setSelectedCustomer(null);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!text.trim()) {
      setCustomerResults([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setCustomerLoading(true);
      try {
        const results = await CustomerService.searchCustomers(STORE_ID, text);
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
    }, CUSTOMER_SEARCH_DEBOUNCE_MS);
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setCustomerResults([]);
  }, []);

  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
  }, []);

  return {
    selectedCustomer,
    customerSearch,
    customerResults,
    customerLoading,
    handleCustomerSearch,
    handleSelectCustomer,
    clearCustomer,
  };
}

// ─── Sub-component: Header ────────────────────────────────────────────────────

interface HeaderProps {
  isRoomMode: boolean;
  searchText: string;
  onSearchChange: (text: string) => void;
  onOpenMenu: () => void;
  title: string;
  isDark: boolean;
  textColor: string;
  inputBg: string;
  borderColor: string;
}

// ─── Sub-component: PosHeader ─────────────────────────────────────────────────

const PosHeader = React.memo<HeaderProps>(
  ({onOpenMenu, title, isDark, textColor}) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
      }}>
      {/* Hamburger */}
      <TouchableOpacity onPress={onOpenMenu} style={{padding: 4}}>
        <View style={{gap: 4}}>
          {[20, 20, 14].map((w, i) => (
            <View
              key={i}
              style={{
                width: w,
                height: 2,
                backgroundColor: isDark ? '#f9fafb' : '#374151',
                borderRadius: 2,
              }}
            />
          ))}
        </View>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: textColor,
          flex: 1,
        }}>
        {title}
      </Text>
    </View>
  ),
);

// ─── Sub-component: Section Tabs ──────────────────────────────────────────────

interface SectionTabsProps {
  sections: {key: string; label: string; icon: string}[];
  activeSection: 'pos' | 'stay';
  onChangeSection: (key: 'pos' | 'stay') => void;
  isDark: boolean;
}

const SectionTabs = React.memo<SectionTabsProps>(
  ({sections, activeSection, onChangeSection, isDark}) => {
    if (sections.length === 0) return null;

    const renderTab = (section: {key: string; label: string; icon: string}) => {
      const isActive = activeSection === section.key;
      const count = sections.length;
      return (
        <TouchableOpacity
          key={section.key}
          onPress={() => onChangeSection(section.key as 'pos' | 'stay')}
          style={{
            flex: count === 2 ? 1 : undefined,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            paddingHorizontal: count === 2 ? 0 : 20,
            borderRadius: 12,
            backgroundColor: isActive
              ? isDark ? '#3b82f6' : '#fff'
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
                ? isDark ? '#fff' : '#3b82f6'
                : isDark ? '#9ca3af' : '#6b7280'
            }
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: isActive
                ? isDark ? '#fff' : '#1e3a8a'
                : isDark ? '#9ca3af' : '#6b7280',
            }}>
            {section.label}
          </Text>
        </TouchableOpacity>
      );
    };

    const tabRow = (
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
          borderRadius: 16,
          padding: 4,
          width: sections.length === 2 ? '100%' : undefined,
        }}>
        {sections.map(renderTab)}
      </View>
    );

    if (sections.length >= 3) {
      return (
        <View style={{paddingBottom: 16}}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal: 16, gap: 10}}>
            {tabRow}
          </ScrollView>
        </View>
      );
    }

    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          alignItems: sections.length === 1 ? 'center' : 'stretch',
        }}>
        {tabRow}
      </View>
    );
  },
);

// ─── Sub-component: Category Bar ─────────────────────────────────────────────

interface CategoryBarProps {
  mainCategories: PosCategory[];
  subCategories: PosCategory[];
  activeMainCategory: string;
  activeSubCategory: string;
  onSelectMain: (id: string) => void;
  onSelectSub: (id: string) => void;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  subTextColor: string;
  t: (key: string) => string;
}

const CategoryBar = React.memo<CategoryBarProps>(
  ({
    mainCategories,
    subCategories,
    activeMainCategory,
    activeSubCategory,
    onSelectMain,
    onSelectSub,
    isDark,
    cardBg,
    borderColor,
    subTextColor,
    t,
  }) => {
    const getCategoryIcon = (cat: PosCategory) => {
      const code = (cat.category_code || '').toLowerCase();
      const applyTo = (cat.apply_to || '').toLowerCase();
      if (code.includes('food') || code.includes('drink') || code.includes('cafe'))
        return 'restaurant';
      if (code.includes('room') || code.includes('hotel') || applyTo === 'accommodation')
        return 'hotel';
      if (code.includes('grocery'))
        return 'storefront';
      if (applyTo === 'pos')
        return 'shopping-basket';
      return 'category';
    };

    return (
      <>
        {/* Main categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 10, gap: 12}}>
          {/* "Tất cả" chip */}
          <CategoryChip
            label={t('pos.all')}
            icon="category"
            isActive={activeMainCategory === '__all__'}
            onPress={() => onSelectMain('__all__')}
            cardBg={cardBg}
            borderColor={borderColor}
            subTextColor={subTextColor}
          />
          {mainCategories.map(cat => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              icon={getCategoryIcon(cat)}
              isActive={activeMainCategory === cat.id}
              onPress={() => onSelectMain(cat.id)}
              cardBg={cardBg}
              borderColor={borderColor}
              subTextColor={subTextColor}
            />
          ))}
        </ScrollView>

        {/* Sub-categories */}
        {subCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 10, gap: 10}}>
            {subCategories.map(cat => {
              const active = activeSubCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => onSelectSub(cat.id)}
                  style={{
                    paddingHorizontal: 18,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: active ? '#3b82f6' : cardBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 1,
                    borderWidth: active ? 0 : 1,
                    borderColor,
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
      </>
    );
  },
);

// ─── Sub-component: Category Chip ─────────────────────────────────────────────

interface CategoryChipProps {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
  cardBg: string;
  borderColor: string;
  subTextColor: string;
}

const CategoryChip = React.memo<CategoryChipProps>(
  ({label, icon, isActive, onPress, cardBg, borderColor, subTextColor}) => (
    <TouchableOpacity
      onPress={onPress}
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
        borderColor,
      }}>
      <Icon name={icon} size={18} color={isActive ? '#fff' : '#3b82f6'} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: isActive ? '#fff' : subTextColor,
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  ),
);

// ─── Sub-component: Room Filter Bar ───────────────────────────────────────────

interface RoomFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  activeRoomType: string;
  onOpenFilter: () => void;
  isDark: boolean;
  textColor: string;
  inputBg: string;
  borderColor: string;
  cardBg: string;
  subTextColor: string;
  t: (key: string) => string;
}

const RoomFilterBar = React.memo<RoomFilterBarProps>(
  ({
    searchText,
    onSearchChange,
    activeRoomType,
    onOpenFilter,
    isDark,
    textColor,
    inputBg,
    borderColor,
    cardBg,
    subTextColor,
    t,
  }) => (
    <View
      style={{
        paddingHorizontal: 16,
        paddingBottom: 10,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
      }}>
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
          borderColor,
        }}>
        <Icon name="search" size={18} color="#9ca3af" style={{marginRight: 6}} />
        <TextInput
          placeholder={t('pos.search_placeholder')}
          placeholderTextColor="#9ca3af"
          value={searchText}
          onChangeText={onSearchChange}
          style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
        />
      </View>
      <TouchableOpacity
        onPress={onOpenFilter}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cardBg,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor,
          gap: 6,
        }}>
        <Icon name="filter-list" size={18} color={subTextColor} />
        <Text style={{fontSize: 13, fontWeight: '600', color: subTextColor}}>
          {t('pos.filter')}
          {activeRoomType !== 'all' ? ' (on)' : ''}
        </Text>
      </TouchableOpacity>
    </View>
  ),
);

// ─── Sub-component: Cart FAB ──────────────────────────────────────────────────

interface CartFabProps {
  cartCount: number;
  onPress: () => void;
}

const CartFab = React.memo<CartFabProps>(({cartCount, onPress}) => (
  <TouchableOpacity
    onPress={onPress}
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
));

// ─── Sub-component: Customer Search Panel ────────────────────────────────────

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  customerSearch: string;
  customerResults: Customer[];
  customerLoading: boolean;
  onSearch: (text: string) => void;
  onSelect: (c: Customer) => void;
  onClear: () => void;
  isDark: boolean;
  textColor: string;
  subTextColor: string;
  inputBg: string;
  borderColor: string;
}

const CustomerSearchSection = React.memo<CustomerSearchProps>(
  ({
    selectedCustomer,
    customerSearch,
    customerResults,
    customerLoading,
    onSearch,
    onSelect,
    onClear,
    isDark,
    textColor,
    subTextColor,
    inputBg,
    borderColor,
  }) => {
    if (selectedCustomer) {
      return (
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
            <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 14, fontWeight: '700', color: textColor}}>
              {selectedCustomer.name}
            </Text>
            <Text style={{fontSize: 12, color: subTextColor}}>
              {selectedCustomer.phone}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: inputBg,
            borderWidth: 1,
            borderColor,
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
            placeholder="Tìm khách theo tên hoặc SĐT..."
            placeholderTextColor="#9ca3af"
            value={customerSearch}
            onChangeText={onSearch}
            style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
            returnKeyType="search"
          />
          {customerLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : customerSearch.length > 0 ? (
            <TouchableOpacity onPress={onClear}>
              <Icon name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        {customerResults.length > 0 && (
          <View
            style={{
              backgroundColor: isDark ? '#1f2937' : '#fff',
              borderWidth: 1,
              borderColor,
              borderRadius: 10,
              marginTop: 4,
              maxHeight: 180,
              overflow: 'hidden',
              elevation: 6,
              zIndex: 999,
            }}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {customerResults.map((c, idx) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => onSelect(c)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderBottomWidth: idx < customerResults.length - 1 ? 1 : 0,
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
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 13}}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={{fontSize: 13, fontWeight: '600', color: textColor}}>
                      {c.name}
                    </Text>
                    <Text style={{fontSize: 12, color: subTextColor}}>{c.phone}</Text>
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
              Không tìm thấy khách hàng
            </Text>
          )}
      </View>
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PosResident({onOpenMenu}: {onOpenMenu: () => void}) {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const {state: authState} = useAuth();
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();

  // ── JWT business types ────────────────────────────────────────────────────
  const jwtBusinessTypes = useMemo(
    () => authState.user?.businessTypes ?? [],
    [authState.user?.businessTypes],
  );

  const defaultSection: 'pos' | 'stay' = useMemo(
    () =>
      jwtBusinessTypes.includes('accommodation') && !jwtBusinessTypes.includes('sale')
        ? 'stay'
        : 'pos',
    [jwtBusinessTypes],
  );

  // ── Section + filter state ────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'pos' | 'stay'>(defaultSection);
  const [activeSubCategory, setActiveSubCategory] = useState('all');
  const [activeRoomStatus, setActiveRoomStatus] = useState<RoomStatus | 'all'>('all');
  const [activeRoomType, setActiveRoomType] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState(t('pos.guest'));

  // ── Room modal state ──────────────────────────────────────────────────────
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [roomDetailVisible, setRoomDetailVisible] = useState(false);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<Room | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);

  // ── Custom hooks ──────────────────────────────────────────────────────────
  const {
    products,
    categories,
    rooms,
    refreshing,
    activeMainCategory,
    setActiveMainCategory,
    loadData,
  } = usePosData(defaultSection);

  const {
    cartItems,
    cartCount,
    subtotal,
    handleAdd,
    handleIncrease,
    handleDecrease,
    handleSetQuantity,
    handleSelectVariant,
    clearCart,
  } = useCartManager(products);

  const {
    selectedCustomer,
    customerSearch,
    customerResults,
    customerLoading,
    handleCustomerSearch,
    handleSelectCustomer,
    clearCustomer,
  } = useCustomerSearch();

  // ── Computed values ───────────────────────────────────────────────────────

  const isRoomMode = activeSection !== 'pos';

  // Title động theo businessTypes
  const screenTitle = useMemo(() => {
    const hasSale          = jwtBusinessTypes.includes('sale');
    const hasAccommodation = jwtBusinessTypes.includes('accommodation');
    if (hasSale && hasAccommodation) return t('pos.title'); // "Bán hàng"
    if (hasAccommodation)            return t('pos.accommodation'); // "Lưu trú"
    return t('pos.title'); // "Bán hàng"
  }, [jwtBusinessTypes, t]);

  const availableSections = useMemo(() => {
    const sections: {key: string; label: string; icon: string}[] = [];
    if (jwtBusinessTypes.includes('sale'))
      sections.push({key: 'pos', label: 'POS', icon: 'shopping-basket'});
    if (jwtBusinessTypes.includes('accommodation'))
      sections.push({key: 'stay', label: t('pos.accommodation'), icon: 'hotel'});
    return sections;
  }, [jwtBusinessTypes, t]);

  const mainCategories = useMemo(
    () =>
      categories.filter(
        c => (!c.parent_id || c.parent_id === c.id) && c.apply_to === activeSection,
      ),
    [categories, activeSection],
  );

  const subCategories = useMemo(
    () =>
      activeMainCategory
        ? categories.filter(
            c => c.parent_id === activeMainCategory && c.id !== c.parent_id,
          )
        : [],
    [categories, activeMainCategory],
  );

  const filteredProducts = useMemo(() => {
    const allowedIds =
      activeMainCategory === '__all__'
        ? null
        : activeSubCategory !== 'all'
        ? [activeSubCategory]
        : [activeMainCategory, ...subCategories.map(c => c.id)];

    return products.filter(p => {
      const matchCat = !allowedIds || allowedIds.includes(p.category_id);
      const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeMainCategory, activeSubCategory, subCategories, searchText]);

  const filteredRooms = useMemo(
    () =>
      rooms
        .map(group => ({
          ...group,
          data: group.data.filter(r => {
            const matchStatus = activeRoomStatus === 'all' || r.status === activeRoomStatus;
            const matchSearch = (r.label || '').toLowerCase().includes(searchText.toLowerCase());
            const matchType = activeRoomType === 'all' || r.product_name === activeRoomType;
            return matchStatus && matchSearch && matchType;
          }),
        }))
        .filter(group => group.data.length > 0),
    [rooms, activeRoomStatus, searchText, activeRoomType],
  );

  const roomTypes = useMemo(() => {
    const types = new Set<string>();
    rooms.forEach(g => g.data.forEach(r => r.product_name && types.add(r.product_name)));
    return Array.from(types).sort();
  }, [rooms]);

  const roomStatuses: {key: RoomStatus | 'all'; label: string}[] = useMemo(
    () => [
      {key: 'all', label: t('pos.status_all')},
      {key: 'available', label: t('pos.status_empty')},
      {key: 'booked', label: t('pos.status_booked', 'Đã đặt')},
      {key: 'occupied', label: t('pos.status_occupied')},
    ],
    [t],
  );

  // Responsive grid
  const numCols = screenWidth > 700 ? 4 : screenWidth > 500 ? 3 : 2;
  const cardWidth = (screenWidth - 32 - GAP * (numCols - 1)) / numCols;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleChangeSection = useCallback(
    (key: 'pos' | 'stay') => {
      setActiveSection(key);
      setActiveSubCategory('all');
      setSearchText('');
      const firstInSec = categories.find(
        c => (!c.parent_id || c.parent_id === c.id) && c.apply_to === key,
      );
      if (firstInSec) setActiveMainCategory(firstInSec.id);
    },
    [categories, setActiveMainCategory],
  );

  const handleSelectMainCategory = useCallback(
    (id: string) => {
      setActiveMainCategory(id);
      setActiveSubCategory('all');
    },
    [setActiveMainCategory],
  );

  const handleRoomPress = useCallback((room: Room) => {
    if (room.status === 'available' || room.status === 'booked') {
      setBookingRoom(room);
    } else if (room.status === 'occupied') {
      setSelectedRoom(room);
      setDetailModalVisible(true);
    }
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    clearCart();
    clearCustomer();
    setActiveCustomerTab(t('pos.guest'));
    setPanelVisible(false);
  }, [clearCart, clearCustomer, t]);

  const handleClearFilter = useCallback(() => {
    setActiveRoomType('all');
    setActiveRoomStatus('all');
  }, []);

  // ── Dynamic styles ────────────────────────────────────────────────────────
  const bgColor = isDark ? '#111827' : '#f5f7fa';
  const headerBg = isDark ? '#1f2937' : '#f5f7fa';
  const cardBg = isDark ? '#1f2937' : '#fff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#374151';
  const borderColor = isDark ? '#374151' : '#c2c2c2';
  const inputBg = isDark ? '#374151' : '#fff';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: bgColor}}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header + tabs ── */}
      <View
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          zIndex: 10,
        }}>
        <PosHeader
          isRoomMode={isRoomMode}
          searchText={searchText}
          onSearchChange={setSearchText}
          onOpenMenu={onOpenMenu}
          title={screenTitle}
          isDark={isDark}
          textColor={textColor}
          inputBg={inputBg}
          borderColor={borderColor}
        />

        <SectionTabs
          sections={availableSections}
          activeSection={activeSection}
          onChangeSection={handleChangeSection}
          isDark={isDark}
        />

        {/* Search bar POS – hiện bên dưới SectionTabs khi ở chế độ POS */}
        {!isRoomMode && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: inputBg,
              borderRadius: 12,
              marginHorizontal: 16,
              marginTop: 8,
              marginBottom: 4,
              paddingHorizontal: 10,
              paddingVertical: 7,
              elevation: isDark ? 0 : 2,
              borderWidth: isDark ? 1 : 0,
              borderColor,
            }}>
            <TextInput
              placeholder="Tìm sản phẩm..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
            />
            <Icon name="search" size={20} color="#9ca3af" />
          </View>
        )}

        {/* Category bar – chỉ cho POS mode */}
        {!isRoomMode && (
          <CategoryBar
            mainCategories={mainCategories}
            subCategories={subCategories}
            activeMainCategory={activeMainCategory}
            activeSubCategory={activeSubCategory}
            onSelectMain={handleSelectMainCategory}
            onSelectSub={setActiveSubCategory}
            isDark={isDark}
            cardBg={cardBg}
            borderColor={borderColor}
            subTextColor={subTextColor}
            t={t}
          />
        )}

        {/* Search + filter bar – chỉ cho Room mode */}
        {isRoomMode && (
          <RoomFilterBar
            searchText={searchText}
            onSearchChange={setSearchText}
            activeRoomType={activeRoomType}
            onOpenFilter={() => setFilterModalVisible(true)}
            isDark={isDark}
            textColor={textColor}
            inputBg={inputBg}
            borderColor={borderColor}
            cardBg={cardBg}
            subTextColor={subTextColor}
            t={t}
          />
        )}
      </View>

      {/* ── Product Grid ── */}
      {!isRoomMode ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          numColumns={numCols}
          key={`products-grid-${numCols}`}
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
                  quantity={cartItem?.quantity ?? 0}
                />
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16 - GAP / 2,
            paddingTop: GAP,
            paddingBottom: insets.bottom + 100,
          }}
          ListEmptyComponent={
            <View style={{alignItems: 'center', marginTop: 60}}>
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
        // ── Room Grid ──
        <SectionList
          sections={filteredRooms}
          keyExtractor={item => item.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({section: {title}}) => (
            <View style={{paddingHorizontal: 16, paddingVertical: 8, marginTop: 4}}>
              <Text style={{fontSize: 16, fontWeight: '700', color: textColor}}>
                {title}
              </Text>
            </View>
          )}
          renderItem={({item, index, section}) => {
            // Tự xây dựng grid vì SectionList không hỗ trợ numColumns
            if (index % numCols !== 0) return null;
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
                      setSelectedRoomForDetail(room);
                      setRoomDetailVisible(true);
                    }}
                  />
                ))}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} />
          }
          contentContainerStyle={{paddingBottom: insets.bottom + 100}}
          ListEmptyComponent={
            <View style={{alignItems: 'center', marginTop: 60}}>
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

      {/* ── Cart FAB ── */}
      {!isRoomMode && (
        <CartFab cartCount={cartCount} onPress={() => setPanelVisible(true)} />
      )}

      {/* ── Cart Panel ── */}
      <ResponsivePanel visible={panelVisible} onClose={() => setPanelVisible(false)}>
        <View style={{flex: 1}}>
          {/* Panel header */}
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderColor,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: cardBg,
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <TouchableOpacity
                onPress={() => setPanelVisible(false)}
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
            <TouchableOpacity onPress={clearCart}>
              <Text style={{fontSize: 14, color: '#ef4444', fontWeight: '600'}}>
                {t('payment.clear')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Customer tab switcher */}
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
                    clearCustomer();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active
                      ? isDark ? '#4b5563' : '#fff'
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

          {/* Customer search – chỉ ở tab Thành viên */}
          {activeCustomerTab === t('pos.member') && (
            <View style={{marginHorizontal: 12, marginBottom: 6}}>
              <CustomerSearchSection
                selectedCustomer={selectedCustomer}
                customerSearch={customerSearch}
                customerResults={customerResults}
                customerLoading={customerLoading}
                onSearch={handleCustomerSearch}
                onSelect={handleSelectCustomer}
                onClear={clearCustomer}
                isDark={isDark}
                textColor={textColor}
                subTextColor={subTextColor}
                inputBg={inputBg}
                borderColor={borderColor}
              />
            </View>
          )}

          {/* Cart items */}
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
                  onSelectVariant={handleSelectVariant}
                />
              ))
            )}
          </ScrollView>

          {/* Tổng tiền + thanh toán */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderColor,
              marginBottom: 8,
              backgroundColor: cardBg,
            }}>
            <View style={styles.summaryRow}>
              <Text style={{fontSize: 14, color: subTextColor}}>{t('pos.subtotal')}</Text>
              <Text style={{fontSize: 14, color: textColor}}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{fontSize: 14, color: subTextColor}}>{t('pos.tax')} (0%)</Text>
              <Text style={{fontSize: 14, color: textColor}}>0đ</Text>
            </View>
            <View style={[styles.summaryRow, {marginBottom: 16}]}>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#3b82f6'}}>
                {t('pos.total')}
              </Text>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#3b82f6'}}>
                {formatPrice(subtotal)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPaymentVisible(true)}
              style={{
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
      </ResponsivePanel>

      {/* ── Payment Modal ── */}
      <PaymentModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        onSuccess={handlePaymentSuccess}
        cartItems={cartItems}
        selectedCustomer={selectedCustomer}
      />

      {/* ── Room Filter Modal ── */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
          style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={{
              backgroundColor: cardBg,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              maxHeight: '85%',
            }}>
            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: textColor}}>
                {t('pos.filter') || 'Bộ lọc phòng'}
              </Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            {/* Loại phòng */}
            <Text style={{fontSize: 14, fontWeight: '600', color: textColor, marginBottom: 8}}>
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
                {['all', ...roomTypes].map((type, idx, arr) => {
                  const active = activeRoomType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setActiveRoomType(type)}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
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
                      {active && <Icon name="check" size={18} color="#3b82f6" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Trạng thái phòng */}
            <Text style={{fontSize: 14, fontWeight: '600', color: textColor, marginBottom: 8}}>
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

            {/* Actions */}
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                onPress={handleClearFilter}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor,
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 14, fontWeight: '600', color: textColor}}>
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

      {/* ── Booking Modal ── */}
      <Modal visible={!!bookingRoom} animationType="slide">
        {bookingRoom && (
          <BookingScreen
            room={bookingRoom}
            onClose={() => setBookingRoom(null)}
            onConfirm={() => {
              setBookingRoom(null);
              loadData();
            }}
          />
        )}
      </Modal>

      {/* ── Room Detail Modal (occupied) ── */}
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

      {/* ── Room Detail Bottom Sheet ── */}
      <RoomDetailBottomSheet
        visible={roomDetailVisible}
        room={selectedRoomForDetail}
        onClose={() => setRoomDetailVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});
