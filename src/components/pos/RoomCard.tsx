import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../hooks/useTheme';

import {Room} from '../../screens/pos/types';

interface RoomCardProps {
  room: Room;
  cardWidth: number; // Chiều rộng thẻ tính toán theo thiết bị
  onPress?: () => void;
}

/**
 * Bảng màu tương ứng với từng trạng thái phòng
 */
const STATUS_DOT: Record<Room['status'], string> = {
  occupied: '#FF4444', // Đang có khách - Đỏ
  available: '#4CAF50', // Trống/Sẵn sàng - Xanh lá
  cleaning: '#FFA726', // Đang dọn dẹp - Cam
  maintenance: '#9E9E9E', // Bảo trì - Xám
};

/**
 * Hàm định dạng tiền tệ Việt Nam
 */
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

const RoomCard: React.FC<RoomCardProps> = React.memo(
  ({room, cardWidth, onPress}) => {
    const {isDark} = useTheme();

    const cardBg = isDark ? '#1f2937' : '#fff';
    const textColor = isDark ? '#F9FAFB' : '#1A1A2E';
    const subTextColor = isDark ? '#9CA3AF' : '#666';
    const tagBg = isDark ? '#374151' : '#FEE2E2';
    const tagBorder = isDark ? '#4B5563' : '#FECACA';

    const statusText =
      room.status === 'available'
        ? 'Trống'
        : room.status === 'occupied'
        ? 'Đang ở'
        : room.status === 'cleaning'
        ? 'Dọn dẹp'
        : 'Bảo trì';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          styles.roomCard,
          {
            width: cardWidth,
            borderLeftColor: room.borderColor,
            backgroundColor: cardBg,
          },
        ]}>
        <View style={styles.roomHeader}>
          <Text style={[styles.roomId, {color: textColor}]}>
            {room.label || room.id}
          </Text>
          {room.tag && (
            <View
              style={[
                styles.roomTag,
                {
                  backgroundColor: tagBg,
                  borderColor: tagBorder,
                  borderWidth: 0.5,
                },
              ]}>
              <Text
                style={[
                  styles.roomTagText,
                  {
                    color:
                      room.id.includes('101') || room.id.includes('103')
                        ? '#EF4444'
                        : '#3B82F6',
                  },
                ]}>
                {room.tag}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.roomStatusRow}>
          <View style={styles.floorBadge}>
            <Text style={styles.floorText}>Tầng {room.floor}</Text>
          </View>
          <View style={styles.statusInfo}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: STATUS_DOT[room.status]},
              ]}
            />
            <Text style={[styles.roomStatusLabel, {color: subTextColor}]}>
              {statusText}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.roomPrice, {color: isDark ? '#60A5FA' : '#2563EB'}]}>
          {formatPrice(room.price)}
        </Text>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  roomCard: {
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomId: {
    fontSize: 15,
    fontWeight: '700',
  },
  roomTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roomTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  roomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floorBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  floorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomStatusLabel: {
    fontSize: 12,
  },
  roomPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RoomCard;
