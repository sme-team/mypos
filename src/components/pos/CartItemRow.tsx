/**
 * @file: CartItemRow.tsx
 * @description: Component hiển thị từng dòng sản phẩm trong giỏ hàng (Cart).
 * Cho phép người dùng thay đổi số lượng (Tăng/Giảm) hoặc xem tổng tiền của từng món.
 * @path: src/components/pos/CartItemRow.tsx
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { CartItem } from '../../screens/pos/types'; // Định nghĩa kiểu dữ liệu mục trong giỏ
import { useTheme } from '../../hooks/useTheme';

/**
 * Hàm định dạng tiền tệ VNĐ
 */
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

/**
 * Props cho Component CartItemRow
 */
interface CartItemRowProps {
  item: CartItem;                 // Đối tượng chứa sản phẩm và số lượng tương ứng
  onIncrease: (id: string) => void; // Hàm xử lý khi nhấn nút tăng (+) số lượng
  onDecrease: (id: string) => void; // Hàm xử lý khi nhấn nút giảm (-) số lượng
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onIncrease,
  onDecrease,
}) => {
  // Lấy trạng thái Dark Mode để đồng bộ màu sắc giỏ hàng
  const { isDark } = useTheme();

  const textColor = isDark ? '#f9fafb' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#666';
  const borderColor = isDark ? '#374151' : '#f3f4f6';
  const btnBorder = isDark ? '#4b5563' : '#d1d5db';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: borderColor, // Đường kẻ phân cách giữa các món
      }}>

      {/* --- 1. ẢNH NHỎ (THUMBNAIL) --- */}
      <Image
        source={{ uri: item.product.image }}
        style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }}
        resizeMode="cover"
      />

      {/* --- 2. THÔNG TIN TÊN & ĐƠN GIÁ --- */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: textColor,
            marginBottom: 4,
          }}>
          {item.product.name}
        </Text>
        <Text style={{ fontSize: 12, color: subTextColor }}>
          {formatPrice(item.product.price)} x {item.quantity}
        </Text>
      </View>

      {/* --- 3. TỔNG TIỀN MÓN & BỘ ĐIỀU KHIỂN SỐ LƯỢNG --- */}
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {/* Tổng tiền của món = Đơn giá x Số lượng */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>
          {formatPrice(item.product.price * item.quantity)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Nút giảm số lượng */}
          <TouchableOpacity
            onPress={() => onDecrease(item.product.id)}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: btnBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 16, color: subTextColor, lineHeight: 20 }}>−</Text>
          </TouchableOpacity>

          {/* Hiển thị số lượng hiện tại */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: textColor,
              minWidth: 16,
              textAlign: 'center',
            }}>
            {item.quantity}
          </Text>

          {/* Nút tăng số lượng */}
          <TouchableOpacity
            onPress={() => onIncrease(item.product.id)}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: btnBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 16, color: subTextColor, lineHeight: 20 }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CartItemRow;
