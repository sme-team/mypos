/**
 * @file: BookingScreen.tsx
 * @description: Màn hình nghiệp vụ ĐĂNG KÝ LƯU TRÚ (Check-in).
 * Vai trò: Thực hiện quy trình Check-in cho phòng đang trống (Available).
 * Bao gồm: Chọn khách hàng, chọn dịch vụ, thiết lập hợp đồng và chốt cọc.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

// Các service xử lý dữ liệu và nghiệp vụ
import { PosQueryService } from '../../services/PosServices/PosQueryService';
import customerService from '../../services/ResidentServices/CustomerService';
import RoomActionService from '../../services/ResidentServices/RoomActionService';

// Import Types
import { BookingForm, ViewMode } from '../../components/booking/types';

// Import Components đã được bóc tách
import { SectionLabel, FieldInput } from '../../components/booking/ui/SharedFields';
import { RoomCard } from '../../components/booking/ui/RoomCard';
import { TenantSection } from '../../components/booking/forms/TenantSection';
import { ServicesSection } from '../../components/booking/forms/ServicesSection';
import { LongTermForm } from '../../components/booking/forms/LongTermForm';
import { ShortTermForm } from '../../components/booking/forms/ShortTermForm';
import { LongTermSummary } from '../../components/booking/summaries/LongTermSummary';
import { ShortTermSummary } from '../../components/booking/summaries/ShortTermSummary';
import { IDScannerModal, CCCDData } from '../../components/booking/modals/IDScannerModal';

const BookingScreen = ({ route, navigation, ...props }: any) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // ─── Cấu hình màu sắc theo Theme (Dark/Light) ───────────────────────────
  const themedColors = useMemo(() => ({
    primary: '#185FA5',
    primaryLight: isDark ? '#1E293B' : '#E6F1FB',
    primaryMid: '#378ADD',
    text: isDark ? '#F1F5F9' : '#1A1A1A',
    textSecondary: isDark ? '#94A3B8' : '#6B7280',
    textHint: isDark ? '#64748B' : '#9CA3AF',
    border: isDark ? '#334155' : '#E5E7EB',
    borderFocus: '#378ADD',
    bg: isDark ? '#0F172A' : '#F9FAFB',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    surfaceAlt: isDark ? '#111827' : '#F3F4F6',
    danger: '#E24B4A',
    success: '#1D9E75',
  }), [isDark]);

  // Styles chung của màn hình (Chỉ giữ lại style layout chính)
  const screenStyles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: themedColors.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: themedColors.border,
      backgroundColor: themedColors.surface,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: themedColors.text },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: { flex: 1, backgroundColor: themedColors.bg },
    scrollContent: { padding: 16 },
    card: {
      backgroundColor: themedColors.surface,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      padding: 14,
    },
    toggleRow: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      alignItems: 'center',
      backgroundColor: themedColors.surface,
    },
    toggleBtnActive: { backgroundColor: themedColors.primary, borderColor: themedColors.primary },
    toggleBtnText: { fontSize: 13, fontWeight: '500', color: themedColors.textSecondary },
    toggleBtnTextActive: { color: '#fff' },
    toggleBtnSub: { fontSize: 10, color: themedColors.textHint, marginTop: 2 },
    toggleBtnSubActive: { color: 'rgba(255,255,255,0.75)' },
    confirmBtn: {
      backgroundColor: themedColors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    confirmBtnDisabled: { backgroundColor: themedColors.textHint, opacity: 0.6 },
    confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    summaryCard: {
      backgroundColor: themedColors.primaryLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: themedColors.primaryMid,
    },
    summaryTitle: { fontSize: 15, fontWeight: '800', color: themedColors.primary, marginBottom: 12, textTransform: 'uppercase' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(55,138,221,0.2)' },
    summaryLabel: { fontSize: 13, color: themedColors.textSecondary },
    summaryValue: { fontSize: 14, color: themedColors.text, fontWeight: '700' },
    summaryTotalLabel: { fontSize: 15, fontWeight: '800', color: themedColors.primary },
    summaryTotalValue: { fontSize: 18, fontWeight: '900', color: themedColors.primary },
  }), [themedColors]);

  // ─── State & Dữ liệu ────────────────────────────────────────────────────
  const room = route?.params?.room || props.room;
  const storeId = route?.params?.storeId || props.storeId || 'store-001';
  const onClose = props.onClose || (() => navigation?.goBack());
  const onConfirmProp = props.onConfirm;

  // Khởi tạo trạng thái form mặc định
  const [form, setForm] = useState<BookingForm>({
    stayType: 'long_term',
    tenantTab: 'existing',
    searchQuery: '',
    deposit: room?.price || 0,
    note: '',
    services: [],
    contractStart: new Date().toISOString().split('T')[0],
    contractDuration: '1',
    monthlyPrice: room?.price || 0,
    electricStart: '0',
    waterStart: '0',
    fullName: '',
    phone: '',
    idCard: '',
    checkinDate: new Date().toISOString().split('T')[0],
    checkinTime: '14:00',
    checkoutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    checkoutTime: '12:00',
    adults: 1,
    children: 0,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('form'); // 'form' hoặc 'summary' (xác nhận)
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Load dữ liệu ban đầu
  useEffect(() => {
    if (!room?.id) {
      Alert.alert('Lỗi', t('Room information not found'));
      onClose();
      return;
    }
    loadInitialData();
  }, [room?.id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Lấy danh sách khách hàng và dịch vụ từ Server
      const custs = await customerService.getCustomerPickerList(storeId);
      setCustomers(custs);
      const svcs = await PosQueryService.getServices(storeId);
      setAvailableServices(svcs.map(s => ({
        ...s,
        qty: 1,
        selected: false,
      })));
    } catch (err) {
      console.error('[BookingScreen] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Logic lọc tìm kiếm khách hàng
  const filteredCustomers = useMemo(() => {
    if (!form.searchQuery) return customers.slice(0, 5);
    const q = form.searchQuery.toLowerCase();
    return customers.filter((c: any) =>
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.id_number?.includes(q)
    );
  }, [customers, form.searchQuery]);

  const formatVND = useCallback((val: number) => {
    if (val === undefined || val === null) return '0đ';
    return val.toLocaleString('vi-VN') + 'đ';
  }, []);

  const updateForm = useCallback((partial: Partial<BookingForm>) => setForm(prev => ({ ...prev, ...partial })), []);

  /**
   * Xử lý dữ liệu sau khi quét CCCD hoặc nhận diện OCR thành công.
   * Dữ liệu trả về từ Modal sẽ được map vào các trường tương ứng của form.
   */
  const handleIDScanned = useCallback((data: CCCDData) => {
    updateForm({
      // Trường hiện trên UI
      fullName: data.fullName || form.fullName,
      idCard: data.idCard || form.idCard,
      // Trường ẩn — chỉ lưu vào DB khi submit
      dateOfBirth: data.dateOfBirth || '',
      gender: data.gender || '',
      address: data.address || '',
      issuedDate: data.issuedDate || '',
      oldIdNumber: data.oldIdNumber || '',
    });
    setScannerVisible(false);
  }, [form.fullName, form.idCard]);

  // ─── Xử lý Gửi thông tin (Final Submission) ─────────────────────────────
  const processFinalSubmission = async () => {
    // Validate thông tin khách hàng
    if (form.tenantTab === 'existing' && !selectedCustomer) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách hàng'); return;
    }
    if (form.tenantTab === 'new' && (!form.fullName || !form.phone)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ họ tên và SĐT khách mới'); return;
    }

    setConfirming(true);
    try {
      if (form.stayType === 'long_term') {
        // Xử lý Check-in Dài hạn
        const duration = parseInt(form.contractDuration, 10) || 12;
        await RoomActionService.checkInLongTerm({
          storeId,
          variantId: room.id,
          productId: room.product_id,
          customerId: form.tenantTab === 'existing' ? selectedCustomer.id : '',
          startDate: form.contractStart,
          durationMonths: duration,
          rentAmount: form.monthlyPrice,
          depositAmount: form.deposit,
          electricReadingInit: parseInt(form.electricStart, 10) || 0,
          waterReadingInit: parseInt(form.waterStart, 10) || 0,
          extraServices: form.services.map(s => ({
            productId: s.id,
            variantId: s.variantId,
            unitId: s.unitId,
            name: s.name,
            quantity: s.qty,
            unitPrice: s.unitPrice
          })),
          notes: form.note,
        });
      } else {
        // Xử lý Check-in Ngắn hạn
        await RoomActionService.checkInShortTerm({
          storeId,
          variantId: room.id,
          productId: room.product_id,
          fullName: form.fullName,
          phone: form.phone,
          idNumber: form.idCard,
          // Trường ẩn từ QR CCCD
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          address: form.address,
          checkinDate: form.checkinDate,
          checkinTime: form.checkinTime,
          checkoutDate: form.checkoutDate,
          checkoutTime: form.checkoutTime,
          adults: form.adults,
          children: form.children,
          rentPerNight: room.price,
          extraServices: form.services.map(s => ({
            productId: s.id,
            variantId: s.variantId,
            unitId: s.unitId,
            name: s.name,
            quantity: s.qty,
            unitPrice: s.unitPrice
          })),
          notes: form.note,
        });
      }
      Alert.alert('Thành công', 'Đăng ký cư trú đã được ghi nhận.');
      if (onConfirmProp) onConfirmProp(); else onClose();
    } catch (err) {
      Alert.alert('Lỗi', String(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleNext = () => {
    if (form.tenantTab === 'existing' && !selectedCustomer) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách hàng'); return;
    }
    if (form.tenantTab === 'new' && (!form.fullName || !form.phone)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ họ tên và SĐT khách mới'); return;
    }
    setViewMode('summary');
  };

  // ─── Phần giao diện ─────────────────────────────────────────────────────
  if (!room) return null;

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header điều hướng */}
      <View style={screenStyles.header}>
        <TouchableOpacity
          style={screenStyles.backBtn}
          onPress={viewMode === 'summary' ? () => setViewMode('form') : onClose}
        >
          <Icon name="arrow-back" size={20} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={screenStyles.headerTitle}>
          {viewMode === 'summary'
            ? (form.stayType === 'long_term' ? 'Xác nhận hợp đồng' : 'Xác nhận đặt phòng')
            : 'Đăng ký lưu trú mới'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {viewMode === 'form' ? (
        <ScrollView style={screenStyles.scrollView} contentContainerStyle={screenStyles.scrollContent}>
          
          {/* Thông tin phòng đang đăng ký */}
          <SectionLabel text={t('booking.sections.room')} />
          <RoomCard room={room} t={t} themedColors={themedColors} />
          
          <View style={{ height: 20 }} />

          {/* Phần thông tin khách hàng */}
          <TenantSection
            form={form}
            updateForm={updateForm}
            isCustomerDropdownOpen={isCustomerDropdownOpen}
            setIsCustomerDropdownOpen={setIsCustomerDropdownOpen}
            filteredCustomers={filteredCustomers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            setScannerVisible={setScannerVisible}
            t={t}
            themedColors={themedColors}
          />

          <View style={{ height: 20 }} />

          {/* Lựa chọn loại hình lưu trú */}
          <SectionLabel text={t('booking.sections.stayType')} />
          <View style={screenStyles.toggleRow}>
            <TouchableOpacity
              style={[screenStyles.toggleBtn, form.stayType === 'long_term' && screenStyles.toggleBtnActive]}
              onPress={() => updateForm({ stayType: 'long_term' })}
            >
              <Text style={[screenStyles.toggleBtnText, form.stayType === 'long_term' && screenStyles.toggleBtnTextActive]}>{t('booking.sections.longTerm')}</Text>
              <Text style={[screenStyles.toggleBtnSub, form.stayType === 'long_term' && screenStyles.toggleBtnSubActive]}>{t('booking.sections.longSub')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[screenStyles.toggleBtn, form.stayType === 'short_term' && screenStyles.toggleBtnActive]}
              onPress={() => updateForm({ stayType: 'short_term' })}
            >
              <Text style={[screenStyles.toggleBtnText, form.stayType === 'short_term' && screenStyles.toggleBtnTextActive]}>{t('booking.sections.shortTerm')}</Text>
              <Text style={[screenStyles.toggleBtnSub, form.stayType === 'short_term' && screenStyles.toggleBtnSubActive]}>{t('booking.sections.shortSub')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />

          {/* Form chi tiết tương ứng với loại hình lưu trú */}
          <View style={screenStyles.card}>
            {form.stayType === 'long_term' ?
              <LongTermForm form={form} updateForm={updateForm} t={t} themedColors={themedColors} isDark={isDark} /> :
              <ShortTermForm form={form} updateForm={updateForm} t={t} themedColors={themedColors} />
            }
          </View>

          <View style={{ height: 20 }} />

          {/* Ghi chú thêm */}
          <SectionLabel text={t('booking.sections.notes')} />
          <FieldInput
            value={form.note}
            onChangeText={(v: any) => updateForm({ note: v })}
            placeholder={t('booking.form.notePlaceholder')}
            multiline
            themedColors={themedColors}
          />

          <View style={{ height: 20 }} />

          {/* Danh sách dịch vụ đính kèm */}
          <ServicesSection
            form={form}
            availableServices={availableServices}
            updateForm={updateForm}
            formatVND={formatVND}
            t={t}
            themedColors={themedColors}
          />

          <View style={{ height: 24 }} />

          {/* Tóm tắt nhanh chi phí dự tính */}
          <View style={screenStyles.summaryCard}>
            <Text style={screenStyles.summaryTitle}>{t('booking.sections.summary')}</Text>

            <View style={screenStyles.summaryRow}>
              <Text style={screenStyles.summaryLabel}>{form.stayType === 'long_term' ? t('booking.summary.roomRentMonth') : t('booking.summary.roomRent')}</Text>
              <Text style={screenStyles.summaryValue}>{formatVND(form.stayType === 'long_term' ? form.monthlyPrice : room.price)}</Text>
            </View>

            {form.stayType === 'long_term' && (
              <View style={screenStyles.summaryRow}>
                <Text style={screenStyles.summaryLabel}>{t('booking.summary.deposit')}</Text>
                <Text style={screenStyles.summaryValue}>{formatVND(form.deposit)}</Text>
              </View>
            )}

            {form.services.length > 0 && (
              <View style={screenStyles.summaryRow}>
                <Text style={screenStyles.summaryLabel}>{t('booking.summary.serviceAdd')} ({form.services.length})</Text>
                <Text style={screenStyles.summaryValue}>{formatVND(form.services.reduce((sum, s) => sum + (s.qty * s.unitPrice), 0))}</Text>
              </View>
            )}

            <View style={screenStyles.summaryTotal}>
              <Text style={screenStyles.summaryTotalLabel}>{t('booking.summary.total')}</Text>
              <Text style={screenStyles.summaryTotalValue}>
                {formatVND(
                  (form.stayType === 'long_term' ? form.monthlyPrice + form.deposit : room.price) +
                  form.services.reduce((sum, s) => sum + (s.qty * s.unitPrice), 0)
                )}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[screenStyles.confirmBtn, (confirming || loading) && screenStyles.confirmBtnDisabled]}
            onPress={handleNext}
            disabled={confirming || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={screenStyles.confirmBtnText}>{t('booking.summary.btnNext')}</Text>}
          </TouchableOpacity>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // Hiển thị màn hình Xác nhận Hợp đồng (Summary Mode)
        form.stayType === 'long_term' ? (
          <LongTermSummary
            form={form}
            room={room}
            selectedCustomer={selectedCustomer}
            onEdit={() => setViewMode('form')}
            onConfirm={processFinalSubmission}
            formatVND={formatVND}
            agreedTerms={agreedTerms}
            setAgreedTerms={setAgreedTerms}
            confirming={confirming}
            themedColors={themedColors}
            t={t}
          />
        ) : (
          <ShortTermSummary
            form={form}
            room={room}
            selectedCustomer={selectedCustomer}
            onEdit={() => setViewMode('form')}
            onConfirm={processFinalSubmission}
            formatVND={formatVND}
            confirming={confirming}
            themedColors={themedColors}
            t={t}
          />
        )
      )}

      {/* Modal Quét CCCD / Passport (Chỉ hiện khi scannerVisible = true) */}
      <IDScannerModal 
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleIDScanned}
        themedColors={themedColors}
        t={t}
      />
    </SafeAreaView>
  );
};

export default BookingScreen;