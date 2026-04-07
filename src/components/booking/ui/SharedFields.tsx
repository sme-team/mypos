/**
 * @file: SharedFields.tsx
 * @description: Chứa các component giao diện nhập liệu dùng chung trong quy trình Booking.
 * Các component này giúp đảm bảo tính nhất quán (UI consistency) và dễ bảo trì.
 */

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Nhãn tiêu đề cho một phân đoạn (Section)
 * @param text: Nội dung hiển thị
 */
export const SectionLabel = React.memo(({ text }: { text: string }) => (
  <Text style={styles.sectionLabel}>{text}</Text>
));

/**
 * Nhãn tiêu đề cho một trường nhập liệu (Field)
 * @param text: Nội dung hiển thị
 */
export const FieldLabel = React.memo(({ text }: { text: string }) => (
  <Text style={styles.fieldLabel}>{text}</Text>
));

/**
 * Ô nhập liệu văn bản/số cơ bản
 * @param value: Giá trị hiện tại
 * @param onChangeText: Hàm xử lý thay đổi
 * @param placeholder: Gợi ý khi chưa nhập
 * @param keyboardType: Loại bàn phím (numeric, default...)
 * @param multiline: Cho phép nhập nhiều dòng
 * @param themedColors: Bảng màu theo theme
 */
export const FieldInput = React.memo(({ value, onChangeText, placeholder, keyboardType, multiline, themedColors, fieldKey }: any) => (
  <TextInput
    key={fieldKey}
    style={[styles.fieldInput, { color: themedColors.text, borderColor: themedColors.border, backgroundColor: themedColors.surface }, multiline && styles.fieldInputMulti]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={themedColors.textHint}
    keyboardType={keyboardType || 'default'}
    multiline={multiline}
    numberOfLines={multiline ? 3 : 1}
  />
));

/**
 * Nhóm nút chọn (Toggle) giữa 2 hoặc nhiều tùy chọn
 * @param options: Danh sách các option [{label, value, sub}]
 * @param value: Giá trị đang chọn
 * @param onChange: Hàm xử lý khi chọn
 * @param themedColors: Bảng màu theme
 */
export const ToggleGroup = React.memo(({ options, value, onChange, themedColors }: any) => (
  <View style={styles.toggleRow}>
    {options.map((opt: any) => (
      <TouchableOpacity
        key={opt.value}
        style={[
          styles.toggleBtn,
          { borderColor: themedColors.border, backgroundColor: themedColors.surface },
          value === opt.value && { backgroundColor: themedColors.primary, borderColor: themedColors.primary }
        ]}
        onPress={() => onChange(opt.value)}
      >
        <Text style={[styles.toggleBtnText, { color: themedColors.textSecondary }, value === opt.value && { color: '#fff' }]}>{opt.label}</Text>
        {opt.sub && <Text style={[styles.toggleBtnSub, { color: themedColors.textHint }, value === opt.value && { color: 'rgba(255,255,255,0.7)' }]}>{opt.sub}</Text>}
      </TouchableOpacity>
    ))}
  </View>
));

/**
 * Bộ tăng giảm số lượng (Số người, số lượng dịch vụ)
 * @param value: Số lượng hiện tại
 * @param min: Giá trị tối thiểu
 */
export const Stepper = React.memo(({ value, onDecrement, onIncrement, min = 0, themedColors }: any) => (
  <View style={styles.stepperWrap}>
    <TouchableOpacity
      style={[styles.stepBtn, { borderColor: themedColors.border }, value <= min && styles.stepBtnDisabled]}
      onPress={onDecrement}
      disabled={value <= min}
    >
      <Icon name="remove" size={18} color={value <= min ? themedColors.textHint : themedColors.text} />
    </TouchableOpacity>
    <Text style={[styles.stepVal, { color: themedColors.text }]}>{value}</Text>
    <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus, { backgroundColor: themedColors.primary, borderColor: themedColors.primary }]} onPress={onIncrement}>
      <Icon name="add" size={18} color="#fff" />
    </TouchableOpacity>
  </View>
));

/**
 * Bộ chọn thời trang (Giờ:Phút) chuyên biệt cho check-in/out
 */
export const TimeStepper = React.memo(({ value, onChange, themedColors }: any) => {
  const handlePress = (delta: number) => {
    const parts = value.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parts[1] || '00';
    const newH = (h + delta + 24) % 24;
    onChange(`${String(newH).padStart(2, '0')}:${m}`);
  };
  return (
    <View style={styles.stepperWrap}>
      <TouchableOpacity style={[styles.stepBtn, { borderColor: themedColors.border }]} onPress={() => handlePress(-1)}>
        <Icon name="remove" size={18} color={themedColors.text} />
      </TouchableOpacity>
      <Text style={[styles.stepVal, { color: themedColors.text }]}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus, { backgroundColor: themedColors.primary, borderColor: themedColors.primary }]} onPress={() => handlePress(1)}>
        <Icon name="add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
});

/**
 * Trường nhập liệu số tiền (Đơn giá, Tiền cọc) có phím tắt +/- 100k
 */
export const AmountField = React.memo(({ label, value, onChange, themedColors }: any) => (
  <View style={styles.fieldGroup}>
    <FieldLabel text={label} />
    <View style={styles.amountRow}>
      <TextInput
        style={[styles.amountInput, { color: themedColors.text, borderColor: themedColors.border, backgroundColor: themedColors.surface }]}
        value={value === 0 ? '' : String(value)}
        onChangeText={(t) => onChange(Number(t.replace(/\D/g, '')) || 0)}
        placeholder="0"
        placeholderTextColor={themedColors.textHint}
        keyboardType="numeric"
      />
      <Text style={[styles.currencyTag, { color: themedColors.textSecondary }]}>VND</Text>
      <TouchableOpacity style={[styles.stepSm, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]} onPress={() => onChange(Math.max(0, value - 100000))}>
        <Icon name="remove" size={16} color={themedColors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.stepSm, styles.stepSmPlus, { backgroundColor: themedColors.primary, borderColor: themedColors.primary }]} onPress={() => onChange(value + 100000)}>
        <Icon name="add" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
));

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  fieldGroup: { marginBottom: 12 },
  fieldInput: {
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  fieldInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  toggleBtnText: { fontSize: 13, fontWeight: '500' },
  toggleBtnSub: { fontSize: 10, marginTop: 2 },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: { borderLeftWidth: 0 },
  stepBtnDisabled: { opacity: 0.35 },
  stepVal: { fontSize: 15, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  currencyTag: { fontSize: 12, fontWeight: '600' },
  stepSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSmPlus: { borderLeftWidth: 0 },
});
