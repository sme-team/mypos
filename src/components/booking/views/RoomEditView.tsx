/**
 * @file: RoomEditView.tsx
 * @description: Giao diện con phục vụ tính năng Chỉnh sửa thông tin cư dân và chỉ số dịch vụ trong RoomDetail.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Component cho phép sửa nhanh thông tin khách hàng đang ở và cập nhật chỉ số điện nước.
 */
export const RoomEditView = React.memo(({
  setView,
  handleUpdateEdit,
  room,
  editData,
  setEditData,
  themedColors,
  t
}: any) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.bg }]}>
      {/* Header của màn hình chỉnh sửa */}
      <View style={[styles.header, { borderBottomColor: themedColors.border, backgroundColor: themedColors.surface }]}>
        <TouchableOpacity onPress={() => setView('detail')} style={{ padding: 8 }}>
          <Icon name="arrow-back" size={24} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themedColors.text }]}>{t('roomDetail.edit')}</Text>
        <TouchableOpacity onPress={handleUpdateEdit} style={{ padding: 8 }}>
          <Text style={{ color: themedColors.primary, fontWeight: '700', fontSize: 16 }}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        {/* Thông tin phòng hiện tại */}
        <Text style={[styles.sectionTitle, { color: themedColors.textSecondary }]}>{t('booking.sections.room')}</Text>
        <View style={[styles.currentRoomBox, { backgroundColor: themedColors.surfaceAlt, marginBottom: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconBox, { backgroundColor: themedColors.primaryLight }]}>
              <Icon name="meeting-room" size={20} color={themedColors.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{room.label}</Text>
              <Text style={{ color: themedColors.textSecondary, fontSize: 13, marginTop: 2 }}>Trạng thái: {t('roomDetail.occupied')}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.outlineBtnSmall, { borderColor: themedColors.primary, backgroundColor: themedColors.primaryLight }]} 
            onPress={() => setView('switch')}
          >
            <Text style={{ color: themedColors.primary, fontSize: 12, fontWeight: '700' }}>{t('roomDetail.switchRoom')}</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin khách hàng (Cư dân) */}
        <Text style={[styles.sectionTitle, { color: themedColors.textSecondary }]}>{t('booking.sections.tenant')}</Text>
        
        <Text style={[styles.inputLabel, { color: themedColors.textSecondary }]}>{t('roomDetail.fullName')}</Text>
        <TextInput 
          style={[styles.input, { borderColor: themedColors.border, color: themedColors.text }]} 
          value={editData.tenant} 
          onChangeText={t => setEditData({ ...editData, tenant: t })} 
        />
        
        <Text style={[styles.inputLabel, { color: themedColors.textSecondary }]}>{t('roomDetail.phone')}</Text>
        <TextInput 
          style={[styles.input, { borderColor: themedColors.border, color: themedColors.text }]} 
          value={editData.phone} 
          onChangeText={t => setEditData({ ...editData, phone: t })} 
          keyboardType="phone-pad" 
        />
        
        <Text style={[styles.inputLabel, { color: themedColors.textSecondary }]}>CCCD/Passport</Text>
        <TextInput 
          style={[styles.input, { borderColor: themedColors.border, color: themedColors.text }]} 
          value={editData.cccd} 
          onChangeText={t => setEditData({ ...editData, cccd: t })} 
        />

        {/* Thông tin dịch vụ & Chỉ số điện nước */}
        <Text style={[styles.sectionTitle, { color: themedColors.textSecondary, marginTop: 12 }]}>{t('roomDetail.serviceAndRent')}</Text>

        {/* Tiền phòng */}
        <View style={[styles.serviceBox, { borderColor: themedColors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Icon name="home" size={20} color={themedColors.text} style={{ marginRight: 8 }} />
            <Text style={{ fontWeight: '700', fontSize: 15, color: themedColors.text }}>Tiền phòng</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.inputSubLabel, { color: themedColors.textSecondary }]}>Đơn giá</Text>
              <TextInput 
                style={[styles.inputSmall, { borderColor: themedColors.border, color: themedColors.text }]} 
                value={editData.rentPrice} 
                onChangeText={t => setEditData({ ...editData, rentPrice: t })} 
                keyboardType="numeric" 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputSubLabel, { color: themedColors.textSecondary }]}>Số lượng</Text>
              <TextInput 
                style={[styles.inputSmall, { borderColor: themedColors.border, color: themedColors.text, opacity: 0.6 }]} 
                value="1" 
                editable={false} 
              />
            </View>
          </View>
        </View>

        {/* Tiền điện */}
        <View style={[styles.serviceBox, { borderColor: themedColors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Icon name="bolt" size={20} color={themedColors.text} style={{ marginRight: 8 }} />
            <Text style={{ fontWeight: '700', fontSize: 15, color: themedColors.text }}>Tiền điện</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.inputSubLabel, { color: themedColors.textSecondary }]}>{t('roomDetail.old')}</Text>
              <TextInput 
                style={[styles.inputSmall, { borderColor: themedColors.border, color: themedColors.text }]} 
                value={editData.electricOld} 
                onChangeText={t => setEditData({ ...editData, electricOld: t })} 
                keyboardType="numeric" 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputSubLabel, { color: themedColors.textSecondary }]}>{t('roomDetail.new')}</Text>
              <TextInput 
                style={[styles.inputSmall, { borderColor: themedColors.border, color: themedColors.text }]} 
                value={editData.electricNew} 
                onChangeText={t => setEditData({ ...editData, electricNew: t })} 
                keyboardType="numeric" 
              />
            </View>
          </View>
          <Text style={[styles.inputSubLabel, { color: themedColors.textSecondary }]}>{t('roomDetail.unitRate')}</Text>
          <TextInput 
            style={[styles.inputSmall, { borderColor: themedColors.border, color: themedColors.text }]} 
            value={editData.electricRate} 
            onChangeText={t => setEditData({ ...editData, electricRate: t })} 
            keyboardType="numeric" 
          />
        </View>

        {/* Nút cập nhật */}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themedColors.primary, marginTop: 20, marginBottom: 40 }]} onPress={handleUpdateEdit}>
          <Text style={styles.primaryBtnText}>Cập nhật thay đổi</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 16, 
    borderBottomWidth: 1 
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  currentRoomBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  outlineBtnSmall: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  inputLabel: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 14 },
  serviceBox: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 12 },
  inputSubLabel: { fontSize: 12, marginBottom: 4 },
  inputSmall: { borderWidth: 1.5, borderRadius: 10, padding: 10, fontSize: 14 },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
