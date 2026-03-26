import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  Animated,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ResponsivePanel from '../../components/pos/ResponsivePanel';
import useHideOnScroll from '../../hooks/useHidenOnScroll';
import ProductCard from '../../components/pos/ProductCard';
import RoomCard from '../../components/pos/RoomCard';
import CartItemRow from '../../components/pos/CartItemRow';
import {Product, Room, RoomStatus, CartItem} from './types';
import {useTheme} from '../../hooks/useTheme';

// ─── Constants ──────────────────────────────────────────────────────────────
const GAP = 12;
const HEADER_TABS_HEIGHT = 160; // Increased to accommodate safe area and avoid overlap

// ─── Mock Data ────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cà phê sữa',
    price: 25000,
    image: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?w=400',
    category: 'Đồ uống',
    available: true,
  },
  {
    id: '2',
    name: 'Trà đào',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    category: 'Đồ uống',
    available: true,
  },
  {
    id: '3',
    name: 'Bánh mì',
    price: 15000,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    category: 'Thực phẩm',
    available: true,
  },
  {
    id: '4',
    name: 'Nước suối',
    price: 10000,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    category: 'Giải khát',
    available: true,
  },
  {
    id: '5',
    name: 'Sinh tố xoài',
    price: 40000,
    image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400',
    category: 'Đồ uống',
    available: true,
  },
  {
    id: '6',
    name: 'Bánh croissant',
    price: 28000,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400',
    category: 'Thực phẩm',
    available: true,
  },
  {
    id: '7',
    name: 'Pepsi',
    price: 10000,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    category: 'Giải khát',
    available: true,
  },
  {
    id: '8',
    name: 'Coca Cola',
    price: 10000,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    category: 'Giải khát',
    available: true,
  },
  {
    id: '9',
    name: 'bánh nho ngọt',
    price: 10000,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    category: 'Thực phẩm',
    available: true,
  },
];

