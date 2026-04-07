/**
 * @file: RoomCard.tsx
 * @description: Thẻ hiển thị thông tin phòng đang được chọn để đăng ký.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RoomInfo } from '../types';

interface RoomCardProps {
  room: RoomInfo;      // Thông tin phòng
  t: any;             // Hàm dịch i18n
  themedColors: any;  // Bảng màu theme
}

/**
 * Component hiển thị tóm tắt thông tin phòng (Số phòng, Loại phòng, Tầng)
 */
export const RoomCard = React.memo(({ room, t, themedColors }: RoomCardProps) => (
  <View style={[styles.roomCard, { backgroundColor: themedColors.surfaceAlt }]}>
    <View style={[styles.roomIcon, { backgroundColor: themedColors.primaryLight }]}>
      <Icon name="meeting-room" size={24} color={themedColors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.roomName, { color: themedColors.primary }]}>{room.name}</Text>
      <Text style={[styles.roomLabel, { color: themedColors.textSecondary }]}>{room.product_name}</Text>
      <Text style={[styles.roomFloor, { color: themedColors.text }]}>
        {t('roomDetail.floor')} {room.floor}
      </Text>
    </View>
  </View>
));

const styles = StyleSheet.create({
  roomCard: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
  },
  roomLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  roomFloor: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
