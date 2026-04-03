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
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {CalendarModal} from '../../components/DateInput';

// ─── Types (map từ customers table trong MyPOS.ts) ────────────────────────────

type Gender = 'male' | 'female' | 'other';
type CustomerGroup = 'regular' | 'vip' | 'wholesale' | 'corporate' | 'staff';
type CustomerType = 'selling' | 'storage';

interface AddCustomerForm {
  // customers table
  full_name: string; // NOT NULL
  id_number: string; // CCCD/CMND/Hộ chiếu
  date_of_birth: string; // date — YYYY-MM-DD
  gender: Gender;
  address: string;
  nationality: string; // DEFAULT 'VN'
  phone: string; // NOT NULL
  email: string;
  notes: string;
  customer_group: CustomerGroup;
  // ui only
  type: CustomerType;
  imageUri?: string;
}

// ─── Mock initial (dùng để test; service sẽ thay thế khi lưu) ────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Label với dấu * nếu required */
const FieldLabel: React.FC<{label: string; required?: boolean}> = ({
  label,
  required,
}) => (
  <Text className="text-sm text-gray-600 mb-1.5">
    {label}
    {required && <Text className="text-red-500"> *</Text>}
  </Text>
);

/** Input chuẩn */
const StyledInput: React.FC<{
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
}> = ({
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  maxLength,
  editable = true,
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
  />
);

/** Section card */
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

/** Section title */
const SectionTitle: React.FC<{
  title: string;
  right?: React.ReactNode;
}> = ({title, right}) => (
  <View className="flex-row items-center justify-between mb-4">
    <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
    {right}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface AddCustomerScreenProps {
  onCancel: () => void;
  /** Sau này thay bằng service thật để lưu DB local */
  onSave?: (form: AddCustomerForm) => void;
}

export default function AddCustomerScreen({
  onCancel,
  onSave,
}: AddCustomerScreenProps) {
  const {t} = useTranslation();
  const [form, setForm] = useState<AddCustomerForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddCustomerForm, string>>
  >({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Date object để truyền vào CalendarModal — fallback 25 năm trước
  const dateOfBirthObj: Date = form.date_of_birth
    ? new Date(form.date_of_birth)
    : new Date(new Date().getFullYear() - 25, 0, 1);

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
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

  // ── Helpers ──────────────────────────────────────────────────────────────

  const setField = <K extends keyof AddCustomerForm>(
    key: K,
    value: AddCustomerForm[K],
  ) => {
    setForm(prev => ({...prev, [key]: value}));
    if (errors[key]) setErrors(prev => ({...prev, [key]: undefined}));
  };

  // ── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!form.full_name.trim()) {
      newErrors.full_name = t('validation.required', {
        defaultValue: 'Trường này là bắt buộc',
      });
    }
    if (!form.phone.trim()) {
      newErrors.phone = t('validation.required', {
        defaultValue: 'Trường này là bắt buộc',
      });
    } else if (form.phone.replace(/\s/g, '').length < 9) {
      newErrors.phone = t('validation.phone_invalid', {
        defaultValue: 'Số điện thoại không hợp lệ',
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Chọn ảnh ─────────────────────────────────────────────────────────────

  const handlePickImage = () => {
    launchImageLibrary(
      {mediaType: 'photo', quality: 0.8, selectionLimit: 1},
      res => {
        if (res.didCancel || res.errorCode) return;
        const uri = res.assets?.[0]?.uri;
        if (uri) setField('imageUri', uri);
      },
    );
  };

  // ── Quét CCCD (camera) ───────────────────────────────────────────────────

  const handleScanCCCD = () => {
    launchCamera({mediaType: 'photo', quality: 0.9}, res => {
      if (res.didCancel || res.errorCode) return;
      // TODO: gọi OCR service để parse thông tin từ ảnh CCCD
      console.log('CCCD scanned:', res.assets?.[0]?.uri);
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!validate()) return;
    // TODO: thay bằng service lưu local DB
    onSave?.(form);
    console.log('Save customer:', form);
  };

  // ── Gender options ───────────────────────────────────────────────────────

  const GENDERS: {key: Gender; label: string}[] = [
    {key: 'male', label: t('gender.male', {defaultValue: 'Nam'})},
    {key: 'female', label: t('gender.female', {defaultValue: 'Nữ'})},
    {key: 'other', label: t('gender.other', {defaultValue: 'Khác'})},
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-100">
        <TouchableOpacity onPress={onCancel}>
          <Text className="text-gray-500 font-medium text-[15px]">
            {t('common.cancel', {defaultValue: 'Hủy'})}
          </Text>
        </TouchableOpacity>

        <Text className="text-base font-bold text-gray-900">
          {t('customer.add.title', {defaultValue: 'Thêm khách hàng'})}
        </Text>

        <TouchableOpacity onPress={handleSave}>
          <Text className="text-blue-500 font-bold text-[15px]">
            {t('common.save', {defaultValue: 'Lưu'})}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingTop: 12, paddingBottom: 120}}
          keyboardShouldPersistTaps="handled">
          {/* ── THÔNG TIN CÁ NHÂN ── */}
          <SectionCard>
            <SectionTitle
              title={t('customer.add.personal_info', {
                defaultValue: 'Thông tin cá nhân',
              })}
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
                    {t('customer.add.scan_cccd', {defaultValue: 'Quét CCCD'})}
                  </Text>
                </TouchableOpacity>
              }
            />

            {/* Họ và tên */}
            <View className="mb-4">
              <FieldLabel
                label={t('customer.add.full_name', {defaultValue: 'Họ và tên'})}
                required
              />
              <StyledInput
                placeholder={t('customer.add.full_name_placeholder', {
                  defaultValue: 'Nhập họ và tên',
                })}
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

            {/* Số CCCD/ID */}
            <View className="mb-4">
              <FieldLabel
                label={t('customer.add.id_number', {
                  defaultValue: 'Số CCCD/ID',
                })}
              />
              <StyledInput
                placeholder={t('customer.add.id_number_placeholder', {
                  defaultValue: 'Số định danh',
                })}
                value={form.id_number}
                onChangeText={v => setField('id_number', v)}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            {/* Ngày sinh */}
            <View className="mb-4">
              <FieldLabel
                label={t('customer.add.dob', {defaultValue: 'Ngày sinh'})}
              />
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
                    : t('customer.add.dob_placeholder', {
                        defaultValue: 'Chọn ngày sinh',
                      })}
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
                title={t('customer.add.dob', {defaultValue: 'Ngày sinh'})}
                onConfirm={handleDateConfirm}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>

            {/* Giới tính */}
            <View className="mb-4">
              <FieldLabel
                label={t('customer.add.gender', {defaultValue: 'Giới tính'})}
              />
              <View className="flex-row bg-gray-100 rounded-xl overflow-hidden">
                {GENDERS.map((g, idx) => (
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
              <FieldLabel
                label={t('customer.add.address', {
                  defaultValue: 'Địa chỉ liên hệ',
                })}
              />
              <StyledInput
                placeholder={t('customer.add.address_placeholder', {
                  defaultValue: 'Số nhà, tên đường, phường/xã...',
                })}
                value={form.address}
                onChangeText={v => setField('address', v)}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Quốc tịch */}
            <View className="mb-2">
              <FieldLabel
                label={t('customer.add.nationality', {
                  defaultValue: 'Quốc tịch',
                })}
              />
              <StyledInput
                placeholder="VN"
                value={form.nationality}
                onChangeText={v => setField('nationality', v.toUpperCase())}
                maxLength={10}
              />
            </View>
          </SectionCard>

          {/* ── THÔNG TIN LIÊN LẠC ── */}
          <SectionCard>
            <SectionTitle
              title={t('customer.add.contact_info', {
                defaultValue: 'Thông tin liên lạc',
              })}
            />

            {/* Số điện thoại */}
            <View className="mb-4">
              <FieldLabel
                label={t('customer.add.phone', {defaultValue: 'Số điện thoại'})}
                required
              />
              <View
                className="bg-gray-100 rounded-xl overflow-hidden"
                style={{paddingLeft: 12}}>
                <TextInput
                  className="flex-1 text-gray-800 text-[14px]"
                  style={{paddingVertical: 14}}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#9ca3af"
                  value={form.phone}
                  onChangeText={v => setField('phone', v)}
                  keyboardType="phone-pad"
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
              <FieldLabel
                label={t('customer.add.notes', {defaultValue: 'Ghi chú'})}
              />
              <StyledInput
                placeholder={t('customer.add.notes_placeholder', {
                  defaultValue: 'Ghi chú thêm về khách hàng...',
                })}
                value={form.notes}
                onChangeText={v => setField('notes', v)}
                multiline
                numberOfLines={4}
              />
            </View>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom CTA ── */}
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
          className="flex-row items-center justify-center rounded-2xl py-4 "
          style={{backgroundColor: '#3b82f6'}}
          onPress={handleSave}
          activeOpacity={0.85}>
          <Icon name="save" size={20} color="#fff" />
          <Text className="text-white font-bold text-[16px]">
            {t('customer.add.save_btn', {defaultValue: 'Lưu khách hàng'})}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
