/**
 * @file: BookingScreen.tsx
 * @description: Màn hình nghiệp vụ ĐĂNG KÝ LƯU TRÚ (Check-in).
 * Vai trò: Thực hiện quy trình Check-in cho phòng đang trống (Available).
 * Bao gồm: Chọn khách hàng, chọn dịch vụ, thiết lập hợp đồng và chốt cọc.
 */

import React, {useState, useEffect, useMemo, useCallback} from 'react';
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
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {useResponsive} from '../../hooks/useResponsive';

// Các service xử lý dữ liệu và nghiệp vụ
import {PosQueryService} from '../../services/PosServices/PosQueryService';
import customerService from '../../services/ResidentServices/CustomerService';
import RoomActionService from '../../services/ResidentServices/RoomActionService';
import {
  ShortTermPriceService,
  ShortTermPriceResult,
} from '../../services/ResidentServices/ShortTermPriceService';

// Import Types
import {BookingForm, ViewMode} from '../../components/booking/types';

// Import Components đã được bóc tách
import {
  SectionLabel,
  FieldInput,
} from '../../components/booking/ui/SharedFields';
import {RoomCard} from '../../components/booking/ui/RoomCard';
import {TenantSection} from '../../components/booking/forms/TenantSection';
import {ServicesSection} from '../../components/booking/forms/ServicesSection';
import {LongTermForm} from '../../components/booking/forms/LongTermForm';
import {ShortTermForm} from '../../components/booking/forms/ShortTermForm';
import {LongTermSummary} from '../../components/booking/summaries/LongTermSummary';
import {ShortTermSummary} from '../../components/booking/summaries/ShortTermSummary';
import {
  IDScannerModal,
  CCCDData,
} from '../../components/booking/modals/IDScannerModal';

