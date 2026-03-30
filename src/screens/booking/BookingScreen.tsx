import React, { useState, useEffect, useMemo } from 'react';
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
import { PosQueryService } from '../../services/PosServices/PosQueryService';
import customerService from '../../services/ResidentServices/CustomerService';
import RoomActionService from '../../services/ResidentServices/RoomActionService';
import { Alert } from 'react-native';
import { CalendarModal } from '../../components/DateInput';



// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type StayType = 'long_term' | 'short_term';
type TenantTab = 'existing' | 'new';

interface RoomInfo {
  id: string;               // product_variants.id
  name: string;             // tên phòng hiển thị
  product_name: string;      // tên loại phòng (products.name)
  label: string;
  floor: string;            // lấy từ attributes.floor
  price: number;            // giá mặc định
  product_id: string;
  attributes: Record<string, any>;
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

// ─────────────────────────────────────────────
// Sub-components (Moved outside for performance)
// ─────────────────────────────────────────────

const SectionLabel = React.memo(({ text }: { text: string }) => (
  <Text style={styles.sectionLabel}>{text}</Text>
));

const FieldLabel = React.memo(({ text }: { text: string }) => (
  <Text style={styles.fieldLabel}>{text}</Text>
));

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

const ToggleGroup = React.memo(({
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
));

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
        <Text style={[styles.stepBtnText, { color: '#fff' }]}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const RoomCard = React.memo(({ room }: { room: RoomInfo }) => (
  <View style={styles.roomCard}>
    <View style={styles.roomIcon}>
      <Icon name="meeting-room" size={24} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.roomName}>{room.label}</Text>
      <Text style={styles.roomSub}>
        {room.product_name} • Tầng {room.floor} {(room.attributes?.area || room.attributes?.area_m2) ? `• ${room.attributes?.area || room.attributes?.area_m2}m²` : ''}
      </Text>
    </View>
  </View>
));

const TenantSection = ({
  tab,
  onTabChange,
  form,
  onFormChange,
  isDropdownOpen,
  setIsDropdownOpen,
  loading,
  customers,
  selectedCustomer,
  setSelectedCustomer,
}: {
  tab: TenantTab;
  onTabChange: (t: TenantTab) => void;
  form: BookingForm;
  onFormChange: (f: Partial<BookingForm>) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (v: boolean) => void;
  loading: boolean;
  customers: any[];
  selectedCustomer: any | null;
  setSelectedCustomer: (c: any | null) => void;
}) => (
  <View>
    <SectionLabel text="THÔNG TIN KHÁCH THUÊ" />
    <View style={styles.tenantToggleRow}>
      <TouchableOpacity
        style={[styles.tenantTabBtn, tab === 'existing' && styles.tenantTabBtnActive]}
        onPress={() => onTabChange('existing')}
      >
        <Text style={[styles.tenantTabText, tab === 'existing' && styles.tenantTabTextActive]}>
          Chọn khách hàng
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tenantTabBtn, tab === 'new' && styles.tenantTabBtnActive]}
        onPress={() => onTabChange('new')}
      >
        <Text style={[styles.tenantTabText, tab === 'new' && styles.tenantTabTextActive]}>
          Khách mới
        </Text>
      </TouchableOpacity>
    </View>

    {tab === 'existing' ? (
      <View style={{ marginTop: 10, gap: 8, zIndex: 10 }}>
        <View style={styles.fieldGroup}>
          <FieldLabel text="CHỌN KHÁCH HÀNG THUÊ" />
          <TouchableOpacity 
            style={[styles.dropdownTrigger, isDropdownOpen && styles.dropdownTriggerActive]} 
            activeOpacity={0.9}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Icon name="search" size={18} color={COLORS.textHint} />
              <TextInput
                style={styles.dropdownSearchInput}
                value={form.searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChangeText={(v) => onFormChange({ searchQuery: v })}
                placeholder={selectedCustomer ? selectedCustomer.full_name : "Tìm tên, SĐT hoặc số CCCD..."}
                placeholderTextColor={selectedCustomer ? COLORS.text : COLORS.textHint}
              />
            </View>
            <Icon name={isDropdownOpen ? "expand-less" : "expand-more"} size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {isDropdownOpen && (
          <View style={styles.dropdownWindow}>
            <Text style={styles.recentLabel}>KẾT QUẢ TÌM KIẾM / GẦN ĐÂY</Text>
            {loading ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <View style={{ maxHeight: 250 }}>
                <ScrollView nestedScrollEnabled={true}>
                  {customers.length === 0 ? (
                    <Text style={{ padding: 16, color: COLORS.textHint, textAlign: 'center' }}>Không có khách hàng trùng khớp</Text>
                  ) : (
                    customers.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.customerItem, selectedCustomer?.id === c.id && styles.customerItemActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedCustomer(c);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <View style={[styles.customerAvatar, selectedCustomer?.id === c.id && styles.customerAvatarActive]}>
                          <Text style={[styles.customerInitials, selectedCustomer?.id === c.id && styles.customerInitialsActive]}>
                            {c.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.customerName, selectedCustomer?.id === c.id && styles.customerNameActive]}>{c.full_name}</Text>
                          <Text style={styles.customerPhone}>{c.phone || c.id_number}</Text>
                        </View>
                        {selectedCustomer?.id === c.id && <Icon name="check-circle" size={20} color="#fff" />}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {selectedCustomer && !isDropdownOpen && (
          <View style={styles.selectedCustomerSummary}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitials}>{selectedCustomer.full_name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{selectedCustomer.full_name}</Text>
              <Text style={styles.customerPhone}>{selectedCustomer.phone || selectedCustomer.id_number}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
              <Icon name="close" size={20} color={COLORS.textHint} />
            </TouchableOpacity>
          </View>
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

const ServicesSection = ({
  services,
  onChange,
  formatVND,
}: {
  services: Service[];
  onChange: (s: Service[]) => void;
  formatVND: (a: number) => string;
}) => {
  const updateQty = (id: string, delta: number) => {
    onChange(services.map((s) => (s.id === id ? { ...s, qty: Math.max(1, s.qty + delta) } : s)));
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
            <View key={svc.id} style={[styles.svcItem, idx < services.length - 1 && styles.svcItemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.svcName}>{svc.name}</Text>
                <Text style={styles.svcUnit}>Đơn giá: {formatVND(svc.unitPrice)}/{svc.unit}</Text>
              </View>
              <View style={styles.svcQty}>
                <Stepper
                  value={svc.qty}
                  onDecrement={() => updateQty(svc.id, -1)}
                  onIncrement={() => updateQty(svc.id, 1)}
                />
              </View>
              <TouchableOpacity style={styles.svcSelect} onPress={() => toggleSelect(svc.id)}>
                <Text style={styles.svcSelectText}>{svc.selected ? '✓' : ''}</Text>
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
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);

  // Convert "YYYY-MM-DD" to Date object
  const startDate = new Date(form.contractStart);
  if (isNaN(startDate.getTime())) {
    startDate.setTime(Date.now());
  }

  const handleDateConfirm = (date: Date) => {
    setIsCalendarOpen(false);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    onFormChange({ contractStart: `${y}-${m}-${d}` });
  };

  const displayDate = form.contractStart.split('-').reverse().join('/');

  return (
    <>
      <View style={[styles.card, { zIndex: 10 }]}>
        <SectionLabel text="THÔNG TIN HỢP ĐỒNG" />
        
        <View style={styles.fieldGroup}>
          <FieldLabel text="NGÀY BẮT ĐẦU HỢP ĐỒNG" />
          <TouchableOpacity 
            style={[styles.fieldInput, { justifyContent: 'center' }]}
            activeOpacity={0.8}
            onPress={() => setIsCalendarOpen(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: COLORS.text }}>{displayDate}</Text>
              <Icon name="calendar-today" size={18} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.fieldGroup, { marginTop: 10, zIndex: isDurationDropdownOpen ? 10 : 1 }]}>
          <FieldLabel text="THỜI HẠN HỢP ĐỒNG" />
          <TouchableOpacity 
            style={[styles.dropdownTrigger, isDurationDropdownOpen && styles.dropdownTriggerActive]}
            activeOpacity={0.9}
            onPress={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
              <Text style={{ fontSize: 14, color: COLORS.text }}>{form.contractDuration}</Text>
              <Icon name={isDurationDropdownOpen ? "expand-less" : "expand-more"} size={24} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          {isDurationDropdownOpen && (
            <View style={[styles.dropdownWindow, { maxHeight: 200, top: 75 }]}>
              <ScrollView nestedScrollEnabled={true}>
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.customerItem, form.contractDuration === d && styles.customerItemActive, { paddingVertical: 12 }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onFormChange({ contractDuration: d });
                      setIsDurationDropdownOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerName, form.contractDuration === d && styles.customerNameActive]}>
                        {d}
                      </Text>
                    </View>
                    {form.contractDuration === d && <Icon name="check-circle" size={20} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={{ marginTop: 10, zIndex: 1 }}>

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
      <CalendarModal
        visible={isCalendarOpen}
        selectedDate={startDate}
        title="Chọn ngày bắt đầu"
        onConfirm={handleDateConfirm}
        onCancel={() => setIsCalendarOpen(false)}
      />
    </>
  );
};

const ShortTermForm = ({
  form,
  onFormChange,
}: {
  form: BookingForm;
  onFormChange: (f: Partial<BookingForm>) => void;
}) => {
  const [isCheckinCalendarOpen, setIsCheckinCalendarOpen] = useState(false);
  const [isCheckoutCalendarOpen, setIsCheckoutCalendarOpen] = useState(false);

  const checkinDateObj = new Date(form.checkinDate);
  if (isNaN(checkinDateObj.getTime())) checkinDateObj.setTime(Date.now());
  const checkoutDateObj = new Date(form.checkoutDate);
  if (isNaN(checkoutDateObj.getTime())) checkoutDateObj.setTime(Date.now());

  const handleCheckinConfirm = (date: Date) => {
    setIsCheckinCalendarOpen(false);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    onFormChange({ checkinDate: `${y}-${m}-${d}` });
  };

  const handleCheckoutConfirm = (date: Date) => {
    setIsCheckoutCalendarOpen(false);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    onFormChange({ checkoutDate: `${y}-${m}-${d}` });
  };

  const displayCheckin = form.checkinDate.split('-').reverse().join('/');
  const displayCheckout = form.checkoutDate.split('-').reverse().join('/');

  return (
    <>
      <View style={styles.card}>
        <SectionLabel text="THÔNG TIN ĐẶT PHÒNG" />
        <View style={styles.dateRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <FieldLabel text="NGÀY NHẬN PHÒNG" />
            <TouchableOpacity 
              style={[styles.fieldInput, { justifyContent: 'center' }]}
              activeOpacity={0.8}
              onPress={() => setIsCheckinCalendarOpen(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: COLORS.text }}>{displayCheckin}</Text>
                <Icon name="calendar-today" size={18} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
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
            <TouchableOpacity 
              style={[styles.fieldInput, { justifyContent: 'center' }]}
              activeOpacity={0.8}
              onPress={() => setIsCheckoutCalendarOpen(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: COLORS.text }}>{displayCheckout}</Text>
                <Icon name="calendar-today" size={18} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
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
      <CalendarModal
        visible={isCheckinCalendarOpen}
        selectedDate={checkinDateObj}
        title="Chọn ngày nhận phòng"
        onConfirm={handleCheckinConfirm}
        onCancel={() => setIsCheckinCalendarOpen(false)}
      />
      <CalendarModal
        visible={isCheckoutCalendarOpen}
        selectedDate={checkoutDateObj}
        minDate={checkinDateObj}
        title="Chọn ngày trả phòng"
        onConfirm={handleCheckoutConfirm}
        onCancel={() => setIsCheckoutCalendarOpen(false)}
      />
    </>
  );
};

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
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const storeId = 'store-001'; // Thực tế lấy từ AuthContext hoặc Global State

  const [form, setForm] = useState<BookingForm>({
    stayType: 'long_term',
    tenantTab: 'existing',
    searchQuery: '',
    deposit: room.price || 0,
    note: '',
    services: [],
    contractStart: new Date().toISOString().split('T')[0],
    contractDuration: '1 năm',
    monthlyPrice: String(room.price || 0),
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

  const filteredCustomers = useMemo(() => {
    if (!form.searchQuery) return customers;
    const q = form.searchQuery.toLowerCase();
    return customers.filter(c => 
      c.full_name?.toLowerCase().includes(q) || 
      c.phone?.includes(q) || 
      c.id_number?.includes(q)
    );
  }, [customers, form.searchQuery]);

  // Load services from database
  useEffect(() => {
    const loadServices = async () => {
      try {
        const serviceList = await PosQueryService.getServices(storeId);
        // Map PosProduct to local Service interface
        setServices(serviceList.map((s: any) => ({
          id: s.id,
          name: s.name,
          unitPrice: s.price || 0,
          unit: s.unit_name || 'DV',
          qty: 1,
          selected: false,
        })));
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
        const customerList = await customerService.getCustomerPickerList(storeId);
        setCustomers(customerList);
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

  const formatVND = (amount: number) =>
    amount.toLocaleString('vi-VN') + 'đ';






  const handleConfirm = async () => {
    if (form.tenantTab === 'existing' && !selectedCustomer) {
      Alert.alert('Thông báo', 'Vui lòng chọn khách hàng');
      return;
    }
    if (form.tenantTab === 'new' && (!form.fullName || !form.phone)) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ họ tên và số điện thoại khách mới');
      return;
    }

    try {
      setConfirming(true);
      const selectedServices = (form.services.length > 0 ? form.services : services)
        .filter(s => s.selected)
        .map(s => ({
          productId: s.id,
          name: s.name,
          quantity: s.qty,
          unitPrice: s.unitPrice,
        }));

      if (form.stayType === 'long_term') {
        await RoomActionService.checkInLongTerm({
          storeId,
          variantId: room.id,
          productId: room.product_id,
          customerId: form.tenantTab === 'existing' ? selectedCustomer.id : '', // Sẽ xử lý tạo khách mới ở service nếu cần, hoặc dùng tab new
          startDate: form.contractStart,
          durationMonths: form.contractDuration === '1 năm' ? 12 : 
                         form.contractDuration === '2 năm' ? 24 : 
                         parseInt(form.contractDuration) || 12,
          rentAmount: Number(form.monthlyPrice),
          depositAmount: form.deposit,
          electricReadingInit: Number(form.electricStart),
          waterReadingInit: Number(form.waterStart),
          notes: form.note,
          extraServices: selectedServices,
          payDepositNow: true,
        });
      } else {
        await RoomActionService.checkInShortTerm({
          storeId,
          variantId: room.id,
          productId: room.product_id,
          fullName: form.fullName,
          phone: form.phone,
          idNumber: form.idCard,
          checkinDate: form.checkinDate,
          checkinTime: form.checkinTime,
          checkoutDate: form.checkoutDate,
          checkoutTime: form.checkoutTime,
          adults: form.adults,
          children: form.children,
          rentPerNight: room.price || 0, // Hoặc lấy từ form nếu có
          depositAmount: form.deposit,
          notes: form.note,
          extraServices: selectedServices,
          payDepositNow: true,
        });
      }

      Alert.alert('Thành công', 'Đã xác nhận hợp đồng và đặt phòng thành công', [
        { text: 'OK', onPress: () => onConfirm?.(form) }
      ]);
    } catch (error: any) {
      console.error('Booking failed:', error);
      Alert.alert('Lỗi', error.message || 'Không thể thực hiện đặt phòng');
    } finally {
      setConfirming(false);
    }
  };

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
            isDropdownOpen={isCustomerDropdownOpen}
            setIsDropdownOpen={setIsCustomerDropdownOpen}
            loading={loading}
            customers={filteredCustomers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
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
            formatVND={formatVND}
          />
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>✓ Xác nhận hợp đồng</Text>
          )}
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

  // Dropdown Styles
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dropdownTriggerActive: {
    borderColor: COLORS.primary,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  dropdownWindow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    maxHeight: 320,
    overflow: 'hidden',
  },
  selectedCustomerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    gap: 12,
  },

  customerItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  customerAvatarActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  customerInitialsActive: {
    color: '#fff',
  },
  customerNameActive: {
    color: '#fff',
  },
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
  confirmBtnDisabled: {
    backgroundColor: COLORS.textHint,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default BookingScreen;