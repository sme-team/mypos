import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useResponsive} from '../../hooks/useResponsive';

import {RoomQueryService} from '../../services/ResidentServices/RoomQueryService';
// We'll import RoomDetailScreen once we create it.
import RoomDetailScreen from './RoomDetailScreen';
import BookingScreen from './BookingScreen';
import RoomDetailBottomSheet from '../../components/booking/ui/RoomDetailBottomSheet';

const PlaceScreen: React.FC<{onOpenMenu?: () => void; onBack?: () => void}> = ({
  onOpenMenu,
  onBack,
}) => {
  const {t} = useTranslation();
  const responsive = useResponsive();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeFloor, setActiveFloor] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [activeRoomType, setActiveRoomType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [bookingRoom, setBookingRoom] = useState<any | null>(null);

  // Bottom sheet for timeline
  const [roomDetailVisible, setRoomDetailVisible] = useState(false);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<any | null>(null);

  const loadRooms = async () => {
    console.log('[PlaceScreen] loadRooms called');
    setLoading(true);
    try {
      const dbRooms = await RoomQueryService.getRoomsFlatList('store-001');
      console.log(`[PlaceScreen] Received ${dbRooms.length} rooms from service`);
      if (dbRooms.length > 0) {
        console.log('[PlaceScreen] Sample room price data:', {
          id: dbRooms[0].id,
          name: dbRooms[0].name,
          displayPriceText: dbRooms[0].displayPriceText
        });
      }
      setRooms(dbRooms);
    } catch (err) {
      console.error('[PlaceScreen] loadRooms error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadRooms();
  }, []);

  console.log('[PlaceScreen] Render state:', {
    roomsCount: rooms.length,
    activeFloor,
    loading
  });

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return '0đ';
    return price.toLocaleString('vi-VN') + 'đ';
  };

  // Responsive calculations
  const cardWidth = responsive.cardWidth(responsive.gridColumns, responsive.containerPadding * 2, 12);

  // Dynamic styles
  const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: '#F4F6FB',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: responsive.containerPadding,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: '#F4F6FB',
      minWidth: '100%',
    },
    iconBtn: {
      padding: 8,
    },
    headerTitle: {
      fontSize: responsive.rv({
        smallPhone: 18,
        phone: 20,
        largePhone: 22,
        tablet: 24,
        largeTablet: 26,
        default: 22,
      }),
      fontWeight: '800',
      color: '#1a1a2e',
    },
    headerSubtitle: {
      fontSize: responsive.rv({
        smallPhone: 11,
        phone: 12,
        largePhone: 13,
        tablet: 14,
        largeTablet: 15,
        default: 13,
      }),
      color: '#888',
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 12,
      color: '#888',
      marginLeft: 6,
    },
    tabsContainer: {
      paddingHorizontal: responsive.containerPadding,
      paddingVertical: 12,
    },
    tab: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: '#E0E0E0',
      backgroundColor: '#fff',
      marginRight: 8,
    },
    tabActive: {
      borderColor: '#1565C0',
      backgroundColor: '#1565C0',
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#555',
    },
    tabTextActive: {
      color: '#fff',
    },
    filtersWrapper: {
      paddingHorizontal: responsive.containerPadding,
      paddingBottom: 12,
      gap: 10,
    },
    filterScroll: {
      gap: 8,
    },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#E0E0E0',
    },
    filterChipActive: {
      backgroundColor: '#1565C0',
      borderColor: '#1565C0',
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#555',
    },
    filterChipTextActive: {
      color: '#fff',
    },
    priceFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    priceInput: {
      flex: 1,
      height: 36,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 13,
      color: '#333',
      flexShrink: 0,
    },
    priceDash: {
      color: '#555',
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: responsive.containerPadding,
      paddingBottom: 100,
    },
    emptyText: {
      textAlign: 'center',
      color: '#aaa',
      marginTop: 60,
    },
    roomGrid: {
      gap: 12,
    },
    roomCard: {
      width: responsive.isTablet || responsive.isLargeTablet ? cardWidth : '100%',
      borderWidth: 1.5,
      borderRadius: 14,
      padding: responsive.rv({
        smallPhone: 12,
        phone: 14,
        largePhone: 14,
        tablet: 16,
        largeTablet: 18,
        default: 14,
      }),
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 5,
      shadowOffset: {width: 0, height: 2},
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      minWidth: '100%',
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomName: {
      fontWeight: '700',
      fontSize: responsive.rv({
        smallPhone: 14,
        phone: 15,
        largePhone: 16,
        tablet: 17,
        largeTablet: 18,
        default: 16,
      }),
      color: '#1a1a2e',
    },
    roomType: {
      fontSize: responsive.rv({
        smallPhone: 10,
        phone: 11,
        largePhone: 12,
        tablet: 13,
        largeTablet: 14,
        default: 12,
      }),
      color: '#1565C0',
      fontWeight: '600',
      marginTop: 1,
    },
    checkoutText: {
      fontSize: responsive.rv({
        smallPhone: 9,
        phone: 10,
        largePhone: 11,
        tablet: 12,
        largeTablet: 13,
        default: 11,
      }),
      color: '#666',
      marginTop: 1,
    },
    badge: {
      paddingVertical: 3,
      paddingHorizontal: 10,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    tenantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    tenantAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#1565C0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    tenantAvatarText: {
      color: '#1565C0',
      fontSize: 10,
      fontWeight: '700',
    },
    timelineIconBtn: {
      padding: 4,
      backgroundColor: '#E3F2FD',
      borderRadius: 6,
    },
    tenantName: {
      fontSize: responsive.rv({
        smallPhone: 12,
        phone: 13,
        largePhone: 14,
        tablet: 15,
        largeTablet: 16,
        default: 14,
      }),
      color: '#333',
      flex: 1,
      flexShrink: 0,
    },
    priceEmpty: {
      fontSize: responsive.rv({
        smallPhone: 12,
        phone: 13,
        largePhone: 14,
        tablet: 15,
        largeTablet: 16,
        default: 14,
      }),
      fontWeight: '700',
      color: '#2E7D32',  // Màu xanh lá đậm để dễ nhìn
      marginTop: 6,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#1565C0',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#1565C0',
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 4},
      elevation: 6,
    },
  });

  const floors = Array.from(
    new Set(rooms.map(r => String(r.floor || '?'))),
  ).sort((a, b) => {
    if (a === '?') return 1;
    if (b === '?') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const roomTypes = Array.from(new Set(rooms.map(r => r.product_name).filter(Boolean))).sort();
  const roomStatuses = [
    { key: 'all', label: 'Tất cả' },
    { key: 'available', label: 'Phòng trống' },
    { key: 'booked', label: 'Phòng đã đặt' },
    { key: 'occupied', label: 'Đang ở' },
  ];

  const filteredRooms = rooms.filter(r => {
    const matchFloor = activeFloor === 'all' ? true : String(r.floor) === activeFloor;
    const matchStatus = activeStatus === 'all' ? true : r.status === activeStatus;
    const matchType = activeRoomType === 'all' ? true : (r.product_name || '') === activeRoomType;
    
    const price = r.displayPriceValue || 0;
    const minP = minPrice ? parseInt(minPrice.replace(/\D/g, '')) || 0 : 0;
    const maxP = maxPrice ? parseInt(maxPrice.replace(/\D/g, '')) || Infinity : Infinity;
    const matchPrice = price >= minP && price <= maxP;

    return matchFloor && matchStatus && matchType && matchPrice;
  });

  const emptyCount = rooms.filter(r => r.status === 'available').length;
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;

  if (selectedRoom) {
    return (
      <RoomDetailScreen
        room={selectedRoom}
        onBack={() => {
          setSelectedRoom(null);
          loadRooms();
        }}
      />
    );
  }

  if (bookingRoom) {
    return (
      <BookingScreen
        room={bookingRoom}
        onClose={() => {
          setBookingRoom(null);
          loadRooms();
        }}
        onConfirm={() => {
          setBookingRoom(null);
          loadRooms();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FB" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {onBack && (
            <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
              <Icon name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>
          )}
          {!onBack && onOpenMenu && (
            <TouchableOpacity style={styles.iconBtn} onPress={onOpenMenu}>
              <Icon name="menu" size={20} color="#333" />
            </TouchableOpacity>
          )}
          <View style={{marginLeft: 16}}>
            <Text style={styles.headerTitle}>Quản lý phòng</Text>
            <Text style={styles.headerSubtitle}>
              {occupiedCount}/{rooms.length} phòng đang thuê
            </Text>
          </View>
        </View>

        <View style={styles.legend}>
          <View style={[styles.dot, {backgroundColor: '#1565C0'}]} />
          <Text style={styles.legendText}>Đang thuê</Text>
          <View
            style={[styles.dot, {backgroundColor: '#A5D6A7', marginLeft: 8}]}
          />
          <Text style={styles.legendText}>Trống</Text>
        </View>
      </View>

      {/* Floor Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', ...floors].map(f => {
            const isActive = activeFloor === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFloor(f)}
                style={[styles.tab, isActive && styles.tabActive]}>
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {f === 'all' ? 'Tất cả tầng' : `Tầng ${f}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Advanced Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {roomStatuses.map(status => {
            const isActive = activeStatus === status.key;
            return (
              <TouchableOpacity
                key={status.key}
                onPress={() => setActiveStatus(status.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {roomTypes.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {['all', ...roomTypes].map(type => {
              const isActive = activeRoomType === type;
              return (
                <TouchableOpacity
                  key={type as string}
                  onPress={() => setActiveRoomType(type as string)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {type === 'all' ? 'Tất cả loại phòng' : type as string}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.priceFilterRow}>
          <TextInput
            style={styles.priceInput}
            placeholder="Giá từ"
            keyboardType="numeric"
            value={minPrice}
            onChangeText={setMinPrice}
            placeholderTextColor="#999"
          />
          <Text style={styles.priceDash}>-</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="Đến"
            keyboardType="numeric"
            value={maxPrice}
            onChangeText={setMaxPrice}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Room Grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        automaticallyAdjustContentInsets={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1565C0"
            style={{marginTop: 40}}
          />
        ) : filteredRooms.length === 0 ? (
          <Text style={styles.emptyText}>
            Không tìm thấy phòng{' '}
            {activeFloor !== 'all' ? `Tầng ${activeFloor}` : ''}
          </Text>
        ) : (
          <View style={styles.roomGrid}>
            {filteredRooms.map(room => {
              const occupied = room.contract_status === 'active';
              console.log(`[PlaceScreen] Rendering room ${room.name}: displayPriceText="${room.displayPriceText}"`);
              return (
                <TouchableOpacity
                  key={room.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    console.log('[PlaceScreen] Clicked room:', { id: room.id, name: room.name, status: room.status });
                    if (room.status === 'occupied') {
                      setSelectedRoom(room);
                    } else if (room.status === 'available' || room.status === 'booked') {
                      setBookingRoom(room);
                    } else {
                      console.log('[PlaceScreen] Room status is not occupied, available or booked, doing nothing.');
                    }
                  }}
                  style={[
                    styles.roomCard,
                    {
                      backgroundColor: occupied ? '#fff' : '#F9FBE7',
                      borderColor: occupied ? '#1565C0' : '#C5CAA0',
                    },
                  ]}>
                  <View style={styles.cardHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View
                        style={[
                          styles.iconBox,
                          {backgroundColor: occupied ? '#E3F2FD' : '#F1F8E9'},
                        ]}>
                        <Icon
                          name="meeting-room"
                          size={20}
                          color={occupied ? '#1565C0' : '#7CB342'}
                        />
                      </View>
                      <View style={{marginLeft: 8, flex: 1}}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                          <Text style={styles.roomName}>{room.label}</Text>
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedRoomForDetail(room);
                              setRoomDetailVisible(true);
                            }}
                            style={styles.timelineIconBtn}
                          >
                            <Icon name="event-note" size={18} color="#1565C0" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.roomType}>{room.product_name}</Text>
                        {occupied && (
                          <View style={{marginTop: 4}}>
                            {room.start_date && (
                              <Text style={styles.checkoutText}>
                                Vào: {new Date(room.start_date).toLocaleDateString('vi-VN')}
                              </Text>
                            )}
                            {room.end_date && (
                              <Text style={styles.checkoutText}>
                                Ra: {new Date(room.end_date).toLocaleDateString('vi-VN')}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {backgroundColor: occupied ? '#1565C0' : '#E8F5E9'},
                      ]}>
                      <Text
                        style={[
                          styles.badgeText,
                          {color: occupied ? '#fff' : '#2E7D32'},
                        ]}>
                        {room.status === 'occupied' ? 'ĐANG THUÊ' : room.status === 'booked' ? 'ĐÃ ĐẶT' : 'TRỐNG'}
                      </Text>
                    </View>
                  </View>

                  {occupied && (
                    <View style={styles.tenantRow}>
                      <View style={styles.tenantAvatar}>
                        <Text style={styles.tenantAvatarText}>
                          {room.customer_name
                            ? room.customer_name.charAt(0).toUpperCase()
                            : '?'}
                        </Text>
                      </View>
                      <Text style={styles.tenantName} numberOfLines={1}>
                        {room.customer_name || 'Đang ở'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.priceEmpty, occupied && { marginTop: 4, fontSize: 13 }]}>
                    {room.displayPriceText ? room.displayPriceText : 'Liên hệ'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity activeOpacity={0.85} style={styles.fab}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Room Detail Bottom Sheet for Timeline */}
      <RoomDetailBottomSheet
        visible={roomDetailVisible}
        room={selectedRoomForDetail}
        onClose={() => setRoomDetailVisible(false)}
      />
    </SafeAreaView>
  );
};

export default PlaceScreen;
