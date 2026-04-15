/**
 * @file: LongTermSummary.tsx
 * @description: Màn hình xác nhận cuối cùng cho quy trình đặt phòng DÀI HẠN.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Ảnh minh họa mặc định cho phòng
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

/**
 * Component hiển thị tóm tắt toàn bộ thông tin hợp đồng dài hạn để khách hàng xác nhận.
 */
export const LongTermSummary = React.memo(({ form, room, selectedCustomer, onEdit, onConfirm, formatVND, agreedTerms, setAgreedTerms, confirming, themedColors, t }: any) => {
  
  // Tính toán các đầu mục kinh tế
  const serviceTotal = form.services.reduce((sum: number, s: any) => sum + (s.qty * s.unitPrice), 0);
  const grandTotal = form.monthlyPrice + form.deposit + serviceTotal;

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: themedColors.bg }]}
      removeClippedSubviews={true}
      scrollEventThrottle={16}
      automaticallyAdjustContentInsets={false}>
      <View style={styles.summaryContent}>
        
        {/* Tóm tắt phòng */}
        <View style={styles.summarySectionHeader}>
          <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.summary.roomSummary')}</Text>
        </View>
        <View style={[styles.summaryRoomCard, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]}>
          <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.summaryRoomImage} />
          <View style={styles.summaryRoomInfo}>
            <Text style={[styles.summaryRoomTag, { color: themedColors.primary }]}>{t('booking.summary.roomSummary')}</Text>
            <Text style={[styles.summaryRoomName, { color: themedColors.text }]}>{room.label}</Text>
          </View>
        </View>

        {/* Thông tin khách thuê */}
        <View style={styles.summarySectionHeader}>
          <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.summary.customerInfo')}</Text>
          <TouchableOpacity onPress={onEdit}>
            <Text style={[styles.summaryEditBtn, { color: themedColors.primary }]}>{t('booking.summary.edit')}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.summaryCustomerCard, { backgroundColor: themedColors.primaryLight }]}>
          <View style={[styles.summaryCustomerAvatar, { backgroundColor: themedColors.primary }]}>
            <Icon name="person" size={24} color="#fff" />
          </View>
          <View style={styles.summaryCustomerInfo}>
            <Text style={[styles.summaryCustomerName, { color: themedColors.text }]}>{selectedCustomer?.full_name || form.fullName}</Text>
            <Text style={[styles.summaryCustomerPhone, { color: themedColors.textSecondary }]}>{selectedCustomer?.phone || form.phone}</Text>
          </View>
        </View>

        {/* Thông tin chi tiết hợp đồng */}
        <View style={styles.summarySectionHeader}>
          <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.sections.contract')}</Text>
        </View>
        <View style={[styles.summaryDetailGrid, { borderColor: themedColors.border }]}>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.startDate')}</Text>
              <Text style={[styles.summaryGridValue, { color: themedColors.text }]}>{form.contractStart}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.duration')}</Text>
              <Text style={[styles.summaryGridValue, { color: themedColors.text }]}>
                {form.contractDuration === '1' ? t('booking.summary.months', { count: 12 }) :
                 form.contractDuration === '2' ? t('booking.summary.months', { count: 24 }) :
                 t('booking.summary.months', { count: parseInt(form.contractDuration) })}
              </Text>
            </View>
          </View>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.electric')} ({t('booking.form.initialMeter')})</Text>
              <Text style={[styles.summaryGridValue, { color: themedColors.text }]}>{form.electricStart} kWh</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.water')} ({t('booking.form.initialMeter')})</Text>
              <Text style={[styles.summaryGridValue, { color: themedColors.text }]}>{form.waterStart} m³</Text>
            </View>
          </View>
        </View>

        {/* Giá thuê chính */}
        <View style={[styles.summaryHighlightCard, { backgroundColor: themedColors.primaryLight, borderColor: themedColors.border }]}>
          <Text style={[styles.summaryHighlightLabel, { color: themedColors.primary }]}>{t('booking.form.monthlyRent')}</Text>
          <Text style={[styles.summaryHighlightValue, { color: themedColors.primary }]}>{formatVND(form.monthlyPrice)}</Text>
        </View>

        {/* Danh sách dịch vụ đính kèm */}
        {form.services.length > 0 && (
          <>
            <View style={styles.summarySectionHeader}>
              <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.sections.services')}</Text>
            </View>
            {form.services.map((svc: any) => (
              <View key={svc.id} style={[styles.summarySvcItem, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
                <View style={[styles.summarySvcIcon, { backgroundColor: themedColors.primaryLight }]}>
                  <Icon name="wifi" size={18} color={themedColors.primary} />
                </View>
                <Text style={[styles.summarySvcName, { color: themedColors.textSecondary }]}>{svc.name}</Text>
                <Text style={[styles.summarySvcPrice, { color: themedColors.text }]}>{formatVND(svc.unitPrice)}/{t('booking.summary.months', { count: 1 })}</Text>
              </View>
            ))}
            <View style={{ height: 12 }} />
          </>
        )}

        {/* Tổng kết tài chính lần đầu */}
        <View style={[styles.summaryTotalCard, { backgroundColor: themedColors.primaryLight }]}>
          <Text style={[styles.summaryTotalTitle, { color: themedColors.text }]}>{t('booking.summary.totalInitial')}</Text>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.roomRentMonth')}</Text>
            <Text style={[styles.confSummaryTotalValue, { color: themedColors.text }]}>{formatVND(form.monthlyPrice)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.depositMonth')}</Text>
            <Text style={[styles.confSummaryTotalValue, { color: themedColors.text }]}>{formatVND(form.deposit)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.serviceMonthly')}</Text>
            <Text style={[styles.confSummaryTotalValue, { color: themedColors.text }]}>{formatVND(serviceTotal)}</Text>
          </View>
          <View style={[styles.summaryGrandTotalRow, { borderTopColor: themedColors.border }]}>
            <Text style={[styles.confSummaryGrandTotalLabel, { color: themedColors.text }]}>{t('booking.summary.total')}</Text>
            <Text style={[styles.confSummaryGrandTotalValue, { color: themedColors.primary }]}>{formatVND(grandTotal)}</Text>
          </View>
        </View>

        {/* Cam kết điều khoản */}
        <TouchableOpacity style={styles.summaryCheckboxRow} onPress={() => setAgreedTerms(!agreedTerms)}>
          <View style={[styles.summaryCheckbox, { borderColor: themedColors.border }, agreedTerms && { backgroundColor: themedColors.primary, borderColor: themedColors.primary }]}>
            {agreedTerms && <Icon name="check" size={14} color="#fff" />}
          </View>
          <Text style={styles.summaryCheckboxText}>{t('booking.summary.termsLong')}</Text>
        </TouchableOpacity>

        {/* Nút xác nhận cuối cùng */}
        <TouchableOpacity
          style={[styles.summarySubmitBtn, { backgroundColor: themedColors.primary }, (!agreedTerms || confirming) && styles.summarySubmitBtnDisabled]}
          onPress={onConfirm}
          disabled={!agreedTerms || confirming}
        >
          {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.summarySubmitBtnText}>{t('booking.summary.btnSign')}</Text>}
        </TouchableOpacity>

        <Text style={styles.summaryFooterText}>{t('booking.summary.footer')}</Text>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  summaryContent: { padding: 16 },
  summaryRoomCard: { borderRadius: 16, padding: 12, flexDirection: 'row', borderWidth: 1, marginBottom: 20 },
  summaryRoomImage: { width: 100, height: 80, borderRadius: 12 },
  summaryRoomInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  summaryRoomTag: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  summaryRoomName: { fontSize: 18, fontWeight: 'bold' },
  summarySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summarySectionTitle: { fontSize: 15, fontWeight: 'bold' },
  summaryEditBtn: { fontSize: 14, fontWeight: '600' },
  summaryCustomerCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 20 },
  summaryCustomerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summaryCustomerInfo: { marginLeft: 12 },
  summaryCustomerName: { fontSize: 15, fontWeight: 'bold' },
  summaryCustomerPhone: { fontSize: 13 },
  summaryDetailGrid: { paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 16 },
  summaryGridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryGridItem: { flex: 1 },
  summaryGridLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  summaryGridValue: { fontSize: 15, fontWeight: 'bold' },
  summaryHighlightCard: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  summaryHighlightLabel: { fontSize: 14, fontWeight: '500' },
  summaryHighlightValue: { fontSize: 18, fontWeight: 'bold' },
  summarySvcItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  summarySvcIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summarySvcName: { flex: 1, marginLeft: 12, fontSize: 14 },
  summarySvcPrice: { fontSize: 14, fontWeight: 'bold' },
  summaryTotalCard: { borderRadius: 16, padding: 16, marginBottom: 20 },
  summaryTotalTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  confSummaryTotalLabel: { fontSize: 14, color: '#6B7280' },
  confSummaryTotalValue: { fontSize: 14, fontWeight: '600' },
  confSummaryGrandTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  confSummaryGrandTotalValue: { fontSize: 20, fontWeight: 'bold' },
  summaryGrandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  summaryCheckboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  summaryCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  summaryCheckboxText: { fontSize: 12, color: '#6B7280', flex: 1 },
  summarySubmitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', elevation: 4 },
  summarySubmitBtnDisabled: { backgroundColor: '#9CA3AF' },
  summarySubmitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summaryFooterText: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 12, lineHeight: 16 },
});
