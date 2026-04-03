import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { PosQueryService } from '../../services/PosServices/PosQueryService';
import customerService from '../../services/ResidentServices/CustomerService';
import RoomActionService from '../../services/ResidentServices/RoomActionService';
import { CalendarModal } from '../../components/DateInput';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type StayType = 'long_term' | 'short_term';
type TenantTab = 'existing' | 'new';

interface RoomInfo {
  id: string;
  name: string;
  product_name: string;
  label: string;
  floor: string;
  price: number;
  product_id: string;
  attributes: Record<string, any>;
}

interface Service {
  id: string;
  variantId?: string;
  unitId?: string;
  name: string;
  unitPrice: number;
  unit: string;
  qty: number;
  selected: boolean;
}

interface BookingForm {
  stayType: StayType;
  tenantTab: TenantTab;
  searchQuery: string;
  deposit: number;
  note: string;
  services: Service[];
  contractStart: string;
  contractDuration: string;
  monthlyPrice: number;
  electricStart: string;
  waterStart: string;
  fullName: string;
  phone: string;
  idCard: string;
  checkinDate: string;
  checkinTime: string;
  checkoutDate: string;
  checkoutTime: string;
  adults: number;
  children: number;
}

type ViewMode = 'form' | 'summary';

// ─────────────────────────────────────────────
// Shared Sub-components (Memoized)
// ─────────────────────────────────────────────

const SectionLabel = React.memo(({ text, styles }: any) => (
  <Text style={styles.sectionLabel}>{text}</Text>
));

const FieldLabel = React.memo(({ text, styles }: any) => (
  <Text style={styles.fieldLabel}>{text}</Text>
));

const FieldInput = React.memo(({ value, onChangeText, placeholder, keyboardType, multiline, themedColors, styles, fieldKey }: any) => (
  <TextInput
    key={fieldKey}
    style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={themedColors.textHint}
    keyboardType={keyboardType || 'default'}
    multiline={multiline}
    numberOfLines={multiline ? 3 : 1}
  />
));

const ToggleGroup = React.memo(({ options, value, onChange, styles }: any) => (
  <View style={styles.toggleRow}>
    {options.map((opt: any) => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.toggleBtn, value === opt.value && styles.toggleBtnActive]}
        onPress={() => onChange(opt.value)}
      >
        <Text style={[styles.toggleBtnText, value === opt.value && styles.toggleBtnTextActive]}>{opt.label}</Text>
        {opt.sub && <Text style={[styles.toggleBtnSub, value === opt.value && styles.toggleBtnSubActive]}>{opt.sub}</Text>}
      </TouchableOpacity>
    ))}
  </View>
));

const Stepper = React.memo(({ value, onDecrement, onIncrement, min = 0, themedColors, styles }: any) => (
  <View style={styles.stepperWrap}>
    <TouchableOpacity
      style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
      onPress={onDecrement}
      disabled={value <= min}
    >
      <Icon name="remove" size={18} color={value <= min ? themedColors.textHint : themedColors.text} />
    </TouchableOpacity>
    <Text style={styles.stepVal}>{value}</Text>
    <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={onIncrement}>
      <Icon name="add" size={18} color="#fff" />
    </TouchableOpacity>
  </View>
));

const TimeStepper = React.memo(({ value, onChange, themedColors, styles }: any) => {
  const handlePress = (delta: number) => {
    const parts = value.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parts[1] || '00';
    const newH = (h + delta + 24) % 24;
    onChange(`${String(newH).padStart(2, '0')}:${m}`);
  };
  return (
    <View style={styles.stepperWrap}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => handlePress(-1)}>
        <Icon name="remove" size={18} color={themedColors.text} />
      </TouchableOpacity>
      <Text style={styles.stepVal}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={() => handlePress(1)}>
        <Icon name="add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
});

const AmountField = React.memo(({ label, value, onChange, themedColors, styles }: any) => (
  <View style={styles.fieldGroup}>
    <FieldLabel text={label} styles={styles} />
    <View style={styles.amountRow}>
      <TextInput
        style={styles.amountInput}
        value={value === 0 ? '' : String(value)}
        onChangeText={(t) => onChange(Number(t.replace(/\D/g, '')) || 0)}
        placeholder="0"
        placeholderTextColor={themedColors.textHint}
        keyboardType="numeric"
      />
      <Text style={styles.currencyTag}>VND</Text>
      <TouchableOpacity style={styles.stepSm} onPress={() => onChange(Math.max(0, value - 100000))}>
        <Icon name="remove" size={16} color={themedColors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.stepSm, styles.stepSmPlus]} onPress={() => onChange(value + 100000)}>
        <Icon name="add" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

const RoomCard = React.memo(({ room, t, themedColors, styles }: { room: RoomInfo; t: any; themedColors: any; styles: any }) => (
  <View style={styles.roomCard}>
    <View style={styles.roomIcon}>
      <Icon name="meeting-room" size={24} color={themedColors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.roomName}>{room.name}</Text>
      <Text style={styles.roomLabel}>{room.product_name}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: themedColors.text, marginTop: 4 }}>
        {t('roomDetail.floor')} {room.floor}
      </Text>
    </View>
  </View>
));

