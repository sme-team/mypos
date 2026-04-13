/**
 * @file: RoomSwitchView.tsx
 * @description: Giao diện con phục vụ tính năng Đổi phòng (Room Swap) trong RoomDetail.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const {width} = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 40, 400); // Giói han 400px cho tablet

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
  // availableRooms is Array<{ title: string; data: any[] }> from RoomQueryService
  const floorsFromSections = availableRooms.map((s: any) => {
    const m = s.title.match(/\d+/);
    return m ? m[0] : (s.title === 'Khác' ? '?' : s.title);
  });
  const availableFloors = floorsFromSections;

  // Lọc danh sách phòng dựa trên switchFloor
  let listForFloor: any[] = [];
  const section = availableRooms.find((s: any) => {
    const m = s.title.match(/\d+/);
    const floorVal = m ? m[0] : (s.title === 'Khác' ? '?' : s.title);
    return floorVal === switchFloor;
  });
  listForFloor = section ? section.data : [];

  console.log('RoomSwitchView Debug:', {
    availableRooms: availableRooms,
    switchFloor: switchFloor,
    listForFloor: listForFloor,
    listForFloorLength: listForFloor.length
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.bg }]}>
      {/* Header của màn hình đổi phòng */}
      <View style={[styles.header, { borderBottomColor: themedColors.border, backgroundColor: themedColors.surface }]}>
        <TouchableOpacity onPress={() => setView('edit')} style={{ padding: 8 }}>
          <Icon name="arrow-back" size={24} color={themedColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themedColors.text }]}>{t('roomDetail.switchRoom')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.body}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        automaticallyAdjustContentInsets={false}>
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
                {t('booking.form.customerName')}: {details?.customer_name || t('roomDetail.unknown')}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: themedColors.primaryLight }]}>
            <Text style={{ color: themedColors.primary, fontSize: 11, fontWeight: '700' }}>{t('roomDetail.here')}</Text>
          </View>
        </View>

        {/* Lựa chọn tầng */}
        <View style={{ marginTop: 20, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: themedColors.textSecondary }]}>{t('roomDetail.selectNewRoom')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
            {availableFloors.map((f: any) => (
              <TouchableOpacity
                key={f}
                onPress={() => setSwitchFloor(f)}
                style={[
                  styles.tab, 
                  { borderColor: themedColors.border, backgroundColor: themedColors.surface },
                  switchFloor === f && { borderColor: themedColors.primary, backgroundColor: themedColors.primary }
                ]}
              >
                <Text style={[
                  styles.tabText, 
                  { color: themedColors.textSecondary },
                  switchFloor === f && { color: '#ffffff' }
                ]}>
                  {f === '?' ? t('roomDetail.other') : `${t('pos.floor')} ${f}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Danh sách phòng trống khả dụng */}
        {listForFloor.length === 0 ? (
          <Text style={{ textAlign: 'center', color: themedColors.textHint, marginTop: 40 }}>{t('roomDetail.noVacant')}</Text>
        ) : (
          <View style={styles.roomGrid}>
            {listForFloor.map((r: any) => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.8}
                onPress={() => setSelectedNewRoom(selectedNewRoom?.id === r.id ? null : r)}
                style={[
                  styles.roomCard, 
                  { 
                    backgroundColor: '#F9FBE7',
                    borderColor: selectedNewRoom?.id === r.id ? themedColors.primary : '#C5CAA0',
                    borderWidth: selectedNewRoom?.id === r.id ? 2.5 : 1.5,
                  },
                  selectedNewRoom?.id === r.id && { backgroundColor: themedColors.primaryLight }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={[styles.iconBox, {backgroundColor: selectedNewRoom?.id === r.id ? themedColors.primaryLight : '#F1F8E9'}]}>
                      <Icon
                        name="meeting-room"
                        size={20}
                        color={selectedNewRoom?.id === r.id ? themedColors.primary : '#7CB342'}
                      />
                    </View>
                    <View style={{marginLeft: 8, flex: 1, maxWidth: '55%'}}>
                      <Text style={[styles.roomName, { color: themedColors.text }]} numberOfLines={1}>{r.name}</Text>
                      <Text style={[styles.roomType, { color: themedColors.textSecondary }]} numberOfLines={1}>{r.product_name}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.badge,
                    {backgroundColor: selectedNewRoom?.id === r.id ? themedColors.primary : '#E8F5E9'},
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      {color: selectedNewRoom?.id === r.id ? '#fff' : '#2E7D32'},
                    ]}>
                      {selectedNewRoom?.id === r.id ? t('roomDetail.selected') : (r.monthly_price ? formatPrice(r.monthly_price) + '/th' : '-')}
                    </Text>
                  </View>
                </View>
                
                {selectedNewRoom?.id === r.id && (
                  <View style={[styles.checkRow, { justifyContent: 'flex-end' }]}>
                    <View style={[styles.checkIcon, { backgroundColor: themedColors.primary }]}>
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
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
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, marginRight: 12 },
  badgeText: { fontSize: 15, fontWeight: '700' },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  roomGrid: {
    gap: 12,
    alignItems: 'center',
  },
  roomCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
  },
  roomName: {
    fontWeight: '700',
    fontSize: 16,
  },
  roomType: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 40 },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
