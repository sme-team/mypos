/**
 * @file: RoomCard.tsx
 * @description: Component hiển thị thẻ thông tin phòng trong phân hệ LƯU TRÚ.
 * Hiển thị số phòng, tầng, trạng thái (màu sắc động), giá tiền và các nhãn (tags).
 * @path: src/components/pos/RoomCard.tsx
 */

import {createModuleLogger, AppModules} from '../../logger';
const logger = createModuleLogger(AppModules.ROOM_CARD);

import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../../hooks/useTheme';
import {useTranslation} from 'react-i18next';

import {Room} from '../../screens/pos/types';

interface RoomCardProps {
  room: Room;
  cardWidth: number; // Chiều rộng thẻ tính toán theo thiết bị
  onPress?: () => void;
  onInfoPress?: () => void; // Handler cho nút 'i'
  onTimelinePress?: () => void; // Handler cho biểu tượng Lịch
}

/**
 * Bảng màu tương ứng với từng trạng thái phòng
 */
const STATUS_COLORS = {
  available: {
    bg: '#D4EAC8',
    dot: '#2E7D32',
    text: '#1B5E20',
  },
  occupied: {
    bg: '#FFCDD2',
    dot: '#D32F2F',
    text: '#B71C1C',
  },
  booked: {
    bg: '#BBDEFB',
    dot: '#1976D2',
    text: '#0D47A1',
  },
  cleaning: {
    bg: '#FFE0B2',
    dot: '#F57C00',
    text: '#E65100',
  },
  maintenance: {
    bg: '#E0E0E0',
    dot: '#757575',
    text: '#424242',
  },
};

const RoomCard: React.FC<RoomCardProps> = React.memo(
  ({room, cardWidth, onPress, onInfoPress, onTimelinePress}) => {
    const {t} = useTranslation();
    const {isDark} = useTheme();

    const cardBg = isDark ? '#1f2937' : '#fff';
    const textColor = isDark ? '#F9FAFB' : '#1A1A2E';
    const subTextColor = isDark ? '#9CA3AF' : '#666';
    const tagBg = isDark ? '#374151' : '#FEE2E2';
    const tagBorder = isDark ? '#4B5563' : '#FECACA';

    const statusColors = STATUS_COLORS[room.status];
    const statusText =
      room.status === 'available'
        ? t('pos.status_empty')
        : room.status === 'occupied'
        ? t('pos.status_occupied')
        : room.status === 'booked'
        ? t('pos.status_booked', 'Đã đặt')
        : room.status === 'cleaning'
        ? t('pos.status_cleaning')
        : t('pos.status_maintenance');

    // Calculate time info text
    const getTimeInfoText = () => {
      logger.debug('[RoomCard getTimeInfoText] room:', room.id, 'status:', room.status, 'start_date:', room.start_date, 'end_date:', room.end_date);

      if (!room.start_date || !room.end_date) {
        logger.debug('[RoomCard getTimeInfoText] No contract dates, returning:', room.status === 'available' ? 'Chưa có booking' : '');
        return room.status === 'available' ? 'Chưa có booking' : '';
      }

      const today = new Date().toISOString().split('T')[0];
      const startDate = room.start_date;
      const endDate = room.end_date;

      const daysUntilCheckin = Math.ceil((new Date(startDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilCheckout = Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));

      logger.debug('[RoomCard getTimeInfoText] today:', today, 'daysUntilCheckin:', daysUntilCheckin, 'daysUntilCheckout:', daysUntilCheckout);

      if (room.status === 'occupied') {
        const checkoutDate = new Date(endDate).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
        const result = `Trả phòng ${checkoutDate} · còn ${daysUntilCheckout} ngày`;
        logger.debug('[RoomCard getTimeInfoText] Returning occupied:', result);
        return result;
      } else if (room.status === 'booked') {
        const checkinDate = new Date(startDate).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
        const result = `Nhận phòng ${checkinDate} · còn ${daysUntilCheckin} ngày trống`;
        logger.debug('[RoomCard getTimeInfoText] Returning booked:', result);
        return result;
      } else if (room.status === 'available') {
        if (daysUntilCheckin > 0) {
          const availableUntil = new Date(startDate).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
          const result = `Trống đến ${availableUntil} · ${daysUntilCheckin} ngày`;
          logger.debug('[RoomCard getTimeInfoText] Returning available with future booking:', result);
          return result;
        }
        logger.debug('[RoomCard getTimeInfoText] Returning available no booking');
        return 'Chưa có booking';
      }
      return '';
    };

    const timeInfoText = getTimeInfoText();

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
          <View style={styles.headerRight}>
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
            {onInfoPress && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onInfoPress();
                }}
                style={styles.infoButton}>
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            )}
            {onTimelinePress && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onTimelinePress();
                }}
                style={styles.timelineButton}>
                <Icon name="event-note" size={18} color="#1565C0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.roomStatusRow}>
          <View style={styles.floorBadge}>
            <Text style={styles.floorText}>
              {t('pos.floor')} {room.floor}
            </Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColors.bg}]}>
            <View style={[styles.statusDot, {backgroundColor: statusColors.dot}]} />
            <Text style={[styles.statusText, {color: statusColors.text}]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Hiển thị giá phòng */}
        {room.displayPriceText && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceText, {color: '#1565C0'}]}>
              {room.displayPriceText}
            </Text>
          </View>
        )}

        {/* Hiển thị thông tin thời gian */}
        {timeInfoText && (
          <View style={styles.timeInfoRow}>
            <Text style={styles.timeInfoText}>{timeInfoText}</Text>
          </View>
        )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomStatusLabel: {
    fontSize: 12,
  },
  priceRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeInfoRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  timeInfoText: {
    fontSize: 11,
    color: '#6B7280',
  },
  infoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  timelineButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
});

export default RoomCard;
