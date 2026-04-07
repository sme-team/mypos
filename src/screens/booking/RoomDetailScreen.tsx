/**
 * @file: RoomDetailScreen.tsx
 * @description: Màn hình CHI TIẾT & VẬN HÀNH (Operation) phòng đang có khách.
 * Vai trò: Quản lý trạng thái lưu trú, đổi phòng, gia hạn, chốt tiền tháng và check-out.
 */

import React, { useState, useEffect, useMemo } from 'react';
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

// Các service truy vấn và thao tác dữ liệu
import { RoomQueryService, RoomDetailInfo } from '../../services/ResidentServices/RoomQueryService';
import { RoomActionService } from '../../services/ResidentServices/RoomActionService';
import { PosQueryService } from '../../services/PosServices/PosQueryService';
import BookingScreen from './BookingScreen';
import { Room } from '../pos/types';

// Import các View con phục vụ Đổi phòng & Chỉnh sửa
import { RoomSwitchView } from '../../components/booking/views/RoomSwitchView';
import { RoomEditView } from '../../components/booking/views/RoomEditView';

type ViewState = 'detail' | 'edit' | 'switch';

export default function RoomDetailScreen({ room, onBack }: { room: Room; onBack: () => void }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  // ─── Cấu hình màu sắc theo Theme (Dark/Light) ───────────────────────────
  const themedColors = useMemo(() => ({
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

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: themedColors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: themedColors.border, backgroundColor: themedColors.surface },
    headerTitle: { fontSize: 18, fontWeight: '800', color: themedColors.text },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: themedColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    divider: { height: 1, backgroundColor: themedColors.border, marginVertical: 12 },
    sectionTitle: { fontSize: 12, color: themedColors.textSecondary, fontWeight: '700', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    infoLabel: { fontSize: 14, color: themedColors.textSecondary, marginLeft: 8 },
    infoValue: { fontSize: 14, fontWeight: '700', color: themedColors.text },
    serviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    primaryBtn: { width: '100%', paddingVertical: 16, backgroundColor: themedColors.primary, borderRadius: 14, alignItems: 'center' },
    primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: { flex: 1, paddingVertical: 14, backgroundColor: themedColors.primaryLight, borderWidth: 1.5, borderColor: themedColors.primary, borderRadius: 14, alignItems: 'center' },
    secondaryBtnText: { color: themedColors.primary, fontSize: 14, fontWeight: '700' },
    outlineBtnSmall: { borderWidth: 1, borderColor: themedColors.primary, backgroundColor: themedColors.primaryLight, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    readingInput: { backgroundColor: themedColors.surface, borderWidth: 1.5, borderColor: themedColors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: 70, fontSize: 15, color: themedColors.primary, fontWeight: '700', textAlign: 'center' },
    serviceCard: { backgroundColor: themedColors.surface, borderRadius: 20, borderWidth: 1, borderColor: themedColors.border, padding: 16, marginTop: 8 },
    summaryCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: themedColors.border },
    totalPriceBlue: { fontSize: 22, fontWeight: '900', color: themedColors.primary },
  }), [themedColors]);

  // ─── State Quản lý ──────────────────────────────────────────────────────
  const [view, setView] = useState<ViewState>('detail'); // Điều hướng giữa Chi tiết / Sửa / Đổi phòng
  const [details, setDetails] = useState<RoomDetailInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // State dành cho việc Chỉnh sửa & Chốt tiền tháng
  const [editData, setEditData] = useState({
    tenant: '', phone: '', cccd: '', rentPrice: '0',
    electricOld: '0', electricNew: '0', electricRate: '3500',
    waterOld: '0', waterNew: '0', waterRate: '18000',
  });
  const [extraServices, setExtraServices] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  
  const [note, setNote] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // State dành cho Đổi phòng (Switch Room)
  const [switchFloor, setSwitchFloor] = useState('1');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState<any>(null);

  // State để hiển thị màn hình Booking (khi phòng đang trống)
  const [showBooking, setShowBooking] = useState(false);

  // Helper logic
  const formatPrice = (price: number) => price?.toLocaleString('vi-VN') + 'đ' || '0đ';
  const extractFloor = (name: string) => {
    const m = String(name || '').match(/\d/); return m ? m[0] : '1';
  };

  // ─── Tải dữ liệu ────────────────────────────────────────────────────────
  const loadDetails = async () => {
    setLoading(true);
    try {
      const dbDetails = await RoomQueryService.getRoomDetails(room.id);
      if (dbDetails) {
        setDetails(dbDetails);
        
        // Giải mã Metadata (Số người, ghi chú) nếu có
        if (dbDetails.metadata) {
          try {
            const meta = JSON.parse(dbDetails.metadata);
            setAdults(meta.adults || 1); setChildren(meta.children || 0); setNote(meta.notes || '');
          } catch(e) {}
        }

        // Khởi tạo dữ liệu cho form chỉnh sửa
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
      // Lấy danh sách dịch vụ để phục vụ việc chốt tiền
      const svcs = await PosQueryService.getServices();
      setAvailableServices(svcs);
    } catch (err) {
      console.error('[RoomDetail] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRoomsForSwitch = async () => {
    try {
      const storeId = 'store-001';
      const allRooms = await RoomQueryService.getAvailableRooms(storeId, room.id);
      setAvailableRooms(allRooms);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadDetails(); }, [room.id]);
  useEffect(() => { if (view === 'switch') loadAvailableRoomsForSwitch(); }, [view]);

  // ─── Các Hành động nghiệp vụ ───────────────────────────────────────────
  
  // Trả phòng (Check-out)
  const handleCheckOut = async () => {
    Alert.alert(t('roomDetail.checkout'), t('roomDetail.confirmCheckout'), [
      { text: t('booking.form.close'), style: 'cancel' },
      { text: t('booking.summary.btnConfirm'), onPress: async () => {
          try { await RoomActionService.checkOut('store-001', room.id); onBack(); } 
          catch (e) { console.error(e); }
        }
      },
    ]);
  };

  // Gia hạn hợp đồng (Extend)
  const handleExtend = async () => {
    Alert.alert(t('roomDetail.extend'), t('roomDetail.confirmExtend'), [
      { text: t('booking.form.close'), style: 'cancel' },
      { text: t('booking.summary.btnConfirm'), onPress: async () => {
          try { await RoomActionService.extendContract('store-001', room.id, 1); loadDetails(); Alert.alert('Thành công', t('roomDetail.successExtend')); } 
          catch (e) { console.error(e); }
        }
      },
    ]);
  };

  // Xác nhận đổi phòng (Swap)
  const handleSwap = async () => {
    if (!selectedNewRoom) return;
    try {
      await RoomActionService.swapRoom('store-001', room.id, selectedNewRoom.id, selectedNewRoom.product_id, selectedNewRoom.price);
      Alert.alert('Thành công', t('roomDetail.successSwap', { name: selectedNewRoom.name })); onBack();
    } catch (err) { console.error(err); }
  };

  // Chốt tiền tháng (Save & Collect Payment)
  const handleSaveAndCollect = async () => {
    try {
      const input = {
        storeId: 'store-001', variantId: room.id,
        electricNew: parseFloat(editData.electricNew) || 0,
        waterNew: parseFloat(editData.waterNew) || 0,
        notes: note, adults, children,
        extraServices: extraServices.map(s => ({ productId: s.id, name: s.name, quantity: s.qty, unitPrice: s.unitPrice, unitId: s.unit_id }))
      };
      await RoomActionService.collectMonthlyPayment(input);
      Alert.alert('Thành công', 'Đã lưu thông tin và tạo hóa đơn chốt tiền.');
      loadDetails();
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu: ' + (err as any).message);
    }
  };

  // ─── Phần giao diện ─────────────────────────────────────────────────────
  
  // Xác định xem phòng có khách hay không dựa trên trạng thái database
  const isOccupied = room.status === 'occupied' || (room as any).contract_status === 'active';

  // Nếu phòng TRỐNG hoặc chuyển sang màn hình Đăng ký
  if (showBooking || !isOccupied) {
    return (
      <BookingScreen
        room={{ id: room.id, code: room.label, name: room.label, floor: extractFloor(room.label), price: room.price, product_id: room.product_id }}
        onClose={() => { setShowBooking(false); onBack(); }}
        onConfirm={() => { setShowBooking(false); onBack(); }}
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

  // ─────────────────────────────────────────────
  // PHÂN LUỒNG HIỂN THỊ
  // ─────────────────────────────────────────────

  // 1. MÀN HÌNH ĐỔI PHÒNG
  if (view === 'switch') {
    return (
      <RoomSwitchView
        room={room} details={details} switchFloor={switchFloor} setSwitchFloor={setSwitchFloor}
        availableRooms={availableRooms} selectedNewRoom={selectedNewRoom} setSelectedNewRoom={setSelectedNewRoom}
        handleSwap={handleSwap} formatPrice={formatPrice} extractFloor={extractFloor} setView={setView}
        themedColors={themedColors} t={t}
      />
    );
  }

  // 2. MÀN HÌNH CHỈNH SỬA
  if (view === 'edit') {
    return (
      <RoomEditView
        setView={setView} handleUpdateEdit={() => setView('detail')} room={room}
        editData={editData} setEditData={setEditData}
        themedColors={themedColors} t={t}
      />
    );
  }

  // 3. MÀN HÌNH CHI TIẾT CHÍNH (MAIN DETAIL)
  const eNew = parseFloat(editData.electricNew) || 0;
  const eOld = parseFloat(editData.electricOld) || 0;
  const eRate = parseFloat(editData.electricRate) || 3500;
  const wNew = parseFloat(editData.waterNew) || 0;
  const wOld = parseFloat(editData.waterOld) || 0;
  const wRate = parseFloat(editData.waterRate) || 18000;
  const totalBill = (room.price || 0) + (eNew - eOld) * eRate + (wNew - wOld) * wRate;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
          <Icon name="arrow-back" size={24} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('roomDetail.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body}>
        {/* Tóm tắt Phòng & Khách đang ở */}
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
              <View style={[styles.badge, { backgroundColor: themedColors.primaryLight }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: themedColors.primary }}>
                  {details?.contract_type === 'short_term' ? 'NGẮN HẠN' : 'DÀI HẠN'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>{t('roomDetail.customerInfo')}</Text>

        {/* Thông tin khách hàng chi tiết */}
        <View style={styles.infoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="person" size={18} color={themedColors.textSecondary} />
            <Text style={styles.infoLabel}>{t('roomDetail.fullName')}</Text>
          </View>
          <Text style={styles.infoValue}>{details?.customer_name || '---'}</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="phone" size={18} color={themedColors.textSecondary} />
            <Text style={styles.infoLabel}>{t('roomDetail.phone')}</Text>
          </View>
          <Text style={styles.infoValue}>{details?.customer_phone || '---'}</Text>
        </View>

        {/* Ghi chú & Số người */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Người lớn</Text>
            <Text style={styles.infoValue}>{adults}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Trẻ em</Text>
            <Text style={styles.infoValue}>{children}</Text>
          </View>
        </View>

        <View style={styles.divider} />
        
        {/* Chốt điện nước tháng này */}
        <Text style={styles.sectionTitle}>{t('roomDetail.monthlyMeter')}</Text>
        <View style={styles.serviceCard}>
          <View style={styles.serviceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="bolt" size={20} color="#FFD600" />
              <Text style={[styles.infoLabel, { fontWeight: '700', color: themedColors.text }]}>{t('roomDetail.electric')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={{ fontSize: 13, color: themedColors.textSecondary, marginRight: 8 }}>{eOld} → </Text>
               <TextInput 
                 style={styles.readingInput} 
                 value={editData.electricNew} 
                 onChangeText={t => setEditData({...editData, electricNew: t})} 
                 keyboardType="numeric" 
               />
               <Text style={{ fontSize: 12, color: themedColors.textSecondary, marginLeft: 6 }}>kWh</Text>
            </View>
          </View>
          <View style={styles.serviceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="water-drop" size={20} color="#03A9F4" />
              <Text style={[styles.infoLabel, { fontWeight: '700', color: themedColors.text }]}>{t('roomDetail.water')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={{ fontSize: 13, color: themedColors.textSecondary, marginRight: 8 }}>{wOld} → </Text>
               <TextInput 
                 style={styles.readingInput} 
                 value={editData.waterNew} 
                 onChangeText={t => setEditData({...editData, waterNew: t})} 
                 keyboardType="numeric" 
               />
               <Text style={{ fontSize: 12, color: themedColors.textSecondary, marginLeft: 6 }}>m³</Text>
            </View>
          </View>

          {/* Tóm tắt tiền chốt tạm tính */}
          <View style={styles.summaryCardRow}>
             <Text style={{ fontSize: 14, fontWeight: '700', color: themedColors.textSecondary }}>Tổng tiền cần thu</Text>
             <Text style={styles.totalPriceBlue}>{formatPrice(totalBill)}</Text>
          </View>
        </View>

        {/* Các nút hành động chính */}
        <View style={{ marginTop: 24, paddingBottom: 40, gap: 12 }}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveAndCollect}>
            <Text style={styles.primaryBtnText}>Lưu & Chốt tiền tháng</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleExtend}>
              <Text style={styles.secondaryBtnText}>{t('roomDetail.extend')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('edit')}>
              <Text style={styles.secondaryBtnText}>{t('roomDetail.edit')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: themedColors.danger, marginTop: 8 }]} 
            onPress={handleCheckOut}
          >
            <Text style={styles.primaryBtnText}>{t('roomDetail.checkout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
