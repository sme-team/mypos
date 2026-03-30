import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

import {RoomQueryService} from '../../services/ResidentServices/RoomQueryService';
// We'll import RoomDetailScreen once we create it.
import RoomDetailScreen from './RoomDetailScreen';
import BookingScreen from './BookingScreen';

const {width} = Dimensions.get('window');

const PlaceScreen: React.FC<{onOpenMenu?: () => void; onBack?: () => void}> = ({
  onOpenMenu,
  onBack,
}) => {
  useTranslation();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFloor, setActiveFloor] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [bookingRoom, setBookingRoom] = useState<any | null>(null);

  const loadRooms = async () => {
    console.log('[PlaceScreen] loadRooms called');
    setLoading(true);
    try {
      const dbRooms = await RoomQueryService.getRoomsFlatList('store-001');
      console.log(`[PlaceScreen] Received ${dbRooms.length} rooms from service`);
      setRooms(dbRooms);
    } catch (err) {
      console.error('[PlaceScreen] loadRooms error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // Build floor list based on room data
  const floors = Array.from(
    new Set(rooms.map(r => String(r.floor || '?'))),
  ).sort((a, b) => {
    if (a === '?') return 1;
    if (b === '?') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const filteredRooms = rooms.filter(r =>
    activeFloor === 'all' ? true : String(r.floor) === activeFloor,
  );

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
                  {f === 'all' ? 'Tất cả' : `Tầng ${f}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Room Grid */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
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
              return (
                <TouchableOpacity
                  key={room.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    console.log('[PlaceScreen] Clicked room:', { id: room.id, name: room.name, status: room.status });
                    if (room.status === 'occupied') {
                      setSelectedRoom(room);
                    } else if (room.status === 'available') {
                      setBookingRoom(room);
                    } else {
                      console.log('[PlaceScreen] Room status is not occupied or available, doing nothing.');
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
                      <View style={{marginLeft: 8}}>
                        <Text style={styles.roomName}>{room.label}</Text>
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
                        {occupied ? 'ĐANG THUÊ' : 'TRỐNG'}
                      </Text>
                    </View>
                  </View>

                  {occupied ? (
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
                  ) : (
                    <Text style={styles.priceEmpty}>
                      {formatPrice(room.price)} / tháng
                    </Text>
                  )}
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
    </SafeAreaView>
  );
};

export default PlaceScreen;

const CARD_WIDTH = width - 32;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F4F6FB',
  },
  iconBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  headerSubtitle: {
    fontSize: 13,
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
    paddingHorizontal: 16,
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
  listContent: {
    paddingHorizontal: 16,
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
    width: CARD_WIDTH,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
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
    fontSize: 16,
    color: '#1a1a2e',
  },
  roomType: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
    marginTop: 1,
  },
  checkoutText: {
    fontSize: 11,
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
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  tenantName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  priceEmpty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D9E5A',
    marginTop: 4,
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
