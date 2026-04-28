/**
 * @file: RoomDetailScreen.tsx
 * @description: Màn hình CHI TIẾT & VẬN HÀNH phòng đang có khách.
 * Thiết kế: Dịch vụ dạng dòng item, chốt tiền điện/nước, công nợ kỳ này.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView, StatusBar, Modal, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { ServicesSection } from '../../components/booking/forms/ServicesSection';

import { RoomQueryService, RoomDetailInfo } from '../../services/ResidentServices/RoomQueryService';
import { RoomActionService } from '../../services/ResidentServices/RoomActionService';
import { PosQueryService } from '../../services/PosServices/PosQueryService';
import BookingScreen from './BookingScreen';
import { Room } from '../pos/types';

import { RoomSwitchView } from '../../components/booking/views/RoomSwitchView';
import { RoomEditView } from '../../components/booking/views/RoomEditView';
import { RoomHistoryView } from '../../components/booking/views/RoomHistoryView';
import { t } from 'i18next';

type ViewState = 'detail' | 'edit' | 'switch' | 'history';

// ─── Kiểu dữ liệu cho một dịch vụ thêm trong dòng bill ────────────────────
interface ExtraServiceItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  unit_id?: string;
  amount: number;
}

export default function RoomDetailScreen({ room, onBack }: { room: Room; onBack: () => void }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const colors = useMemo(() => ({
    primary: '#1E6FD9',
    primaryLight: isDark ? '#1E3A5F' : '#E8F1FB',
    text: isDark ? '#F1F5F9' : '#111827',
    textSecondary: isDark ? '#94A3B8' : '#6B7280',
    border: isDark ? '#334155' : '#E5E7EB',
    bg: isDark ? '#0F172A' : '#F4F7FB',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    danger: '#E53935',
    success: '#16A34A',
    warning: '#D97706',
    yellow: '#FFD600',
    blue: '#03A9F4',
  }), [isDark]);

  // ─── State ────────────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewState>('detail');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [details, setDetails] = useState<RoomDetailInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);

  // Chỉ số điện nước (thực tế đang dùng để chốt tiền / cập nhật chỉ số hiện tại)
  const [electricNew, setElectricNew] = useState('');
  const [waterNew, setWaterNew] = useState('');
  const [electricRate, setElectricRate] = useState(3500);
  const [waterRate, setWaterRate] = useState(18000);

  // States dành riêng cho việc Chỉnh sửa thông tin nhanh
  const [editTenant, setEditTenant] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCccd, setEditCccd] = useState('');
  const [editRentPrice, setEditRentPrice] = useState('');
  const [editElectricOld, setEditElectricOld] = useState('');
  const [editWaterOld, setEditWaterOld] = useState('');

  // Dịch vụ thêm — dùng cùng format với BookingScreen (services array)
  const [services, setServices] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  // Adapter: updateForm-style để ServicesSection hoạt động
  const fakeForm = useMemo(() => ({ services }), [services]);
  const updateServicesForm = useCallback((partial: any) => {
    if (partial.services !== undefined) {setServices(partial.services);}
  }, []);

  // ─── Load dữ liệu ─────────────────────────────────────────────────────────
  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const dbDetails = await RoomQueryService.getRoomDetails(room.id);
      if (dbDetails) {
        setDetails(dbDetails);
        setElectricNew('');
        setWaterNew('');
        if (dbDetails.electric_rate) {setElectricRate(dbDetails.electric_rate);}
        if (dbDetails.water_rate) {setWaterRate(dbDetails.water_rate);}
      }
      const svcs = await PosQueryService.getServices();
      // Map sang format của ServicesSection (qty, selected, unitPrice, unit)
      setAvailableServices(svcs.map((s: any) => ({
        ...s,
        qty: 1,
        selected: false,
        unitPrice: s.unitPrice ?? s.price ?? 0,
        unit: s.unit ?? 'lần',
      })));
    } catch (err) {
      console.error('[RoomDetail] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  const loadAvailableRoomsForSwitch = useCallback(async () => {
    try {
      const allRooms = await RoomQueryService.getAvailableRooms('store-001', room.id);
      setAvailableRooms(allRooms);
    } catch (err) { console.error(err); }
  }, [room.id]);

  const [switchFloor, setSwitchFloor] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState<any>(null);

  useEffect(() => { loadDetails(); }, [room.id]);
  useEffect(() => { if (view === 'switch') {loadAvailableRoomsForSwitch();} }, [view]);

  // Auto-select first floor when availableRooms loads
  useEffect(() => {
    if (availableRooms.length > 0 && switchFloor === '') {
      const firstFloor = availableRooms[0];
      const m = firstFloor.title.match(/\d+/);
      const floorVal = m ? m[0] : (firstFloor.title === 'Khác' ? '?' : firstFloor.title);
      setSwitchFloor(floorVal);
    }
  }, [availableRooms, switchFloor]);

  // ─── Tính toán tiền (Logic mới: Gross Total & Net Debt) ─────────────────
  // Kiểm tra loại hợp đồng: chỉ tính điện nước cho hợp đồng dài hạn
  // Dựa trên thời gian: dài hạn nếu duration >= 30 ngày
  const isLongTerm = details?.start_date && details?.end_date &&
    ((new Date(details.end_date).getTime() - new Date(details.start_date).getTime()) / (1000 * 60 * 60 * 24) >= 30);

  // Tiền điện nước tạm tính (chỉ cho hợp đồng dài hạn)
  let meterEstimate = 0;
  let eOld = 0, wOld = 0, eNew = 0, wNew = 0, eAmount = 0, wAmount = 0;

  if (isLongTerm) {
    eOld = details?.electric_reading_init ?? 0;
    wOld = details?.water_reading_init ?? 0;
    eNew = parseFloat(electricNew) || 0;
    wNew = parseFloat(waterNew) || 0;
    const eDiff = Math.max(0, eNew - eOld);
    const wDiff = Math.max(0, wNew - wOld);
    eAmount = eDiff * electricRate;
    wAmount = wDiff * waterRate;
    meterEstimate = eAmount + wAmount;
  }

  // Dịch vụ từ bill hiện tại (nếu có)
  const billServices = details?.bill_items?.filter((item: any) => 
    item.product_type === 'service' || 
    item.product_type === 'product_service' || 
    item.product_type === 'room_service'
  ) || [];

  // Tiền phòng: ngắn hạn dùng metadata_rent_amount (tách biệt), dài hạn dùng rent_amount
  const rentAmount = !isLongTerm
    ? (details?.metadata_rent_amount ?? details?.total_amount ?? 0)  // Ngắn hạn: dùng metadata_rent_amount nếu có
    : (details?.rent_amount ?? room.monthly_price ?? 0);  // Dài hạn: dùng giá tháng

  // Tiền dịch vụ: ngắn hạn dùng metadata_service_amount (tách biệt), dài hạn dùng bill_services
  const serviceAmount = !isLongTerm
    ? (details?.metadata_service_amount ?? 0)  // Ngắn hạn: dùng metadata_service_amount nếu có
    : billServices.reduce((sum: number, sv: any) => sum + (sv.unit_price ?? 0) * (sv.quantity ?? 1), 0);  // Dài hạn: dùng bill_services

  // Tổng dịch vụ: dịch vụ từ metadata/bill + dịch vụ thêm mới
  const extraTotal = serviceAmount + services.reduce((sum: number, sv: any) => sum + (sv.unitPrice ?? 0) * (sv.qty ?? 1), 0);

  // Gross Total (Phải thu): Tổng tất cả dịch vụ + tiền phòng + nợ cũ
  // Ngắn hạn: total_amount đã bao gồm cả phòng + dịch vụ (trừ cọc), chỉ cộng thêm dịch vụ mới và nợ cũ
  // Dài hạn: rent_amount chỉ là tiền phòng, cần cộng thêm dịch vụ, điện nước và nợ cũ
  const baseAmount = !isLongTerm
    ? ((details?.total_amount ?? 0) + (details?.negative_balance ?? 0))  // Ngắn hạn: dùng total_amount (đã có phòng + dịch vụ)
    : (rentAmount + (details?.negative_balance ?? 0));  // Dài hạn: dùng rent_amount (chỉ phòng)

  // Chỉ cộng extraTotal (dịch vụ mới) cho dài hạn, vì ngắn hạn đã có trong total_amount
  const grossTotal = !isLongTerm
    ? (baseAmount + meterEstimate + services.reduce((sum: number, sv: any) => sum + (sv.unitPrice ?? 0) * (sv.qty ?? 1), 0))  // Ngắn hạn: chỉ cộng dịch vụ mới
    : (baseAmount + meterEstimate + extraTotal);  // Dài hạn: cộng tất cả

  // Tiền đã trả (tổng tất cả bill/payment của hợp đồng)
  const totalPaid = details?.total_paid ?? 0;
  
  // Hiển thị ở UI "Đã thanh toán" (Trừ đi phần cọc đã hiển thị ở trên để tránh double count)
  const displayPaidAmount = Math.max(0, totalPaid - (!isLongTerm ? (details?.deposit_amount ?? 0) : 0));

  // Số tiền thực sự còn nợ (Net Remaining)
  // Logic đúng: (Tổng phòng + Dịch vụ) - (Tất cả tiền đã thu)
  const fullGross = (rentAmount + extraTotal + (details?.negative_balance ?? 0));
  const remainingAmount = Math.max(0, fullGross - totalPaid);

  // Hiển thị ở màn hình chính
  const payableAmount = fullGross;
  const payableSubLabels: string[] = [];
  if (eNew > 0 || wNew > 0 || extraTotal > 0) {
    payableSubLabels.push(t('roomDetail.estimated'));
  }

  const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

  // ─── Hành động ────────────────────────────────────────────────────────────


  const handleCollect = () => {
    setPaymentMode('full');
    setPartialAmount(String(remainingAmount));
    setShowPaymentModal(true);
  };

  const handleCheckOut = async () => {
    Alert.alert(t('roomDetail.confirmCheckoutTitle'), t('roomDetail.confirmCheckoutMsg'), [
      { text: t('roomDetail.cancel'), style: 'cancel' },
      {
        text: t('roomDetail.checkoutBtn'), style: 'destructive',
        onPress: async () => {
          try { await RoomActionService.checkOut('store-001', room.id); onBack(); }
          catch (e) { Alert.alert(t('common.error'), String(e)); }
        },
      },
    ]);
  };

  const handleExtend = async () => {
    Alert.alert(t('roomDetail.extend'), t('roomDetail.confirmExtend'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('roomDetail.extend'),
        onPress: async () => {
          try { await RoomActionService.extendContract('store-001', room.id, 1); loadDetails(); Alert.alert(t('common.ok'), t('roomDetail.success.extend')); }
          catch (e) { Alert.alert(t('common.error'), String(e)); }
        },
      },
    ]);
  };

  const handleSwap = () => {
    if (!selectedNewRoom) {return;}
    Alert.alert(
      t('roomDetail.confirmSwap'),
      t('roomDetail.confirmSwapDesc') || t('roomDetail.confirmCheckoutMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('roomDetail.error.confirm'),
          onPress: async () => {
            try {
              await RoomActionService.swapRoom('store-001', room.id, selectedNewRoom.id, selectedNewRoom.product_id, selectedNewRoom.monthly_price || 0);
              Alert.alert(t('common.ok'), t('roomDetail.success.swap', { name: selectedNewRoom.name }));
              onBack();
            } catch (err) { console.error(err); }
          },
        },
      ]
    );
  };

  const extractFloor = (name: string) => { const m = String(name || '').match(/\d/); return m ? m[0] : '1'; };
  const isOccupied = room.status === 'occupied' || (room as any).contract_status === 'active';

  // ─── Case: Phòng trống → Booking ─────────────────────────────────────────
  if (showBooking || !isOccupied) {
    return (
      <BookingScreen
        room={{ id: room.id, code: room.label, name: room.label, floor: extractFloor(room.label), monthly_price: room.monthly_price, product_id: room.product_id }}
        onClose={() => { setShowBooking(false); onBack(); }}
        onConfirm={() => { setShowBooking(false); onBack(); }}
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // ─── Case: Đổi phòng ─────────────────────────────────────────────────────
  if (view === 'switch') {
    return (
      <RoomSwitchView
        room={room} details={details} switchFloor={switchFloor} setSwitchFloor={setSwitchFloor}
        availableRooms={availableRooms} selectedNewRoom={selectedNewRoom} setSelectedNewRoom={setSelectedNewRoom}
        handleSwap={handleSwap} formatPrice={fmt} extractFloor={extractFloor} setView={setView}
        themedColors={colors} t={t}
      />
    );
  }

  // ─── Case: Chỉnh sửa ─────────────────────────────────────────────────────
  if (view === 'edit') {
    // Nếu các state edit chưa có dữ liệu (lần đầu vào màn edit), sync từ details
    if (editTenant === '' && details?.customer_name) {
      setEditTenant(details.customer_name);
      setEditPhone(details.customer_phone || '');
      setEditCccd(details.cccd || '');
      setEditRentPrice(String(details.rent_amount || room.monthly_price || 0));
      setEditElectricOld(String(details.electric_reading_init || 0));
      setEditWaterOld(String(details.water_reading_init || 0));
    }

    const editData = {
      tenant: editTenant,
      phone: editPhone,
      cccd: editCccd,
      rentPrice: editRentPrice,
      electricOld: editElectricOld,
      electricNew: electricNew,
      electricRate: String(electricRate),
      waterOld: editWaterOld,
      waterNew: waterNew,
      waterRate: String(waterRate),
    };

    const handleSetEditData = (newData: any) => {
      if (newData.tenant !== undefined) {setEditTenant(newData.tenant);}
      if (newData.phone !== undefined) {setEditPhone(newData.phone);}
      if (newData.cccd !== undefined) {setEditCccd(newData.cccd);}
      if (newData.rentPrice !== undefined) {setEditRentPrice(newData.rentPrice);}
      if (newData.electricOld !== undefined) {setEditElectricOld(newData.electricOld);}
      if (newData.electricNew !== undefined) {setElectricNew(newData.electricNew);}
      if (newData.electricRate !== undefined) {setElectricRate(Number(newData.electricRate));}
      if (newData.waterOld !== undefined) {setEditWaterOld(newData.waterOld);}
      if (newData.waterNew !== undefined) {setWaterNew(newData.waterNew);}
      if (newData.waterRate !== undefined) {setWaterRate(Number(newData.waterRate));}
    };

    const onSaveEdit = async () => {
      try {
        setLoading(true);
        await RoomActionService.editRoomDetails({
          storeId: 'store-001',
          variantId: room.id,
          fullName: editTenant,
          phone: editPhone,
          idNumber: editCccd,
          rentAmount: Number(editRentPrice),
          electricRate: electricRate,
          waterRate: waterRate,
          electricReadingInit: Number(editElectricOld),
          waterReadingInit: Number(editWaterOld),
          // Nếu có nhập số mới thì coi như cập nhật luôn?
          // Thực tế editRoomDetails chủ yếu sửa thông tin nền.
        });
        Alert.alert(t('common.ok'), t('roomDetail.success.update') || t('roomDetail.save'));
        await loadDetails();
        setView('detail');
      } catch (err) {
        Alert.alert(t('common.error'), String(err));
      } finally {
        setLoading(false);
      }
    };

    return (
      <RoomEditView
        setView={setView}
        handleUpdateEdit={onSaveEdit}
        room={room}
        editData={editData}
        setEditData={handleSetEditData}
        themedColors={colors}
        t={t}
      />
    );
  }

  // ─── Case: Lịch sử ───────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <RoomHistoryView
        room={room} details={details} setView={setView} themedColors={colors} t={t}
      />
    );
  }

  // ─── Màn hình Chi tiết chính ─────────────────────────────────────────────
  const dueDate = details?.end_date ?? '';
  const isOverdue = dueDate && new Date(dueDate) < new Date();

  // Calculate next monthly due date for long-term rentals
  let nextMonthlyDueDate = '';
  if (isLongTerm && details?.billing_day) {
    const now = new Date();
    const currentDay = now.getDate();
    const billingDay = details.billing_day;
    
    if (currentDay < billingDay) {
      // Next billing is this month
      nextMonthlyDueDate = `${billingDay}/${now.getMonth() + 1}/${now.getFullYear()}`;
    } else {
      // Next billing is next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
      nextMonthlyDueDate = `${billingDay}/${nextMonth.getMonth() + 1}/${nextMonth.getFullYear()}`;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── HEADER ── */}
      <View style={[s.header, { backgroundColor: colors.surface, borderColor: colors.border, justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text, position: 'relative' }]}>{t('roomDetail.title')}</Text>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={s.iconBtn}>
          <Icon name="more-vert" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        automaticallyAdjustContentInsets={false}>

        {/* ── CARD PHÒNG ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[s.roomIcon, { backgroundColor: colors.primaryLight, width: 62, height: 62 }]}>
              <Icon name="meeting-room" size={34} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16, flexShrink: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minWidth: '100%' }}>
                <Text style={[s.roomName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {details?.variant_name || room.label}
                </Text>
                <View style={[s.badge, { backgroundColor: colors.primary }]}>
                  <Text style={s.badgeText}>{t('roomDetail.statusRent')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Icon name="person" size={17} color={colors.textSecondary} />
                <Text style={[s.tenantName, { color: colors.text, marginLeft: 5 }]} numberOfLines={1} ellipsizeMode="tail">
                  {details?.customer_name || '---'}
                </Text>
              </View>
              {dueDate ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Icon name="event" size={14} color={colors.textSecondary} />
                  <Text style={[s.dueText, { color: colors.textSecondary }]}>
                    {'  '}Checkout: {details?.check_out_time ?? '12:00'} – {dueDate}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── THÔNG TIN KHÁCH HÀNG ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('roomDetail.customerInfo')}</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow icon="phone" label={t('roomDetail.phone')} value={details?.customer_phone || '---'} colors={colors} />
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <InfoRow icon="badge" label={t('roomDetail.idCard')} value={details?.cccd || '---'} colors={colors} />
        </View>

        {/* ── DỊCH VỤ & TIỀN PHÒNG ── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('roomDetail.serviceAndRent')}</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* ── TIỀN PHÒNG ── */}
          <View style={s.sectionHeader}>
            <Icon name="home" size={18} color={colors.primary} />
            <Text style={[s.sectionHeaderText, { color: colors.text }]}>{t('roomDetail.roomRent')}</Text>
          </View>

          {/* Ngắn hạn: Hiển thị breakdown chi tiết */}
          {!isLongTerm && details?.price_breakdown && details.price_breakdown.length > 0 ? (
            <View style={s.priceDetailBox}>
              {details.price_breakdown.map((item: any, index: number) => (
                <View key={index} style={s.breakdownItem}>
                  <Text style={[s.breakdownDesc, { color: colors.textSecondary }]}>
                    {item.description || `${item.type === 'hour' ? t('roomDetail.hour') : t('roomDetail.day')}: ${item.quantity} × ${fmt(item.unitPrice)}`}
                  </Text>
                  <Text style={[s.breakdownAmount, { color: colors.text, fontWeight: '700' }]}>
                    {fmt(item.amount)}
                  </Text>
                </View>
              ))}
              <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
              <View style={s.priceTotalRow}>
                <Text style={[s.priceTotalLabel, { color: colors.textSecondary }]}>{t('roomDetail.totalRoomRent')}</Text>
                <Text style={[s.priceTotalValue, { color: colors.primary, fontWeight: '800' }]}>
                  {fmt(rentAmount)}
                </Text>
              </View>
            </View>
          ) : (
            /* Dài hạn: Hiển thị giá cố định */
            <View style={s.priceDetailBox}>
              <Text style={[s.priceDescription, { color: colors.textSecondary }]}>
                {t('roomDetail.rentFixed')}
              </Text>
              <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
              <View style={s.priceTotalRow}>
                <Text style={[s.priceTotalLabel, { color: colors.textSecondary }]}>{t('roomDetail.monthPrice')}</Text>
                <Text style={[s.priceTotalValue, { color: colors.primary, fontWeight: '800' }]}>
                  {fmt(rentAmount)}
                </Text>
              </View>
            </View>
          )}

          <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

          {/* ── DỊCH VỤ ── */}
          <View style={s.sectionHeader}>
            <Icon name="room-service" size={18} color={colors.warning} />
            <Text style={[s.sectionHeaderText, { color: colors.text }]}>{t('roomDetail.services')}</Text>
          </View>

          {billServices.length > 0 ? (
            <View style={s.servicesList}>
              {billServices.map((item: any, index: number) => (
                <View key={index} style={s.serviceItem}>
                  <View style={s.serviceItemLeft}>
                    <Text style={[s.serviceName, { color: colors.text }]}>{item.line_description}</Text>
                    <Text style={[s.serviceQty, { color: colors.textSecondary }]}>
                      {item.quantity} × {fmt(item.unit_price)}
                    </Text>
                  </View>
                  <Text style={[s.serviceAmount, { color: colors.text, fontWeight: '700' }]}>
                    {fmt(item.amount)}
                  </Text>
                </View>
              ))}
              <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
              <View style={s.priceTotalRow}>
                <Text style={[s.priceTotalLabel, { color: colors.textSecondary }]}>{t('roomDetail.totalServices')}</Text>
                <Text style={[s.priceTotalValue, { color: colors.warning, fontWeight: '800' }]}>
                  {fmt(serviceAmount)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[s.noServiceText, { color: colors.textSecondary }]}>{t('roomDetail.noServices')}</Text>
          )}

          <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

          {/* ── TỔNG KẾT THANH TOÁN ── */}
          <View style={s.sectionHeader}>
            <Icon name="receipt" size={18} color={colors.success} />
            <Text style={[s.sectionHeaderText, { color: colors.text }]}>{t('roomDetail.paymentSummary')}</Text>
          </View>

          <View style={s.paymentSummary}>
            <View style={s.paymentRow}>
              <Text style={[s.paymentLabel, { color: colors.textSecondary }]}>{t('roomDetail.totalRentAmount')}</Text>
              <Text style={[s.paymentValue, { color: colors.text }]}>{fmt(rentAmount)}</Text>
            </View>
            <View style={s.paymentRow}>
              <Text style={[s.paymentLabel, { color: colors.textSecondary }]}>{t('roomDetail.totalServiceAmount')}</Text>
              <Text style={[s.paymentValue, { color: colors.text }]}>{fmt(extraTotal)}</Text>
            </View>
            
            {/* Tiền cọc - hiển thị khác nhau cho Ngắn hạn / Dài hạn */}
            {!isLongTerm && details?.deposit_amount && details.deposit_amount > 0 ? (
              <View style={s.paymentRow}>
                <Text style={[s.paymentLabel, { color: colors.textSecondary }]}>{t('roomDetail.depositApplied')}</Text>
                <Text style={[s.paymentValue, { color: colors.danger, fontWeight: '700' }]}>
                  - {fmt(details.deposit_amount)}
                </Text>
              </View>
            ) : isLongTerm && details?.deposit_amount && details.deposit_amount > 0 ? (
              <View style={{ marginTop: 8 }}>
                <View style={s.paymentRow}>
                  <Text style={[s.paymentLabel, { color: colors.textSecondary }]}>{t('roomDetail.depositHeld')}</Text>
                  <Text style={[s.paymentValue, { color: colors.warning, fontWeight: '700' }]}>
                    {fmt(details.deposit_amount)}
                  </Text>
                </View>
                <Text style={[s.depositNote, { color: colors.textSecondary, fontSize: 11, marginTop: 4, lineHeight: 16 }]}>
                  {t('roomDetail.depositNote')}
                </Text>
              </View>
            ) : null}

            <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
            
            <View style={s.paymentRow}>
              <Text style={[s.paymentLabel, { color: colors.textSecondary }]}>{t('roomDetail.paidAmount')}</Text>
              <Text style={[s.paymentValue, { color: colors.success, fontWeight: '700' }]}>
                {fmt(displayPaidAmount)}
              </Text>
            </View>

            <View style={[s.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
            
            <View style={[s.finalPaymentRow, { backgroundColor: colors.primaryLight }]}>
              <View>
                <Text style={[s.finalPaymentLabel, { color: colors.primary, fontWeight: '800' }]}>{t('roomDetail.remainingToPay')}</Text>
                {!isLongTerm && (
                  <Text style={{ fontSize: 10, color: colors.primary, marginTop: 2, opacity: 0.8 }}>
                    {t('roomDetail.remainingNote')}
                  </Text>
                )}
              </View>
              <Text style={[s.finalPaymentValue, { color: colors.primary, fontWeight: '900', fontSize: 20 }]}>
                {fmt(remainingAmount)}
              </Text>
            </View>
          </View>

          {/* Dòng điện - chỉ hiển thị cho hợp đồng dài hạn */}
          {isLongTerm && (
            <>
              <ServiceLineMeter
                icon="bolt"
                iconColor={colors.yellow}
                name={t('roomDetail.electric')}
                unit="kWh"
                oldVal={eOld}
                newVal={electricNew}
                onChangeNew={setElectricNew}
                amount={eAmount}
                fmt={fmt}
                colors={colors}
                t={t}
              />
              <View style={[s.divider, { backgroundColor: colors.border }]} />

              {/* Dòng nước - chỉ hiển thị cho hợp đồng dài hạn */}
              <ServiceLineMeter
                icon="water-drop"
                iconColor={colors.blue}
                name={t('roomDetail.water')}
                unit="m³"
                oldVal={wOld}
                newVal={waterNew}
                onChangeNew={setWaterNew}
                amount={wAmount}
                fmt={fmt}
                colors={colors}
                t={t}
              />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
            </>
          )}
        </View>

        {/* ── DỊCH VỤ THÊM (dùng lại từ BookingScreen) ── */}
        <ServicesSection
          form={fakeForm}
          availableServices={availableServices}
          updateForm={updateServicesForm}
          formatVND={fmt}
          t={t}
          themedColors={{
            ...colors,
            primaryLight: colors.primaryLight,
            textHint: colors.textSecondary,
            surfaceAlt: colors.bg,
            danger: colors.danger,
          }}
        />

        <View style={[s.debtHeader, { borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>{t('roomDetail.debt.title')}</Text>
          {dueDate ? <Text style={[s.debtDue, { color: colors.textSecondary }]}>– {t('roomDetail.debt.dueDate', { date: dueDate })}</Text> : null}
        </View>
        <View style={[s.card, s.debtCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.debtRow}>
            <DebtCol label={t('roomDetail.debt.payable')} value={fmt(payableAmount)} valueColor={colors.text} subLabels={payableSubLabels} />
            <DebtCol label={t('roomDetail.debt.paid')} value={fmt(displayPaidAmount)} valueColor={colors.success} />
            <DebtCol
              label={t('roomDetail.debt.remaining')}
              value={isOverdue ? t('roomDetail.debt.overdue') : fmt(remainingAmount)}
              valueColor={isOverdue ? '#fff' : colors.danger}
              badge={isOverdue}
            />
          </View>
          {/* Hiển thị tiền cọc đang giữ */}
          {details?.deposit_amount && details.deposit_amount > 0 && (
            <View style={[s.depositRow, { borderTopColor: colors.border }]}>
              <Icon name="account-balance-wallet" size={16} color={colors.warning} />
              <Text style={[s.depositLabel, { color: colors.textSecondary }]}>
                {isLongTerm ? t('roomDetail.deposit.held') : t('roomDetail.deposit.offset')}
              </Text>
              <Text style={[s.depositAmount, { color: colors.warning }]}>{fmt(details.deposit_amount)}</Text>
            </View>
          )}
        </View>

        {/* ── NÚT HÀNH ĐỘNG ── */}
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleCollect}>
          <Icon name="payment" size={20} color="#fff" />
          <Text style={s.primaryBtnText}>{t('roomDetail.collectMoney')}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <TouchableOpacity style={[s.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setView('history')}>
            <Icon name="history" size={18} color={colors.text} />
            <Text style={[s.secondaryBtnText, { color: colors.text }]}>{t('roomDetail.history')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setView('edit')}>
            <Icon name="edit" size={18} color={colors.text} />
            <Text style={[s.secondaryBtnText, { color: colors.text }]}>{t('roomDetail.edit')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MENU MODAL ── */}
      {showMenu && (
        <Modal visible={showMenu} animationType="fade" transparent onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            <View style={[s.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[s.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowMenu(false);
                  handleCheckOut();
                }}
              >
                <Icon name="logout" size={20} color={colors.danger} />
                <Text style={[s.menuItemText, { color: colors.danger }]}>{t('roomDetail.checkout')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── PAYMENT MODAL ── */}
      {showPaymentModal && (
        <Modal visible={showPaymentModal} animationType="slide" transparent onRequestClose={() => setShowPaymentModal(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPaymentModal(false)}>
            <View style={[s.paymentModal, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
              <View style={[s.modalDragIndicator, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={[s.modalHeader, { borderBottomWidth: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 16 }]}>
                <Text style={[s.modalTitle, { color: colors.text, marginBottom: 0, fontSize: 18 }]}>
                  {t('roomDetail.collectMonthlyPayment', { month: new Date().getMonth() + 1, year: new Date().getFullYear() })}
                </Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={{ backgroundColor: colors.bg, padding: 6, borderRadius: 16 }}>
                  <Icon name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Thống kê (Statistics) */}
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{t('roomDetail.debt.payable')}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{fmt(remainingAmount)}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{t('roomDetail.debt.paid')}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.success }}>{fmt(Number(partialAmount || 0))}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{t('roomDetail.debt.remaining')}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{fmt(Math.max(0, remainingAmount - (Number(partialAmount || 0))))}</Text>
                  </View>
                </View>
                {isLongTerm && (
                  <View style={{ backgroundColor: colors.primaryLight, paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                    <Icon name="calendar-today" size={12} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>{t('roomDetail.payment.nextDueDate', { date: nextMonthlyDueDate || '---' })}</Text>
                  </View>
                )}
              </View>

              {/* Amount input block */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{t('roomDetail.payment.actualCollect')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 4, minWidth: 200, justifyContent: 'center' }}>
                  <TextInput
                    style={{ fontSize: 32, fontWeight: '800', color: colors.primary, textAlign: 'center', padding: 0, minWidth: 150 }}
                    value={partialAmount !== '' ? Number(partialAmount).toLocaleString('vi-VN') : ''}
                    onChangeText={(val) => {
                      const numericValue = val.replace(/\D/g, '');
                      setPartialAmount(numericValue);
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 4, marginLeft: 4 }}>đ</Text>
                </View>
              </View>

              {/* Action Options */}
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, backgroundColor: colors.primaryLight }}
                  onPress={() => setPartialAmount(String(remainingAmount))}
                >
                  <Icon name="refresh" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{t('roomDetail.resetFullAmount')}</Text>
                </TouchableOpacity>
              </View>

              {/* Nút lưu */}
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primary, marginTop: 4, marginBottom: Platform.OS === 'ios' ? 10 : 0 }]}
                onPress={async () => {
                  try {
                    const finalAmount = parseFloat(partialAmount || String(remainingAmount));
                    if (finalAmount <= 0) {
                      Alert.alert(t('roomDetail.error.title'), t('roomDetail.payment.errZero'));
                      return;
                    }

                    await RoomActionService.collectMonthlyPayment({
                      storeId: 'store-001',
                      variantId: room.id,
                      electricNew: isLongTerm ? eNew : 0,
                      waterNew: isLongTerm ? wNew : 0,
                      paymentAmount: finalAmount,
                      extraServices: services.map((s: any) => ({ productId: s.id, name: s.name, quantity: s.qty, unitPrice: s.unitPrice, unitId: s.unitId })),
                    });
                    Alert.alert(t('common.ok'), t('roomDetail.success.collect'));
                    setShowPaymentModal(false);
                    loadDetails();
                  } catch (err) {
                    Alert.alert(t('roomDetail.error.title'), String((err as any)?.message ?? err));
                  }
                }}
              >
                <Text style={[s.primaryBtnText, { marginRight: 8 }]}>{t('roomDetail.collectBtn')}</Text>
                <Icon name="payment" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, colors }: any) {
  return (
    <View style={s.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon name={icon} size={18} color={colors.textSecondary} />
        <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[s.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ServiceLineFixed({ icon, iconColor, name, sub, amount, fmt, colors }: any) {
  return (
    <View style={s.svcRow}>
      <View style={[s.svcIcon, { backgroundColor: iconColor + '22' }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, marginLeft: 10, flexShrink: 0 }}>
        <Text style={[s.svcName, { color: colors.text }]}>{name}</Text>
        <Text style={[s.svcSub, { color: colors.textSecondary }]}>{sub}</Text>
      </View>
      <Text style={[s.svcAmount, { color: colors.text }]}>{fmt(amount)}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function ServiceLineMeter({ icon, iconColor, name, unit, oldVal, newVal, onChangeNew, amount, fmt, colors, t }: any) {
  return (
    <View style={s.svcRow}>
      <View style={[s.svcIcon, { backgroundColor: iconColor + '22' }]}>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, marginLeft: 10, flexShrink: 0 }}>
        <Text style={[s.svcName, { color: colors.text }]}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={[s.svcSub, { color: colors.textSecondary, fontWeight: 'bold' }]}>{t('roomDetail.old')} </Text>
          <Text style={[s.svcSub, { color: colors.textSecondary }]}>{oldVal} {unit}</Text>
          <Text style={[s.svcSub, { color: colors.textSecondary, marginLeft: 8, fontWeight: 'bold' }]}>{t('roomDetail.new')} </Text>
          <TextInput
            style={[s.meterInput, { borderColor: colors.border, color: colors.primary, backgroundColor: colors.bg }]}
            value={newVal}
            onChangeText={onChangeNew}
            keyboardType="numeric"
            placeholder="0"
          />
          <Text style={[s.svcSub, { color: colors.textSecondary, marginLeft: 4 }]}>{unit}</Text>
        </View>
      </View>
      <Text style={[s.svcAmount, { color: colors.text }]}>{fmt(amount)}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
}

function DebtCol({ label, value, valueColor, badge, subLabels }: any) {
  return (
    <View style={{ alignItems: 'center', flex: 1, flexShrink: 0 }}>
      <Text style={s.debtLabel}>{label}</Text>
      {badge ? (
        <View style={s.overdueBadge}>
          <Text style={s.overdueText}>{value}</Text>
        </View>
      ) : (
        <Text style={[s.debtValue, { color: valueColor }]}>{value}</Text>
      )}
      {subLabels && subLabels.map((sl: string, idx: number) => (
        <Text key={idx} style={[s.debtSubLabel, { color: idx === 0 && sl.includes('(') ? '#F59E0B' : '#6B7280' }]}>
          {sl}
        </Text>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, minWidth: '100%' },
  headerTitle: { fontSize: 17, fontWeight: '800', position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: 0 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', zIndex: 1 },

  card: { borderRadius: 16, borderWidth: 1, marginBottom: 16, padding: 16 },
  roomIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  tenantName: { fontSize: 15, fontWeight: '700' },
  dueText: { fontSize: 13, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginTop: 20, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, minWidth: '100%' },
  infoLabel: { fontSize: 14, marginLeft: 10 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 12 },

  svcRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, minWidth: '100%' },
  svcIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  svcName: { fontSize: 14, fontWeight: '600' },
  svcSub: { fontSize: 12, marginTop: 2 },
  svcAmount: { fontSize: 14, fontWeight: '700', minWidth: 80, textAlign: 'right' },

  addSvcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, margin: 14, paddingVertical: 12, gap: 6 },
  addSvcText: { fontSize: 14, fontWeight: '600' },

  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18, minWidth: '100%' },
  subtotalLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  subtotalValue: { fontSize: 22, fontWeight: '900' },

  debtHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8, minWidth: '100%' },
  debtDue: { fontSize: 12 },
  debtCard: { paddingVertical: 16, paddingHorizontal: 8 },
  debtRow: { flexDirection: 'row' },
  debtLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.8, marginBottom: 8 },
  debtValue: { fontSize: 16, fontWeight: '800' },
  debtSubLabel: { fontSize: 10, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  overdueBadge: { backgroundColor: '#E53935', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  overdueText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  depositRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1 },
  depositLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  depositAmount: { fontSize: 14, fontWeight: '800' },
  priceBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  priceBreakdownText: { fontSize: 12, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  // New styles for redesigned payment section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionHeaderText: { fontSize: 16, fontWeight: '800' },
  priceDetailBox: { paddingVertical: 12, paddingHorizontal: 4 },
  priceDescription: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  breakdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  breakdownDesc: { fontSize: 12, fontWeight: '500', flex: 1 },
  breakdownAmount: { fontSize: 13, fontWeight: '700' },
  priceTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceTotalLabel: { fontSize: 14, fontWeight: '700' },
  priceTotalValue: { fontSize: 18, fontWeight: '900' },
  servicesList: { paddingVertical: 8 },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  serviceItemLeft: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: '700' },
  serviceQty: { fontSize: 13, marginTop: 3 },
  serviceAmount: { fontSize: 15, fontWeight: '800' },
  noServiceText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  paymentSummary: { paddingVertical: 12, paddingHorizontal: 4, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 12, marginTop: 8 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  paymentLabel: { fontSize: 14, fontWeight: '600' },
  paymentValue: { fontSize: 15, fontWeight: '700' },
  finalPaymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginTop: 12, borderWidth: 2 },
  finalPaymentLabel: { fontSize: 15, fontWeight: '800' },
  finalPaymentValue: { fontSize: 22, fontWeight: '900' },
  depositNote: { fontStyle: 'italic' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 18, gap: 10, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, borderWidth: 1, gap: 6, flexShrink: 0 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  paymentModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  modalDragIndicator: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  svcPickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, minWidth: '100%' },
  meterInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 70, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  menuContainer: { position: 'absolute', top: 60, right: 12, borderRadius: 12, borderWidth: 1, minWidth: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  menuItemText: { fontSize: 15, fontWeight: '600' },
});
