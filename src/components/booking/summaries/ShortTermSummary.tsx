/**
 * @file: ShortTermSummary.tsx
 * @description: Màn hình xác nhận cuối cùng cho quy trình đặt phòng NGẮN HẠN (theo giờ/ngày/đêm).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ShortTermPriceService, ShortTermPriceResult } from '../../../services/ResidentServices/ShortTermPriceService';

// Ảnh minh họa mặc định
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

/**
 * Component hiển thị tóm tắt thông tin đặt phòng ngắn hạn.
 * Tính giá theo giờ/ngày/đêm dựa trên thời gian nhận/trả phòng.
 */
export const ShortTermSummary = React.memo(({ form, room, selectedCustomer, onEdit, onConfirm, formatVND, confirming, themedColors, t }: any) => {
  const [priceResult, setPriceResult] = useState<ShortTermPriceResult | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  // Tính giá phòng khi mount hoặc form thay đổi
  useEffect(() => {
    const calculatePrice = async () => {
      setLoadingPrice(true);
      try {
        const result = await ShortTermPriceService.calculatePrice({
          checkinDate: form.checkinDate,
          checkinTime: form.checkinTime,
          checkoutDate: form.checkoutDate,
          checkoutTime: form.checkoutTime,
          variantId: room.id,
          productId: room.product_id,
          storeId: room.store_id || 'store-001',
        });
        setPriceResult(result);
      } catch (err) {
        console.error('[ShortTermSummary] Price calculation error:', err);
      } finally {
        setLoadingPrice(false);
      }
    };
    calculatePrice();
  }, [form.checkinDate, form.checkinTime, form.checkoutDate, form.checkoutTime, room.id, room.product_id]);

  // Tính số lượng dịch vụ
  const serviceTotal = form.services.reduce((sum: number, s: any) => sum + (s.qty * s.unitPrice), 0);

  // Tính số đêm (dùng để hiển thị)
  const checkin = new Date(form.checkinDate);
  const checkout = new Date(form.checkoutDate);
  const diffTime = checkout.getTime() - checkin.getTime();
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // Tính toán tài chính
  const roomTotal = priceResult?.totalAmount || 0;
  const grandTotal = roomTotal + serviceTotal;

  return (
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: themedColors.bg }]}
      removeClippedSubviews={true}
      scrollEventThrottle={16}
      automaticallyAdjustContentInsets={false}>
      <View style={styles.summaryContent}>
        
        {/* Thông tin phòng */}
        <View style={styles.summarySectionHeader}>
          <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.sections.room')}</Text>
        </View>
        <View style={[styles.summaryRoomCard, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]}>
          <Image source={{ uri: PLACEHOLDER_IMAGE }} style={styles.summaryRoomImage} />
          <View style={styles.summaryRoomInfo}>
            <Text style={[styles.summaryRoomTag, { color: themedColors.primary }]}>{t('booking.sections.room')}</Text>
            <Text style={[styles.summaryRoomName, { color: themedColors.text }]}>{room.label}</Text>
            <Text style={[styles.summaryRoomAddr, { color: themedColors.textSecondary }]}>{room.product_name}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: themedColors.text, marginTop: 4 }}>
              {t('roomDetail.floor')} {room.floor}
            </Text>
          </View>
        </View>

        {/* Thông tin khách hàng */}
        <View style={styles.summarySectionHeader}>
          <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.sections.tenant')}</Text>
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

        {/* Chi tiết thời gian lưu trú */}
        <View style={styles.summarySectionHeader}>
          <Text style={[styles.summarySectionTitle, { color: themedColors.text }]}>{t('booking.sections.stayDetails')}</Text>
        </View>
        <View style={[styles.summaryDetailGrid, { borderColor: themedColors.border }]}>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.checkin')}</Text>
              <Text style={[styles.summaryGridValue, { color: themedColors.text }]}>{form.checkinDate}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{form.checkinTime}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>{t('booking.form.checkout')}</Text>
              <Text style={[styles.summaryGridValue, { color: themedColors.text }]}>{form.checkoutDate}</Text>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>{form.checkoutTime}</Text>
            </View>
          </View>
          <View style={styles.summaryGridRow}>
            <View style={styles.summaryGridItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="people" size={16} color="#9CA3AF" />
                <Text style={{ fontSize: 14, color: themedColors.text, marginLeft: 6 }}>
                  {form.adults} {t('booking.form.adults')}, {form.children} {t('booking.form.children')}
                </Text>
              </View>
            </View>
            <View style={styles.summaryGridItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Icon name="nights-stay" size={16} color="#9CA3AF" />
                <Text style={{ fontSize: 14, color: themedColors.text, marginLeft: 6 }}>{t('booking.summary.nights', { count: nights })}</Text>
              </View>
            </View>
          </View>
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
                  <Icon name="room-service" size={18} color={themedColors.primary} />
                </View>
                <Text style={[styles.summarySvcName, { color: themedColors.textSecondary }]}>{svc.name}</Text>
                <Text style={[styles.summarySvcPrice, { color: themedColors.text }]}>{formatVND(svc.qty * svc.unitPrice)}</Text>
              </View>
            ))}
            <View style={{ height: 16 }} />
          </>
        )}

        {/* Chi tiết tính giá phòng */}
        {priceResult && priceResult.breakdown.length > 0 && (
          <View style={[styles.summaryTotalCard, { backgroundColor: themedColors.primaryLight, marginBottom: 12 }]}>
            <Text style={[styles.summaryTotalTitle, { color: themedColors.text }]}>Chi tiết giá phòng</Text>
            {priceResult.breakdown.map((item, index) => (
              <View key={index} style={styles.summaryTotalRow}>
                <Text style={styles.confSummaryTotalLabel}>{item.description}</Text>
                <Text style={[styles.confSummaryTotalValue, { color: themedColors.text }]}>{formatVND(item.amount)}</Text>
              </View>
            ))}
            <View style={{ borderTopWidth: 1, borderTopColor: themedColors.border, marginTop: 8, paddingTop: 8 }}>
              <View style={styles.summaryTotalRow}>
                <Text style={[styles.confSummaryTotalLabel, { fontWeight: '700' }]}>Tổng tiền phòng</Text>
                <Text style={[styles.confSummaryTotalValue, { color: themedColors.text, fontWeight: '700' }]}>{formatVND(roomTotal)}</Text>
              </View>
            </View>
          </View>
        )}

        {loadingPrice && (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <ActivityIndicator size="small" color={themedColors.primary} />
            <Text style={{ fontSize: 12, color: themedColors.textSecondary, marginTop: 4 }}>Đang tính giá...</Text>
          </View>
        )}

        {/* Tổng kết chi tiết thanh toán */}
        <View style={[styles.summaryTotalCard, { backgroundColor: themedColors.primaryLight }]}>
          <Text style={[styles.summaryTotalTitle, { color: themedColors.text }]}>{t('booking.summary.paymentDetail')}</Text>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>Tiền phòng ({nights} đêm)</Text>
            <Text style={[styles.confSummaryTotalValue, { color: themedColors.text }]}>{formatVND(roomTotal)}</Text>
          </View>
          <View style={styles.summaryTotalRow}>
            <Text style={styles.confSummaryTotalLabel}>{t('booking.summary.serviceAdd')}</Text>
            <Text style={[styles.confSummaryTotalValue, { color: themedColors.text }]}>{formatVND(serviceTotal)}</Text>
          </View>
          <View style={[styles.summaryGrandTotalRow, { borderTopColor: themedColors.border }]}>
            <Text style={[styles.confSummaryGrandTotalLabel, { color: themedColors.text }]}>{t('booking.summary.totalToPay')}</Text>
            <Text style={[styles.confSummaryGrandTotalValue, { color: themedColors.primary }]}>{formatVND(grandTotal)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.summarySubmitBtn, { backgroundColor: themedColors.primary }, confirming && styles.summarySubmitBtnDisabled]}
          onPress={onConfirm}
          disabled={confirming}
        >
          {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.summarySubmitBtnText}>{t('booking.summary.btnConfirm')}</Text>}
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
  summaryRoomAddr: { fontSize: 12, marginTop: 2 },
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
  summarySubmitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', elevation: 4 },
  summarySubmitBtnDisabled: { backgroundColor: '#9CA3AF' },
  summarySubmitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  summaryFooterText: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 12, lineHeight: 16 },
});
