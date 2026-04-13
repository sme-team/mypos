/**
 * @file: ServicesSection.tsx
 * @description: Quản lý danh sách dịch vụ đi kèm khi đặt phòng (Wifi, Dọn dẹp, Giặt ủi...).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SectionLabel, Stepper } from '../ui/SharedFields';
import { Service } from '../types';

/**
 * Modal hiển thị danh sách tất cả dịch vụ có sẵn trong hệ thống để người dùng chọn thêm.
 */
export const ServiceSelectionModal = React.memo(({ visible, onClose, availableServices, form, updateForm, formatVND, t, themedColors }: any) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContainer, { backgroundColor: themedColors.surface }]}>
        <View style={[styles.modalHeader, { borderBottomColor: themedColors.border }]}>
          <Text style={[styles.modalTitle, { color: themedColors.text }]}>{t('booking.form.serviceModalTitle')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color={themedColors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={{ maxHeight: 400 }}
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          automaticallyAdjustContentInsets={false}>
          {availableServices.length === 0 ? (
            <Text style={[styles.emptyText, { color: themedColors.textHint }]}>{t('booking.form.noAvailableServices')}</Text>
          ) : (
            availableServices.map((svc: any) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.svcSelectItem, { borderBottomColor: themedColors.border }]}
                onPress={() => {
                  const ext = form.services.find((s: any) => s.id === svc.id);
                  if (ext) {
                    // Nếu đã có trong danh sách thì tăng số lượng
                    updateForm({ services: form.services.map((s: any) => s.id === svc.id ? { ...s, qty: s.qty + 1 } : s) });
                  } else {
                    // Nếu chưa có thì thêm mới
                    updateForm({ services: [...form.services, { ...svc, qty: 1, selected: true }] });
                  }
                }}
              >
                <View style={[styles.svcSelectIcon, { backgroundColor: themedColors.primaryLight }]}>
                  <Icon name="room-service" size={20} color={themedColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.svcSelectName, { color: themedColors.text }]}>{svc.name}</Text>
                  <Text style={[styles.svcSelectPrice, { color: themedColors.textSecondary }]}>{formatVND(svc.unitPrice)} / {svc.unit}</Text>
                </View>
                <Icon name="add" size={22} color={themedColors.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: themedColors.surfaceAlt }]} onPress={onClose}>
          <Text style={[styles.modalCloseBtnText, { color: themedColors.textSecondary }]}>{t('booking.form.close')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

/**
 * Phân đoạn hiển thị các dịch vụ đã chọn và nút thêm mới.
 */
export const ServicesSection = React.memo(({ form, availableServices, updateForm, formatVND, t, themedColors }: any) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  return (
    <View>
      <SectionLabel text={t('booking.sections.services')} />
      
      {form.services.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: themedColors.border, backgroundColor: themedColors.surface }]}>
          <Text style={{ color: themedColors.textHint, fontSize: 13 }}>{t('booking.form.noServices')}</Text>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
          {form.services.map((svc: Service, idx: number) => (
            <View key={svc.id} style={[styles.svcItem, idx < form.services.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: themedColors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.svcName, { color: themedColors.text }]}>{svc.name}</Text>
                <Text style={[styles.svcUnit, { color: themedColors.textSecondary }]}>{formatVND(svc.unitPrice)} / {svc.unit}</Text>
              </View>
              {/* Bộ tăng giảm số lượng dịch vụ */}
              <Stepper
                value={svc.qty}
                onDecrement={() => updateForm({ services: form.services.map((s: any) => s.id === svc.id ? { ...s, qty: Math.max(1, s.qty - 1) } : s) })}
                onIncrement={() => updateForm({ services: form.services.map((s: any) => s.id === svc.id ? { ...s, qty: s.qty + 1 } : s) })}
                min={1}
                themedColors={themedColors}
              />
              {/* Nút xóa dịch vụ khỏi danh sách */}
              <TouchableOpacity onPress={() => updateForm({ services: form.services.filter((s: any) => s.id !== svc.id) })} style={styles.svcDelete}>
                <Icon name="delete-outline" size={22} color={themedColors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Nút mở Modal thêm dịch vụ */}
      <TouchableOpacity style={[styles.addSvcBtn, { borderColor: themedColors.primary, backgroundColor: themedColors.primaryLight }]} onPress={() => setIsMenuVisible(true)}>
        <Text style={[styles.addSvcText, { color: themedColors.primary }]}>{t('booking.form.addService')}</Text>
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
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 14,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 12,
  },
  svcItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  svcName: { fontSize: 13, fontWeight: '600' },
  svcUnit: { fontSize: 11, marginTop: 2 },
  svcDelete: { padding: 8, marginLeft: 6 },
  addSvcBtn: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addSvcText: { fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContainer: { borderRadius: 16, padding: 16, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  svcSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  svcSelectIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svcSelectName: { fontSize: 14, fontWeight: '600' },
  svcSelectPrice: { fontSize: 12, marginTop: 2 },
  modalCloseBtn: {
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 20,
  },
  modalCloseBtnText: { fontSize: 14, fontWeight: '700' },
  emptyText: { textAlign: 'center', padding: 40, fontSize: 14 },
});
