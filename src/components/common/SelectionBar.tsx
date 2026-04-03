import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';

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
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        elevation: 10,
      }}>
      <TouchableOpacity
        style={{
          paddingVertical: 16,
          borderRadius: 16,
          alignItems: 'center',
          backgroundColor: totalSelected > 0 ? '#ef4444' : '#f3f4f6',
        }}
        disabled={totalSelected === 0}
        onPress={onDelete}>
        <Text
          style={{
            color: totalSelected > 0 ? '#fff' : '#9ca3af',
            fontSize: 16,
            fontWeight: '700',
          }}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
