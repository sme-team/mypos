/**
 * @file: RoomDetailBottomSheet.tsx
 * @description: Bottom sheet hiển thị chi tiết phòng với timeline 30 ngày dạng calendar và danh sách booking
 * Style hiện đại, tối giản, cao cấp
 */

import {createModuleLogger, AppModules} from '../../../logger';
const logger = createModuleLogger(AppModules.ROOM_DETAIL_BOTTOM_SHEET);

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../hooks/useTheme';
import { Room } from '../../../screens/pos/types';
import { RoomQueryService } from '../../../services/ResidentServices/RoomQueryService';
import { RoomActionService } from '../../../services/ResidentServices/RoomActionService';

interface RoomDetailBottomSheetProps {
  visible: boolean;
  room: Room | null;
  onClose: () => void;
}

interface Booking {
  id: string;
  customerName: string;
  startDate: string;
  endDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'occupied' | 'booked';
}

interface DayInfo {
  date: string;
  day: number;
  month: number;
  weekday: string;
}

export default function RoomDetailBottomSheet({
  visible,
  room,
  onClose,
}: RoomDetailBottomSheetProps) {
  logger.debug('[RoomDetailBottomSheet] Render - visible:', visible, 'room:', room);
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [days, setDays] = useState<DayInfo[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEarlyCheckInDetails, setShowEarlyCheckInDetails] = useState(false);
  const [surchargeMode, setSurchargeMode] = useState<'percentage' | 'price'>('percentage');
  const [surchargeValue, setSurchargeValue] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    logger.debug('[RoomDetailBottomSheet] useEffect - room:', room, 'visible:', visible);
    if (room && visible) {
      fetchRoomContracts(room.id);
      generateDays();
    }
  }, [room, visible]);

  const generateDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayInfos: DayInfo[] = [];
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      dayInfos.push({
        date: currentDate.toISOString().split('T')[0],
        day: currentDate.getDate(),
        month: currentDate.getMonth() + 1,
        weekday: weekdays[currentDate.getDay()],
      });
    }

    setDays(dayInfos);
  };

  const fetchRoomContracts = async (variantId: string) => {
    setLoading(true);
    try {
      const contracts = await RoomQueryService.getRoomContracts(variantId);
      setBookings(contracts);
    } catch (error) {
      logger.error('[RoomDetailBottomSheet] Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc chắn muốn hủy đặt phòng này không? Hành động này không thể hoàn tác.',
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Hủy đặt phòng',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await RoomActionService.cancelContract(bookingId);
              if (room) {
                await fetchRoomContracts(room.id);
              }
              setSelectedBooking(null);
              Alert.alert('Thành công', 'Đã hủy đặt phòng thành công.');
            } catch (error) {
              logger.error('[RoomDetailBottomSheet] Cancel error:', error);
              Alert.alert('Lỗi', 'Không thể hủy đặt phòng. Vui lòng thử lại.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderTimeline = () => {
    if (days.length === 0) {
      return <View style={styles.timelineContainer} />;
    }

    const getBookingsForDay = (dateStr: string) => {
      return bookings.filter(
        booking => dateStr >= booking.startDate && dateStr <= booking.endDate
      );
    };

    const isCheckInDay = (booking: Booking, dateStr: string) => {
      return booking.startDate === dateStr;
    };

    const isCheckOutDay = (booking: Booking, dateStr: string) => {
      return booking.endDate === dateStr;
    };

    const { width } = Dimensions.get('window');
    const cellWidth = (width - 48) / 7; // 7 days per week

    // Group days into weeks
    const weeks: DayInfo[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return (
      <View style={styles.timelineContainer}>
        {/* Date Range Header */}
        <View style={styles.timelineHeader}>
          <Text style={styles.dateRange}>
            {days[0].day}/{days[0].month} - {days[29].day}/{days[29].month}
          </Text>
        </View>

        {/* Weekday Labels */}
        <View style={styles.weekdayHeaderRow}>
          {weekdays.map(day => (
            <View key={day} style={[styles.weekdayHeaderCell, { width: cellWidth }]}>
              <Text style={styles.weekdayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid with Continuous Bars */}
        {weeks.map((week, weekIndex) => {
          const weekStartDate = week[0].date;
          const weekEndDate = week[week.length - 1].date;

          // Find bookings that overlap with this week
          const weekBookings = bookings.filter(booking =>
            booking.startDate <= weekEndDate && booking.endDate >= weekStartDate
          );

          return (
            <View key={weekIndex} style={styles.weekContainer}>
              {/* Background Grid Cells */}
              <View style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  const isToday = day.date === days[0].date;
                  const dayBookings = getBookingsForDay(day.date);

                  return (
                    <TouchableOpacity
                      key={day.date}
                      style={[
                        styles.dayCell,
                        isToday && styles.todayCell,
                        { width: cellWidth },
                      ]}
                      onPress={() => {
                        if (dayBookings.length > 0) {
                          setSelectedBooking(dayBookings[0]);
                        }
                      }}
                      activeOpacity={0.7}>
                      <View style={styles.dayCellHeader}>
                        <Text style={[styles.dayCellDate, isToday && styles.todayText]}>
                          {day.day}
                        </Text>
                        <Text style={[styles.dayCellMonth, isToday && styles.todayText]}>
                          {day.month}
                        </Text>
                        {isToday && <View style={styles.todayIndicator} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Booking Bars Overlay */}
              <View style={styles.barsOverlay} pointerEvents="none">
                {weekBookings.map((booking, bIndex) => {
                  const startInWeek = week.findIndex(d => d.date === booking.startDate);
                  const endInWeek = week.findIndex(d => d.date === booking.endDate);

                  const startIndex = startInWeek !== -1 ? startInWeek : 0;
                  const endIndex = endInWeek !== -1 ? endInWeek : 6;

                  const barWidth = (endIndex - startIndex + 1) * cellWidth - 8;
                  const barLeft = startIndex * cellWidth + 4;

                  // Vertical position offset if multiple bookings overlap (rare for 1 room)
                  const topOffset = 38 + bIndex * 15;

                  const isStart = startInWeek !== -1;
                  const isEnd = endInWeek !== -1;

                  return (
                    <View
                      key={booking.id}
                      style={[
                        styles.bookingBar,
                        {
                          left: barLeft,
                          width: barWidth,
                          top: topOffset,
                          backgroundColor: booking.status === 'occupied' ? '#448AFF' : '#FFB300',
                          borderTopLeftRadius: isStart ? 10 : 0,
                          borderBottomLeftRadius: isStart ? 10 : 0,
                          borderTopRightRadius: isEnd ? 10 : 0,
                          borderBottomRightRadius: isEnd ? 10 : 0,
                        },
                      ]}>
                      {barWidth > 60 && (
                        <Text style={styles.barText} numberOfLines={1}>
                          {booking.customerName}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#BBDEFB' }]} />
            <Text style={styles.legendText}>Đã xác nhận</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFF3E0' }]} />
            <Text style={styles.legendText}>Đang chờ</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBookingList = () => {
    if (bookings.length === 0) {
      return (
        <View style={styles.emptyBooking}>
          <Icon name="event-busy" size={48} color="#9CA3AF" />
          <Text style={styles.emptyBookingText}>Chưa có booking nào</Text>
        </View>
      );
    }

    const sortedBookings = [...bookings].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return (
      <View style={styles.bookingList}>
        {sortedBookings.map((booking, index) => {
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          const nights = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          );

          return (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => setSelectedBooking(booking)}
              activeOpacity={0.7}>
              <View style={styles.bookingCardHeader}>
                <View style={styles.bookingCardInfo}>
                  <Icon
                    name="person"
                    size={20}
                    color={booking.status === 'occupied' ? '#D32F2F' : '#1976D2'}
                  />
                  <Text style={styles.bookingCardCustomer}>{booking.customerName}</Text>
                </View>
                <View
                  style={[
                    styles.bookingCardBadge,
                    {
                      backgroundColor:
                        booking.status === 'occupied' ? '#FFCDD2' : '#BBDEFB',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.bookingCardBadgeText,
                      {
                        color:
                          booking.status === 'occupied' ? '#B71C1C' : '#0D47A1',
                      },
                    ]}>
                    {booking.status === 'occupied' ? 'Đang ở' : 'Đã đặt'}
                  </Text>
                </View>
              </View>
              <View style={styles.bookingCardBody}>
                <View style={styles.bookingCardRow}>
                  <Icon name="calendar-today" size={16} color="#6B7280" />
                  <Text style={styles.bookingCardText}>
                    {startDate.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                    {booking.checkInTime ? ` (${booking.checkInTime})` : ''}
                    {' → '}
                    {endDate.toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                    {booking.checkOutTime ? ` (${booking.checkOutTime})` : ''}
                  </Text>
                </View>
                <View style={styles.bookingCardRow}>
                  <Icon name="nightlight" size={16} color="#6B7280" />
                  <Text style={styles.bookingCardText}>{nights} đêm</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const handleEarlyCheckIn = () => {
    setShowEarlyCheckInDetails(!showEarlyCheckInDetails);
  };

  const calculateEarlyCheckInFee = () => {
    if (!selectedBooking) return null;

    const now = new Date();
    const checkInDateTime = new Date(`${selectedBooking.startDate}T${selectedBooking.checkInTime || '14:00'}`);
    const hoursUntilCheckIn = Math.max(0, (checkInDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

    let surchargeAmount = 0;
    let surchargePercent = 0;

    if (surchargeMode === 'percentage') {
      // Use user input percentage
      const percent = parseFloat(surchargeValue) || 0;
      surchargePercent = percent;
      const roomPrice = room?.monthly_price || 0;
      surchargeAmount = (roomPrice * percent) / 100;
    } else {
      // Use user input price directly
      surchargeAmount = parseFloat(surchargeValue) || 0;
      // Calculate equivalent percentage for display
      const roomPrice = room?.monthly_price || 0;
      surchargePercent = roomPrice > 0 ? (surchargeAmount / roomPrice) * 100 : 0;
    }

    return {
      hoursUntilCheckIn: Math.floor(hoursUntilCheckIn),
      surchargePercent: Math.round(surchargePercent),
      surchargeAmount,
      totalFee: surchargeAmount,
    };
  };

  const handleConfirmEarlyCheckIn = async () => {
    if (!selectedBooking) return;

    try {
      setLoading(true);

      // Calculate fee info
      const feeInfo = calculateEarlyCheckInFee();
      if (!feeInfo) {
        Alert.alert('Lỗi', 'Không thể tính phí phụ thu.');
        return;
      }

      // TODO: Call RoomActionService to update contract status
      // For now, simulate the check-in by updating local state
      const updatedBookings = bookings.map(b =>
        b.id === selectedBooking.id
          ? { ...b, status: 'occupied' as const }
          : b
      );
      setBookings(updatedBookings);

      // Close tooltip and reset state
      setSelectedBooking(null);
      setShowEarlyCheckInDetails(false);
      setSurchargeMode('percentage');
      setSurchargeValue('');

      Alert.alert(
        'Thành công',
        `Đã check-in sớm cho khách ${selectedBooking.customerName}. Phụ thu: ${feeInfo.surchargeAmount.toLocaleString('vi-VN')}đ`
      );

      // Refresh room contracts to get updated data
      if (room) {
        await fetchRoomContracts(room.id);
      }
    } catch (error) {
      logger.error('[RoomDetailBottomSheet] Early check-in error:', error);
      Alert.alert('Lỗi', 'Không thể check-in sớm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const renderBookingTooltip = () => {
    if (!selectedBooking) return null;

    const startDate = new Date(selectedBooking.startDate);
    const endDate = new Date(selectedBooking.endDate);
    const nights = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
      <Modal
        visible={!!selectedBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBooking(null)}>
        <TouchableOpacity
          style={styles.tooltipOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBooking(null)}>
          <View style={styles.tooltip}>
            <View style={styles.tooltipHeader}>
              {showEarlyCheckInDetails && (
                <TouchableOpacity
                  onPress={() => setShowEarlyCheckInDetails(false)}
                  style={styles.tooltipCloseButton}>
                  <Icon name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
              )}
              <Icon
                name="person"
                size={24}
                color={selectedBooking.status === 'occupied' ? '#D32F2F' : '#1976D2'}
              />
              <Text style={styles.tooltipTitle}>{selectedBooking.customerName}</Text>
              <TouchableOpacity
                onPress={() => setSelectedBooking(null)}
                style={styles.tooltipCloseButton}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.tooltipContent}>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>Trạng thái:</Text>
                <View
                  style={[
                    styles.tooltipBadge,
                    {
                      backgroundColor:
                        selectedBooking.status === 'occupied'
                          ? '#FFCDD2'
                          : '#BBDEFB',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.tooltipBadgeText,
                      {
                        color:
                          selectedBooking.status === 'occupied'
                            ? '#B71C1C'
                            : '#0D47A1',
                      },
                    ]}>
                    {selectedBooking.status === 'occupied' ? 'Đang ở' : 'Đã đặt'}
                  </Text>
                </View>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>Check-in:</Text>
                <Text style={styles.tooltipValue}>
                  {startDate.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                  {selectedBooking.checkInTime ? ` ${selectedBooking.checkInTime}` : ''}
                </Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>Check-out:</Text>
                <Text style={styles.tooltipValue}>
                  {endDate.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                  {selectedBooking.checkOutTime ? ` ${selectedBooking.checkOutTime}` : ''}
                </Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>Số đêm:</Text>
                <Text style={styles.tooltipValue}>{nights} đêm</Text>
              </View>
            </View>

            {/* Early Check-in Details */}
            {showEarlyCheckInDetails && selectedBooking.status === 'booked' && (() => {
              const feeInfo = calculateEarlyCheckInFee();
              if (!feeInfo) return null;
              return (
                <View style={styles.earlyCheckInDetails}>
                  <View style={styles.earlyCheckInRow}>
                    <Icon name="schedule" size={16} color="#185FA5" />
                    <Text style={styles.earlyCheckInLabel}>
                      Còn {feeInfo.hoursUntilCheckIn} giờ nữa đến giờ check-in chuẩn
                    </Text>
                  </View>

                  {/* Surcharge Mode Selector */}
                  <View style={styles.surchargeModeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.surchargeModeBtn,
                        surchargeMode === 'percentage' && styles.surchargeModeBtnActive,
                      ]}
                      onPress={() => {
                        setSurchargeMode('percentage');
                        setSurchargeValue('');
                      }}>
                      <Text style={[
                        styles.surchargeModeText,
                        surchargeMode === 'percentage' && styles.surchargeModeTextActive,
                      ]}>
                        Nhập %
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.surchargeModeBtn,
                        surchargeMode === 'price' && styles.surchargeModeBtnActive,
                      ]}
                      onPress={() => {
                        setSurchargeMode('price');
                        setSurchargeValue('');
                      }}>
                      <Text style={[
                        styles.surchargeModeText,
                        surchargeMode === 'price' && styles.surchargeModeTextActive,
                      ]}>
                        Nhập giá
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Surcharge Input */}
                  <View style={styles.surchargeInputContainer}>
                    <Text style={styles.surchargeInputLabel}>
                      {surchargeMode === 'percentage' ? 'Phụ thu (% giá phòng):' : 'Phụ thu (số tiền):'}
                    </Text>
                    <View style={styles.surchargeInputRow}>
                      <TextInput
                        style={styles.surchargeInput}
                        value={surchargeValue}
                        onChangeText={setSurchargeValue}
                        keyboardType="numeric"
                        placeholder={surchargeMode === 'percentage' ? 'Nhập %' : 'Nhập số tiền'}
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.surchargeInputSuffix}>
                        {surchargeMode === 'percentage' ? '%' : 'đ'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.earlyCheckInRow, styles.earlyCheckInTotalRow]}>
                    <Text style={styles.earlyCheckInTotalLabel}>Tổng phí phụ thu:</Text>
                    <Text style={styles.earlyCheckInTotalValue}>
                      {feeInfo.surchargeAmount.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                  <View style={styles.earlyCheckInActions}>
                    <TouchableOpacity
                      style={[styles.tooltipBtn, styles.tooltipPrimaryBtn]}
                      onPress={() => handleConfirmEarlyCheckIn()}>
                      <Text style={[styles.tooltipPrimaryBtnText, { color: '#FFFFFF', fontSize: 16 }]}>Xác nhận</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {selectedBooking.status === 'booked' && !showEarlyCheckInDetails && (
              <View style={styles.tooltipFooter}>
                <TouchableOpacity
                  style={[styles.tooltipBtn, styles.tooltipPrimaryBtn]}
                  onPress={() => handleEarlyCheckIn()}>
                  <Text style={styles.tooltipPrimaryBtnText}>Check-in sớm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tooltipBtn, styles.tooltipCancelBtn]}
                  onPress={() => handleCancelBooking(selectedBooking.id)}>
                  <Text style={styles.tooltipCancelBtnText}>Huỷ đặt phòng</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (!room) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}>
          <View style={styles.bottomSheet}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={e => e.stopPropagation()}
              style={{ flexShrink: 1, height: '100%' }}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.roomInfoContainer}>
                    <Text style={styles.roomName}>{room.label}</Text>
                    <Text style={styles.roomMeta}>
                      Tầng {room.floor} · {room.product_name}
                    </Text>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
                {room.displayPriceText && (
                  <Text style={styles.roomPrice}>{room.displayPriceText}</Text>
                )}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        room.status === 'occupied'
                          ? '#FFCDD2'
                          : room.status === 'booked'
                            ? '#BBDEFB'
                            : '#D4EAC8',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          room.status === 'occupied'
                            ? '#B71C1C'
                            : room.status === 'booked'
                              ? '#0D47A1'
                              : '#1B5E20',
                      },
                    ]}>
                    {room.status === 'occupied'
                      ? 'Đang ở'
                      : room.status === 'booked'
                        ? 'Đã đặt'
                        : 'Trống'}
                  </Text>
                </View>
              </View>

              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#185FA5" />
                    <Text style={styles.loadingText}>Đang tải thông tin booking...</Text>
                  </View>
                ) : (
                  <>
                    {/* Timeline */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Timeline 30 ngày</Text>
                      {renderTimeline()}
                    </View>

                    {/* Booking List */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Danh sách booking</Text>
                      {renderBookingList()}
                    </View>
                  </>
                )}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {renderBookingTooltip()}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roomInfoContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
  },
  roomName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  roomMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  roomPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  // Timeline styles
  timelineContainer: {
    marginBottom: 24,
  },
  timelineHeader: {
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: '#6B7280',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayHeaderCell: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  weekContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  weekRow: {
    flexDirection: 'row',
  },
  barsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dayCell: {
    backgroundColor: '#fff',
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#F3F4F6',
    aspectRatio: 0.85,
  },
  todayCell: {
    backgroundColor: '#EEF2FF',
  },
  dayCellHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dayCellDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  dayCellMonth: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: -2,
  },
  todayText: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4F46E5',
    marginTop: 4,
  },
  bookingBar: {
    position: 'absolute',
    height: 18,
    justifyContent: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  barText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  // Booking card styles
  bookingList: {
    marginTop: 8,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bookingCardCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  bookingCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bookingCardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingCardBody: {
    gap: 8,
  },
  bookingCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingCardText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cancelBookingBtn: {
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginLeft: 12,
  },
  emptyBooking: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyBookingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Tooltip styles
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
  },
  tooltipCloseButton: {
    padding: 4,
  },
  tooltipContent: {
    gap: 12,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  tooltipBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tooltipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tooltipFooter: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  tooltipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tooltipPrimaryBtn: {
    backgroundColor: '#185FA5',
  },
  tooltipPrimaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tooltipCloseBtn: {
    backgroundColor: '#185FA5',
  },
  tooltipCancelBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  tooltipCancelBtnText: {
    color: '#D32F2F',
    fontSize: 15,
    fontWeight: '600',
  },
  tooltipCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  earlyCheckInDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  earlyCheckInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earlyCheckInLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  earlyCheckInTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    justifyContent: 'space-between',
  },
  earlyCheckInTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  earlyCheckInTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#185FA5',
  },
  earlyCheckInActions: {
    marginTop: 16,
  },
  surchargeModeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  surchargeModeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  surchargeModeBtnActive: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  surchargeModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  surchargeModeTextActive: {
    color: '#fff',
  },
  surchargeInputContainer: {
    marginBottom: 12,
  },
  surchargeInputLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  surchargeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  surchargeInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
  },
  surchargeInputSuffix: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