const BookingScreen = ({route, navigation, ...props}: any) => {
  const {isDark} = useTheme();
  const {t} = useTranslation();
  const responsive = useResponsive();

  // ─── Cấu hình màu sắc theo Theme (Dark/Light) ───────────────────────────
  const themedColors = useMemo(
    () => ({
      primary: '#185FA5',
      primaryLight: isDark ? '#1E293B' : '#E6F1FB',
      primaryMid: '#378ADD',
      success: '#16A34A',
      successLight: isDark ? '#1E3A2F' : '#DCFCE7',
      warning: '#CA8A04',
      warningLight: isDark ? '#3F3820' : '#FEF9C3',
      error: '#DC2626',
      errorLight: isDark ? '#3F2020' : '#FEE2E2',
      text: isDark ? '#F1F5F9' : '#1A1A1A',
      textSecondary: isDark ? '#94A3B8' : '#6B7280',
      textHint: isDark ? '#64748B' : '#9CA3AF',
      border: isDark ? '#334155' : '#E5E7EB',
      borderFocus: '#378ADD',
      bg: isDark ? '#0F172A' : '#F9FAFB',
      surface: isDark ? '#1E293B' : '#FFFFFF',
      surfaceAlt: isDark ? '#111827' : '#F3F4F6',
      danger: '#E24B4A',
    }),
    [isDark],
  );

  // Styles chung của màn hình (Responsive)
  const screenStyles = useMemo(
    () =>
      StyleSheet.create({
        safeArea: {flex: 1, backgroundColor: themedColors.surface},
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: responsive.containerPadding,
          paddingVertical: responsive.rv({
            smallPhone: 10,
            phone: 12,
            largePhone: 12,
            tablet: 14,
            largeTablet: 16,
            default: 12,
          }),
          borderBottomWidth: 0.5,
          borderBottomColor: themedColors.border,
          backgroundColor: themedColors.surface,
          minWidth: '100%',
        },
        headerTitle: {
          fontSize: responsive.rv({
            smallPhone: 14,
            phone: 15,
            largePhone: 16,
            tablet: 17,
            largeTablet: 18,
            default: 16,
          }),
          fontWeight: '700',
          color: themedColors.text,
        },
        backBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: themedColors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        scrollView: {flex: 1, backgroundColor: themedColors.bg},
        scrollContent: {
          padding: responsive.containerPadding,
          paddingBottom: responsive.rv({
            smallPhone: 80,
            phone: 80,
            largePhone: 80,
            tablet: 100,
            largeTablet: 120,
            default: 80,
          }),
        },
        card: {
          backgroundColor: themedColors.surface,
          borderRadius: responsive.rv({
            smallPhone: 10,
            phone: 12,
            largePhone: 12,
            tablet: 14,
            largeTablet: 16,
            default: 12,
          }),
          borderWidth: 0.5,
          borderColor: themedColors.border,
          padding: responsive.rv({
            smallPhone: 12,
            phone: 14,
            largePhone: 14,
            tablet: 16,
            largeTablet: 18,
            default: 14,
          }),
        },
        toggleRow: {flexDirection: 'row', gap: 8},
        toggleBtn: {
          flex: 1,
          paddingVertical: responsive.rv({
            smallPhone: 8,
            phone: 10,
            largePhone: 10,
            tablet: 12,
            largeTablet: 14,
            default: 10,
          }),
          borderRadius: responsive.rv({
            smallPhone: 6,
            phone: 8,
            largePhone: 8,
            tablet: 10,
            largeTablet: 12,
            default: 8,
          }),
          borderWidth: 0.5,
          borderColor: themedColors.border,
          alignItems: 'center',
          backgroundColor: themedColors.surface,
          flexShrink: 0,
        },
        toggleBtnActive: {
          backgroundColor: themedColors.primary,
          borderColor: themedColors.primary,
        },
        toggleBtnText: {
          fontSize: responsive.rv({
            smallPhone: 11,
            phone: 12,
            largePhone: 13,
            tablet: 14,
            largeTablet: 15,
            default: 13,
          }),
          fontWeight: '500',
          color: themedColors.textSecondary,
        },
        toggleBtnTextActive: {color: '#fff'},
        toggleBtnSub: {
          fontSize: responsive.rv({
            smallPhone: 8,
            phone: 9,
            largePhone: 10,
            tablet: 11,
            largeTablet: 12,
            default: 10,
          }),
          color: themedColors.textHint,
          marginTop: 2,
        },
        toggleBtnSubActive: {color: 'rgba(255,255,255,0.75)'},
        confirmBtn: {
          backgroundColor: themedColors.primary,
          borderRadius: responsive.rv({
            smallPhone: 10,
            phone: 12,
            largePhone: 12,
            tablet: 14,
            largeTablet: 16,
            default: 12,
          }),
          paddingVertical: responsive.rv({
            smallPhone: 14,
            phone: 16,
            largePhone: 16,
            tablet: 18,
            largeTablet: 20,
            default: 16,
          }),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: responsive.rv({
            smallPhone: 6,
            phone: 8,
            largePhone: 8,
            tablet: 10,
            largeTablet: 12,
            default: 8,
          }),
          marginTop: responsive.rv({
            smallPhone: 16,
            phone: 20,
            largePhone: 20,
            tablet: 24,
            largeTablet: 28,
            default: 20,
          }),
        },
        confirmBtnDisabled: {
          backgroundColor: themedColors.textHint,
          opacity: 0.6,
        },
        confirmBtnText: {
          fontSize: responsive.rv({
            smallPhone: 14,
            phone: 15,
            largePhone: 16,
            tablet: 17,
            largeTablet: 18,
            default: 16,
          }),
          fontWeight: '700',
          color: '#fff',
        },
        summaryCard: {
          backgroundColor: themedColors.primaryLight,
          borderRadius: responsive.rv({
            smallPhone: 10,
            phone: 12,
            largePhone: 12,
            tablet: 14,
            largeTablet: 16,
            default: 12,
          }),
          padding: responsive.rv({
            smallPhone: 12,
            phone: 14,
            largePhone: 14,
            tablet: 16,
            largeTablet: 18,
            default: 14,
          }),
          marginBottom: responsive.rv({
            smallPhone: 12,
            phone: 16,
            largePhone: 16,
            tablet: 20,
            largeTablet: 24,
            default: 16,
          }),
          borderWidth: 1,
          borderColor: themedColors.primaryMid,
        },
        summaryTitle: {
          fontSize: responsive.rv({
            smallPhone: 13,
            phone: 14,
            largePhone: 15,
            tablet: 16,
            largeTablet: 17,
            default: 15,
          }),
          fontWeight: '800',
          color: themedColors.primary,
          marginBottom: responsive.rv({
            smallPhone: 10,
            phone: 12,
            largePhone: 12,
            tablet: 14,
            largeTablet: 16,
            default: 12,
          }),
          textTransform: 'uppercase',
        },
        summaryRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: responsive.rv({
            smallPhone: 6,
            phone: 8,
            largePhone: 8,
            tablet: 10,
            largeTablet: 12,
            default: 8,
          }),
          minWidth: '100%',
        },
        summaryTotal: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: responsive.rv({
            smallPhone: 8,
            phone: 10,
            largePhone: 10,
            tablet: 12,
            largeTablet: 14,
            default: 10,
          }),
          paddingTop: responsive.rv({
            smallPhone: 8,
            phone: 10,
            largePhone: 10,
            tablet: 12,
            largeTablet: 14,
            default: 10,
          }),
          borderTopWidth: 1,
          borderTopColor: 'rgba(55,138,221,0.2)',
          minWidth: '100%',
        },
        summaryLabel: {
          fontSize: responsive.rv({
            smallPhone: 11,
            phone: 12,
            largePhone: 13,
            tablet: 14,
            largeTablet: 15,
            default: 13,
          }),
          color: themedColors.textSecondary,
        },
        summaryValue: {
          fontSize: responsive.rv({
            smallPhone: 12,
            phone: 13,
            largePhone: 14,
            tablet: 15,
            largeTablet: 16,
            default: 14,
          }),
          color: themedColors.text,
          fontWeight: '700',
        },
        summaryTotalLabel: {
          fontSize: responsive.rv({
            smallPhone: 13,
            phone: 14,
            largePhone: 15,
            tablet: 16,
            largeTablet: 17,
            default: 15,
          }),
          fontWeight: '800',
          color: themedColors.primary,
        },
        summaryTotalValue: {
          fontSize: responsive.rv({
            smallPhone: 15,
            phone: 16,
            largePhone: 18,
            tablet: 20,
            largeTablet: 22,
            default: 18,
          }),
          fontWeight: '900',
          color: themedColors.primary,
        },
      }),
    [themedColors],
  );

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
    deposit: room?.monthly_price || 0,
    note: '',
    services: [],
    contractStart: new Date().toISOString().split('T')[0],
    contractDuration: '1',
    monthlyPrice: room?.monthly_price || 0,
    electricStart: '0',
    waterStart: '0',
    fullName: '',
    phone: '',
    idCard: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    address: '',
    nationality: '',
    checkinDate: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    checkinTime: '14:00',
    checkoutDate: (() => {
      const d = new Date(Date.now() + 86400000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    checkoutTime: '12:00',
    adults: 1,
    children: 0,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('form'); // 'form' hoặc 'summary' (xác nhận)
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [shortTermPrice, setShortTermPrice] =
    useState<ShortTermPriceResult | null>(null);
  const [loadingShortTermPrice, setLoadingShortTermPrice] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      if (!prev[key]) return prev;
      const copy = {...prev};
      delete copy[key];
      return copy;
    });
  }, []);

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
      setAvailableServices(
        svcs.map(s => ({
          ...s,
          qty: 1,
          selected: false,
        })),
      );
    } catch (err) {
      console.error('[BookingScreen] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tính giá ngắn hạn khi form thay đổi
  useEffect(() => {
    const calculateShortTermPrice = async () => {
      if (form.stayType !== 'short_term' || !room?.id) return;

      setLoadingShortTermPrice(true);
      try {
        const result = await ShortTermPriceService.calculatePrice({
          checkinDate: form.checkinDate,
          checkinTime: form.checkinTime,
          checkoutDate: form.checkoutDate,
          checkoutTime: form.checkoutTime,
          variantId: room.id,
          productId: room.product_id,
          storeId: storeId,
        });
        setShortTermPrice(result);
      } catch (err) {
        console.error('[BookingScreen] Short term price error:', err);
      } finally {
        setLoadingShortTermPrice(false);
      }
    };

    calculateShortTermPrice();
  }, [
    form.stayType,
    form.checkinDate,
    form.checkinTime,
    form.checkoutDate,
    form.checkoutTime,
    room?.id,
    room?.product_id,
    storeId,
  ]);

  // Logic lọc tìm kiếm khách hàng
  const filteredCustomers = useMemo(() => {
    if (!form.searchQuery) return customers.slice(0, 5);
    const q = form.searchQuery.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.id_number?.includes(q),
    );
  }, [customers, form.searchQuery]);

  const formatVND = useCallback((val: number) => {
    if (val === undefined || val === null) return '0đ';
    return val.toLocaleString('vi-VN') + 'đ';
  }, []);

  const updateForm = useCallback(
    (partial: Partial<BookingForm>) => setForm(prev => ({...prev, ...partial})),
    [],
  );

  /**
   * Xử lý dữ liệu sau khi quét CCCD hoặc nhận diện OCR thành công.
   * Dữ liệu trả về từ Modal sẽ được map vào các trường tương ứng của form.
   */
  const handleIDScanned = useCallback(
    (data: CCCDData) => {
      updateForm({
        // Trường hiện trên UI
        fullName: data.fullName || form.fullName,
        idCard: data.idCard || form.idCard,
        // Trường ẩn — chỉ lưu vào DB khi submit
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || '',
        address: data.address || '',
        placeOfOrigin: data.placeOfOrigin || '',
        oldIdNumber: data.oldIdNumber || '',
      });
      setScannerVisible(false);
    },
    [form.fullName, form.idCard],
  );

  // ─── Xử lý Gửi thông tin (Final Submission) ─────────────────────────────
  const processFinalSubmission = async () => {
    // Validate thông tin khách hàng
    if (form.tenantTab === 'existing' && !selectedCustomer) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách hàng');
      return;
    }
    if (form.tenantTab === 'new') {
      const requiredFields = [
        {key: 'fullName', name: 'Họ tên'},
        {key: 'phone', name: 'Số điện thoại'},
        {key: 'idCard', name: 'Số CCCD / Passport'},
        {key: 'dateOfBirth', name: 'Ngày sinh'},
        {key: 'gender', name: 'Giới tính'},
        {key: 'email', name: 'Email'},
        {key: 'address', name: 'Địa chỉ'},
        {key: 'nationality', name: 'Quốc tịch'},
      ];
      for (const field of requiredFields) {
        if (!form[field.key as keyof typeof form]) {
          Alert.alert(
            'Thiếu thông tin',
            `Vui lòng nhập ${field.name} cho khách mới`,
          );
          return;
        }
      }
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
          // Dữ liệu khách mới (nếu customerId rỗng)
          fullName: form.fullName,
          phone: form.phone,
          idNumber: form.idCard,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          email: form.email,
          nationality: form.nationality,
          address: form.address,

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
            unitPrice: s.unitPrice,
          })),
          notes: form.note,
        });
      } else {
        // Xử lý Check-in Ngắn hạn
        await RoomActionService.checkInShortTerm({
          storeId,
          variantId: room.id,
          productId: room.product_id,
          customerId: form.tenantTab === 'existing' ? selectedCustomer.id : '',
          // Dữ liệu khách mới (nếu customerId rỗng)
          fullName: form.fullName,
          phone: form.phone,
          idNumber: form.idCard,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          email: form.email,
          nationality: form.nationality,
          address: form.address,

          checkinDate: form.checkinDate,
          checkinTime: form.checkinTime,
          checkoutDate: form.checkoutDate,
          checkoutTime: form.checkoutTime,
          adults: form.adults,
          children: form.children,
          extraServices: form.services.map(s => ({
            productId: s.id,
            variantId: s.variantId,
            unitId: s.unitId,
            name: s.name,
            quantity: s.qty,
            unitPrice: s.unitPrice,
          })),
          notes: form.note,
        });
      }
      Alert.alert('Thành công', 'Đăng ký cư trú đã được ghi nhận.');
      if (onConfirmProp) onConfirmProp();
      else onClose();
    } catch (err) {
      Alert.alert('Lỗi', String(err));
    } finally {
      setConfirming(false);
    }
  };

  const handleNext = () => {
    if (form.tenantTab === 'existing' && !selectedCustomer) {
      Alert.alert(
        t('booking.errors.error'),
        t('booking.errors.selectCustomer'),
      );
      return;
    }
    if (form.tenantTab === 'new') {
      const requiredFields = [
        {key: 'fullName', name: t('booking.fields.fullName')},
        {key: 'phone', name: t('booking.fields.phone')},
        {key: 'idCard', name: t('booking.fields.idCard')},
        {key: 'dateOfBirth', name: t('booking.fields.dateOfBirth')},
        {key: 'gender', name: t('booking.fields.gender')},
        {key: 'email', name: t('booking.fields.email')},
        {key: 'address', name: t('booking.fields.address')},
        {key: 'nationality', name: t('booking.fields.nationality')},
      ];
      const newErrors: Record<string, string> = {};
      for (const field of requiredFields) {
        if (!form[field.key as keyof typeof form]) {
          newErrors[field.key] = t('booking.errors.requiredFieldNew', {
            field: field.name,
          });
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    // Kiểm tra thời gian Nhận/Trả phòng cho ngắn hạn
    if (form.stayType === 'short_term') {
      const checkinDateTime = new Date(
        `${form.checkinDate}T${form.checkinTime}`,
      ).getTime();
      const checkoutDateTime = new Date(
        `${form.checkoutDate}T${form.checkoutTime}`,
      ).getTime();

      if (checkoutDateTime <= checkinDateTime) {
        Alert.alert(
          t('booking.errors.error'),
          t('booking.errors.checkoutAfterCheckin'),
        );
        return;
      }

      if (checkoutDateTime - checkinDateTime < 3600000) {
        // 3,600,000 ms = 1 giờ
        Alert.alert(t('booking.errors.error'), t('booking.errors.minStay1h'));
        return;
      }
    }

    setViewMode('summary');
  };

  // ─── Phần giao diện ─────────────────────────────────────────────────────
  if (!room) return null;

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      {/* Header điều hướng */}
      <View style={screenStyles.header}>
        <TouchableOpacity
          style={screenStyles.backBtn}
          onPress={
            viewMode === 'summary' ? () => setViewMode('form') : onClose
          }>
          <Icon name="arrow-back" size={20} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={screenStyles.headerTitle}>
          {viewMode === 'summary'
            ? form.stayType === 'long_term'
              ? 'Xác nhận hợp đồng'
              : 'Xác nhận đặt phòng'
            : 'Đăng ký lưu trú mới'}
        </Text>
        <View style={{width: 32}} />
      </View>

      {viewMode === 'form' ? (
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={screenStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          automaticallyAdjustContentInsets={false}>
          {/* Thông tin phòng đang đăng ký */}
          <SectionLabel text={t('booking.sections.room')} />
          <RoomCard room={room} t={t} themedColors={themedColors} />

          <View style={{height: 20}} />

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
            errors={errors}
            clearError={clearError}
            t={t}
            themedColors={themedColors}
          />

          <View style={{height: 20}} />

          {/* Lựa chọn loại hình lưu trú */}
          <SectionLabel text={t('booking.sections.stayType')} />
          <View style={screenStyles.toggleRow}>
            <TouchableOpacity
              style={[
                screenStyles.toggleBtn,
                form.stayType === 'long_term' && screenStyles.toggleBtnActive,
              ]}
              onPress={() => updateForm({stayType: 'long_term'})}>
              <Text
                style={[
                  screenStyles.toggleBtnText,
                  form.stayType === 'long_term' &&
                    screenStyles.toggleBtnTextActive,
                ]}>
                {t('booking.sections.longTerm')}
              </Text>
              <Text
                style={[
                  screenStyles.toggleBtnSub,
                  form.stayType === 'long_term' &&
                    screenStyles.toggleBtnSubActive,
                ]}>
                {t('booking.sections.longSub')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                screenStyles.toggleBtn,
                form.stayType === 'short_term' && screenStyles.toggleBtnActive,
              ]}
              onPress={() => updateForm({stayType: 'short_term'})}>
              <Text
                style={[
                  screenStyles.toggleBtnText,
                  form.stayType === 'short_term' &&
                    screenStyles.toggleBtnTextActive,
                ]}>
                {t('booking.sections.shortTerm')}
              </Text>
              <Text
                style={[
                  screenStyles.toggleBtnSub,
                  form.stayType === 'short_term' &&
                    screenStyles.toggleBtnSubActive,
                ]}>
                {t('booking.sections.shortSub')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{height: 16}} />

          {/* Form chi tiết tương ứng với loại hình lưu trú */}
          <View style={screenStyles.card}>
            {form.stayType === 'long_term' ? (
              <LongTermForm
                form={form}
                updateForm={updateForm}
                t={t}
                themedColors={themedColors}
                isDark={isDark}
              />
            ) : (
              <ShortTermForm
                form={form}
                updateForm={updateForm}
                t={t}
                themedColors={themedColors}
              />
            )}
          </View>

          <View style={{height: 20}} />

          {/* Ghi chú thêm */}
          <SectionLabel text={t('booking.sections.notes')} />
          <FieldInput
            value={form.note}
            onChangeText={(v: any) => updateForm({note: v})}
            placeholder={t('booking.form.notePlaceholder')}
            multiline
            themedColors={themedColors}
          />

          <View style={{height: 20}} />

          {/* Danh sách dịch vụ đính kèm */}
          <ServicesSection
            form={form}
            availableServices={availableServices}
            updateForm={updateForm}
            formatVND={formatVND}
            t={t}
            themedColors={themedColors}
          />

          <View style={{height: 24}} />

          {/* Tóm tắt nhanh chi phí dự tính */}
          <View style={screenStyles.summaryCard}>
            <Text style={screenStyles.summaryTitle}>Tạm tính thanh toán</Text>

            {form.stayType === 'long_term' ? (
              <>
                <View style={screenStyles.summaryRow}>
                  <Text style={screenStyles.summaryLabel}>
                    {t('booking.summary.roomRentMonth')}
                  </Text>
                  <Text style={screenStyles.summaryValue}>
                    {formatVND(form.monthlyPrice)}
                  </Text>
                </View>
                <View style={screenStyles.summaryRow}>
                  <Text style={screenStyles.summaryLabel}>
                    {t('booking.summary.deposit')}
                  </Text>
                  <Text style={screenStyles.summaryValue}>
                    {formatVND(form.deposit)}
                  </Text>
                </View>
              </>
            ) : loadingShortTermPrice ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}>
                <ActivityIndicator size="small" color={themedColors.primary} />
                <Text style={{fontSize: 13, color: themedColors.textSecondary}}>
                  Đang tính giá...
                </Text>
              </View>
            ) : shortTermPrice && shortTermPrice.breakdown.length > 0 ? (
              <View style={{marginBottom: 8}}>
                {shortTermPrice.breakdown.map((item, index) => (
                  <View
                    key={index}
                    style={[screenStyles.summaryRow, {marginBottom: 4}]}>
                    <Text
                      style={[
                        screenStyles.summaryLabel,
                        {color: themedColors.textSecondary},
                      ]}>
                      • {item.description}
                    </Text>
                    <Text style={[screenStyles.summaryValue, {fontSize: 13}]}>
                      {formatVND(item.amount)}
                    </Text>
                  </View>
                ))}
                <View
                  style={[
                    screenStyles.summaryRow,
                    {
                      borderTopWidth: 1,
                      borderTopColor: themedColors.border,
                      paddingTop: 8,
                      marginTop: 4,
                    },
                  ]}>
                  <Text
                    style={[screenStyles.summaryLabel, {fontWeight: '600'}]}>
                    Giá phòng:
                  </Text>
                  <Text
                    style={[
                      screenStyles.summaryValue,
                      {color: themedColors.primary, fontWeight: '700'},
                    ]}>
                    {formatVND(shortTermPrice.totalAmount)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={screenStyles.summaryRow}>
                <Text
                  style={[
                    screenStyles.summaryLabel,
                    {color: themedColors.textSecondary},
                  ]}>
                  Chưa có thông tin giá
                </Text>
              </View>
            )}

            {form.services.length > 0 && (
              <View style={screenStyles.summaryRow}>
                <Text style={screenStyles.summaryLabel}>
                  {t('booking.summary.serviceAdd')} ({form.services.length})
                </Text>
                <Text style={screenStyles.summaryValue}>
                  {formatVND(
                    form.services.reduce(
                      (sum, s) => sum + s.qty * s.unitPrice,
                      0,
                    ),
                  )}
                </Text>
              </View>
            )}

            <View style={screenStyles.summaryTotal}>
              <Text style={screenStyles.summaryTotalLabel}>Tổng cộng:</Text>
              <Text style={screenStyles.summaryTotalValue}>
                {form.stayType === 'long_term'
                  ? formatVND(
                      form.monthlyPrice +
                        form.deposit +
                        form.services.reduce(
                          (sum, s) => sum + s.qty * s.unitPrice,
                          0,
                        ),
                    )
                  : formatVND(
                      (shortTermPrice?.totalAmount || 0) +
                        form.services.reduce(
                          (sum, s) => sum + s.qty * s.unitPrice,
                          0,
                        ),
                    )}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              screenStyles.confirmBtn,
              (confirming || loading) && screenStyles.confirmBtnDisabled,
            ]}
            onPress={handleNext}
            disabled={confirming || loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={screenStyles.confirmBtnText}>
                {t('booking.summary.btnNext')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      ) : // Hiển thị màn hình Xác nhận Hợp đồng (Summary Mode)
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
