/**
 * @file: RoomSwitchView.tsx
 * @description: Giao diện con phục vụ tính năng Đổi phòng (Room Swap) trong RoomDetail.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Component hiển thị danh sách phòng trống để khách hàng có thể chuyển sang.
 */
export const RoomSwitchView = React.memo(({
  room,
  details,
  switchFloor,
  setSwitchFloor,
  availableRooms,
  selectedNewRoom,
  setSelectedNewRoom,
  handleSwap,
  formatPrice,
  extractFloor,
  setView,
  themedColors,
  t
}: any) => {
  // Lọc danh sách phòng theo tầng đang chọn
  const listForFloor = availableRooms.filter((r: any) => extractFloor(r.name) === switchFloor);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.bg }]}>
      {/* Header của màn hình đổi phòng */}
      <View style={[styles.header, { borderBottomColor: themedColors.border, backgroundColor: themedColors.surface }]}>
        <TouchableOpacity onPress={() => setView('detail')} style={{ padding: 8 }}>
          <Icon name="arrow-back" size={24} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themedColors.text }]}>{t('roomDetail.switchRoom')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body}>
        {/* Thông tin phòng hiện tại */}
        <Text style={[styles.sectionTitle, { color: themedColors.textSecondary }]}>{t('roomDetail.currentRoom')}</Text>
        <View style={[styles.currentRoomBox, { backgroundColor: themedColors.surfaceAlt }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconBox, { backgroundColor: themedColors.primaryLight }]}>
              <Icon name="meeting-room" size={20} color={themedColors.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: themedColors.text }}>{room.label}</Text>
              <Text style={{ color: themedColors.textSecondary, fontSize: 13, marginTop: 2 }}>
                Khách: {details?.customer_name || 'Không rõ'}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: themedColors.primaryLight }]}>
            <Text style={{ color: themedColors.primary, fontSize: 11, fontWeight: '700' }}>Ở đây</Text>
          </View>
        </View>

        {/* Lựa chọn tầng */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: themedColors.textSecondary, marginBottom: 0 }]}>{t('roomDetail.selectNewRoom')}</Text>
          <View style={{ flexDirection: 'row' }}>
            {['1', '2', '3'].map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setSwitchFloor(f)}
                style={[styles.floorBtn, { backgroundColor: themedColors.border }, switchFloor === f && { backgroundColor: themedColors.primary }]}
              >
                <Text style={[styles.floorBtnText, { color: themedColors.textSecondary }, switchFloor === f && { color: '#ffffff' }]}>Tầng {f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Danh sách phòng trống khả dụng */}
        {listForFloor.length === 0 ? (
          <Text style={{ textAlign: 'center', color: themedColors.textHint, marginTop: 40 }}>{t('roomDetail.noVacant')}</Text>
        ) : (
          listForFloor.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              activeOpacity={0.8}
              onPress={() => setSelectedNewRoom(r)}
              style={[
                styles.switchRoomCard, 
                { borderColor: themedColors.border, backgroundColor: themedColors.surface },
                selectedNewRoom?.id === r.id && { borderColor: themedColors.primary, backgroundColor: themedColors.primaryLight }
              ]}
            >
              <View>
                <Text style={{ fontWeight: '700', fontSize: 15, color: themedColors.text }}>{r.name}</Text>
                <Text style={{ fontSize: 13, color: themedColors.textSecondary, marginTop: 2 }}>{t('roomDetail.vacant')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', fontSize: 15, color: themedColors.primary, marginRight: 10 }}>{formatPrice(r.price)}</Text>
                {selectedNewRoom?.id === r.id && (
                  <View style={[styles.checkIcon, { backgroundColor: themedColors.primary }]}>
                    <Icon name="check" size={14} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Nút xác nhận đổi */}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: themedColors.primary, marginTop: 30 }]} onPress={handleSwap}>
          <Text style={styles.primaryBtnText}>{t('roomDetail.confirmSwap')}</Text>
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
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  floorBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginLeft: 6 },
  floorBtnText: { fontSize: 13, fontWeight: '600' },
  switchRoomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1.5, borderRadius: 14, marginBottom: 10 },
  checkIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 40 },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
