/**
 * @file: LongTermForm.tsx
 * @description: Form nhập liệu chuyên biệt cho loại hình lưu trú DÀI HẠN (Thuê tháng, có hợp đồng).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FieldLabel, FieldInput, AmountField } from '../ui/SharedFields';
import { CalendarModal } from '../../DateInput';

/**
 * Component nhập liệu hợp đồng dài hạn
 * Bao gồm: Ngày bắt đầu, Thời hạn, Tiền cọc, Tiền thuê, Chỉ số điện nước đầu kỳ.
 */
export const LongTermForm = React.memo(({ form, updateForm, t, themedColors, isDark }: any) => {
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);

  // Get today's date at midnight for minDate constraint
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Danh sách các tùy chọn thời hạn hợp đồng phổ biến
  const durationOptions = [
    { label: '3 tháng', value: '3' },
    { label: '6 tháng', value: '6' },
    { label: '1 năm', value: '1' },
    { label: '2 năm', value: '2' },
  ];

  return (
    <View>
      {/* Ngày bắt đầu hợp đồng */}
      <FieldLabel text={t('booking.form.startDate')} />
      <TouchableOpacity 
        style={[styles.fieldInputRow, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]} 
        onPress={() => setIsCalOpen(true)}
      >
        <Text style={{ color: themedColors.text, fontSize: 14 }}>{form.contractStart || t('booking.form.selectStartDate')}</Text>
        <Icon name="calendar-today" size={18} color={themedColors.textSecondary} />
      </TouchableOpacity>
      
      <View style={{ height: 12 }} />

      {/* Thời hạn hợp đồng (Dropdown) */}
      <FieldLabel text={t('booking.form.duration')} />
      <TouchableOpacity
        style={[styles.dropdownTrigger, { borderColor: themedColors.border, backgroundColor: themedColors.surface }, isDurationOpen && { borderColor: themedColors.primary }]}
        onPress={() => setIsDurationOpen(!isDurationOpen)}
      >
        <Text style={{ flex: 1, color: themedColors.text, fontSize: 14 }}>
          {durationOptions.find(o => o.value === form.contractDuration)?.label || 'Chọn thời hạn'}
        </Text>
        <Icon name="arrow-drop-down" size={20} color={themedColors.textHint} />
      </TouchableOpacity>

      {/* Cửa sổ chọn thời hạn */}
      {isDurationOpen && (
        <View style={[styles.durationWindow, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
          {durationOptions.map((opt, idx) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.durationItem,
                idx === durationOptions.length - 1 && { borderBottomWidth: 0 },
                { borderBottomColor: themedColors.border },
                form.contractDuration === opt.value && { backgroundColor: isDark ? '#2D3748' : '#F0F7FF' }
              ]}
              onPress={() => { updateForm({ contractDuration: opt.value }); setIsDurationOpen(false); }}
            >
              <Text style={[
                styles.durationText,
                { color: themedColors.text },
                form.contractDuration === opt.value && { color: themedColors.primary, fontWeight: '700' }
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 12 }} />

      {/* Tiền cọc và tiền thuê hàng tháng */}
      <AmountField label={t('booking.form.deposit')} value={form.deposit} onChange={(v: any) => updateForm({ deposit: v })} themedColors={themedColors} />
      <AmountField label={t('booking.form.monthlyRent')} value={form.monthlyPrice} onChange={(v: any) => updateForm({ monthlyPrice: v })} themedColors={themedColors} />
      
      <View style={{ height: 12 }} />

      {/* Chỉ số điện/nước đầu kỳ (để tính tiền tháng đầu) */}
      <FieldLabel text={t('booking.form.initialMeter')} />
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.electric')} />
          <FieldInput fieldKey="electricStart" value={form.electricStart} onChangeText={(v: any) => updateForm({ electricStart: v })} placeholder="0" keyboardType="numeric" themedColors={themedColors} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.water')} />
          <FieldInput fieldKey="waterStart" value={form.waterStart} onChangeText={(v: any) => updateForm({ waterStart: v })} placeholder="0" keyboardType="numeric" themedColors={themedColors} />
        </View>
      </View>

      {/* Modal chọn ngày */}
      <CalendarModal
        visible={isCalOpen}
        selectedDate={new Date(form.contractStart)}
        minDate={today}
        onConfirm={(d) => { setIsCalOpen(false); updateForm({ contractStart: d.toISOString().split('T')[0] }); }}
        onCancel={() => setIsCalOpen(false)}
        title={t('booking.form.selectStartDate')}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fieldInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderRadius: 8,
    gap: 8,
  },
  durationWindow: {
    borderRadius: 8,
    borderWidth: 0.5,
    marginTop: 4,
  },
  durationItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
  },
  durationText: {
    fontSize: 14,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
});
