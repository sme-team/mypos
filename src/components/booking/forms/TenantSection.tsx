/**
 * @file: TenantSection.tsx
 * @description: Phân đoạn quản lý thông tin khách thuê (Chọn khách cũ hoặc nhập mới).
 */

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SectionLabel, FieldLabel, FieldInput } from '../ui/SharedFields';

/**
 * Component quản lý thông tin khách thuê
 * Hỗ trợ 2 chế độ: Chọn từ danh sách có sẵn (Existing) hoặc Quét CCCD/Nhập mới (New)
 */
export const TenantSection = React.memo(({
  form, updateForm, isCustomerDropdownOpen, setIsCustomerDropdownOpen,
  filteredCustomers, selectedCustomer, setSelectedCustomer,
  setScannerVisible, // Prop mới để điều khiển Modal quét
  errors = {}, clearError,
  t, themedColors
}: any) => (
  <View>
    {/* Tiêu đề phân đoạn */}
    <SectionLabel text={t('booking.sections.tenant')} />

    {/* Nút chuyển đổi giữa Khách cũ / Khách mới */}
    <View style={styles.tenantToggleRow}>
      <TouchableOpacity
        style={[
          styles.tenantTabBtn,
          { borderColor: themedColors.border, backgroundColor: themedColors.surface },
          form.tenantTab === 'existing' && { backgroundColor: themedColors.primary, borderColor: themedColors.primary }
        ]}
        onPress={() => updateForm({ tenantTab: 'existing' })}
      >
        <Text style={[styles.tenantTabText, { color: themedColors.textSecondary }, form.tenantTab === 'existing' && { color: '#fff' }]}>
          {t('booking.form.selectCustomer')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tenantTabBtn,
          { borderColor: themedColors.border, backgroundColor: themedColors.surface },
          form.tenantTab === 'new' && { backgroundColor: themedColors.primary, borderColor: themedColors.primary }
        ]}
        onPress={() => updateForm({ tenantTab: 'new' })}
      >
        <Text style={[styles.tenantTabText, { color: themedColors.textSecondary }, form.tenantTab === 'new' && { color: '#fff' }]}>
          {t('booking.form.newCustomer')}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Nội dung tương ứng với Tab được chọn */}
    {form.tenantTab === 'existing' ? (
      <View style={{ zIndex: 10 }}>
        <FieldLabel text={t('booking.form.searchLabel')} />
        <TouchableOpacity
          style={[styles.dropdownTrigger, { borderColor: themedColors.border, backgroundColor: themedColors.surface }, isCustomerDropdownOpen && { borderColor: themedColors.primary }]}
          onPress={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
        >
          <Icon name="search" size={18} color={themedColors.textHint} />
          <TextInput
            style={[styles.dropdownSearchInput, { color: themedColors.text }]}
            value={form.searchQuery}
            onFocus={() => setIsCustomerDropdownOpen(true)}
            onChangeText={(v) => updateForm({ searchQuery: v })}
            placeholder={selectedCustomer ? selectedCustomer.full_name : t('booking.form.searchCustomer')}
            placeholderTextColor={themedColors.textHint}
          />
          <Icon name="arrow-drop-down" size={20} color={themedColors.textHint} />
        </TouchableOpacity>

        {/* Danh sách kết quả tìm kiếm khách hàng */}
        {isCustomerDropdownOpen && (
          <View style={[styles.dropdownWindow, { backgroundColor: themedColors.surface, borderColor: themedColors.border }]}>
            <ScrollView 
              nestedScrollEnabled
              removeClippedSubviews={true}
              scrollEventThrottle={16}
              automaticallyAdjustContentInsets={false}>
              {filteredCustomers.length === 0 ? (
                <Text style={[styles.emptyText, { color: themedColors.textHint }]}>{t('booking.form.notFound')}</Text>
              ) : (
                filteredCustomers.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.customerItem, selectedCustomer?.id === c.id && { backgroundColor: themedColors.primary }]}
                    onPress={() => { setSelectedCustomer(c); setIsCustomerDropdownOpen(false); }}
                  >
                    <View style={[styles.customerAvatar, { backgroundColor: themedColors.primaryMid }]}>
                      <Text style={styles.customerInitials}>{c.full_name?.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerName, { color: themedColors.text }, selectedCustomer?.id === c.id && { color: '#fff' }]}>{c.full_name}</Text>
                      <Text style={[styles.customerPhone, { color: themedColors.textSecondary }, selectedCustomer?.id === c.id && { color: 'rgba(255,255,255,0.7)' }]}>{c.phone || c.id_number}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Hiển thị khách hàng đang được chọn */}
        {selectedCustomer && !isCustomerDropdownOpen && (
          <View style={[styles.selectedCustomerSummary, { backgroundColor: themedColors.surfaceAlt }]}>
            <View style={[styles.customerAvatar, { backgroundColor: themedColors.primaryMid }]}>
              <Text style={styles.customerInitials}>{selectedCustomer.full_name?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerName, { color: themedColors.text }]}>{selectedCustomer.full_name}</Text>
              <Text style={[styles.customerPhone, { color: themedColors.textSecondary }]}>{selectedCustomer.phone || selectedCustomer.id_number}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
              <Icon name="close" size={20} color={themedColors.textHint} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    ) : (
      <View style={{ gap: 10 }}>
        {/* Chế độ nhập khách hàng mới */}
        <TouchableOpacity 
          style={[styles.scanBtn, { borderColor: themedColors.primaryMid, backgroundColor: themedColors.primaryLight }]}
          onPress={() => setScannerVisible(true)}
        >
          <Text style={[styles.scanBtnText, { color: themedColors.primary }]}>{t('booking.form.scanning')}</Text>
        </TouchableOpacity>
        <FieldInput fieldKey="fullName" error={errors.fullName} value={form.fullName} onChangeText={(v: any) => { updateForm({ fullName: v }); clearError && clearError('fullName'); }} placeholder={t('booking.form.fullName')} themedColors={themedColors} />
        <FieldInput fieldKey="phone" error={errors.phone} value={form.phone} onChangeText={(v: any) => { updateForm({ phone: v }); clearError && clearError('phone'); }} placeholder={t('booking.form.phone')} keyboardType="phone-pad" themedColors={themedColors} />
        <FieldInput fieldKey="idCard" error={errors.idCard} value={form.idCard} onChangeText={(v: any) => { updateForm({ idCard: v }); clearError && clearError('idCard'); }} placeholder={t('booking.form.idCard')} themedColors={themedColors} />
        <FieldInput fieldKey="dateOfBirth" error={errors.dateOfBirth} value={form.dateOfBirth} onChangeText={(v: any) => { updateForm({ dateOfBirth: v }); clearError && clearError('dateOfBirth'); }} placeholder={t('booking.form.dateOfBirth')} themedColors={themedColors} />
        <FieldInput fieldKey="gender" error={errors.gender} value={form.gender} onChangeText={(v: any) => { updateForm({ gender: v }); clearError && clearError('gender'); }} placeholder={t('booking.form.gender')} themedColors={themedColors} />
        <FieldInput fieldKey="email" error={errors.email} value={form.email} onChangeText={(v: any) => { updateForm({ email: v }); clearError && clearError('email'); }} placeholder={t('booking.form.email')} keyboardType="email-address" themedColors={themedColors} />
        <FieldInput fieldKey="address" error={errors.address} value={form.address} onChangeText={(v: any) => { updateForm({ address: v }); clearError && clearError('address'); }} placeholder={t('booking.form.address')} themedColors={themedColors} />
        <FieldInput fieldKey="nationality" error={errors.nationality} value={form.nationality} onChangeText={(v: any) => { updateForm({ nationality: v }); clearError && clearError('nationality'); }} placeholder={t('booking.form.nationality')} themedColors={themedColors} />
      </View>
    )}
  </View>
));

const styles = StyleSheet.create({
  tenantToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tenantTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  tenantTabText: { fontSize: 13 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderRadius: 8,
    gap: 8,
  },
  dropdownSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  dropdownWindow: {
    borderRadius: 12,
    borderWidth: 1,
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: 220,
    minWidth: '100%',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitials: { fontSize: 12, fontWeight: '600', color: '#fff' },
  customerName: { fontSize: 13, fontWeight: '600' },
  customerPhone: { fontSize: 11, marginTop: 2 },
  emptyText: { textAlign: 'center', padding: 20, fontSize: 13 },
  selectedCustomerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 12,
  },
  scanBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanBtnText: { fontSize: 13, fontWeight: '600' },
});
