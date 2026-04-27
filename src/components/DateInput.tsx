import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DateInputProps {
  fromDate: Date;
  toDate: Date;
  onFromDateChange: (date: Date) => void;
  onToDateChange: (date: Date) => void;
  isDark?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const MONTHS_VI = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

const formatDate = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay(); // 0 = Sunday

// ─── CalendarModal ─────────────────────────────────────────────────────────────
export interface CalendarModalProps {
  visible: boolean;
  selectedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  title: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  minDate,
  maxDate,
  title,
  onConfirm,
  onCancel,
}) => {
  const {t} = useTranslation();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [tempDate, setTempDate] = useState<Date>(selectedDate);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Reset tempDate when modal opens or selectedDate changes
  useEffect(() => {
    if (visible) {
      setTempDate(selectedDate);
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build cells: leading nulls + days
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({length: daysInMonth}, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) {cells.push(null);}

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (
      minDate &&
      d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    )
      {return true;}
    if (
      maxDate &&
      d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    )
      {return true;}
    return false;
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {setViewMonth(m => m - 1);}
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {setViewMonth(m => m + 1);}
  };

  const currentYear = new Date().getFullYear();
  const yearList = Array.from({length: 30}, (_, i) => currentYear - 10 + i);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 bg-black/40 justify-center items-center px-5"
        onPress={onCancel}>
        <Pressable
          className="bg-white rounded-2xl w-full overflow-hidden"
          onPress={e => e.stopPropagation()}>
          {/* Modal Header */}
          <View className="bg-blue-600 px-4 py-4">
            <Text className="text-white text-xs font-medium opacity-80 mb-0.5">
              {title}
            </Text>
            <Text className="text-white text-xl font-bold">
              {formatDate(tempDate)}
            </Text>
          </View>

          {/* Month Navigation */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <TouchableOpacity
              onPress={prevMonth}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <Icon name="chevron-left" size={20} color="#374151" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowYearPicker(!showYearPicker)}
              className="flex-row items-center gap-1">
              <Text className="text-sm font-semibold text-gray-800">
                {MONTHS_VI[viewMonth]} {viewYear}
              </Text>
              <Icon
                name={showYearPicker ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={20}
                color="#3B82F6"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={nextMonth}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <Icon name="chevron-right" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Year Picker Dropdown */}
          {showYearPicker && (
            <View className="mx-4 mb-2 border border-gray-200 rounded-xl overflow-hidden max-h-36">
              <ScrollView>
                {yearList.map(yr => (
                  <TouchableOpacity
                    key={yr}
                    onPress={() => {
                      setViewYear(yr);
                      setShowYearPicker(false);
                    }}
                    className={`px-4 py-2.5 ${
                      yr === viewYear ? 'bg-blue-50' : 'bg-white'
                    }`}>
                    <Text
                      className={`text-sm text-center ${
                        yr === viewYear
                          ? 'text-blue-600 font-semibold'
                          : 'text-gray-700'
                      }`}>
                      {yr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Days of week header */}
          <View className="flex-row px-2 pb-1">
            {DAYS_OF_WEEK.map(d => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-xs font-semibold text-gray-400">{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="px-2 pb-3">
            {Array.from({length: cells.length / 7}, (_, row) => (
              <View key={row} className="flex-row">
                {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                  const cellKey =
                    day != null ? `day-${day}` : `empty-${row}-${col}`;

                  if (day == null)
                    {return <View key={cellKey} className="flex-1 h-9" />;}

                  const cellDate = new Date(viewYear, viewMonth, day);
                  cellDate.setHours(0, 0, 0, 0);
                  const normalizedTemp = new Date(tempDate);
                  normalizedTemp.setHours(0, 0, 0, 0);

                  const selected = isSameDay(cellDate, tempDate);
                  const disabled = isDisabled(day);
                  const isToday = isSameDay(cellDate, new Date());

                  return (
                    <TouchableOpacity
                      key={cellKey}
                      disabled={disabled}
                      onPress={() => {
                        const picked = new Date(viewYear, viewMonth, day);
                        picked.setHours(0, 0, 0, 0);
                        setTempDate(picked);
                      }}
                      className={`flex-1 h-9 items-center justify-center rounded-full mx-0.5 ${
                        selected
                          ? 'bg-blue-600'
                          : isToday
                          ? 'bg-blue-50'
                          : 'bg-transparent'
                      }`}>
                      <Text
                        className={`text-sm ${
                          disabled
                            ? 'text-gray-300'
                            : selected
                            ? 'text-white font-bold'
                            : isToday
                            ? 'text-blue-600 font-semibold'
                            : 'text-gray-700'
                        }`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Actions */}
          <View className="flex-row border-t border-gray-100">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-4 items-center">
              <Text className="text-sm font-semibold text-gray-500">
                {t('calendar.cancel')}
              </Text>
            </TouchableOpacity>
            <View className="w-px bg-gray-100" />
            <TouchableOpacity
              onPress={() => onConfirm(tempDate)}
              className="flex-1 py-4 items-center">
              <Text className="text-sm font-semibold text-blue-600">
                {t('calendar.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── DateInput ───────────────────────────────────────────────────────────
export const DateInput: React.FC<DateInputProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  isDark = false,
}) => {
  const {t} = useTranslation();
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  // Get today's date at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleFromConfirm = useCallback(
    (date: Date) => {
      setOpenFrom(false);
      onFromDateChange(date);
    },
    [onFromDateChange],
  );

  const handleToConfirm = useCallback(
    (date: Date) => {
      setOpenTo(false);
      onToDateChange(date);
    },
    [onToDateChange],
  );

  return (
    <View className="flex-row gap-3">
      {/* From Date */}
      <View className="flex-1">
        <Text
          className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
          {t('report.filter.fromDate')}
        </Text>
        <TouchableOpacity
          onPress={() => setOpenFrom(true)}
          className={`flex-row items-center border rounded-xl px-3 py-2.5 ${
            isDark
              ? 'border-gray-600 bg-gray-700'
              : 'border-gray-200 bg-gray-50'
          }`}>
          <Icon name="calendar-today" size={18} color="#3B82F6" />
          <Text
            className={`ml-2.5 text-sm flex-1 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
            {formatDate(fromDate)}
          </Text>
          <Icon
            name="keyboard-arrow-down"
            size={18}
            color={isDark ? '#9ca3af' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>

      {/* To Date */}
      <View className="flex-1">
        <Text
          className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
          {t('report.filter.toDate')}
        </Text>
        <TouchableOpacity
          onPress={() => setOpenTo(true)}
          className={`flex-row items-center border rounded-xl px-3 py-2.5 ${
            isDark
              ? 'border-gray-600 bg-gray-700'
              : 'border-gray-200 bg-gray-50'
          }`}>
          <Icon name="calendar-today" size={18} color="#3B82F6" />
          <Text
            className={`ml-2.5 text-sm flex-1 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
            {formatDate(toDate)}
          </Text>
          <Icon
            name="keyboard-arrow-down"
            size={18}
            color={isDark ? '#9ca3af' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>

      {/* Calendar Modals */}
      <CalendarModal
        visible={openFrom}
        selectedDate={fromDate}
        maxDate={toDate > today ? today : toDate}
        title={t('report.filter.selectFromDate')}
        onConfirm={handleFromConfirm}
        onCancel={() => setOpenFrom(false)}
      />
      <CalendarModal
        visible={openTo}
        selectedDate={toDate}
        minDate={fromDate}
        maxDate={today}
        title={t('report.filter.selectToDate')}
        onConfirm={handleToConfirm}
        onCancel={() => setOpenTo(false)}
      />
    </View>
  );
};