const TenantSection = React.memo(({
  form, updateForm, isCustomerDropdownOpen, setIsCustomerDropdownOpen,
  filteredCustomers, selectedCustomer, setSelectedCustomer,
  t, themedColors, styles
}: any) => (
  <View>
    <SectionLabel text={t('booking.sections.tenant')} styles={styles} />
    <View style={styles.tenantToggleRow}>
      <TouchableOpacity
        style={[styles.tenantTabBtn, form.tenantTab === 'existing' && styles.tenantTabBtnActive]}
        onPress={() => updateForm({ tenantTab: 'existing' })}
      >
        <Text style={[styles.tenantTabText, form.tenantTab === 'existing' && styles.tenantTabTextActive]}>{t('booking.form.selectCustomer')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tenantTabBtn, form.tenantTab === 'new' && styles.tenantTabBtnActive]}
        onPress={() => updateForm({ tenantTab: 'new' })}
      >
        <Text style={[styles.tenantTabText, form.tenantTab === 'new' && styles.tenantTabTextActive]}>{t('booking.form.newCustomer')}</Text>
      </TouchableOpacity>
    </View>

    {form.tenantTab === 'existing' ? (
      <View style={{ zIndex: 10 }}>
        <FieldLabel text={t('booking.form.searchLabel')} styles={styles} />
        <TouchableOpacity
          style={[styles.dropdownTrigger, isCustomerDropdownOpen && styles.dropdownTriggerActive]}
          onPress={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
        >
          <Icon name="search" size={18} color={themedColors.textHint} />
          <TextInput
            style={styles.dropdownSearchInput}
            value={form.searchQuery}
            onFocus={() => setIsCustomerDropdownOpen(true)}
            onChangeText={(v) => updateForm({ searchQuery: v })}
            placeholder={selectedCustomer ? selectedCustomer.full_name : t('booking.form.searchCustomer')}
            placeholderTextColor={themedColors.textHint}
          />
          <Icon name="arrow-drop-down" size={20} color={themedColors.textHint} />
        </TouchableOpacity>

        {isCustomerDropdownOpen && (
          <View style={styles.dropdownWindow}>
            <ScrollView nestedScrollEnabled>
              {filteredCustomers.length === 0 ? (
                <Text style={{ textAlign: 'center', color: themedColors.textHint, padding: 20 }}>{t('booking.form.notFound')}</Text>
              ) : (
                filteredCustomers.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.customerItem, selectedCustomer?.id === c.id && styles.customerItemActive]}
                    onPress={() => { setSelectedCustomer(c); setIsCustomerDropdownOpen(false); }}
                  >
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerInitials}>{c.full_name?.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerName, selectedCustomer?.id === c.id && { color: '#fff' }]}>{c.full_name}</Text>
                      <Text style={[styles.customerPhone, selectedCustomer?.id === c.id && { color: 'rgba(255,255,255,0.7)' }]}>{c.phone || c.id_number}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {selectedCustomer && !isCustomerDropdownOpen && (
          <View style={styles.selectedCustomerSummary}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitials}>{selectedCustomer.full_name?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{selectedCustomer.full_name}</Text>
              <Text style={styles.customerPhone}>{selectedCustomer.phone || selectedCustomer.id_number}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
              <Icon name="close" size={20} color={themedColors.textHint} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    ) : (
      <View style={{ gap: 10 }}>
        <TouchableOpacity style={styles.scanBtn}><Text style={styles.scanBtnText}>{t('booking.form.scanning')}</Text></TouchableOpacity>
        <FieldInput fieldKey="fullName" value={form.fullName} onChangeText={(v: any) => updateForm({ fullName: v })} placeholder={t('booking.form.fullName')} themedColors={themedColors} styles={styles} />
        <FieldInput fieldKey="phone" value={form.phone} onChangeText={(v: any) => updateForm({ phone: v })} placeholder={t('booking.form.phone')} keyboardType="phone-pad" themedColors={themedColors} styles={styles} />
        <FieldInput fieldKey="idCard" value={form.idCard} onChangeText={(v: any) => updateForm({ idCard: v })} placeholder={t('booking.form.idCard')} themedColors={themedColors} styles={styles} />
      </View>
    )}
  </View>
));

const ServiceSelectionModal = React.memo(({ visible, onClose, availableServices, form, updateForm, formatVND, t, themedColors, styles }: any) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('booking.form.serviceModalTitle')}</Text>
          <TouchableOpacity onPress={onClose}><Icon name="close" size={24} color={themedColors.textSecondary} /></TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 400 }}>
          {availableServices.length === 0 ? (
            <Text style={{ textAlign: 'center', color: themedColors.textHint, padding: 40 }}>{t('booking.form.noAvailableServices')}</Text>
          ) : (
            availableServices.map((svc: any) => (
              <TouchableOpacity
                key={svc.id}
                style={styles.svcSelectItem}
                onPress={() => {
                  const ext = form.services.find((s: any) => s.id === svc.id);
                  if (ext) {
                    updateForm({ services: form.services.map((s: any) => s.id === svc.id ? { ...s, qty: s.qty + 1 } : s) });
                  } else {
                    updateForm({ services: [...form.services, { ...svc, qty: 1, selected: true }] });
                  }
                }}
              >
                <View style={styles.svcSelectIcon}><Icon name="room-service" size={20} color={themedColors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.svcSelectName}>{svc.name}</Text>
                  <Text style={styles.svcSelectPrice}>{formatVND(svc.unitPrice)} / {svc.unit}</Text>
                </View>
                <Icon name="add" size={22} color={themedColors.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}><Text style={styles.modalCloseBtnText}>{t('booking.form.close')}</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>
));

const ServicesSection = React.memo(({ form, availableServices, updateForm, formatVND, t, themedColors, styles }: any) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  return (
    <View>
      <SectionLabel text={t('booking.sections.services')} styles={styles} />
      {form.services.length === 0 ? (
        <View style={[styles.card, { padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: themedColors.border }]}>
          <Text style={{ color: themedColors.textHint }}>{t('booking.form.noServices')}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {form.services.map((svc: Service, idx: number) => (
            <View key={svc.id} style={[styles.svcItem, idx < form.services.length - 1 && styles.svcItemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.svcName}>{svc.name}</Text>
                <Text style={styles.svcUnit}>{formatVND(svc.unitPrice)} / {svc.unit}</Text>
              </View>
              <Stepper
                value={svc.qty}
                onDecrement={() => updateForm({ services: form.services.map((s: any) => s.id === svc.id ? { ...s, qty: Math.max(1, s.qty - 1) } : s) })}
                onIncrement={() => updateForm({ services: form.services.map((s: any) => s.id === svc.id ? { ...s, qty: s.qty + 1 } : s) })}
                min={1}
                themedColors={themedColors}
                styles={styles}
              />
              <TouchableOpacity onPress={() => updateForm({ services: form.services.filter((s: any) => s.id !== svc.id) })} style={styles.svcDelete}>
                <Icon name="delete-outline" size={22} color={themedColors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.addSvcBtn} onPress={() => setIsMenuVisible(true)}>
        <Text style={styles.addSvcText}>{t('booking.form.addService')}</Text>
      </TouchableOpacity>
      <ServiceSelectionModal
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        availableServices={availableServices}
        form={form}
        updateForm={updateForm}
        formatVND={formatVND}
        t={t}
        themedColors={themedColors}
        styles={styles}
      />
    </View>
  );
});

const LongTermForm = React.memo(({ form, updateForm, t, themedColors, styles, isDark }: any) => {
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);

  const durationOptions = [
    { label: '3 tháng', value: '3' },
    { label: '6 tháng', value: '6' },
    { label: '1 năm', value: '1' },
    { label: '2 năm', value: '2' },
  ];

  return (
    <>
      <FieldLabel text={t('booking.form.startDate')} styles={styles} />
      <TouchableOpacity style={styles.fieldInputRow} onPress={() => setIsCalOpen(true)}>
        <Text style={{ color: themedColors.text }}>{form.contractStart || t('booking.form.selectStartDate')}</Text>
        <Icon name="calendar-today" size={18} color={themedColors.textSecondary} />
      </TouchableOpacity>
      <View style={{ height: 12 }} />
      <FieldLabel text={t('booking.form.duration')} styles={styles} />
      <TouchableOpacity
        style={[styles.dropdownTrigger, isDurationOpen && styles.dropdownTriggerActive]}
        onPress={() => setIsDurationOpen(!isDurationOpen)}
      >
        <Text style={{ flex: 1, color: themedColors.text }}>
          {durationOptions.find(o => o.value === form.contractDuration)?.label || 'Chọn thời hạn'}
        </Text>
        <Icon name="arrow-drop-down" size={20} color={themedColors.textHint} />
      </TouchableOpacity>

      {isDurationOpen && (
        <View style={{
          backgroundColor: themedColors.surface,
          borderRadius: 8,
          borderWidth: 0.5,
          borderColor: themedColors.border,
          marginTop: 4,
          overflow: 'hidden'
        }}>
          {durationOptions.map((opt, idx) => (
            <TouchableOpacity
              key={opt.value}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderBottomWidth: idx === durationOptions.length - 1 ? 0 : 0.5,
                borderBottomColor: themedColors.border,
                backgroundColor: form.contractDuration === opt.value ? (isDark ? '#2D3748' : '#F0F7FF') : 'transparent'
              }}
              onPress={() => { updateForm({ contractDuration: opt.value }); setIsDurationOpen(false); }}
            >
              <Text style={{
                fontSize: 14,
                color: form.contractDuration === opt.value ? themedColors.primary : themedColors.text,
                fontWeight: form.contractDuration === opt.value ? '600' : '400'
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ height: 12 }} />
      <AmountField label={t('booking.form.deposit')} value={form.deposit} onChange={(v: any) => updateForm({ deposit: v })} themedColors={themedColors} styles={styles} />
      <AmountField label={t('booking.form.monthlyRent')} value={form.monthlyPrice} onChange={(v: any) => updateForm({ monthlyPrice: v })} themedColors={themedColors} styles={styles} />
      <View style={{ height: 12 }} />
      <FieldLabel text={t('booking.form.initialMeter')} styles={styles} />
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.electric')} styles={styles} />
          <FieldInput fieldKey="electricStart" value={form.electricStart} onChangeText={(v: any) => updateForm({ electricStart: v })} placeholder="0" keyboardType="numeric" themedColors={themedColors} styles={styles} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.water')} styles={styles} />
          <FieldInput fieldKey="waterStart" value={form.waterStart} onChangeText={(v: any) => updateForm({ waterStart: v })} placeholder="0" keyboardType="numeric" themedColors={themedColors} styles={styles} />
        </View>
      </View>
      <CalendarModal
        visible={isCalOpen}
        selectedDate={new Date(form.contractStart)}
        onConfirm={(d) => { setIsCalOpen(false); updateForm({ contractStart: d.toISOString().split('T')[0] }); }}
        onCancel={() => setIsCalOpen(false)}
        title={t('booking.form.selectStartDate')}
      />
    </>
  );
});

const ShortTermForm = React.memo(({ form, updateForm, t, themedColors, styles }: any) => {
  const [isInOpen, setIsInOpen] = useState(false);
  const [isOutOpen, setIsOutOpen] = useState(false);
  return (
    <>
      <SectionLabel text={t('booking.sections.shortTerm')} styles={styles} />

      <View style={styles.dateRow}>
        <View style={{ flex: 1.5 }}>
          <FieldLabel text={t('booking.form.checkin')} styles={styles} />
          <TouchableOpacity
            style={styles.fieldInputRow}
            onPress={() => setIsInOpen(true)}
          >
            <Text style={{ color: themedColors.text }}>{form.checkinDate}</Text>
            <Icon name="event" size={18} color={themedColors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.time')} styles={styles} />
          <TimeStepper value={form.checkinTime} onChange={(v: any) => updateForm({ checkinTime: v })} themedColors={themedColors} styles={styles} />
        </View>
      </View>

      <View style={{ height: 12 }} />

      <View style={styles.dateRow}>
        <View style={{ flex: 1.5 }}>
          <FieldLabel text={t('booking.form.checkout')} styles={styles} />
          <TouchableOpacity
            style={styles.fieldInputRow}
            onPress={() => setIsOutOpen(true)}
          >
            <Text style={{ color: themedColors.text }}>{form.checkoutDate}</Text>
            <Icon name="event" size={18} color={themedColors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.time')} styles={styles} />
          <TimeStepper value={form.checkoutTime} onChange={(v: any) => updateForm({ checkoutTime: v })} themedColors={themedColors} styles={styles} />
        </View>
      </View>

      <View style={{ height: 12 }} />
      <AmountField label={t('booking.form.deposit')} value={form.deposit} onChange={(v: any) => updateForm({ deposit: v })} themedColors={themedColors} styles={styles} />

      <View style={{ height: 16 }} />
      <View style={styles.utilRow}>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.adults')} styles={styles} />
          <Stepper
            value={form.adults}
            onDecrement={() => updateForm({ adults: Math.max(1, form.adults - 1) })}
            onIncrement={() => updateForm({ adults: form.adults + 1 })}
            min={1}
            themedColors={themedColors}
            styles={styles}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.children')} styles={styles} />
          <Stepper
            value={form.children}
            onDecrement={() => updateForm({ children: Math.max(0, form.children - 1) })}
            onIncrement={() => updateForm({ children: form.children + 1 })}
            min={0}
            themedColors={themedColors}
            styles={styles}
          />
        </View>
      </View>
      <CalendarModal visible={isInOpen} selectedDate={new Date(form.checkinDate)} title={t('booking.form.checkin')} onConfirm={(d) => { setIsInOpen(false); updateForm({ checkinDate: d.toISOString().split('T')[0] }); }} onCancel={() => setIsInOpen(false)} />
      <CalendarModal visible={isOutOpen} selectedDate={new Date(form.checkoutDate)} title={t('booking.form.checkout')} onConfirm={(d) => { setIsOutOpen(false); updateForm({ checkoutDate: d.toISOString().split('T')[0] }); }} onCancel={() => setIsOutOpen(false)} />
    </>
  );
});

// ─────────────────────────────────────────────
// Summary Components
// ─────────────────────────────────────────────

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

const LongTermSummary = React.memo(({ form, room, selectedCustomer, onEdit, onConfirm, formatVND, styles, agreedTerms, setAgreedTerms, confirming, t }: any) => {
  const serviceTotal = form.services.reduce((sum: number, s: any) => sum + (s.qty * s.unitPrice), 0);
  const grandTotal = form.monthlyPrice + form.deposit + serviceTotal;

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.summaryContent}>
        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionTitle}>{t('booking.summary.roomSummary')}</Text>
        </View>
        <View style={styles.summaryRoomCard}>
          <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.summaryRoomImage} />
          <View style={styles.summaryRoomInfo}>
            <Text style={styles.summaryRoomTag}>{t('booking.summary.roomSummary')}</Text>
            <Text style={styles.summaryRoomName}>{room.label}</Text>
          </View>
        </View>

        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionTitle}>{t('booking.summary.customerInfo')}</Text>
          <TouchableOpacity onPress={onEdit}><Text style={styles.summaryEditBtn}>{t('booking.summary.edit')}</Text></TouchableOpacity>
        </View>
        <View style={styles.summaryCustomerCard}>
          <View style={styles.summaryCustomerAvatar}>
            <Icon name="person" size={24} color="#fff" />
          </View>
          <View style={styles.summaryCustomerInfo}>
            <Text style={styles.summaryCustomerName}>{selectedCustomer?.full_name || form.fullName}</Text>
            <Text style={styles.summaryCustomerPhone}>{selectedCustomer?.phone || form.phone}</Text>
          </View>
        </View>

        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionTitle}>{t('booking.sections.contract')}</Text>
        </View>
        <View style={styles.summaryDetailGrid}>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.startDate')}</Text>
              <Text style={styles.summaryGridValue}>{form.contractStart}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.duration')}</Text>
              <Text style={styles.summaryGridValue}>{form.contractDuration === '1' ? '12 tháng' :
                form.contractDuration === '2' ? '24 tháng' :
                  form.contractDuration + ' tháng'}</Text>
            </View>
          </View>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.electric')} ({t('booking.form.initialMeter')})</Text>
              <Text style={styles.summaryGridValue}>{form.electricStart} kWh</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.water')} ({t('booking.form.initialMeter')})</Text>
              <Text style={styles.summaryGridValue}>{form.waterStart} m³</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryHighlightCard}>
          <Text style={styles.summaryHighlightLabel}>{t('booking.form.monthlyRent')}</Text>
          <Text style={styles.summaryHighlightValue}>{formatVND(form.monthlyPrice)}</Text>
        </View>

        {form.services.length > 0 && (
          <>
            <View style={styles.summarySectionHeader}>
              <Text style={styles.summarySectionTitle}>{t('booking.sections.services')}</Text>
            </View>
            {form.services.map((svc: any) => (
              <View key={svc.id} style={styles.summarySvcItem}>
                <View style={styles.summarySvcIcon}>
                  <Icon name="wifi" size={18} color="#3B82F6" />
                </View>
                <Text style={styles.summarySvcName}>{svc.name}</Text>
                <Text style={styles.summarySvcPrice}>{formatVND(svc.unitPrice)}/tháng</Text>
              </View>
            ))}
            <View style={{ height: 12 }} />
          </>
        )}

        <View style={styles.summaryTotalCard}>
          <Text style={styles.summaryTotalTitle}>{t('booking.summary.totalInitial')}</Text>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.roomRentMonth')}</Text>
            <Text style={styles.confSummaryTotalValue}>{formatVND(form.monthlyPrice)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.depositMonth')}</Text>
            <Text style={styles.confSummaryTotalValue}>{formatVND(form.deposit)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.serviceMonthly')}</Text>
            <Text style={styles.confSummaryTotalValue}>{formatVND(serviceTotal)}</Text>
          </View>
          <View style={styles.summaryGrandTotalRow}>
            <Text style={styles.confSummaryGrandTotalLabel}>{t('booking.summary.total')}</Text>
            <Text style={styles.confSummaryGrandTotalValue}>{formatVND(grandTotal)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.summaryCheckboxRow}
          onPress={() => setAgreedTerms(!agreedTerms)}
        >
          <View style={[styles.summaryCheckbox, agreedTerms && styles.summaryCheckboxChecked]}>
            {agreedTerms && <Icon name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.summaryCheckboxText}>{t('booking.summary.termsLong')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.summarySubmitBtn, (!agreedTerms || confirming) && styles.summarySubmitBtnDisabled]}
          onPress={onConfirm}
          disabled={!agreedTerms || confirming}
        >
          {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.summarySubmitBtnText}>{t('booking.summary.btnSign')}</Text>}
        </TouchableOpacity>

        <Text style={styles.summaryFooterText}>
          {t('booking.summary.footer')}
        </Text>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
});

const ShortTermSummary = React.memo(({ form, room, selectedCustomer, onEdit, onConfirm, formatVND, styles, confirming, themedColors, t }: any) => {
  const serviceTotal = form.services.reduce((sum: number, s: any) => sum + (s.qty * s.unitPrice), 0);

  // Calculate nights
  const checkin = new Date(form.checkinDate);
  const checkout = new Date(form.checkoutDate);
  const nights = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  const roomTotal = room.price * nights;
  const grandTotal = roomTotal + serviceTotal;

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.summaryContent}>
        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionTitle}>{t('booking.sections.room')}</Text>
        </View>
        <View style={styles.summaryRoomCard}>
          <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.summaryRoomImage} />
          <View style={styles.summaryRoomInfo}>
            <Text style={styles.summaryRoomTag}>{t('booking.sections.room')}</Text>
            <Text style={styles.summaryRoomName}>{room.label}</Text>
            <Text style={styles.summaryRoomAddr}>{room.product_name}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: themedColors.text, marginTop: 4 }}>
              {t('roomDetail.floor')} {room.floor}
            </Text>
          </View>
        </View>

        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionTitle}>{t('booking.sections.tenant')}</Text>
          <TouchableOpacity onPress={onEdit}><Text style={styles.summaryEditBtn}>{t('booking.summary.edit')}</Text></TouchableOpacity>
        </View>
        <View style={styles.summaryCustomerCard}>
          <View style={styles.summaryCustomerAvatar}>
            <Icon name="person" size={24} color="#fff" />
          </View>
          <View style={styles.summaryCustomerInfo}>
            <Text style={styles.summaryCustomerName}>{selectedCustomer?.full_name || form.fullName}</Text>
            <Text style={styles.summaryCustomerPhone}>{selectedCustomer?.phone || form.phone}</Text>
          </View>
        </View>

        <View style={styles.summarySectionHeader}>
          <Text style={styles.summarySectionTitle}>{t('booking.sections.stayDetails')}</Text>
        </View>
        <View style={styles.summaryDetailGrid}>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.checkin')}</Text>
              <Text style={styles.summaryGridValue}>{form.checkinDate}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{form.checkinTime}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.checkout')}</Text>
              <Text style={styles.summaryGridValue}>{form.checkoutDate}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{form.checkoutTime}</Text>
            </View>
          </View>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="people" size={16} color="#9CA3AF" />
                <Text style={{ fontSize: 14, color: '#1A1A1A', marginLeft: 6 }}>{form.adults} {t('booking.form.adults')}, {form.children} {t('booking.form.children')}</Text>
              </View>
            </View>
            <View style={styles.summaryGridItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Icon name="nights-stay" size={16} color="#9CA3AF" />
                <Text style={{ fontSize: 14, color: '#1A1A1A', marginLeft: 6 }}>{nights} Đêm</Text>
              </View>
            </View>
          </View>
        </View>

        {form.services.length > 0 && (
          <>
            <View style={styles.summarySectionHeader}>
              <Text style={styles.summarySectionTitle}>{t('booking.sections.services')}</Text>
            </View>
            {form.services.map((svc: any) => (
              <View key={svc.id} style={styles.summarySvcItem}>
                <View style={styles.summarySvcIcon}>
                  <Icon name="room-service" size={18} color="#3B82F6" />
                </View>
                <Text style={styles.summarySvcName}>{svc.name}</Text>
                <Text style={styles.summarySvcPrice}>{formatVND(svc.qty * svc.unitPrice)}</Text>
              </View>
            ))}
            <View style={{ height: 16 }} />
          </>
        )}

        <View style={styles.summaryTotalCard}>
          <Text style={styles.summaryTotalTitle}>{t('booking.summary.paymentDetail')}</Text>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.roomRentNights', { nights })}</Text>
            <Text style={styles.confSummaryTotalValue}>{formatVND(roomTotal)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.serviceAdd')}</Text>
            <Text style={styles.confSummaryTotalValue}>{formatVND(serviceTotal)}</Text>
          </View>
          <View style={styles.summaryGrandTotalRow}>
            <Text style={styles.confSummaryGrandTotalLabel}>{t('booking.summary.totalToPay')}</Text>
            <Text style={styles.confSummaryGrandTotalValue}>{formatVND(grandTotal)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.summarySubmitBtn, confirming && styles.summarySubmitBtnDisabled]}
          onPress={onConfirm}
          disabled={confirming}
        >
          {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.summarySubmitBtnText}>{t('booking.summary.btnConfirm')}</Text>}
        </TouchableOpacity>

        <Text style={styles.summaryFooterText}>
          {t('booking.summary.footer')}
        </Text>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
});

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const BookingScreen = ({ route, navigation, ...props }: any) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // ─── Theme Colors Logic ──────────────────────────────────────────────────
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

  const styles = useMemo(() => StyleSheet.create({
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
    headerTitle: { fontSize: 16, fontWeight: '600', color: themedColors.text },
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
    section: { marginBottom: 16 },
    card: {
      backgroundColor: themedColors.surface,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      padding: 14,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: themedColors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: themedColors.textSecondary,
      letterSpacing: 0.4,
      marginBottom: 4,
    },
    fieldGroup: { marginBottom: 12 },
    fieldInput: {
      backgroundColor: themedColors.surface,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: themedColors.text,
    },
    fieldInputMulti: { minHeight: 72, textAlignVertical: 'top' },
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
    stepperWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnPlus: { backgroundColor: themedColors.primary, borderColor: themedColors.primary },
    stepBtnDisabled: { opacity: 0.35 },
    stepBtnText: { fontSize: 16, color: themedColors.text },
    stepVal: { fontSize: 15, fontWeight: '600', color: themedColors.text, minWidth: 20, textAlign: 'center' },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    amountInput: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 14,
      color: themedColors.text,
      backgroundColor: themedColors.surface,
    },
    currencyTag: { fontSize: 12, color: themedColors.textSecondary },
    fieldInputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: themedColors.surface,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    stepSm: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themedColors.surface,
    },
    stepSmPlus: { backgroundColor: themedColors.primary, borderColor: themedColors.primary },
    roomCard: {
      backgroundColor: themedColors.surfaceAlt,
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
      backgroundColor: themedColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomName: { fontSize: 16, fontWeight: '600', color: themedColors.primary },
    roomSub: { fontSize: 12, color: themedColors.textSecondary },
    tenantToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    tenantTabBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: themedColors.border,
      alignItems: 'center',
      backgroundColor: themedColors.surface,
    },
    tenantTabBtnActive: { backgroundColor: themedColors.primary, borderColor: themedColors.primary },
    tenantTabText: { fontSize: 13, color: themedColors.textSecondary },
    tenantTabTextActive: { color: '#fff' },
    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 8,
    },
    dropdownTriggerActive: { borderColor: themedColors.primary },
    dropdownSearchInput: { flex: 1, fontSize: 14, color: themedColors.text, padding: 0 },
    dropdownWindow: {
      backgroundColor: themedColors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: themedColors.border,
      position: 'absolute',
      top: 80,
      left: 0,
      right: 0,
      zIndex: 999,
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      maxHeight: 220,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: themedColors.border,
    },
    dropdownItemName: { fontSize: 14, fontWeight: '600', color: themedColors.text },
    dropdownItemInfo: { fontSize: 12, color: themedColors.textSecondary, marginTop: 2 },
    emptyText: { textAlign: 'center', padding: 20, color: themedColors.textSecondary, fontSize: 13 },
    confirmBtn: {
      backgroundColor: themedColors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
    },
    confirmBtnDisabled: { backgroundColor: themedColors.textHint },
    confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    summaryCard: {
      backgroundColor: themedColors.primaryLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: themedColors.primaryMid,
    },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: themedColors.primary, marginBottom: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(55,138,221,0.2)' },
    summaryLabel: { fontSize: 14, color: themedColors.textSecondary },
    summaryValue: { fontSize: 14, color: themedColors.text, fontWeight: '600' },
    summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: themedColors.primary },
    summaryTotalValue: { fontSize: 18, fontWeight: '800', color: themedColors.primary },
    svcSelectModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    svcSelectContent: { backgroundColor: themedColors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    svcSelectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    svcSelectTitle: { fontSize: 18, fontWeight: '700', color: themedColors.text },
    svcSelectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: themedColors.border,
      gap: 12,
    },
    svcSelectItemActive: { backgroundColor: themedColors.primaryLight },
    svcSelectIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: themedColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    svcSelectName: { fontSize: 14, fontWeight: '600', color: themedColors.text },
    svcSelectPrice: { fontSize: 12, color: themedColors.textSecondary, marginTop: 2 },
    modalCloseBtn: {
      borderRadius: 8,
      backgroundColor: themedColors.surfaceAlt,
      alignItems: 'center',
      paddingVertical: 10,
      marginTop: 20,
    },
    modalCloseBtnText: { fontSize: 14, fontWeight: '600', color: themedColors.textSecondary },
    customerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      gap: 10,
    },
    customerItemActive: { backgroundColor: themedColors.primary },
    customerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: themedColors.primaryMid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    customerInitials: { fontSize: 12, fontWeight: '600', color: '#fff' },
    customerName: { fontSize: 13, fontWeight: '500', color: themedColors.text },
    customerPhone: { fontSize: 11, color: themedColors.textSecondary },
    selectedCustomerSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: themedColors.surfaceAlt,
      borderRadius: 10,
      marginTop: 8,
      gap: 12,
    },
    scanBtn: {
      borderWidth: 1,
      borderColor: themedColors.primaryMid,
      borderStyle: 'dashed',
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
      backgroundColor: themedColors.primaryLight,
      marginBottom: 12,
    },
    scanBtnText: { fontSize: 13, color: themedColors.primary },
    svcItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
    svcItemBorder: { borderBottomWidth: 0.5, borderBottomColor: themedColors.border },
    svcName: { fontSize: 13, fontWeight: '500', color: themedColors.text },
    svcUnit: { fontSize: 11, color: themedColors.textSecondary },
    svcDelete: { padding: 8, marginLeft: 10 },
    addSvcBtn: {
      marginTop: 6,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: themedColors.primary,
      alignItems: 'center',
      backgroundColor: themedColors.primaryLight,
    },
    addSvcText: { fontSize: 13, color: themedColors.primary, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: themedColors.surface, borderRadius: 16, padding: 16, maxHeight: '80%' },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: themedColors.border,
      marginBottom: 10,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: themedColors.text },
    dateRow: { flexDirection: 'row', gap: 10 },
    utilRow: { flexDirection: 'row', gap: 12 },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: themedColors.border,
      backgroundColor: themedColors.surface,
    },
    summaryContent: { padding: 16 },
    summaryRoomCard: {
      backgroundColor: themedColors.surface,
      borderRadius: 16,
      padding: 12,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: themedColors.border,
      marginBottom: 20,
    },
    summaryRoomImage: {
      width: 100,
      height: 80,
      borderRadius: 12,
      backgroundColor: themedColors.primaryLight,
    },
    summaryRoomInfo: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    summaryRoomTag: {
      fontSize: 10,
      fontWeight: 'bold',
      color: themedColors.primary,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    summaryRoomName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    summaryRoomAddr: { fontSize: 12, color: themedColors.textSecondary, marginTop: 2 },
    summarySectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    summarySectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
    summaryEditBtn: { fontSize: 14, color: themedColors.primary, fontWeight: '600' },
    summaryCustomerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F0F7FF',
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    summaryCustomerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: themedColors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryCustomerInfo: { marginLeft: 12 },
    summaryCustomerName: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
    summaryCustomerPhone: { fontSize: 13, color: themedColors.textSecondary },
    summaryDetailGrid: {
      paddingVertical: 12,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#F0F0F0',
      marginBottom: 16,
    },
    summaryGridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    summaryGridItem: { flex: 1 },
    summaryGridLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
    summaryGridValue: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
    summaryHighlightCard: {
      backgroundColor: '#F0F7FF',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#D1E9FF',
    },
    summaryHighlightLabel: { fontSize: 14, color: themedColors.primary, fontWeight: '500' },
    summaryHighlightValue: { fontSize: 18, fontWeight: 'bold', color: themedColors.primary },
    summarySvcItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#F3F4F6',
    },
    summarySvcIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#F0F7FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    summarySvcName: { flex: 1, marginLeft: 12, fontSize: 14, color: '#4B5563' },
    summarySvcPrice: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
    summaryTotalCard: { backgroundColor: '#F0F7FF', borderRadius: 16, padding: 16, marginBottom: 20 },
    summaryTotalTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
    summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    confSummaryTotalLabel: { fontSize: 14, color: '#6B7280' },
    confSummaryTotalValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
    confSummaryGrandTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    confSummaryGrandTotalValue: { fontSize: 20, fontWeight: 'bold', color: themedColors.primary },
    summaryGrandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#D1E9FF',
    },
    summaryCheckboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    summaryCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: themedColors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    summaryCheckboxChecked: {
      backgroundColor: themedColors.primary,
      borderColor: themedColors.primary,
    },
    summaryCheckboxText: {
      fontSize: 12,
      color: '#6B7280',
      flex: 1,
    },
    summarySubmitBtn: {
      backgroundColor: themedColors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: themedColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    summarySubmitBtnDisabled: {
      backgroundColor: '#9CA3AF',
      shadowOpacity: 0,
    },
    summarySubmitBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    summaryFooterText: {
      textAlign: 'center',
      fontSize: 11,
      color: '#9CA3AF',
      marginTop: 12,
      lineHeight: 16,
    },
  }), [themedColors]);

  // ─── State & Layout Data ────────────────────────────────────────────────
  const room = route?.params?.room || props.room;
  const storeId = route?.params?.storeId || props.storeId || 'store-001';
  const onClose = props.onClose || (() => navigation?.goBack());
  const onConfirmProp = props.onConfirm;

  const [form, setForm] = useState<BookingForm>({
    stayType: 'long_term',
    tenantTab: 'existing',
    searchQuery: '',
    deposit: room?.price || 0,
    note: '',
    services: [],
    contractStart: new Date().toISOString().split('T')[0],
    contractDuration: '1 năm',
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
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  useEffect(() => {
    if (!room?.id) {
      Alert.alert('Lỗi', t('Room information not found'));
      onClose();
      return;
    }
    loadData();
  }, [room?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const custs = await customerService.getCustomerPickerList(storeId);
      setCustomers(custs);
      const svcs = await PosQueryService.getServices(storeId);
      setAvailableServices(svcs.map(s => ({
        ...s,
        id: s.id,
        variantId: s.variantId,
        unitId: s.unitId,
        name: s.name,
        unitPrice: s.unitPrice,
        unit: s.unit,
        qty: 1,
        selected: false,
      })));
    } catch (err) {
      console.error('[BookingScreen] load error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // Rename this for internal use
  const processFinalSubmission = async () => {
    if (form.tenantTab === 'existing' && !selectedCustomer) {
      Alert.alert('Lỗi', 'Vui lòng chọn khách hàng'); return;
    }
    if (form.tenantTab === 'new' && (!form.fullName || !form.phone)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ họ tên và SĐT khách mới'); return;
    }

    setConfirming(true);
    try {
      if (form.stayType === 'long_term') {
        const duration = form.contractDuration === '1 năm' ? 12 :
          form.contractDuration === '2 năm' ? 24 :
            parseInt(form.contractDuration, 10) || 12;

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
      Alert.alert('Thành công', 'Hợp đồng đã được xác nhận');
      if (onConfirmProp) {
        onConfirmProp();
      } else {
        onClose();
      }
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

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!room) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={viewMode === 'summary' ? () => setViewMode('form') : onClose}
        >
          <Icon name="arrow-back" size={20} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === 'summary'
            ? (form.stayType === 'long_term' ? 'Xác nhận hợp đồng' : 'Xác nhận đặt phòng')
            : 'Đăng ký lưu trú'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {viewMode === 'form' ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <SectionLabel text={t('booking.sections.room')} styles={styles} />
          <RoomCard room={room} t={t} themedColors={themedColors} styles={styles} />
          <View style={{ height: 16 }} />

          <TenantSection
            form={form}
            updateForm={updateForm}
            isCustomerDropdownOpen={isCustomerDropdownOpen}
            setIsCustomerDropdownOpen={setIsCustomerDropdownOpen}
            filteredCustomers={filteredCustomers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            t={t}
            themedColors={themedColors}
            styles={styles}
          />

          <View style={{ height: 16 }} />
          <SectionLabel text={t('booking.sections.stayType')} styles={styles} />
          <ToggleGroup
            value={form.stayType}
            onChange={(v: any) => updateForm({ stayType: v })}
            options={[
              { value: 'long_term', label: t('booking.sections.longTerm'), sub: t('booking.sections.longSub') },
              { value: 'short_term', label: t('booking.sections.shortTerm'), sub: t('booking.sections.shortSub') },
            ]}
            styles={styles}
          />

          <View style={{ height: 16 }} />
          <View style={styles.card}>
            {form.stayType === 'long_term' ?
              <LongTermForm form={form} updateForm={updateForm} t={t} themedColors={themedColors} styles={styles} isDark={isDark} /> :
              <ShortTermForm form={form} updateForm={updateForm} t={t} themedColors={themedColors} styles={styles} />
            }
          </View>

          <View style={{ height: 16 }} />
          <SectionLabel text={t('booking.sections.notes')} styles={styles} />
          <FieldInput
            value={form.note}
            onChangeText={(v: any) => updateForm({ note: v })}
            placeholder={t('booking.form.notePlaceholder')}
            multiline
            themedColors={themedColors}
            styles={styles}
          />

          <View style={{ height: 16 }} />
          <ServicesSection
            form={form}
            availableServices={availableServices}
            updateForm={updateForm}
            formatVND={formatVND}
            t={t}
            themedColors={themedColors}
            styles={styles}
          />

          <View style={{ height: 24 }} />

          {/* Price Summary Section */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('booking.sections.summary')}</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{form.stayType === 'long_term' ? t('booking.summary.roomRentMonth') : t('booking.summary.roomRent')}</Text>
              <Text style={styles.summaryValue}>{formatVND(form.stayType === 'long_term' ? form.monthlyPrice : room.price)}</Text>
            </View>

            {form.stayType === 'long_term' && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('booking.summary.deposit')}</Text>
                <Text style={styles.summaryValue}>{formatVND(form.deposit)}</Text>
              </View>
            )}

            {form.services.length > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('booking.summary.serviceAdd')} ({form.services.length})</Text>
                <Text style={styles.summaryValue}>{formatVND(form.services.reduce((sum, s) => sum + (s.qty * s.unitPrice), 0))}</Text>
              </View>
            )}

            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>{t('booking.summary.total')}</Text>
              <Text style={styles.summaryTotalValue}>
                {formatVND(
                  (form.stayType === 'long_term' ? form.monthlyPrice + form.deposit : room.price) +
                  form.services.reduce((sum, s) => sum + (s.qty * s.unitPrice), 0)
                )}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, (confirming || loading) && styles.confirmBtnDisabled]}
            onPress={handleNext}
            disabled={confirming || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>{t('booking.summary.btnNext')}</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        form.stayType === 'long_term' ? (
          <LongTermSummary
            form={form}
            room={room}
            selectedCustomer={selectedCustomer}
            onEdit={() => setViewMode('form')}
            onConfirm={processFinalSubmission}
            formatVND={formatVND}
            styles={styles}
            agreedTerms={agreedTerms}
            setAgreedTerms={setAgreedTerms}
            confirming={confirming}
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
            styles={styles}
            confirming={confirming}
            themedColors={themedColors}
            t={t}
          />
        )
      )}
    </SafeAreaView>
  );
};

export default BookingScreen;