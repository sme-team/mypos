/**
 * @file: ResponsivePanel.tsx
 * @description: Component bảng điều khiển thông minh.
 * Tự động chuyển đổi giữa dạng Modal (trên Mobile) và Side Panel (trên Tablet).
 * @path: src/components/common/ResponsivePanel.tsx
 */

import React from 'react';
import {View, Modal, TouchableOpacity, useWindowDimensions} from 'react-native';
import {useTheme} from '../../hooks/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ResponsivePanel({visible, onClose, children}: Props) {
  // Lấy kích thước màn hình thiết bị thực tế
  const {width, height} = useWindowDimensions();
  const {isDark} = useTheme();

  // Kiểm tra nếu bề ngang >= 768px thì coi là máy tính bảng (Tablet)
  const isTablet = width >= 768;
  const panelBg = isDark ? '#1f2937' : '#fff';
  const borderColor = isDark ? '#374151' : '#eee';

  // --- TRƯỜNG HỢP 1: TABLET (Máy tính bảng) ---
  // Hiển thị dạng bảng ở cạnh bên (Side Panel) chiếm 35% màn hình
  if (isTablet && visible) {
    return (
      <View
        style={{
          width: width * 0.35,
          backgroundColor: panelBg,
          borderLeftWidth: 1,
          borderColor: borderColor,
        }}>
        {children}
      </View>
    );
  }

  // --- TRƯỜNG HỢP 2: MOBILE (Điện thoại) ---
  // Hiển thị dạng Modal tràn màn hình với lớp nền mờ
  return (
    <Modal transparent visible={visible} animationType="slide">
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          backgroundColor: 'rgba(0,0,0,0.3)', // Nền tối mờ phía sau
        }}>
        {/* Vùng nhấn phía ngoài để đóng Modal */}
        <TouchableOpacity style={{flex: 1}} onPress={onClose} />

        {/* Nội dung bảng chiếm 85% chiều ngang màn hình điện thoại */}
        <View
          style={{
            width: width * 0.85,
            height: height,
            backgroundColor: panelBg,
          }}>
          {children}
        </View>
      </View>
    </Modal>
  );
}
