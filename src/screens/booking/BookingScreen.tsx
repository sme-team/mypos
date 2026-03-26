import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { RoomQueryService } from '../../services/ResidentServices/RoomQueryService';



// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type StayType = 'long_term' | 'short_term';
type TenantTab = 'existing' | 'new';

interface RoomInfo {
  code: string;
  floor: string;
  building?: string;
  direction?: string;
  price?: number;
  id: string;
  name?: string;
}

interface BookingForm {
  // Shared
  stayType: StayType;
  tenantTab: TenantTab;
  searchQuery: string;
  deposit: number;
  note: string;
  services: Service[];
  // Long-term
  contractStart: string;
  contractDuration: string;
  monthlyPrice: string;
  electricStart: string;
  waterStart: string;
  // New tenant fields
  fullName: string;
  phone: string;
  idCard: string;
  // Short-term
  checkinDate: string;
  checkinTime: string;
  checkoutDate: string;
  checkoutTime: string;
  adults: number;
  children: number;
}

interface Service {
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
  qty: number;
  selected: boolean;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#185FA5',
  primaryLight: '#E6F1FB',
  primaryMid: '#378ADD',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textHint: '#9CA3AF',
  border: '#E5E7EB',
  borderFocus: '#378ADD',
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  danger: '#E24B4A',
  success: '#1D9E75',
};

const DURATION_OPTIONS = ['1 tháng', '3 tháng', '6 tháng', '1 năm', '2 năm'];

// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
const BookingScreen = ({
  room,
  onClose,
  onConfirm,
}: {
  room: RoomInfo;
  onClose?: () => void;
  onConfirm?: (form: BookingForm) => void;
}) => {
  const { t } = useTranslation();
  // const theme = useTheme(); // uncomment nếu bạn đang dùng theme hook

  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<BookingForm>({
    stayType: 'long_term',
    tenantTab: 'existing',
    searchQuery: '',
    deposit: room.price || 0,
    note: '',
    services: [],
    contractStart: '',
    contractDuration: '1 năm',
    monthlyPrice: '',
    electricStart: '',
    waterStart: '',
    fullName: '',
    phone: '',
    idCard: '',
    checkinDate: '',
    checkinTime: '',
    checkoutDate: '',
    checkoutTime: '',
    adults: 1,
    children: 0,
  });

  // Load services from database
  useEffect(() => {
    const loadServices = async () => {
      try {
        const { getMyPosDB } = require('../../database/index');
        const db = getMyPosDB();
        const result = await db.execute(`
          SELECT 
            p.id, 
            p.name, 
            COALESCE(pr.price, 0) AS unit_price, 
            COALESCE(u.name, 'cái') AS unit
          FROM products p
          LEFT JOIN product_variants v ON v.product_id = p.id
          LEFT JOIN prices pr ON pr.variant_id = v.id AND pr.status = 'active'
          LEFT JOIN units u ON u.id = p.unit_id
          WHERE p.product_type = 'service'
            AND (p.deleted_at IS NULL OR p.deleted_at = '')
          GROUP BY p.id
          ORDER BY p.name
        `, []);

        const serviceList = (result?.rows || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          unitPrice: item.unit_price || 0,
          unit: item.unit || 'cái',
          qty: 1,
          selected: false,
        }));
        setServices(serviceList);
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    loadServices();
  }, []);

  // Load customers from database
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const { getMyPosDB } = require('../../database/index');
        const db = getMyPosDB();
        const result = await db.execute(`
          SELECT id, full_name, phone, id_number
          FROM customers
          WHERE (deleted_at IS NULL OR deleted_at = '')
          ORDER BY full_name
        `, []);
        setCustomers(result?.rows || []);
      } catch (error) {
        console.error('Failed to load customers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, []);

  const updateForm = (partial: Partial<BookingForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  // ─────────────────────────────────────────────
  // Sub-components
  // ─────────────────────────────────────────────
  const SectionLabel = ({ text }: { text: string }) => (
    <Text style={styles.sectionLabel}>{text}</Text>
  );

  const FieldLabel = ({ text }: { text: string }) => (
    <Text style={styles.fieldLabel}>{text}</Text>
  );

  const FieldInput = ({
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
  }: {
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: any;
    multiline?: boolean;
  }) => (
    <TextInput
      style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textHint}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  );

  const ToggleGroup = ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string; sub?: string }[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <View style={styles.toggleRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.toggleBtn, value === opt.value && styles.toggleBtnActive]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.toggleBtnText, value === opt.value && styles.toggleBtnTextActive]}
          >
            {opt.label}
          </Text>
          {opt.sub && (
            <Text
              style={[styles.toggleBtnSub, value === opt.value && styles.toggleBtnSubActive]}
            >
              {opt.sub}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const Stepper = ({
    value,
    onDecrement,
    onIncrement,
    min = 0,
  }: {
    value: number;
    onDecrement: () => void;
    onIncrement: () => void;
    min?: number;
  }) => (
    <View style={styles.stepperWrap}>
      <TouchableOpacity
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        onPress={onDecrement}
        disabled={value <= min}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepVal}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepBtn, styles.stepBtnPlus]}
        onPress={onIncrement}
      >
        <Text style={[styles.stepBtnText, { color: '#fff' }]}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const AmountField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <View style={styles.fieldGroup}>
      <FieldLabel text={label} />
      <View style={styles.amountRow}>
        <TextInput
          style={styles.amountInput}
          value={value === 0 ? '' : String(value)}
          onChangeText={(t) => onChange(Number(t.replace(/\D/g, '')) || 0)}
          placeholder="0"
          placeholderTextColor={COLORS.textHint}
          keyboardType="numeric"
        />
        <Text style={styles.currencyTag}>VND</Text>
        <TouchableOpacity
          style={styles.stepSm}
          onPress={() => onChange(Math.max(0, value - 100000))}
        >
          <Text style={styles.stepSmText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stepSm, styles.stepSmPlus]}
          onPress={() => onChange(value + 100000)}
        >
          <Text style={[styles.stepSmText, { color: '#fff' }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Room Card
  const RoomCard = ({ room }: { room: RoomInfo }) => (
    <View style={styles.roomCard}>
      <View style={styles.roomIcon}>
        <View style={styles.buildingIcon}>
          <View style={styles.buildingBody}>
            <View style={styles.buildingWindow} />
            <View style={styles.buildingWindow} />
            <View style={styles.buildingWindow} />
          </View>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.roomName}>{room.code}</Text>
        <Text style={styles.roomSub}>
          {[room.floor, room.building, room.direction].filter(Boolean).join(' • ')}
        </Text>
      </View>
    </View>
  );

  // Tenant Section
  const TenantSection = ({
    tab,
    onTabChange,
    form,
    onFormChange,
  }: {
    tab: TenantTab;
    onTabChange: (t: TenantTab) => void;
    form: BookingForm;
    onFormChange: (f: Partial<BookingForm>) => void;
  }) => (
    <View>
      <SectionLabel text="THÔNG TIN KHÁCH THUÊ" />
      <View style={styles.tenantToggleRow}>
        <TouchableOpacity
          style={[styles.tenantTabBtn, tab === 'existing' && styles.tenantTabBtnActive]}
          onPress={() => onTabChange('existing')}
        >
          <Text
            style={[styles.tenantTabText, tab === 'existing' && styles.tenantTabTextActive]}
          >
            Chọn khách hàng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tenantTabBtn, tab === 'new' && styles.tenantTabBtnActive]}
          onPress={() => onTabChange('new')}
        >
          <Text
            style={[styles.tenantTabText, tab === 'new' && styles.tenantTabTextActive]}
          >
            Khách mới
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'existing' ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              value={form.searchQuery}
              onChangeText={(v) => onFormChange({ searchQuery: v })}
              placeholder="Nhập tên, SĐT hoặc số CCCD..."
              placeholderTextColor={COLORS.textHint}
            />
          </View>
          <Text style={styles.recentLabel}>KHÁCH HÀNG GẦN ĐÂY</Text>

          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textHint }}>Đang tải khách hàng...</Text>
            </View>
          ) : (
            customers.map((c) => (
              <TouchableOpacity key={c.id} style={styles.customerItem} activeOpacity={0.7}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerInitials}>
                    {c.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{c.full_name}</Text>
                  <Text style={styles.customerPhone}>{c.phone}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <View style={{ marginTop: 10, gap: 10 }}>
          <TouchableOpacity style={styles.scanBtn} activeOpacity={0.8}>
            <Text style={styles.scanBtnText}>📷 Quét CCCD / Passport</Text>
          </TouchableOpacity>
          <View style={styles.fieldGroup}>
            <FieldLabel text="HỌ TÊN NGƯỜI THUÊ" />
            <FieldInput
              value={form.fullName}
              onChangeText={(v) => onFormChange({ fullName: v })}
              placeholder="Nguyễn Văn A"
            />
          </View>
          <View style={styles.fieldGroup}>
            <FieldLabel text="SỐ ĐIỆN THOẠI" />
            <FieldInput
              value={form.phone}
              onChangeText={(v) => onFormChange({ phone: v })}
              placeholder="0901 234 567"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.fieldGroup}>
            <FieldLabel text="SỐ CCCD / PASSPORT" />
            <FieldInput
              value={form.idCard}
              onChangeText={(v) => onFormChange({ idCard: v })}
              placeholder="Số CCCD hoặc Số hộ chiếu"
            />
          </View>
        </View>
      )}
    </View>
  );

  // Services Section
  const ServicesSection = ({
    services,
    onChange,
  }: {
    services: Service[];
    onChange: (s: Service[]) => void;
  }) => {
    const updateQty = (id: string, delta: number) => {
      onChange(
        services.map((s) =>
          s.id === id ? { ...s, qty: Math.max(1, s.qty + delta) } : s
        )
      );
    };

    const toggleSelect = (id: string) => {
      onChange(services.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
    };

    return (
      <View>
        <SectionLabel text="DỊCH VỤ THÊM" />
        {services.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textHint }}>Đang tải dịch vụ...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {services.map((svc, idx) => (
              <View
                key={svc.id}
                style={[styles.svcItem, idx < services.length - 1 && styles.svcItemBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.svcName}>{svc.name}</Text>
                  <Text style={styles.svcUnit}>
                    Đơn giá: {formatVND(svc.unitPrice)}/{svc.unit}
                  </Text>
                </View>
                <View style={styles.svcQty}>
                  <Stepper
                    value={svc.qty}
                    onDecrement={() => updateQty(svc.id, -1)}
                    onIncrement={() => updateQty(svc.id, 1)}
                  />
                </View>
                <TouchableOpacity
                  style={styles.svcSelect}
                  onPress={() => toggleSelect(svc.id)}
                >
                  <Text style={styles.svcSelectText}>
                    {svc.selected ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.addSvcBtn} activeOpacity={0.7}>
          <Text style={styles.addSvcText}>+ Thêm dịch vụ</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const LongTermForm = ({
    form,
    onFormChange,
  }: {
    form: BookingForm;
    onFormChange: (f: Partial<BookingForm>) => void;
  }) => (
    <>
      <View style={styles.card}>
        <SectionLabel text="THÔNG TIN HỢP ĐỒNG" />
        <View style={styles.fieldGroup}>
          <FieldLabel text="NGÀY BẮT ĐẦU HỢP ĐỒNG" />
          <FieldInput
            value={form.contractStart}
            onChangeText={(v) => onFormChange({ contractStart: v })}
            placeholder="dd/mm/yyyy"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={[styles.fieldGroup, { marginTop: 10 }]}>
          <FieldLabel text="THỜI HẠN HỢP ĐỒNG" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DURATION_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationChip,
                    form.contractDuration === d && styles.durationChipActive,
                  ]}
                  onPress={() => onFormChange({ contractDuration: d })}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      form.contractDuration === d && styles.durationChipTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ marginTop: 10 }}>
          <AmountField
            label="TIỀN CỌC (VND)"
            value={form.deposit}
            onChange={(v) => onFormChange({ deposit: v })}
          />
        </View>

        <View style={[styles.fieldGroup, { marginTop: 10 }]}>
          <FieldLabel text="GIÁ THUÊ/THÁNG (VND)" />
          <FieldInput
            value={form.monthlyPrice}
            onChangeText={(v) => onFormChange({ monthlyPrice: v })}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.utilLabel}>CHỈ SỐ ĐẦU KỲ</Text>
        <View style={styles.utilRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <FieldLabel text="SỐ ĐIỆN (kWh)" />
            <FieldInput
              value={form.electricStart}
              onChangeText={(v) => onFormChange({ electricStart: v })}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <FieldLabel text="SỐ NƯỚC (m³)" />
            <FieldInput
              value={form.waterStart}
              onChangeText={(v) => onFormChange({ waterStart: v })}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>
    </>
  );

  const ShortTermForm = ({
    form,
    onFormChange,
  }: {
    form: BookingForm;
    onFormChange: (f: Partial<BookingForm>) => void;
  }) => (
    <View style={styles.card}>
      <SectionLabel text="THÔNG TIN ĐẶT PHÒNG" />
      <View style={styles.dateRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <FieldLabel text="NGÀY NHẬN PHÒNG" />
          <FieldInput
            value={form.checkinDate}
            onChangeText={(v) => onFormChange({ checkinDate: v })}
            placeholder="dd/mm/yyyy"
          />
        </View>
        <View style={{ width: 10 }} />
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <FieldLabel text="GIỜ NHẬN" />
          <FieldInput
            value={form.checkinTime}
            onChangeText={(v) => onFormChange({ checkinTime: v })}
            placeholder="14:00"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <View style={[styles.dateRow, { marginTop: 10 }]}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <FieldLabel text="NGÀY TRẢ PHÒNG" />
          <FieldInput
            value={form.checkoutDate}
            onChangeText={(v) => onFormChange({ checkoutDate: v })}
            placeholder="dd/mm/yyyy"
          />
        </View>
        <View style={{ width: 10 }} />
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <FieldLabel text="GIỜ TRẢ" />
          <FieldInput
            value={form.checkoutTime}
            onChangeText={(v) => onFormChange({ checkoutTime: v })}
            placeholder="12:00"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>

      <View style={[styles.dateRow, { marginTop: 14 }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="NGƯỜI LỚN" />
          <View style={{ marginTop: 6 }}>
            <Stepper
              value={form.adults}
              onDecrement={() => onFormChange({ adults: Math.max(1, form.adults - 1) })}
              onIncrement={() => onFormChange({ adults: form.adults + 1 })}
              min={1}
            />
          </View>
        </View>
        <View style={{ width: 20 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text="TRẺ EM" />
          <View style={{ marginTop: 6 }}>
            <Stepper
              value={form.children}
              onDecrement={() => onFormChange({ children: Math.max(0, form.children - 1) })}
              onIncrement={() => onFormChange({ children: form.children + 1 })}
              min={0}
            />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <AmountField
          label="TIỀN CỌC (VND)"
          value={form.deposit}
          onChange={(v) => onFormChange({ deposit: v })}
        />
      </View>
    </View>
  );

  const formatVND = (amount: number) =>
    amount.toLocaleString('vi-VN') + 'đ';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đặt phòng mới</Text>
        <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
          <View style={styles.menuIcon}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.menuLine} />
            ))}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Room Info */}
        <View style={styles.section}>
          <SectionLabel text="THÔNG TIN PHÒNG" />
          <RoomCard room={room} />
        </View>

        {/* Tenant */}
        <View style={styles.section}>
          <TenantSection
            tab={form.tenantTab}
            onTabChange={(t) => updateForm({ tenantTab: t })}
            form={form}
            onFormChange={updateForm}
          />
        </View>

        {/* Stay type */}
        <View style={styles.section}>
          <SectionLabel text="LOẠI HÌNH LƯU TRÚ" />
          <ToggleGroup
            options={[
              { value: 'long_term', label: 'Phòng trọ', sub: 'DÀI HẠN' },
              { value: 'short_term', label: 'Lưu trú', sub: 'NGẮN HẠN' },
            ]}
            value={form.stayType}
            onChange={(v) => updateForm({ stayType: v as StayType })}
          />
        </View>

        {/* Conditional Form */}
        <View style={styles.section}>
          {form.stayType === 'long_term' ? (
            <LongTermForm form={form} onFormChange={updateForm} />
          ) : (
            <ShortTermForm form={form} onFormChange={updateForm} />
          )}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <View style={styles.fieldGroup}>
            <FieldLabel text="GHI CHÚ" />
            <FieldInput
              value={form.note}
              onChangeText={(v) => updateForm({ note: v })}
              placeholder="Nhập các yêu cầu thêm hoặc thỏa thuận riêng..."
              multiline
            />
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <ServicesSection
            services={form.services.length > 0 ? form.services : services}
            onChange={(s) => updateForm({ services: s })}
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm?.(form)}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>✓ Xác nhận hợp đồng</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 22,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { gap: 4, alignItems: 'center' },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: COLORS.text,        // ← đã sửa
    borderRadius: 2,
  },

  scrollView: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16 },
  section: { marginBottom: 16 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: 14,
  },

  // Room card
  roomCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingIcon: { alignItems: 'center' },
  buildingBody: {
    flexDirection: 'row',
    gap: 3,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 2,
    padding: 3,
  },
  buildingWindow: {
    width: 5,
    height: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  roomName: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  roomSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Field
  fieldGroup: {},
  fieldInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  fieldInputMulti: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  // Toggle
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  toggleBtnTextActive: { color: '#fff' },
  toggleBtnSub: { fontSize: 10, color: COLORS.textHint, marginTop: 2 },
  toggleBtnSubActive: { color: 'rgba(255,255,255,0.75)' },

  // Tenant tabs
  tenantToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 2 },
  tenantTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  tenantTabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tenantTabText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tenantTabTextActive: { color: '#fff' },

  // Search & Customer
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
  },
  searchIcon: { fontSize: 16, color: COLORS.textHint, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: COLORS.text },
  recentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 4,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitials: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  customerName: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  customerPhone: { fontSize: 11, color: COLORS.textSecondary },
  chevron: { fontSize: 20, color: COLORS.textSecondary },

  scanBtn: {
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  scanBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.primary },

  // Duration chips
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  durationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durationChipText: { fontSize: 13, color: COLORS.textSecondary },
  durationChipTextActive: { color: '#fff', fontWeight: '500' },

  // Amount field
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountInput: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  currencyTag: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  stepSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  stepSmPlus: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepSmText: { fontSize: 16, color: COLORS.text, lineHeight: 20 },

  utilLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  utilRow: { flexDirection: 'row' },
  dateRow: { flexDirection: 'row' },

  // Stepper
  stepperWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { fontSize: 16, color: COLORS.text, lineHeight: 22 },
  stepVal: { fontSize: 15, fontWeight: '600', color: COLORS.text, minWidth: 20, textAlign: 'center' },

  // Services
  svcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  svcItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  svcName: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  svcUnit: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  svcQty: {},
  svcSelect: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svcSelectText: { fontSize: 18, color: COLORS.primary },

  addSvcBtn: {
    marginTop: 6,
    padding: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  addSvcText: { fontSize: 13, color: COLORS.textSecondary },

  // Confirm
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default BookingScreen;