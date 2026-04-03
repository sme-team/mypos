import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { RoomQueryService, RoomDetailInfo } from '../../services/ResidentServices/RoomQueryService';
import { RoomActionService } from '../../services/ResidentServices/RoomActionService';
import { PosQueryService } from '../../services/PosServices/PosQueryService';
import BookingScreen from './BookingScreen';
import { Room } from '../pos/types';

type ViewState = 'detail' | 'edit' | 'switch';

export default function RoomDetailScreen({ room, onBack }: { room: Room; onBack: () => void }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const themedColors = React.useMemo(() => ({
    primary: '#1565C0',
    primaryLight: isDark ? '#1E293B' : '#E3F2FD',
    text: isDark ? '#F1F5F9' : '#1a1a2e',
    textSecondary: isDark ? '#94A3B8' : '#888',
    border: isDark ? '#334155' : '#E0E0E0',
    bg: isDark ? '#0F172A' : '#fff',
    surface: isDark ? '#1E293B' : '#fff',
    surfaceAlt: isDark ? '#111827' : '#F8F9FA',
    danger: '#FF4444',
    textHint: isDark ? '#64748B' : '#aaa',
  }), [isDark]);

  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: themedColors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: themedColors.border, backgroundColor: themedColors.surface },
    headerTitle: { fontSize: 18, fontWeight: '800', color: themedColors.text },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: themedColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    divider: { height: 1, backgroundColor: themedColors.border, marginVertical: 12 },
    sectionTitle: { fontSize: 12, color: themedColors.textSecondary, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    infoLabel: { fontSize: 14, color: themedColors.textSecondary, marginLeft: 8 },
    infoValue: { fontSize: 14, fontWeight: '700', color: themedColors.text },
    serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    stepperBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: themedColors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: themedColors.surface },
    noteArea: { backgroundColor: themedColors.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 14, color: themedColors.text, borderWidth: 1, borderColor: themedColors.border, minHeight: 80, textAlignVertical: 'top' },
    primaryBtn: { width: '100%', paddingVertical: 16, backgroundColor: themedColors.primary, borderRadius: 14, alignItems: 'center' },
    primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: { flex: 1, paddingVertical: 14, backgroundColor: themedColors.primaryLight, borderWidth: 1.5, borderColor: themedColors.primary, borderRadius: 14, alignItems: 'center' },
    secondaryBtnText: { color: themedColors.primary, fontSize: 14, fontWeight: '700' },
    currentRoomBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: themedColors.surfaceAlt, borderRadius: 14, padding: 14 },
    outlineBtnSmall: { borderWidth: 1, borderColor: themedColors.primary, backgroundColor: themedColors.primaryLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    floorBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: themedColors.border, marginLeft: 6 },
    floorBtnActive: { backgroundColor: themedColors.primary },
    floorBtnText: { fontSize: 13, fontWeight: '600', color: themedColors.textSecondary },
    switchRoomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1.5, borderColor: themedColors.border, borderRadius: 14, marginBottom: 10, backgroundColor: themedColors.surface },
    checkIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: themedColors.primary, alignItems: 'center', justifyContent: 'center' },
    inputLabel: { fontSize: 13, color: themedColors.textSecondary, marginBottom: 6 },
    input: { borderWidth: 1.5, borderColor: themedColors.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14, color: themedColors.text },
    serviceBox: { borderWidth: 1.5, borderColor: themedColors.border, borderRadius: 14, padding: 14, marginBottom: 12 },
    inputSubLabel: { fontSize: 12, color: themedColors.textSecondary, marginBottom: 4 },
    inputSmall: { borderWidth: 1.5, borderColor: themedColors.border, borderRadius: 10, padding: 10, fontSize: 14, color: themedColors.text },
    readingInput: { backgroundColor: themedColors.surface, borderWidth: 1.5, borderColor: themedColors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 70, fontSize: 15, color: themedColors.primary, fontWeight: '700', textAlign: 'center' },
    serviceCard: { backgroundColor: themedColors.surface, borderRadius: 20, borderWidth: 1, borderColor: themedColors.border, padding: 16, marginTop: 8 },
    rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    iconBoxSmall: { width: 44, height: 44, borderRadius: 12, backgroundColor: themedColors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    meterBadge: { backgroundColor: themedColors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
    meterBadgeText: { fontSize: 12, color: themedColors.textSecondary, fontWeight: '600' },
    meterLabel: { fontSize: 12, color: themedColors.textSecondary, marginRight: 4 },
    addServiceBtn: { borderWidth: 1.5, borderColor: themedColors.border, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12, flexDirection: 'row', gap: 6 },
    addServiceText: { color: themedColors.primary, fontSize: 15, fontWeight: '700' },
    summaryCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: themedColors.border },
    totalPriceBlue: { fontSize: 22, fontWeight: '900', color: themedColors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContainer: { backgroundColor: themedColors.surface, borderRadius: 20, padding: 16, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: themedColors.border },
    modalTitle: { fontSize: 18, fontWeight: '800', color: themedColors.text },
    svcSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: themedColors.border },
  }), [themedColors]);

  const [view, setView] = useState<ViewState>('detail');
  const [details, setDetails] = useState<RoomDetailInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editData, setEditData] = useState({
    tenant: '',
    phone: '',
    cccd: '',
    rentPrice: '0',
    electricOld: '0',
    electricNew: '0',
    electricRate: '3500',
    waterOld: '0',
    waterNew: '0',
    waterRate: '18000',
  });
  const [extraServices, setExtraServices] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const [note, setNote] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Switch State
  const [switchFloor, setSwitchFloor] = useState('1');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState<any>(null);

  // Booking Screen State
  const [showBooking, setShowBooking] = useState(false);

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
  const extractFloor = (name: string) => {
    const m = String(name || '').match(/\d/);
    return m ? m[0] : '1';
  };

  const loadDetails = async () => {
    setLoading(true);
    try {
      const dbDetails = await RoomQueryService.getRoomDetails(room.id);
      if (dbDetails) {
        setDetails(dbDetails);
        
        // Initialize from metadata if available
        if (dbDetails.metadata) {
          try {
            const meta = JSON.parse(dbDetails.metadata);
            setAdults(meta.adults || 1);
            setChildren(meta.children || 0);
            setNote(meta.notes || '');
          } catch(e) {}
        }

        setEditData({
          tenant: dbDetails.customer_name || '',
          phone: dbDetails.customer_phone || '',
          cccd: dbDetails.cccd || '',
          rentPrice: room.price ? room.price.toString() : '0',
          electricOld: dbDetails.electric_reading_init ? dbDetails.electric_reading_init.toString() : '0',
          electricNew: dbDetails.electric_reading_init ? dbDetails.electric_reading_init.toString() : '0',
          electricRate: '3500',
          waterOld: dbDetails.water_reading_init ? dbDetails.water_reading_init.toString() : '0',
          waterNew: dbDetails.water_reading_init ? dbDetails.water_reading_init.toString() : '0',
          waterRate: '18000',
        });
      }
      const svcs = await PosQueryService.getServices();
      setAvailableServices(svcs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRoomsForSwitch = async () => {
    try {
      // FIX: Cần truyền storeId là tham số đầu tiên, roomId là tham số thứ hai (excludeId)
      const storeId = 'store-001';
      const allRooms = await RoomQueryService.getAvailableRooms(storeId, room.id);
      setAvailableRooms(allRooms);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (view === 'switch') {
      loadAvailableRoomsForSwitch();
    }
  }, [view]);

  // Handlers
  const handleCheckOut = async () => {
    Alert.alert(t('roomDetail.checkout'), t('roomDetail.confirmCheckout'), [
      { text: t('booking.form.close'), style: 'cancel' },
      {
        text: t('booking.summary.btnConfirm'), onPress: async () => {
          try {
            const storeId = 'store-001';
            await RoomActionService.checkOut(storeId, room.id);
            onBack();
          } catch (e) { console.error(e); }
        }
      },
    ]);
  };

  const handleExtend = async () => {
    Alert.alert(t('roomDetail.extend'), t('roomDetail.confirmExtend'), [
      { text: t('booking.form.close'), style: 'cancel' },
      {
        text: t('booking.summary.btnConfirm'), onPress: async () => {
          try {
            const storeId = 'store-001';
            await RoomActionService.extendContract(storeId, room.id, 1);
            loadDetails();
            Alert.alert('Thành công', t('roomDetail.successExtend'));
          } catch (e) { console.error(e); }
        }
      },
    ]);
  };

  const handleSwap = async () => {
    if (!selectedNewRoom) { return; }
    try {
      const storeId = 'store-001';
      await RoomActionService.swapRoom(storeId, room.id, selectedNewRoom.id, selectedNewRoom.product_id, selectedNewRoom.price);
      Alert.alert('Thành công', t('roomDetail.successSwap', { name: selectedNewRoom.name }));
      onBack();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateEdit = async () => {
    // Updating edit logic...
    Alert.alert('Sắp ra mắt', 'Tính năng cập nhật thông tin đang được hoàn thiện.');
    setView('detail');
  };

  const handleSaveAndCollect = async () => {
    try {
      const storeId = 'store-001';
      const input = {
        storeId,
        variantId: room.id,
        electricNew: parseFloat(editData.electricNew) || 0,
        waterNew: parseFloat(editData.waterNew) || 0,
        notes: note,
        adults,
        children,
        extraServices: extraServices.map(s => ({
          productId: s.id,
          name: s.name,
          quantity: s.qty,
          unitPrice: s.unitPrice,
          unitId: s.unit_id
        }))
      };
      await RoomActionService.collectMonthlyPayment(input);
      Alert.alert('Thành công', 'Đã lưu thông tin và tạo hóa đơn chốt tiền.');
      loadDetails();
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu: ' + (err as any).message);
    }
  };

  const isOccupied = room.status === 'occupied' || (room as any).contract_status === 'active';

  if (showBooking || !isOccupied) {
    return (
      <BookingScreen
        room={{ id: room.id, code: room.label, name: room.label, floor: extractFloor(room.label), price: room.price, product_id: room.product_id }}
        onClose={() => { setShowBooking(false); onBack(); }}
        onConfirm={() => {
          setShowBooking(false);
          onBack();
        }}
      />
    );
  }

  if (loading && isOccupied) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1565C0" />
      </SafeAreaView>
    );
  }

  const renderBadge = (type?: string) => {
    const isShort = type === 'short_term';
    return (
      <View style={[styles.badge, { backgroundColor: isShort ? '#e0f2fe' : '#fef3c7' }]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: isShort ? '#0ea5e9' : '#d97706' }}>
          {isShort ? 'NGẮN HẠN' : 'DÀI HẠN'}
        </Text>
      </View>
    );
  };

  // 1. SWITCH VIEW
  if (view === 'switch') {
    const listForFloor = availableRooms.filter(r => extractFloor(r.name) === switchFloor);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('detail')} style={{ padding: 8 }}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('roomDetail.switchRoom')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.body}>
          <Text style={styles.sectionTitle}>{t('roomDetail.currentRoom')}</Text>
          <View style={styles.currentRoomBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconBox}>
                <Icon name="meeting-room" size={20} color="#1565C0" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', fontSize: 16 }}>{room.label}</Text>
                <Text style={{ color: themedColors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  Khách: {details?.customer_name || 'Không rõ'}
                </Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
              <Text style={{ color: themedColors.primary, fontSize: 11, fontWeight: '700' }}>Ở đây</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>{t('roomDetail.selectNewRoom')}</Text>
            <View style={{ flexDirection: 'row' }}>
              {['1', '2', '3'].map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setSwitchFloor(f)}
                  style={[styles.floorBtn, switchFloor === f && styles.floorBtnActive]}
                >
                  <Text style={[styles.floorBtnText, switchFloor === f && { color: '#ffffff' }]}>Tầng {f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {listForFloor.length === 0 ? (
            <Text style={{ textAlign: 'center', color: themedColors.textHint, marginTop: 20 }}>{t('roomDetail.noVacant')}</Text>
          ) : (
            listForFloor.map(r => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.8}
                onPress={() => setSelectedNewRoom(r)}
                style={[styles.switchRoomCard, selectedNewRoom?.id === r.id && { borderColor: '#1565C0', backgroundColor: '#F0F6FF' }]}
              >
                <View>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: themedColors.text }}>{r.name}</Text>
                  <Text style={{ fontSize: 13, color: themedColors.textSecondary, marginTop: 2 }}>{t('roomDetail.vacant')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: themedColors.primary, marginRight: 10 }}>{formatPrice(r.price)}</Text>
                  {selectedNewRoom?.id === r.id && (
                    <View style={styles.checkIcon}>
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 30 }]} onPress={handleSwap}>
            <Text style={styles.primaryBtnText}>{t('roomDetail.confirmSwap')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. EDIT VIEW
  if (view === 'edit') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('detail')} style={{ padding: 8 }}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('roomDetail.edit')}</Text>
          <TouchableOpacity onPress={handleUpdateEdit} style={{ padding: 8 }}>
            <Text style={{ color: themedColors.primary, fontWeight: '700', fontSize: 16 }}>Lưu</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body}>
          <Text style={styles.sectionTitle}>{t('booking.sections.room')}</Text>
          <View style={[styles.currentRoomBox, { marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconBox}>
                <Icon name="meeting-room" size={20} color="#1565C0" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', fontSize: 16 }}>{room.label}</Text>
                <Text style={{ color: themedColors.textSecondary, fontSize: 13, marginTop: 2 }}>Trạng thái: {t('roomDetail.occupied')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.outlineBtnSmall} onPress={() => setView('switch')}>
              <Text style={{ color: themedColors.primary, fontSize: 12, fontWeight: '700' }}>{t('roomDetail.switchRoom')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t('booking.sections.tenant')}</Text>
          <Text style={styles.inputLabel}>{t('roomDetail.fullName')}</Text>
          <TextInput style={styles.input} value={editData.tenant} onChangeText={t => setEditData({ ...editData, tenant: t })} />
          <Text style={styles.inputLabel}>{t('roomDetail.phone')}</Text>
          <TextInput style={styles.input} value={editData.phone} onChangeText={t => setEditData({ ...editData, phone: t })} keyboardType="phone-pad" />
          <Text style={styles.inputLabel}>CCCD/Passport</Text>
          <TextInput style={styles.input} value={editData.cccd} onChangeText={t => setEditData({ ...editData, cccd: t })} />

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>{t('roomDetail.serviceAndRent')}</Text>

          <View style={styles.serviceBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="home" size={20} color="#1a1a2e" style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: '700', fontSize: 15 }}>Tiền phòng</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputSubLabel}>Đơn giá</Text>
                <TextInput style={styles.inputSmall} value={editData.rentPrice} onChangeText={t => setEditData({ ...editData, rentPrice: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputSubLabel}>Số lượng</Text>
                <TextInput style={styles.inputSmall} value="1" editable={false} />
              </View>
            </View>
          </View>

          <View style={styles.serviceBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="bolt" size={20} color="#1a1a2e" style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: '700', fontSize: 15 }}>Tiền điện</Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputSubLabel}>{t('roomDetail.old')}</Text>
                <TextInput style={styles.inputSmall} value={editData.electricOld} onChangeText={t => setEditData({ ...editData, electricOld: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputSubLabel}>{t('roomDetail.new')}</Text>
                <TextInput style={styles.inputSmall} value={editData.electricNew} onChangeText={t => setEditData({ ...editData, electricNew: t })} keyboardType="numeric" />
              </View>
            </View>
            <Text style={styles.inputSubLabel}>{t('roomDetail.unitRate')}</Text>
            <TextInput style={styles.inputSmall} value={editData.electricRate} onChangeText={t => setEditData({ ...editData, electricRate: t })} keyboardType="numeric" />
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20, marginBottom: 40 }]} onPress={handleUpdateEdit}>
            <Text style={styles.primaryBtnText}>Cập nhật thay đổi</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3. MAIN DETAIL VIEW

  // Occupied View
  const eNew = parseFloat(editData.electricNew) || 0;
  const eOld = parseFloat(editData.electricOld) || 0;
  const eRate = parseFloat(editData.electricRate) || 3500;
  const wNew = parseFloat(editData.waterNew) || 0;
  const wOld = parseFloat(editData.waterOld) || 0;
  const wRate = parseFloat(editData.waterRate) || 18000;

  const electricCost = (eNew - eOld) * eRate;
  const waterCost = (wNew - wOld) * wRate;
  const extraServicesTotal = extraServices.reduce((sum, s) => sum + (s.unitPrice * s.qty), 0);
  const totalBill = (room.price || 0) + electricCost + waterCost + extraServicesTotal;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('roomDetail.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.body}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={[styles.iconBox, { width: 48, height: 48, borderRadius: 14 }]}>
            <Icon name="meeting-room" size={28} color="#1565C0" />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', fontSize: 20, color: themedColors.text }}>{details?.variant_name || room.label}</Text>
              <TouchableOpacity style={styles.outlineBtnSmall} onPress={() => setView('switch')}>
                <Text style={{ color: themedColors.primary, fontWeight: '700', fontSize: 13 }}>{t('roomDetail.switchRoom')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              {renderBadge(details?.contract_type)}
            </View>
            <Text style={{ fontSize: 13, color: themedColors.textSecondary, marginTop: 6, fontWeight: '500' }}>
              Checkout: {(() => {
                if (!details?.end_date) return '---';
                let timeStr = '';
                if (details.metadata) {
                  try {
                    const meta = JSON.parse(details.metadata);
                    timeStr = meta.checkout_time ? meta.checkout_time + ' ' : '';
                  } catch(e) {}
                }
                const [y, m, d] = details.end_date.split('-');
                return `${timeStr}${d}/${m}/${y}`;
              })()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>{t('roomDetail.customerInfo')}</Text>

        <View style={styles.infoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="person" size={20} color="#1565C0" />
            <Text style={styles.infoLabel}>{t('roomDetail.fullName')}</Text>
          </View>
          <Text style={styles.infoValue}>{details?.customer_name || 'Không rõ'}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="phone" size={20} color="#1565C0" />
            <Text style={styles.infoLabel}>{t('roomDetail.phone')}</Text>
          </View>
          <Text style={styles.infoValue}>{details?.customer_phone || '---'}</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>{t('roomDetail.serviceAndRent')}</Text>

        <View style={styles.serviceCard}>
          {/* Tiền thuê phòng */}
          <View style={styles.rowItem}>
            <View style={styles.iconBoxSmall}>
              <Icon name="home" size={22} color="#1e293b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{t('roomDetail.roomRent')}</Text>
              <Text style={{ fontSize: 12, color: themedColors.textSecondary }}>{t('roomDetail.rentFixed')}</Text>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{formatPrice(room.price)}</Text>
            <TouchableOpacity style={{ marginLeft: 12 }}>
              <Icon name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Điện */}
          <View style={styles.rowItem}>
            <View style={styles.iconBoxSmall}>
              <Icon name="bolt" size={22} color="#eab308" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{t('roomDetail.electric')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={styles.meterBadge}>
                  <Text style={styles.meterBadgeText}>{t('roomDetail.old')}: {eOld}</Text>
                </View>
                <Text style={styles.meterLabel}>{t('roomDetail.new')}:</Text>
                <TextInput
                  style={[styles.readingInput, { minWidth: 65, paddingVertical: 4, height: 32 }]}
                  value={editData.electricNew}
                  onChangeText={val => setEditData(prev => ({ ...prev, electricNew: val }))}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{formatPrice(electricCost)}</Text>
            <TouchableOpacity style={{ marginLeft: 12 }}>
              <Icon name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Nước */}
          <View style={styles.rowItem}>
            <View style={styles.iconBoxSmall}>
              <Icon name="water-drop" size={22} color="#0ea5e9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{t('roomDetail.water')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={styles.meterBadge}>
                  <Text style={styles.meterBadgeText}>{t('roomDetail.old')}: {wOld}</Text>
                </View>
                <Text style={styles.meterLabel}>{t('roomDetail.new')}:</Text>
                <TextInput
                  style={[styles.readingInput, { minWidth: 65, paddingVertical: 4, height: 32 }]}
                  value={editData.waterNew}
                  onChangeText={val => setEditData(prev => ({ ...prev, waterNew: val }))}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </View>
            <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{formatPrice(waterCost)}</Text>
            <TouchableOpacity style={{ marginLeft: 12 }}>
              <Icon name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Extra Services */}
          {extraServices.map((svc) => (
            <View key={svc.id} style={styles.rowItem}>
              <View style={styles.iconBoxSmall}>
                <Icon name="room-service" size={22} color="#1565C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{svc.name}</Text>
                <Text style={{ fontSize: 12, color: themedColors.textSecondary }}>{formatPrice(svc.unitPrice)} x {svc.qty} {svc.unit}</Text>
              </View>
              <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{formatPrice(svc.unitPrice * svc.qty)}</Text>
              <TouchableOpacity
                style={{ marginLeft: 12 }}
                onPress={() => setExtraServices(prev => prev.filter(s => s.id !== svc.id))}
              >
                <Icon name="close" size={18} color="#FF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addServiceBtn}
            onPress={() => setIsServiceModalOpen(true)}
          >
            <Icon name="add" size={20} color="#2563eb" />
            <Text style={styles.addServiceText}>{t('roomDetail.addService')}</Text>
          </TouchableOpacity>

          <View style={styles.summaryCardRow}>
            <Text style={{ fontSize: 16, color: themedColors.textSecondary, fontWeight: '500' }}>{t('roomDetail.subtotal')}</Text>
            <Text style={styles.totalPriceBlue}>{formatPrice(totalBill)}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24, backgroundColor: themedColors.danger }]} onPress={handleCheckOut}>
          <Text style={styles.primaryBtnText}>{t('roomDetail.btnCheckout')}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, paddingBottom: 40 }}>
          <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={handleExtend}>
            <Text style={styles.secondaryBtnText}>{t('roomDetail.extend')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, borderColor: themedColors.border, backgroundColor: themedColors.surface }]} onPress={() => setView('edit')}>
            <Text style={[styles.secondaryBtnText, { color: themedColors.text }]}>{t('roomDetail.edit')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isServiceModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn dịch vụ rổ</Text>
              <TouchableOpacity onPress={() => setIsServiceModalOpen(false)}>
                <Icon name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {availableServices.map(svc => (
                <TouchableOpacity
                  key={svc.id}
                  style={styles.svcSelectItem}
                  onPress={() => {
                    const exist = extraServices.find(s => s.id === svc.id);
                    if (exist) {
                      setExtraServices(extraServices.map(s => s.id === svc.id ? { ...s, qty: s.qty + 1 } : s));
                    } else {
                      setExtraServices([...extraServices, { ...svc, qty: 1 }]);
                    }
                    setIsServiceModalOpen(false);
                  }}
                >
                  <View style={styles.iconBoxSmall}>
                    <Icon name="room-service" size={20} color="#1565C0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15 }}>{svc.name}</Text>
                    <Text style={{ color: themedColors.textSecondary, fontSize: 13 }}>{formatPrice(svc.unitPrice)} / {svc.unit}</Text>
                  </View>
                  <Icon name="add" size={20} color="#1565C0" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

