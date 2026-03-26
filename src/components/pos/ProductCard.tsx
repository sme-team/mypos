/**
 * @file: ProductCard.tsx
 * @description: Component hiển thị thẻ sản phẩm trong màn hình POS (Bán hàng).
 * Hỗ trợ giao diện Sáng/Tối (Dark/Light Mode) và thay đổi nút chức năng theo số lượng.
 * @path: src/components/pos/ProductCard.tsx (Hoặc đường dẫn thực tế của bạn)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Product } from '../../screens/pos/types';
import { useTheme } from '../../hooks/useTheme';

/**
 * Hàm định dạng tiền tệ sang chuẩn Việt Nam (VNĐ)
 * @param price: Số tiền (number)
 * @returns Chuỗi đã định dạng (e.g., 25.000đ)
 */
const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

/**
 * Props định nghĩa cho Component ProductCard
 */
interface ProductCardProps {
  product: Product;           // Thông tin sản phẩm (id, name, price, image)
  onAdd: (id: string) => void;      // Hàm xử lý khi nhấn nút thêm (+)
  onDecrease: (id: string) => void; // Hàm xử lý khi nhấn nút giảm (-)
  cardWidth: number;          // Chiều rộng động của thẻ (tính toán theo màn hình)
  quantity: number;           // Số lượng hiện tại của sản phẩm trong giỏ hàng
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAdd,
  onDecrease,
  cardWidth,
  quantity,
}) => {
  // Lấy trạng thái giao diện hiện tại
  const { isDark } = useTheme();

  // Thiết lập bảng màu động dựa trên chế độ Dark Mode
  const cardBg = isDark ? '#1f2937' : '#fff';
  const textColor = isDark ? '#f9fafb' : '#1a1a1a';
  const borderColor = isDark ? '#374151' : '#bfdbfe';
  const addBtnBg = isDark ? '#374151' : '#eff6ff';
  const decBtnBg = isDark ? '#450a0a' : '#fee2e2';
  const decBtnBorder = isDark ? '#7f1d1d' : '#fca5a5';

  return (
    <View
      style={{
        width: cardWidth,
        backgroundColor: cardBg,
        borderRadius: 16,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        elevation: 3, // Tạo bóng đổ cho Android
      }}>

      {/* --- PHẦN HÌNH ẢNH SẢN PHẨM --- */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: product.image }}
          style={{ width: '100%', height: 130 }}
          resizeMode="cover"
        />
      </View>

      {/* --- PHẦN THÔNG TIN CHI TIẾT --- */}
      <View style={{ padding: 10 }}>
        {/* Tên sản phẩm - giới hạn 1 dòng */}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: textColor,
            marginBottom: 4,
          }}
          numberOfLines={1}>
          {product.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          {/* Giá sản phẩm */}
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#f97316' }}>
              {formatPrice(product.price)}
            </Text>
          </View>

          {/* --- NÚT TƯƠNG TÁC --- */}
          {/* Nếu chưa có trong giỏ hàng (quantity = 0) -> Hiển thị nút (+) */}
          {quantity === 0 ? (
            <TouchableOpacity
              onPress={() => onAdd(product.id)}
              style={{
                width: 34,
                height: 34,
                backgroundColor: addBtnBg,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: borderColor,
              }}>
              <Text style={{ fontSize: 20, color: '#3b82f6' }}>+</Text>
            </TouchableOpacity>
          ) : (
            /* Nếu đã có trong giỏ hàng -> Hiển thị nút (-) để bớt món */
            <TouchableOpacity
              onPress={() => onDecrease(product.id)}
              style={{
                width: 34,
                height: 34,
                backgroundColor: decBtnBg,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: decBtnBorder,
              }}>
              <Text style={{ fontSize: 20, color: '#ef4444' }}>−</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default ProductCard;