const ROOMS: Room[] = [
  {
    id: 'P.101',
    status: 'occupied',
    label: 'Đang ở',
    price: 500000,
    tag: 'Hết hạn: 30/11',
    tagColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  {
    id: 'P.102',
    status: 'available',
    label: 'Sẵn sàng',
    price: 450000,
    tag: 'Checkout: 12:00 15/10',
    tagColor: '#4E9FFF',
    borderColor: '#4CAF50',
  },
  {
    id: 'P.103',
    status: 'cleaning',
    label: 'Đang dọn',
    price: 450000,
    tag: 'Hết hạn: 25/11',
    tagColor: '#FF6B6B',
    borderColor: '#FFA726',
  },
  {
    id: 'P.104',
    status: 'available',
    label: 'Sẵn sàng',
    price: 600000,
    tag: 'Checkout: 14:00 16/10',
    tagColor: '#4E9FFF',
    borderColor: '#4CAF50',
  },
  {
    id: 'P.105',
    status: 'occupied',
    label: 'Đang ở',
    price: 500000,
    tag: 'Hết hạn: 05/12',
    tagColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  {
    id: 'P.106',
    status: 'available',
    label: 'Sẵn sàng',
    price: 480000,
    borderColor: '#4CAF50',
  },
  {
    id: 'P.107',
    status: 'maintenance',
    label: 'Bảo trì',
    price: 520000,
    borderColor: '#9E9E9E',
  },
  {
    id: 'P.108',
    status: 'available',
    label: 'Sẵn sàng',
    price: 450000,
    tag: 'Checkout: 10:00 18/10',
    tagColor: '#4E9FFF',
    borderColor: '#4CAF50',
  },
];

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PosResident({
  onOpenMenu,
  initialMode = 'food',
}: {
  onOpenMenu: () => void;
  initialMode?: 'food' | 'accommodation';
}) {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {width: screenWidth} = useWindowDimensions();

  const [mode, setMode] = useState<'food' | 'accommodation'>(initialMode);
  const [activeFoodCategory, setActiveFoodCategory] = useState<string>(
    t('pos.category_all'),
  );
  const [activeRoomStatus, setActiveRoomStatus] = useState<RoomStatus | 'all'>(
    'all',
  );
  const [searchText, setSearchText] = useState('');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState(t('pos.guest'));

  const {translateY, onScroll} = useHideOnScroll(HEADER_TABS_HEIGHT);

  const foodCategories = useMemo(
    () => [
      t('pos.category_all'),
      t('pos.category_food'),
      t('pos.category_drink'),
      t('pos.category_refreshment'),
      t('pos.category_merchandise'),
    ],
    [t],
  );

  const roomStatuses: {key: RoomStatus | 'all'; label: string}[] = useMemo(
    () => [
      {key: 'all', label: t('pos.status_all')},
      {key: 'available', label: t('pos.status_empty')},
      {key: 'occupied', label: t('pos.status_occupied')},
      {key: 'cleaning', label: t('pos.status_cleaning')},
      {key: 'maintenance', label: t('pos.status_maintenance')},
    ],
    [t],
  );

  // Responsive Grid
  const numCols = screenWidth > 700 ? 4 : screenWidth > 500 ? 3 : 2;
  const cardWidth = (screenWidth - 32 - GAP * (numCols - 1)) / numCols;

  const filteredProducts = PRODUCTS.filter(p => {
    const matchCat =
      activeFoodCategory === foodCategories[0] ||
      p.category === activeFoodCategory;
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredRooms = ROOMS.filter(r => {
    const matchStatus =
      activeRoomStatus === 'all' || r.status === activeRoomStatus;
    const matchSearch = r.id.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAdd = (id: string) => {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === id);
      if (existing) {
        return prev.map(i =>
          i.product.id === id ? {...i, quantity: i.quantity + 1} : i,
        );
      }
      return [...prev, {product, quantity: 1}];
    });
    setCartCount(c => c + 1);
  };

  const handleIncrease = (id: string) => {
    setCartItems(prev =>
      prev.map(i =>
        i.product.id === id ? {...i, quantity: i.quantity + 1} : i,
      ),
    );
    setCartCount(c => c + 1);
  };

  const handleDecrease = (id: string) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === id);
      if (!item) return prev;
      if (item.quantity === 1) return prev.filter(i => i.product.id !== id);
      return prev.map(i =>
        i.product.id === id ? {...i, quantity: i.quantity - 1} : i,
      );
    });
    setCartCount(c => Math.max(0, c - 1));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setCartCount(0);
  };

  const subtotal = cartItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );

  // Dynamic Styles
  const bgColor = isDark ? '#111827' : '#f5f7fa';
  const headerBg = isDark ? '#1f2937' : '#f5f7fa';
  const cardBg = isDark ? '#1f2937' : '#fff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#374151';
  const borderColor = isDark ? '#374151' : '#c2c2c2';
  const inputBg = isDark ? '#374151' : '#fff';

  return (
    <View style={{flex: 1, backgroundColor: bgColor}}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header + Tabs ── */}
      <Animated.View
        style={{
          transform: [{translateY}],
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          paddingTop: insets.top,
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

          <Text style={{fontSize: 20, fontWeight: '700', color: textColor}}>
            {t('pos.title')}
          </Text>

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
        </View>

        {/* Mode Switcher */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 12,
          }}>
          <TouchableOpacity
            onPress={() => setMode('food')}
            style={{
              flex: 1,
              flexDirection: 'row',
              height: 40,
              borderRadius: 12,
              backgroundColor: mode === 'food' ? '#3b82f6' : cardBg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              elevation: mode === 'food' ? 4 : 1,
              borderWidth: mode === 'food' ? 0 : 1,
              borderColor: borderColor,
            }}>
            <Icon
              name="restaurant"
              size={18}
              color={mode === 'food' ? '#fff' : '#3b82f6'}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: mode === 'food' ? '#fff' : subTextColor,
              }}>
              {t('pos.food_and_drink')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('accommodation')}
            style={{
              flex: 1,
              flexDirection: 'row',
              height: 40,
              borderRadius: 12,
              backgroundColor: mode === 'accommodation' ? '#3b82f6' : cardBg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              elevation: mode === 'accommodation' ? 4 : 1,
              borderWidth: mode === 'accommodation' ? 0 : 1,
              borderColor: borderColor,
            }}>
            <Icon
              name="hotel"
              size={18}
              color={mode === 'accommodation' ? '#fff' : '#3b82f6'}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: mode === 'accommodation' ? '#fff' : subTextColor,
              }}>
              {t('pos.accommodation')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 10,
          }}>
          {mode === 'food'
            ? foodCategories.map(cat => {
                const active = activeFoodCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveFoodCategory(cat)}
                    style={{
                      paddingHorizontal: 16,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: active ? '#3b82f6' : cardBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 1,
                      borderWidth: active ? 0 : 1,
                      borderColor: borderColor,
                    }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: active ? '#fff' : subTextColor,
                      }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : roomStatuses.map(status => {
                const active = activeRoomStatus === status.key;
                return (
                  <TouchableOpacity
                    key={status.key}
                    onPress={() => setActiveRoomStatus(status.key)}
                    style={{
                      paddingHorizontal: 16,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: active ? '#3b82f6' : cardBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 1,
                      borderWidth: active ? 0 : 1,
                      borderColor: borderColor,
                    }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: active ? '#fff' : subTextColor,
                      }}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      </Animated.View>

      {/* Grid Content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: HEADER_TABS_HEIGHT + insets.top,
          paddingBottom: 100,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: GAP,
        }}>
        {mode === 'food' ? (
          filteredProducts.length === 0 ? (
            <View style={{flex: 1, alignItems: 'center', marginTop: 60}}>
              <Text style={{color: '#9ca3af', fontSize: 14}}>
                {t('pos.no_products')}
              </Text>
            </View>
          ) : (
            filteredProducts.map(item => {
              const cartItem = cartItems.find(i => i.product.id === item.id);
              return (
                <ProductCard
                  key={item.id}
                  product={item}
                  onAdd={handleAdd}
                  onDecrease={handleDecrease}
                  cardWidth={cardWidth}
                  quantity={cartItem ? cartItem.quantity : 0}
                />
              );
            })
          )
        ) : filteredRooms.length === 0 ? (
          <View style={{flex: 1, alignItems: 'center', marginTop: 60}}>
            <Text style={{color: '#9ca3af', fontSize: 14}}>
              {t('pos.no_products')}
            </Text>
          </View>
        ) : (
          filteredRooms.map(item => (
            <RoomCard key={item.id} room={item} cardWidth={cardWidth} />
          ))
        )}
      </Animated.ScrollView>

      {/* FAB */}
      {mode === 'food' && (
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
                {cartCount}
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
            <Text style={{fontSize: 20, fontWeight: '600', color: textColor}}>
              {t('pos.cart')}
            </Text>
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
                  onPress={() => setActiveCustomerTab(tab)}
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

          {activeCustomerTab === t('pos.member') && (
            <View
              style={{
                marginHorizontal: 12,
                marginBottom: 4,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: inputBg,
                borderWidth: 1,
                borderColor: borderColor,
                borderRadius: 14,
                paddingHorizontal: 10,
              }}>
              <TextInput
                placeholder={t('payment.search_customers')}
                placeholderTextColor="#9ca3af"
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: textColor,
                }}
              />
            </View>
          )}

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
                {formatPrice(subtotal)}
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
              <Text style={{fontSize: 14, color: textColor}}>0đ</Text>
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
                {formatPrice(subtotal)}
              </Text>
            </View>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: borderColor,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  backgroundColor: cardBg,
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: subTextColor,
                  }}>
                  {t('payment.select_table')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
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
    </View>
  );
}
