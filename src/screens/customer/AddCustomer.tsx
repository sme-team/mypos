import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {CalendarModal} from '../../components/DateInput';
import {
  IDScannerModal,
  CCCDData,
} from '../../components/booking/modals/IDScannerModal';
import {useTheme} from '../../hooks/useTheme';

import {
  CustomerService,
  CustomerInput,
  CustomerRecord,
  CustomerGender,
  CustomerGroup,
} from '../../services/database/customer/CustomerService';

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerType = 'selling' | 'storage';

interface AddCustomerForm {
  full_name: string;
  id_number: string;
  date_of_birth: string;
  gender: CustomerGender;
  address: string;
  nationality: string;
  phone: string;
  email: string;
  notes: string;
  customer_group: CustomerGroup;
  type: CustomerType;
  imageUri?: string;
}

const INITIAL_FORM: AddCustomerForm = {
  full_name: '',
  id_number: '',
  date_of_birth: '',
  gender: 'male',
  address: '',
  nationality: 'VN',
  phone: '',
  email: '',
  notes: '',
  customer_group: 'regular',
  type: 'selling',
  imageUri: undefined,
};

/** Map CustomerRecord → form (dùng khi edit) */
function recordToForm(customer: CustomerRecord): AddCustomerForm {
  const meta = customer.metadata ?? {};
  return {
    full_name: customer.full_name ?? '',
    id_number: customer.id_number ?? '',
    date_of_birth: customer.date_of_birth ?? '',
    gender: customer.gender ?? 'male',
    address: customer.address ?? '',
    nationality: customer.nationality ?? 'VN',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    notes: customer.notes ?? '',
    customer_group: customer.customer_group ?? 'regular',
    type: (meta.type as CustomerType) ?? 'selling',
    imageUri: customer.imageUri ?? undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldLabel: React.FC<{label: string; required?: boolean}> = ({
  label,
  required,
}) => (
  <Text className="text-sm text-gray-600 mb-1.5">
    {label}
    {required && <Text className="text-red-500"> *</Text>}
  </Text>
);

const StyledInput: React.FC<{
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  onBlur?: () => void;
}> = ({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  maxLength,
  editable = true,
  onBlur,
}) => (
  <TextInput
    className="bg-gray-100 rounded-xl px-4 text-gray-800 text-[14px]"
    style={{
      paddingVertical: 14,
      minHeight: multiline ? (numberOfLines ?? 3) * 40 : undefined,
      textAlignVertical: multiline ? 'top' : 'center',
      color: editable ? '#1f2937' : '#9ca3af',
    }}
    placeholder={placeholder}
    placeholderTextColor="#9ca3af"
    value={value}
    onChangeText={onChangeText}
    keyboardType={keyboardType}
    multiline={multiline}
    numberOfLines={numberOfLines}
    maxLength={maxLength}
    editable={editable}
    onBlur={onBlur}
  />
);

const SectionCard: React.FC<{children: React.ReactNode}> = ({children}) => (
  <View
    className="bg-white rounded-2xl px-4 pt-4 pb-2 mx-4 mb-4"
    style={{
      elevation: 1,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: {width: 0, height: 1},
    }}>
    {children}
  </View>
);

const SectionTitle: React.FC<{title: string; right?: React.ReactNode}> = ({
  title,
  right,
}) => (
  <View className="flex-row items-center justify-between mb-4">
    <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
    {right}
  </View>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddCustomerProps {
  storeId: string;
  onCancel: () => void;
  /** Nhận CustomerRecord đã được lưu/cập nhật vào DB */
  onSaved: (customer: CustomerRecord) => void;
  /**
   * Chế độ hoạt động:
   *   - 'create' (default): tạo mới khách hàng
   *   - 'edit': cập nhật khách hàng có sẵn (yêu cầu initialData)
   */
  mode?: 'create' | 'edit';
  /** Dữ liệu khách hàng hiện tại — bắt buộc khi mode = 'edit' */
  initialData?: CustomerRecord;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddCustomer({
  storeId,
  onCancel,
  onSaved,
  mode = 'create',
  initialData,
}: AddCustomerProps) {
  const {t} = useTranslation();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<AddCustomerForm>(
    isEdit && initialData ? recordToForm(initialData) : INITIAL_FORM,
  );

  const {isDark} = useTheme();
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddCustomerForm, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showIDScanner, setShowIDScanner] = useState(false);

  // Theme colors cho IDScannerModal
  const themedColors = {
    primary: '#1E6FD9',
    primaryLight: isDark ? '#1E3A5F' : '#E8F1FB',
    text: isDark ? '#F1F5F9' : '#111827',
    textSecondary: isDark ? '#94A3B8' : '#6B7280',
    border: isDark ? '#334155' : '#E5E7EB',
    bg: isDark ? '#0F172A' : '#F4F7FB',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    warning: '#F59E0B',
    warningLight: isDark ? '#78350F' : '#FEF3C7',
    success: '#16A34A',
  };

  const dateOfBirthObj: Date = form.date_of_birth
    ? new Date(form.date_of_birth)
    : new Date(new Date().getFullYear() - 25, 0, 1);

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) {return '';}
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1,
    ).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const handleDateConfirm = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setField('date_of_birth', `${yyyy}-${mm}-${dd}`);
    setShowDatePicker(false);
  };

  const setField = <K extends keyof AddCustomerForm>(
    key: K,
    value: AddCustomerForm[K],
  ) => {
    setForm(prev => ({...prev, [key]: value}));
    if (errors[key]) {setErrors(prev => ({...prev, [key]: undefined}));}
  };

  // ── Check trùng lặp ────────────────────────────────────────────────────────
  const checkPhoneDuplicate = async (phone: string) => {
    const raw = phone.replace(/\s/g, '');
    if (raw.length < 10 || raw.length > 11) return; // để validate() xử lý lỗi độ dài
    const phoneChanged = !isEdit || phone.trim() !== initialData?.phone?.trim();
    if (!phoneChanged) return;
    const dup = await CustomerService.findByPhone(phone, storeId);
    if (dup) {
      setErrors(prev => ({
        ...prev,
        phone: t('validation.phone_duplicate'),
      }));
    }
  };

  const checkIdNumberDuplicate = async (idNumber: string) => {
    if (!idNumber.trim()) return;
    const idChanged =
      !isEdit || idNumber.trim() !== initialData?.id_number?.trim();
    if (!idChanged) return;
    const dup = await CustomerService.findByIdNumber(idNumber.trim(), storeId);
    if (dup) {
      setErrors(prev => ({
        ...prev,
        id_number: t('validation.id_number_duplicate'),
      }));
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = async (): Promise<boolean> => {
    const newErrors: typeof errors = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = t('validation.required', {});
    }

    // ── Validate SĐT ────────────────────────────────────────────────
    if (!form.phone.trim()) {
      newErrors.phone = t('validation.required', {});
    } else {
      const rawPhone = form.phone.replace(/\s/g, '');
      if (rawPhone.length < 10 || rawPhone.length > 11) {
        // ← THAY ĐỔI: từ < 9 thành 10–11
        newErrors.phone = t('validation.invalid', {});
      } else {
        const phoneChanged =
          !isEdit || form.phone.trim() !== initialData?.phone?.trim();
        if (phoneChanged) {
          const dup = await CustomerService.findByPhone(form.phone, storeId);
          if (dup) {
            newErrors.phone = t('validation.phone_duplicate', {});
          }
        }
      }
    }

    // ── Validate CCCD ────────────────────────────────────────────────
    if (form.id_number.trim()) {
      // Chỉ check khi có nhập — CCCD không bắt buộc
      const idChanged =
        !isEdit || form.id_number.trim() !== initialData?.id_number?.trim();
      if (idChanged) {
        const dupId = await CustomerService.findByIdNumber(
          form.id_number.trim(),
          storeId,
        );
        if (dupId) {
          newErrors.id_number = t('validation.id_number_duplicate');
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Chọn ảnh ────────────────────────────────────────────────────────────────

  const handlePickImage = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
      res => {
        if (res.didCancel || res.errorCode) {return;}
        const uri = res.assets?.[0]?.uri;
        if (uri) {setField('imageUri', uri);}
      },
    );
  };

  const handleScanCCCD = () => {
    setShowIDScanner(true);
  };

  const handleIDScanned = (data: CCCDData) => {
    // Map dữ liệu từ CCCDData sang AddCustomerForm
    setField('id_number', data.idCard);
    setField('full_name', data.fullName);

    // Convert ngày từ DD/MM/YYYY sang YYYY-MM-DD
    if (data.dateOfBirth) {
      const parts = data.dateOfBirth.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        setField('date_of_birth', `${yyyy}-${mm}-${dd}`);
      }
    }

    // Convert giới tính từ tiếng Việt sang enum
    if (data.gender) {
      const genderLower = data.gender.toLowerCase();
      if (genderLower.includes('nam') || genderLower.includes('male')) {
        setField('gender', 'male');
      } else if (
        genderLower.includes('nữ') ||
        genderLower.includes('female') ||
        genderLower.includes('nu')
      ) {
        setField('gender', 'female');
      } else {
        setField('gender', 'other');
      }
    }

    // Địa chỉ
    if (data.address) {
      setField('address', data.address);
    }

    // Lưu quê quán vào notes nếu có
    if (data.placeOfOrigin) {
      setField(
        'notes',
        `Quê quán: ${data.placeOfOrigin}${form.notes ? '\n' + form.notes : ''}`,
      );
    }

    setShowIDScanner(false);
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const valid = await validate();
    if (!valid) {return;}

    setSaving(true);
    try {
      let result: CustomerRecord;

      if (isEdit && initialData) {
        // ── UPDATE ──
        result = await CustomerService.update(initialData.id, {
          full_name: form.full_name,
          phone: form.phone,
          id_number: form.id_number || null,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender,
          email: form.email || null,
          address: form.address || null,
          nationality: form.nationality,
          customer_group: form.customer_group,
          notes: form.notes || null,
          imageUri: form.imageUri ?? null,
          metadata: {
            ...(initialData.metadata ?? {}),
            type: form.type,
          },
        });
      } else {
        // ── CREATE ──
        const input: CustomerInput = {
          store_id: storeId,
          full_name: form.full_name,
          phone: form.phone,
          id_number: form.id_number || null,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender,
          email: form.email || null,
          address: form.address || null,
          nationality: form.nationality,
          customer_group: form.customer_group,
          notes: form.notes || null,
          imageUri: form.imageUri ?? null,
          metadata: {
            type: form.type,
            hasKey: false,
          },
        };
        result = await CustomerService.create(input);
      }

      onSaved(result);
    } catch (err: any) {
      console.error('[AddCustomer] save error:', err);
      Alert.alert(
        t('common.error'),
        err?.message ?? t('customer.add.save_error'),
      );
    } finally {
      setSaving(false);
    }
  };

  const GENDERS: {key: CustomerGender; label: string}[] = [
    {key: 'male', label: t('gender.male')},
    {key: 'female', label: t('gender.female')},
    {key: 'other', label: t('gender.other')},
  ];

  // ──────────────────────────────────────────────────────────────────────────

  const screenTitle = isEdit
    ? t('customer.edit.title')
    : t('customer.add.title');

  const saveLabel = isEdit
    ? t('customer.edit.save_btn')
    : t('customer.add.save_btn');

  const savingLabel = t('common.saving');

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-100">
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text className="text-gray-500 font-medium text-[15px]">
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">{screenTitle}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text className="text-blue-500 font-bold text-[15px]">
              {t('common.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingTop: 12, paddingBottom: 120}}
          keyboardShouldPersistTaps="handled">
          {/* ── Thông tin cá nhân ── */}
          <SectionCard>
            <SectionTitle
              title={t('customer.add.personal_info')}
              right={
                <TouchableOpacity
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: '#eff6ff',
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                  }}
                  onPress={handleScanCCCD}>
                  <Icon name="camera-alt" size={15} color="#3b82f6" />
                  <Text className="text-blue-500 text-sm font-semibold">
                    {t('customer.add.scan_cccd')}
                  </Text>
                </TouchableOpacity>
              }
            />

            {/* Họ và tên */}
            <View className="mb-4">
              <FieldLabel label={t('customer.add.full_name')} required />
              <StyledInput
                placeholder={t('customer.add.full_name_placeholder')}
                value={form.full_name}
                onChangeText={v => setField('full_name', v)}
                maxLength={150}
              />
              {errors.full_name && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.full_name}
                </Text>
              )}
            </View>

            {/* Số CCCD */}
            <View className="mb-4">
              <FieldLabel label={t('customer.add.id_number')} />
              <StyledInput
                placeholder={t('customer.add.id_number_placeholder')}
                value={form.id_number}
                onChangeText={v => setField('id_number', v)}
                keyboardType="phone-pad"
                maxLength={20}
              />
              {errors.id_number && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.id_number}
                </Text>
              )}
            </View>

            {/* Ngày sinh */}
            <View className="mb-4">
              <FieldLabel label={t('customer.add.dob')} />
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center bg-gray-100 rounded-xl px-4"
                style={{paddingVertical: 14}}>
                <Icon
                  name="calendar-today"
                  size={18}
                  color={form.date_of_birth ? '#374151' : '#9ca3af'}
                  style={{marginRight: 10}}
                />
                <Text
                  className="flex-1 text-[14px]"
                  style={{color: form.date_of_birth ? '#1f2937' : '#9ca3af'}}>
                  {form.date_of_birth
                    ? formatDisplayDate(form.date_of_birth)
                    : t('customer.add.dob_placeholder')}
                </Text>
                {form.date_of_birth && (
                  <TouchableOpacity
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    onPress={() => setField('date_of_birth', '')}>
                    <Icon name="close" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <CalendarModal
                visible={showDatePicker}
                selectedDate={dateOfBirthObj}
                maxDate={new Date()}
                title={t('customer.add.dob')}
                onConfirm={handleDateConfirm}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>

            {/* Giới tính */}
            <View className="mb-4">
              <FieldLabel label={t('customer.add.gender')} />
              <View className="flex-row bg-gray-100 rounded-xl overflow-hidden">
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    className="flex-1 items-center py-3"
                    style={{
                      backgroundColor:
                        form.gender === g.key ? '#fff' : 'transparent',
                      borderRadius: 10,
                      margin: form.gender === g.key ? 3 : 0,
                      ...(form.gender === g.key
                        ? {
                            elevation: 2,
                            shadowColor: '#000',
                            shadowOpacity: 0.08,
                            shadowRadius: 4,
                            shadowOffset: {width: 0, height: 1},
                          }
                        : {}),
                    }}
                    onPress={() => setField('gender', g.key)}>
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color: form.gender === g.key ? '#3b82f6' : '#6b7280',
                      }}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Địa chỉ */}
            <View className="mb-4">
              <FieldLabel label={t('customer.add.address')} />
              <StyledInput
                placeholder={t('customer.add.address_placeholder')}
                value={form.address}
                onChangeText={v => setField('address', v)}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Quốc tịch */}
            <View className="mb-2">
              <FieldLabel label={t('customer.add.nationality')} />
              <StyledInput
                placeholder="VN"
                value={form.nationality}
                onChangeText={v => setField('nationality', v.toUpperCase())}
                maxLength={10}
              />
            </View>
          </SectionCard>

          {/* ── Thông tin liên lạc ── */}
          <SectionCard>
            <SectionTitle title={t('customer.add.contact_info')} />

            {/* Số điện thoại */}
            <View className="mb-4">
              <FieldLabel label={t('customer.add.phone')} required />
              <View
                className="bg-gray-100 rounded-xl overflow-hidden"
                style={{paddingLeft: 12}}>
                <TextInput
                  className="flex-1 text-gray-800 text-[14px]"
                  style={{paddingVertical: 14}}
                  placeholder={t('customer.add.phone_placeholder')}
                  placeholderTextColor="#9ca3af"
                  value={form.phone}
                  onChangeText={v => setField('phone', v)}
                  keyboardType="phone-pad"
                  onBlur={() => checkPhoneDuplicate(form.phone)}
                  maxLength={15}
                />
              </View>
              {errors.phone && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.phone}
                </Text>
              )}
            </View>

            {/* Ghi chú */}
            <View className="mb-2">
              <FieldLabel label={t('customer.add.notes')} />
              <StyledInput
                placeholder={t('customer.add.notes_placeholder')}
                value={form.notes}
                onChangeText={v => setField('notes', v)}
                multiline
                numberOfLines={4}
              />
            </View>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-2"
        style={{
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: {width: 0, height: -2},
        }}>
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={{backgroundColor: saving ? '#93c5fd' : '#3b82f6'}}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{marginRight: 8}}
            />
          ) : (
            <Icon name={isEdit ? 'edit' : 'save'} size={20} color="#fff" />
          )}
          <Text className="text-white font-bold text-[16px] ml-2">
            {saving ? savingLabel : saveLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ID Scanner Modal ── */}
      <IDScannerModal
        visible={showIDScanner}
        onClose={() => setShowIDScanner(false)}
        onScanned={handleIDScanned}
        themedColors={themedColors}
        t={t}
      />
    </SafeAreaView>
  );
}
