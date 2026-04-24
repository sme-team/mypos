/**
 * @file: RoomDetailScreen.tsx
 * @description: Màn hình CHI TIẾT & VẬN HÀNH phòng đang có khách.
 * Thiết kế: Dịch vụ dạng dòng item, chốt tiền điện/nước, công nợ kỳ này.
 */

import {createModuleLogger, AppModules} from '../../logger';
const logger = createModuleLogger(AppModules.ROOM_DETAIL_SCREEN);

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
    if (partial.services !== undefined) setServices(partial.services);
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
        if (dbDetails.electric_rate) setElectricRate(dbDetails.electric_rate);
        if (dbDetails.water_rate) setWaterRate(dbDetails.water_rate);
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
      logger.error('[RoomDetail] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  const loadAvailableRoomsForSwitch = useCallback(async () => {
    try {
      const allRooms = await RoomQueryService.getAvailableRooms('store-001', room.id);
      setAvailableRooms(allRooms);
    } catch (err) { logger.error(err); }
  }, [room.id]);

  const [switchFloor, setSwitchFloor] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [selectedNewRoom, setSelectedNewRoom] = useState<any>(null);

  useEffect(() => { loadDetails(); }, [loadDetails, room.id]);
  useEffect(() => { if (view === 'switch') loadAvailableRoomsForSwitch(); }, [loadAvailableRoomsForSwitch, view]);

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
  const rentAmount = details?.rent_amount ?? room.monthly_price ?? 0;
  const extraTotal = services.reduce((sum: number, sv: any) => sum + (sv.unitPrice ?? 0) * (sv.qty ?? 1), 0);

  // Tiền điện nước tạm tính
  const eOld = details?.electric_reading_init ?? 0;
  const wOld = details?.water_reading_init ?? 0;
  const eNew = parseFloat(electricNew) || 0;
  const wNew = parseFloat(waterNew) || 0;
  const eDiff = Math.max(0, eNew - eOld);
  const wDiff = Math.max(0, wNew - wOld);
  const eAmount = eDiff * electricRate;
  const wAmount = wDiff * waterRate;
  const meterEstimate = eAmount + wAmount;

  // Gross Total (Phải thu): Tổng tất cả dịch vụ + tiền phòng + nợ cũ
  // Nếu đã có bill, details.total_amount thường đã gồm rent + negative_balance + prev services.
  // Nếu chưa có bill, ta phải cộng thủ công rent và negative_balance.
  const baseAmount = !!details?.current_bill_id 
    ? (details?.total_amount ?? 0) 
    : (rentAmount + (details?.negative_balance ?? 0));
  
  const grossTotal = baseAmount + meterEstimate + extraTotal;

  // Tiền đã trả (từ bill hiện tại)
  const paidAmount = details?.paid_amount ?? 0;

  // Số tiền thực sự còn nợ (Net Remaining)
  const netRemainingDebt = Math.max(0, grossTotal - paidAmount);

  // Hiển thị ở màn hình chính
  const payableAmount = grossTotal;
  const remainingAmount = netRemainingDebt;
  const payableSubLabels: string[] = [];
  if (eNew > 0 || wNew > 0 || extraTotal > 0) {
    payableSubLabels.push(t('roomDetail.estimated'));
  }

  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  // ─── Hành động ────────────────────────────────────────────────────────────


  const handleCollect = () => {
    setPaymentMode('full');
    setPartialAmount(String(netRemainingDebt));
    setShowPaymentModal(true);
  };

  const handleCheckOut = async () => {
    Alert.alert('Xác nhận trả phòng', 'Bạn có chắc chắn muốn trả phòng này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Trả phòng', style: 'destructive',
        onPress: async () => {
          try { await RoomActionService.checkOut('store-001', room.id); onBack(); }
          catch (e) { Alert.alert(t('common.error'), String(e)); }
        }
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
        }
      },
    ]);
  };

  const handleSwap = () => {
    if (!selectedNewRoom) return;
    Alert.alert(
      t('roomDetail.confirmSwap'),
      t('roomDetail.confirmSwapDesc') || 'Bạn có chắc chắn muốn đổi khách sang phòng đã chọn không?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('roomDetail.error.confirm'),
          onPress: async () => {
            try {
              await RoomActionService.swapRoom('store-001', room.id, selectedNewRoom.id, selectedNewRoom.product_id, selectedNewRoom.monthly_price || 0);
              Alert.alert(t('common.ok'), t('roomDetail.success.swap', { name: selectedNewRoom.name }));
              onBack();
            } catch (err) { logger.error(err); }
          }
        }
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
      if (newData.tenant !== undefined) setEditTenant(newData.tenant);
      if (newData.phone !== undefined) setEditPhone(newData.phone);
      if (newData.cccd !== undefined) setEditCccd(newData.cccd);
      if (newData.rentPrice !== undefined) setEditRentPrice(newData.rentPrice);
      if (newData.electricOld !== undefined) setEditElectricOld(newData.electricOld);
      if (newData.electricNew !== undefined) setElectricNew(newData.electricNew);
      if (newData.electricRate !== undefined) setElectricRate(Number(newData.electricRate));
      if (newData.waterOld !== undefined) setEditWaterOld(newData.waterOld);
      if (newData.waterNew !== undefined) setWaterNew(newData.waterNew);
      if (newData.waterRate !== undefined) setWaterRate(Number(newData.waterRate));
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
        Alert.alert(t('common.ok'), t('roomDetail.success.update') || 'Cập nhật thành công');
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

          {/* Dòng tiền phòng */}
          <ServiceLineFixed
            icon="home"
            iconColor={colors.primary}
            name={t('roomDetail.roomRent')}
            sub={t('roomDetail.rentFixed')}
            amount={rentAmount}
            fmt={fmt}
            colors={colors}
          />
          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Dòng điện */}
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

          {/* Dòng nước */}
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
            <DebtCol label={t('roomDetail.debt.paid')} value={fmt(paidAmount)} valueColor={colors.success} />
            <DebtCol
              label={t('roomDetail.debt.remaining')}
              value={isOverdue ? t('roomDetail.debt.overdue') : fmt(remainingAmount)}
              valueColor={isOverdue ? '#fff' : colors.danger}
              badge={isOverdue}
            />
          </View>
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
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{fmt(netRemainingDebt)}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{t('roomDetail.debt.paid')}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.success }}>{fmt(Number(partialAmount || 0))}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{t('roomDetail.debt.remaining')}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{fmt(Math.max(0, netRemainingDebt - (Number(partialAmount || 0))))}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: colors.primaryLight, paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                  <Icon name="calendar-today" size={12} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>{t('roomDetail.payment.nextDueDate', { date: details?.end_date ? new Date(details.end_date).toLocaleDateString('vi-VN') : '---' })}</Text>
                </View>
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
                  onPress={() => setPartialAmount(String(netRemainingDebt))}
                >
                  <Icon name="refresh" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>Đặt lại số tiền đầy đủ</Text>
                </TouchableOpacity>
              </View>

              {/* Nút lưu */}
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primary, marginTop: 4, marginBottom: Platform.OS === 'ios' ? 10 : 0 }]}
                onPress={async () => {
                  try {
                    const finalAmount = parseFloat(partialAmount || String(netRemainingDebt));
                    if (finalAmount <= 0) {
                      Alert.alert(t('roomDetail.error.title'), t('roomDetail.payment.errZero'));
                      return;
                    }

                    await RoomActionService.collectMonthlyPayment({
                      storeId: 'store-001',
                      variantId: room.id,
                      electricNew: eNew,
                      waterNew: wNew,
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
                <Text style={[s.primaryBtnText, { marginRight: 8 }]}>Thu tiền</Text>
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

function ServiceLineMeter({ icon, iconColor, name, unit, oldVal, newVal, onChangeNew, amount, fmt, colors }: any) {
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

  card: { borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  roomIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  tenantName: { fontSize: 15, fontWeight: '700' },
  dueText: { fontSize: 13, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, minWidth: '100%' },
  infoLabel: { fontSize: 14, marginLeft: 10 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 16 },

  svcRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, minWidth: '100%' },
  svcIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
