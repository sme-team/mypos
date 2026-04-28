/**
 * @file: RoomDetailBottomSheet.tsx
 * @description: Bottom sheet hiển thị chi tiết phòng với timeline 30 ngày dạng calendar và danh sách booking
 * Style hiện đại, tối giản, cao cấp
 */

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
import i18n from '../../../i18n';
import { useTranslation } from 'react-i18next';
import { Room } from '../../../screens/pos/types';
import { RoomQueryService } from '../../../services/ResidentServices/RoomQueryService';
import { RoomActionService } from '../../../services/ResidentServices/RoomActionService';
import { EarlyCheckInService } from '../../../services/ResidentServices/EarlyCheckInService';

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
   console.log('[RoomDetailBottomSheet] Render - visible:', visible, 'room:', room);
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const currentLocale = i18n.language === 'vi' ? 'vi-VN' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [days, setDays] = useState<DayInfo[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEarlyCheckInDetails, setShowEarlyCheckInDetails] = useState(false);
  const [surchargeMode, setSurchargeMode] = useState<'percentage' | 'fixed'>('percentage');
  const [surchargeValue, setSurchargeValue] = useState('');
  const [basePriceType, setBasePriceType] = useState<'day' | 'hour'>('day');
  const [basePrice, setBasePrice] = useState(0);
  const [overrideReason, setOverrideReason] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log('[RoomDetailBottomSheet] useEffect - room:', room, 'visible:', visible);
    if (room && visible) {
      fetchRoomContracts(room.id);
      generateDays();
    }
  }, [room, visible]);

  const generateDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayInfos: DayInfo[] = [];
    const weekdays = [
      t('calendar.days.sun'),
      t('calendar.days.mon'),
      t('calendar.days.tue'),
      t('calendar.days.wed'),
      t('calendar.days.thu'),
      t('calendar.days.fri'),
      t('calendar.days.sat'),
    ];

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
      console.error('[RoomDetailBottomSheet] Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      t('booking.cancel_confirm'),
      t('booking.cancel_confirm_msg'),
      [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('booking.btn_cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await RoomActionService.cancelContract(bookingId);
              if (room) {
                await fetchRoomContracts(room.id);
              }
              setSelectedBooking(null);
              Alert.alert(t('common.success'), t('booking.cancel_success'));
            } catch (error) {
              console.error('[RoomDetailBottomSheet] Cancel error:', error);
              Alert.alert(t('common.error'), t('booking.cancel_error'));
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

    const weekdays = [
      t('calendar.days.sun'),
      t('calendar.days.mon'),
      t('calendar.days.tue'),
      t('calendar.days.wed'),
      t('calendar.days.thu'),
      t('calendar.days.fri'),
      t('calendar.days.sat'),
    ];

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
                          setShowEarlyCheckInDetails(false);
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
            <Text style={styles.legendText}>{t('booking.status.confirmed')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFF3E0' }]} />
            <Text style={styles.legendText}>{t('booking.status.pending')}</Text>
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
          <Text style={styles.emptyBookingText}>{t('booking.no_booking')}</Text>
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
              onPress={() => {
                setSelectedBooking(booking);
                setShowEarlyCheckInDetails(false);
              }}
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
                    {booking.status === 'occupied' ? t('booking.status.staying') : t('booking.status.booked')}
                  </Text>
                </View>
              </View>
              <View style={styles.bookingCardBody}>
                <View style={styles.bookingCardRow}>
                  <Icon name="calendar-today" size={16} color="#6B7280" />
                  <Text style={styles.bookingCardText}>
                    {startDate.toLocaleDateString(currentLocale, {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                    {booking.checkInTime ? ` (${booking.checkInTime})` : ''}
                    {' → '}
                    {endDate.toLocaleDateString(currentLocale, {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                    {booking.checkOutTime ? ` (${booking.checkOutTime})` : ''}
                  </Text>
                </View>
                <View style={styles.bookingCardRow}>
                  <Icon name="nightlight" size={16} color="#6B7280" />
                  <Text style={styles.bookingCardText}>{nights} {t('common.nights')}</Text>
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
    if (!selectedBooking) {return null;}

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    const actualCheckinDateTime = now.toISOString();

    // Tạo scheduled datetime từ startDate + checkInTime
    const scheduledDate = selectedBooking.startDate || now.toISOString().split('T')[0];
    const scheduledTime = selectedBooking.checkInTime || '14:00';
    const scheduledCheckinDateTime = `${scheduledDate}T${scheduledTime}:00`;

    // Tính số giờ sớm
    const hoursEarly = EarlyCheckInService.calculateHoursEarly(
      actualCheckinDateTime,
      scheduledCheckinDateTime,
    );

    if (hoursEarly <= 0) {
      return null;
    }

    // Sử dụng giá cơ sở (mặc định giá ngày từ room)
    const priceToUse = basePrice > 0 ? basePrice : (room?.monthly_price || 0);

    // Tính phụ thu bằng service
    const calculation = EarlyCheckInService.calculateSurcharge(
      surchargeMode,
      surchargeValue,
      priceToUse,
      basePriceType,
      hoursEarly,
    );

    return {
      hoursEarly,
      surchargePercent: calculation.equivalentPercentage,
      surchargeAmount: calculation.surchargeAmount,
      baseAmount: calculation.baseAmount,
      description: calculation.description,
      actualCheckinDateTime,
      scheduledCheckinDateTime,
    };
  };

  const handleConfirmEarlyCheckIn = async () => {
    if (!selectedBooking) {return;}

    try {
      setLoading(true);

      // Calculate fee info
      const feeInfo = calculateEarlyCheckInFee();
      if (!feeInfo) {
        Alert.alert(t('common.error'), t('booking.early_checkin_fee_error'));
        return;
      }

      // Validate input
      if (!surchargeValue || parseFloat(surchargeValue) <= 0) {
        Alert.alert(t('common.error'), t('booking.early_checkin_value_required'));
        return;
      }

      // Get storeId (use default since Room interface doesn't have store_id)
      const storeId = 'store-001';

      // Call EarlyCheckInService to process
      const result = await EarlyCheckInService.processEarlyCheckIn({
        storeId,
        contractId: selectedBooking.id,
        variantId: room?.id || '',
        actualCheckinDateTime: feeInfo.actualCheckinDateTime,
        scheduledCheckinDateTime: feeInfo.scheduledCheckinDateTime,
        surchargeMode,
        surchargeValue,
        basePriceType,
        basePrice: basePrice > 0 ? basePrice : (room?.monthly_price || 0),
        overrideReason: overrideReason || undefined,
      });

      // Close tooltip and reset state
      setSelectedBooking(null);
      setShowEarlyCheckInDetails(false);
      setSurchargeMode('percentage');
      setSurchargeValue('');
      setOverrideReason('');
      setBasePrice(0);

      Alert.alert(
        t('common.success'),
        t('booking.early_checkin_success', {
          customerName: selectedBooking.customerName,
          amount: result.surchargeAmount.toLocaleString(currentLocale),
          hours: result.hoursEarly,
        })
      );

      // Refresh room contracts to get updated data
      if (room) {
        await fetchRoomContracts(room.id);
      }
    } catch (error) {
      console.error('[RoomDetailBottomSheet] Early check-in error:', error);
      Alert.alert(t('common.error'), String(error));
    } finally {
      setLoading(false);
    }
  };

  const renderBookingTooltip = () => {
    if (!selectedBooking) {return null;}

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
                <Text style={styles.tooltipLabel}>{t('common.status')}:</Text>
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
                    {selectedBooking.status === 'occupied' ? t('booking.status.staying') : t('booking.status.booked')}
                  </Text>
                </View>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>{t('booking.checkin_label')}:</Text>
                <Text style={styles.tooltipValue}>
                  {startDate.toLocaleDateString(currentLocale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                  {selectedBooking.checkInTime ? ` ${selectedBooking.checkInTime}` : ''}
                </Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>{t('booking.checkout_label')}:</Text>
                <Text style={styles.tooltipValue}>
                  {endDate.toLocaleDateString(currentLocale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                  {selectedBooking.checkOutTime ? ` ${selectedBooking.checkOutTime}` : ''}
                </Text>
              </View>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipLabel}>{t('booking.nights_label')}:</Text>
                <Text style={styles.tooltipValue}>{nights} {t('common.nights')}</Text>
              </View>
            </View>

            {/* Early Check-in Details */}
            {(() => {
              if (!showEarlyCheckInDetails || selectedBooking.status !== 'booked') return null;
              const feeInfo = calculateEarlyCheckInFee();
              if (!feeInfo) return null;
              return (
                <View style={styles.earlyCheckInDetails}>
                  <View style={styles.earlyCheckInRow}>
                    <Icon name="schedule" size={16} color="#185FA5" />
                    <Text style={styles.earlyCheckInLabel}>
                      {t('booking.early_checkin_hours', { hours: feeInfo.hoursEarly })}
                    </Text>
                  </View>
                  <View style={styles.earlyCheckInRow}>
                    <Text style={styles.earlyCheckInSubLabel}>
                      {new Date(feeInfo.actualCheckinDateTime).toLocaleString(currentLocale, {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})} → {new Date(feeInfo.scheduledCheckinDateTime).toLocaleString(currentLocale, {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                    </Text>
                  </View>
                  <View style={styles.earlyCheckInRow}>
                    <Icon name="info" size={16} color="#6B7280" />
                    <Text style={styles.earlyCheckInSubLabel}>
                      {t('booking.equivalent_price')}: {feeInfo.baseAmount.toLocaleString(currentLocale)}{t('pos.currency_symbol')}
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
                        {t('common.input_percent')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.surchargeModeBtn,
                        surchargeMode === 'fixed' && styles.surchargeModeBtnActive,
                      ]}
                      onPress={() => {
                        setSurchargeMode('fixed');
                        setSurchargeValue('');
                      }}>
                      <Text style={[
                        styles.surchargeModeText,
                        surchargeMode === 'fixed' && styles.surchargeModeTextActive,
                      ]}>
                        {t('common.input_price')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Surcharge Input */}
                  <View style={styles.surchargeInputContainer}>
                    <Text style={styles.surchargeInputLabel}>
                      {surchargeMode === 'percentage' ? t('booking.surcharge_percent_label') : t('booking.surcharge_fixed_label')}
                    </Text>
                    <View style={styles.surchargeInputRow}>
                      <TextInput
                        style={styles.surchargeInput}
                        value={surchargeValue}
                        onChangeText={setSurchargeValue}
                        keyboardType="numeric"
                        placeholder={surchargeMode === 'percentage' ? t('booking.surcharge_percent_placeholder') : t('booking.surcharge_fixed_placeholder')}
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.surchargeInputSuffix}>
                        {surchargeMode === 'percentage' ? '%' : t('pos.currency_symbol')}
                      </Text>
                    </View>
                    {surchargeMode === 'fixed' && (
                      <Text style={styles.surchargeInfoText}>
                        {t('booking.equivalent')}: {feeInfo.surchargePercent}% {t('booking.daily_price')}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.earlyCheckInRow, styles.earlyCheckInTotalRow]}>
                    <Text style={styles.earlyCheckInTotalLabel}>{t('booking.total_surcharge')}:</Text>
                    <Text style={styles.earlyCheckInTotalValue}>
                      {feeInfo.surchargeAmount.toLocaleString(currentLocale)}{t('pos.currency_symbol')}
                    </Text>
                  </View>
                  <View style={styles.earlyCheckInActions}>
                    <TouchableOpacity
                      style={[styles.tooltipBtn, styles.tooltipPrimaryBtn]}
                      onPress={() => handleConfirmEarlyCheckIn()}>
                      <Text style={[styles.tooltipPrimaryBtnText, { color: '#FFFFFF', fontSize: 16 }]}>{t('common.confirm')}</Text>
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
                  <Text style={styles.tooltipPrimaryBtnText}>{t('booking.btn_early_checkin')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tooltipBtn, styles.tooltipCancelBtn]}
                  onPress={() => handleCancelBooking(selectedBooking.id)}>
                  <Text style={styles.tooltipCancelBtnText}>{t('booking.btn_cancel')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (!room) {return null;}

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
                      {t('common.floor')} {room.floor} · {room.product_name}
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
                      ? t('booking.status.staying')
                      : room.status === 'booked'
                        ? t('booking.status.booked')
                        : t('booking.status.empty')}
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
                    <Text style={styles.loadingText}>{t('booking.loading_info')}</Text>
                  </View>
                ) : (
                  <>
                    {/* Timeline */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t('booking.timeline_title')}</Text>
                      {renderTimeline()}
                    </View>

                    {/* Booking List */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t('booking.list_title')}</Text>
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
  earlyCheckInSubLabel: {
    fontSize: 12,
    color: '#9CA3AF',
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
  surchargeInfoText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
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
