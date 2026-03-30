import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ResponsivePanel from '../../components/pos/ResponsivePanel';
import ProductCard from '../../components/pos/ProductCard';
import RoomCard from '../../components/pos/RoomCard';
import CartItemRow from '../../components/pos/CartItemRow';
import { Product, Room, RoomStatus, CartItem, PosCategory } from './types';
import { useTheme } from '../../hooks/useTheme';
import BookingScreen from '../booking/BookingScreen';
import { PosQueryService } from '@/services/PosServices/PosQueryService';
import { RoomQueryService } from '@/services/ResidentServices/RoomQueryService';
import { RoomActionService } from '@/services/ResidentServices/RoomActionService';
import RoomDetailScreen from '../booking/RoomDetailScreen';

// ─── Constants ──────────────────────────────────────────────────────────────
const GAP = 12;
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

// ─── Data fetch happen inside PosResident ───────────────────────────────────

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PosResident({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [activeMainCategory, setActiveMainCategory] = useState<string>('par001');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all'); // 'all' or specific sub category ID
  const [activeRoomStatus, setActiveRoomStatus] = useState<RoomStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [rooms, setRooms] = useState<{ title: string; data: Room[] }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Do redux chưa được cài đặt, tạm thời dùng mock storeId. 
  // Sau này có thể lấy từ Context hoặc Global State thực tế.
  const activeStoreId = 'store-001';

  const loadData = async () => {
    if (!activeStoreId) return;
    setRefreshing(true);

    try {
      console.log('[PosResident] Loading data for store:', activeStoreId);
      const [prods, cats, roomsData] = await Promise.all([
        PosQueryService.getProducts(),
        PosQueryService.getCategories(),
        RoomQueryService.getRoomsGroupedByFloor(activeStoreId)
      ]);

      console.log('[PosResident] Data Counts:', {
        products: prods.length,
        categories: cats.length,
        rooms: roomsData.length
      });

      setProducts(prods);
      setCategories(cats);
      setRooms(roomsData);

      if (cats.length > 0 && !activeMainCategory) {
        const mainCats = cats.filter(c => c.parent_id === null || c.id === 'par001' || c.id === 'par002');
        const posCat = mainCats.find(c => c.id === 'par001');
        const defaultCatId = posCat ? posCat.id : mainCats[0].id;
        setActiveMainCategory(defaultCatId);
      }
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

  const handleRoomPress = (room: Room) => {
    console.log('[PosResident] handleRoomPress:', { id: room.id, status: room.status, label: room.label });
    if (room.status === 'available') {
      setBookingRoom(room);
    } else if (room.status === 'occupied') {
      setSelectedRoom(room);
      setDetailModalVisible(true);
    }
  };

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState(t('pos.guest'));
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);

  // Detail Modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const mainCategories = useMemo(() => {
    // Lọc các danh mục chính (không có parent_id hoặc parent_id trỏ về chính nó)
    return categories.filter(c => !c.parent_id || c.parent_id === c.id || c.id === 'par001' || c.id === 'par002');
  }, [categories]);

  const subCategories = useMemo(() => {
    if (!activeMainCategory) { return []; }
    return categories.filter(c => c.parent_id === activeMainCategory);
  }, [categories, activeMainCategory]);

  const isRoomMode = activeMainCategory === 'par002';

  const roomStatuses: { key: RoomStatus | 'all'; label: string }[] = useMemo(
    () => [
      { key: 'all', label: t('pos.status_all') },
      { key: 'available', label: t('pos.status_empty') },
      { key: 'occupied', label: t('pos.status_occupied') },
      { key: 'cleaning', label: t('pos.status_cleaning') },
    ],
    [t],
  );

  // Responsive Grid
  const numCols = screenWidth > 700 ? 4 : screenWidth > 500 ? 3 : 2;
  const cardWidth = (screenWidth - 32 - GAP * (numCols - 1)) / numCols;

  const filteredProducts = products.filter(p => {
    let allowedCategoryIds: string[] = [];
    if (activeSubCategory !== 'all') {
      allowedCategoryIds = [activeSubCategory];
    } else {
      allowedCategoryIds = [activeMainCategory, ...subCategories.map(c => c.id)];
    }

    const matchCat = allowedCategoryIds.includes(p.category_id);
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredRooms = useMemo(() => {
    return rooms.map((group: { title: string; data: Room[] }) => ({
      ...group,
      data: group.data.filter((r: Room) => {
        const matchStatus = activeRoomStatus === 'all' || r.status === activeRoomStatus;
        const matchSearch = (r.label || '').toLowerCase().includes(searchText.toLowerCase());
        return matchStatus && matchSearch;
      })
    })).filter((group: { title: string; data: Room[] }) => group.data.length > 0);
  }, [rooms, activeRoomStatus, searchText]);

  const handleAdd = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) { return; }
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === id);
      if (existing) {
        return prev.map(i =>
          i.product.id === id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartCount(c => c + 1);
  };

  const handleIncrease = (id: string) => {
    setCartItems(prev =>
      prev.map(i =>
        i.product.id === id ? { ...i, quantity: i.quantity + 1 } : i,
      ),
    );
    setCartCount(c => c + 1);
  };

  const handleDecrease = (id: string) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === id);
      if (!item) { return prev; }
      if (item.quantity === 1) { return prev.filter(i => i.product.id !== id); }
      return prev.map(i =>
        i.product.id === id ? { ...i, quantity: i.quantity - 1 } : i,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
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
          <TouchableOpacity onPress={onOpenMenu} style={{ padding: 4 }}>
            <View style={{ gap: 4 }}>
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

          <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>
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
              style={{ flex: 1, fontSize: 13, color: textColor, padding: 0 }}
            />
            <Icon name="search" size={20} color="#9ca3af" />
          </View>
        </View>

        {/* Main Categories Menu */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 12,
          }}>
          {mainCategories.map(cat => {
            const isActive = activeMainCategory === cat.id;

            let iconName = 'category';
            const code = (cat.category_code || '').toLowerCase();
            if (code.includes('food') || code.includes('drink') || code.includes('cafe')) { iconName = 'restaurant'; }
            else if (code.includes('room') || code.includes('hotel')) { iconName = 'hotel'; }
            else if (code.includes('grocery')) { iconName = 'storefront'; }

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

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 10,
            gap: 10,
          }}>
          {!isRoomMode
            ? [{ id: 'all', name: t('pos.category_all') }, ...subCategories].map(cat => {
              const active = activeSubCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveSubCategory(cat.id)}
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
                    {cat.name}
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
      </View>

      {/* Grid Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: GAP,
          paddingBottom: insets.bottom + 100,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: GAP,
        }}>
        {!isRoomMode ? (
          filteredProducts.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', marginTop: 60, width: '100%' }}>
              <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                {t('pos.no_products')}
              </Text>
              <TouchableOpacity 
                onPress={loadData}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: '#3b82f6',
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tải lại</Text>
              </TouchableOpacity>
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
          <View style={{ flex: 1, alignItems: 'center', marginTop: 60, width: '100%' }}>
            <Text style={{ color: '#9ca3af', fontSize: 14 }}>
              {t('pos.no_rooms')}
            </Text>
            <TouchableOpacity 
              onPress={loadData}
              style={{
                marginTop: 16,
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: '#3b82f6',
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tải lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRooms.map((group: { title: string; data: Room[] }) => (
            <React.Fragment key={group.title}>
              <View style={{ width: '100%', paddingVertical: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: textColor }}>{group.title}</Text>
              </View>
              {group.data.map((item: Room) => (
                <RoomCard key={item.id} room={item} cardWidth={cardWidth} onPress={() => handleRoomPress(item)} />
              ))}
            </React.Fragment>
          ))
        )}
      </ScrollView>

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
          <Text style={{ fontSize: 24 }}>🛒</Text>
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
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
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
        <View style={{ flex: 1 }}>
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
            <Text style={{ fontSize: 20, fontWeight: '600', color: textColor }}>
              {t('pos.cart')}
            </Text>
            <TouchableOpacity onPress={handleClearCart}>
              <Text style={{ fontSize: 14, color: '#ef4444', fontWeight: '600' }}>
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
            style={{ flex: 1, backgroundColor: cardBg }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4 }}>
            {cartItems.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 48 }}>
                <Text style={{ color: '#9ca3af', fontSize: 14 }}>
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
              <Text style={{ fontSize: 14, color: subTextColor }}>
                {t('pos.subtotal')}
              </Text>
              <Text style={{ fontSize: 14, color: textColor }}>
                {formatPrice(subtotal)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
              <Text style={{ fontSize: 14, color: subTextColor }}>
                {t('pos.tax')} (0%)
              </Text>
              <Text style={{ fontSize: 14, color: textColor }}>0đ</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#3b82f6' }}>
                {t('pos.total')}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#3b82f6' }}>
                {formatPrice(subtotal)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  {t('payment.title')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ResponsivePanel>

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
    </SafeAreaView>
  );
}