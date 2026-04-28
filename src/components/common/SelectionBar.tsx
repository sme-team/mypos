import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useTheme} from '../../hooks/useTheme';

interface SelectionBarProps {
  totalSelected: number;
  onDelete: () => void;
  labelSelected?: (count: number) => string;
  labelEmpty?: string;
}

export function SelectionBar({
  totalSelected,
  onDelete,
  labelSelected,
  labelEmpty = 'Chưa chọn mục nào',
}: SelectionBarProps) {
  const {isDark} = useTheme();
  const label =
    totalSelected > 0
      ? labelSelected
        ? labelSelected(totalSelected)
        : `Xóa ${totalSelected} mục đã chọn`
      : labelEmpty;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: isDark ? '#1f2937' : 'white',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: isDark ? '#374151' : '#e5e7eb',
        elevation: 10,
      }}>
      <TouchableOpacity
        style={{
          paddingVertical: 16,
          borderRadius: 16,
          alignItems: 'center',
          backgroundColor: totalSelected > 0 ? '#ef4444' : (isDark ? '#374151' : '#f3f4f6'),
        }}
        disabled={totalSelected === 0}
        onPress={onDelete}>
        <Text
          style={{
            color: totalSelected > 0 ? '#fff' : (isDark ? '#94a3b8' : '#9ca3af'),
            fontSize: 16,
            fontWeight: '700',
          }}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
