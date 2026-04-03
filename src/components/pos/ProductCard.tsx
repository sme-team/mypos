/**
 * @file: ProductCard.tsx
 * @description: Component hiển thị thẻ sản phẩm trong màn hình POS (Bán hàng).
 * Hỗ trợ giao diện Sáng/Tối (Dark/Light Mode) và thay đổi nút chức năng theo số lượng.
 * @path: src/components/pos/ProductCard.tsx (Hoặc đường dẫn thực tế của bạn)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
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

const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAdd,
  onDecrease,
  cardWidth,
  quantity,
}) => {
  const { isDark } = useTheme();

  const cardBg = isDark ? '#1f2937' : '#fff';
  const textColor = isDark ? '#f9fafb' : '#1a1a1a';
  const borderColor = isDark ? '#374151' : '#bfdbfe';
  const addBtnBg = isDark ? '#374151' : '#eff6ff';
  const decBtnBg = isDark ? '#450a0a' : '#fee2e2';
  const decBtnBorder = isDark ? '#7f1d1d' : '#fca5a5';

  return (
    <View
      style={[
        styles.card,
        {
          width: cardWidth,
          backgroundColor: cardBg,
        }
      ]}>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: textColor }]}
          numberOfLines={1}>
          {product.name}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>
            {formatPrice(product.price)}
          </Text>

          {quantity === 0 ? (
            <TouchableOpacity
              onPress={() => onAdd(product.id)}
              style={[styles.addBtn, { backgroundColor: addBtnBg, borderColor: borderColor }]}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onDecrease(product.id)}
              style={[styles.decBtn, { backgroundColor: decBtnBg, borderColor: decBtnBorder }]}>
              <Text style={styles.decBtnText}>−</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 130,
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f97316',
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 20,
    color: '#3b82f6',
  },
  decBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  decBtnText: {
    fontSize: 20,
    color: '#ef4444',
  },
});

export default ProductCard;
