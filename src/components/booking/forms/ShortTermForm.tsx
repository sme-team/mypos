/**
 * @file: ShortTermForm.tsx
 * @description: Form nhập liệu cho loại hình lưu trú NGẮN HẠN (Theo ngày, khách vãng lai).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SectionLabel, FieldLabel, Stepper, TimeStepper, AmountField } from '../ui/SharedFields';
import { CalendarModal } from '../../DateInput';

/**
 * Component nhập liệu check-in/out cho khách ở ngắn hạn (khách sạn/homestay)
 * Bao gồm: Ngày/Giờ vào, Ngày/Giờ ra, Tiền cọc, Số người lớn/trẻ em.
 */
export const ShortTermForm = React.memo(({ form, updateForm, t, themedColors }: any) => {
  const [isInOpen, setIsInOpen] = useState(false);
  const [isOutOpen, setIsOutOpen] = useState(false);

  return (
    <View>
      <SectionLabel text={t('booking.sections.shortTerm')} />

      {/* Thông tin Check-in (Ngày & Giờ) */}
      <View style={styles.dateRow}>
        <View style={{ flex: 1.5 }}>
          <FieldLabel text={t('booking.form.checkin')} />
          <TouchableOpacity
            style={[styles.fieldInputRow, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]}
            onPress={() => setIsInOpen(true)}
          >
            <Text style={{ color: themedColors.text }}>{form.checkinDate}</Text>
            <Icon name="event" size={18} color={themedColors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.time')} />
          {/* Bộ chọn giờ chuyên biệt */}
          <TimeStepper value={form.checkinTime} onChange={(v: any) => updateForm({ checkinTime: v })} themedColors={themedColors} />
        </View>
      </View>

      <View style={{ height: 12 }} />

      {/* Thông tin Check-out (Ngày & Giờ dự kiến) */}
      <View style={styles.dateRow}>
        <View style={{ flex: 1.5 }}>
          <FieldLabel text={t('booking.form.checkout')} />
          <TouchableOpacity
            style={[styles.fieldInputRow, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]}
            onPress={() => setIsOutOpen(true)}
          >
            <Text style={{ color: themedColors.text }}>{form.checkoutDate}</Text>
            <Icon name="event" size={18} color={themedColors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.time')} />
          <TimeStepper value={form.checkoutTime} onChange={(v: any) => updateForm({ checkoutTime: v })} themedColors={themedColors} />
        </View>
      </View>

      <View style={{ height: 12 }} />

      {/* Tiền cọc ngắn hạn (nếu có) */}
      <AmountField label={t('booking.form.deposit')} value={form.deposit} onChange={(v: any) => updateForm({ deposit: v })} themedColors={themedColors} />

      <View style={{ height: 16 }} />

      {/* Số lượng khách lưu trú */}
      <View style={styles.utilRow}>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.adults')} />
          <Stepper
            value={form.adults}
            onDecrement={() => updateForm({ adults: Math.max(1, form.adults - 1) })}
            onIncrement={() => updateForm({ adults: form.adults + 1 })}
            min={1}
            themedColors={themedColors}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text={t('booking.form.children')} />
          <Stepper
            value={form.children}
            onDecrement={() => updateForm({ children: Math.max(0, form.children - 1) })}
            onIncrement={() => updateForm({ children: form.children + 1 })}
            min={0}
            themedColors={themedColors}
          />
        </View>
      </View>

      {/* Modals lịch chọn ngày */}
      <CalendarModal 
        visible={isInOpen} 
        selectedDate={new Date(form.checkinDate)} 
        title={t('booking.form.checkin')} 
        onConfirm={(d) => { setIsInOpen(false); updateForm({ checkinDate: d.toISOString().split('T')[0] }); }} 
        onCancel={() => setIsInOpen(false)} 
      />
      <CalendarModal 
        visible={isOutOpen} 
        selectedDate={new Date(form.checkoutDate)} 
        title={t('booking.form.checkout')} 
        onConfirm={(d) => { setIsOutOpen(false); updateForm({ checkoutDate: d.toISOString().split('T')[0] }); }} 
        onCancel={() => setIsOutOpen(false)} 
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
  dateRow: { flexDirection: 'row', gap: 10 },
  utilRow: { flexDirection: 'row', gap: 16 },
});
