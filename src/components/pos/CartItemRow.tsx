import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {CartItem, ProductVariant} from '../../screens/pos/types';
import {useTheme} from '../../hooks/useTheme';

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

interface CartItemRowProps {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onSelectVariant: (id: string, variant: ProductVariant) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onIncrease,
  onDecrease,
  onSetQuantity,
  onSelectVariant,
}) => {
  const {isDark} = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [variantModalVisible, setVariantModalVisible] = useState(false);

  const textColor = isDark ? '#f9fafb' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#666';
  const borderColor = isDark ? '#374151' : '#f3f4f6';
  const btnBorder = isDark ? '#4b5563' : '#d1d5db';
  const qtyBg = isDark ? '#111827' : '#f0f9ff';
  const qtyBorder = isDark ? '#374151' : '#bfdbfe';
  const inputColor = isDark ? '#f9fafb' : '#1e3a8a';
  const sheetBg = isDark ? '#1f2937' : '#fff';
  const overlayBg = 'rgba(0,0,0,0.45)';
  const chipActiveBg = '#3b82f6';
  const chipInactiveBg = isDark ? '#374151' : '#f3f4f6';
  const chipActiveBorder = '#3b82f6';
  const chipInactiveBorder = isDark ? '#4b5563' : '#e5e7eb';
  const chipBg = isDark ? '#1e3a5f' : '#eff6ff';
  const chipBorderColor = isDark ? '#3b82f6' : '#bfdbfe';
  const chipTextColor = isDark ? '#93c5fd' : '#1d4ed8';

  // Variants được truyền từ parent — render ngay, không fetch
  const variants: ProductVariant[] = item.variants ?? [];
  const hasVariants = variants.length >= 1;

  const displayPrice = item.selectedVariant
    ? item.selectedVariant.price
    : item.product.price;

  const handleQtyPress = () => {
    setInputValue(String(item.quantity));
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleQtyBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSetQuantity(item.product.id, parsed);
    }
    setInputValue('');
  };

  const handleSelectVariant = useCallback(
    (v: ProductVariant) => {
      onSelectVariant(item.product.id, v);
      setVariantModalVisible(false);
    },
    [item.product.id, onSelectVariant],
  );

  return (
    <>
      <View style={{paddingVertical: 12, borderBottomWidth: 1, borderColor}}>
        <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
          {/* Ảnh */}
          <Image
            source={{uri: item.product.image}}
            style={{width: 56, height: 56, borderRadius: 12, marginRight: 12}}
            resizeMode="cover"
          />

          {/* Tên & đơn giá */}
          <View style={{flex: 1}}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: textColor,
                marginBottom: 2,
              }}>
              {item.product.name}
            </Text>
            <Text style={{fontSize: 12, color: subTextColor, marginBottom: 4}}>
              {formatPrice(displayPrice)}
            </Text>

            {/* Chip chọn biến thể */}
            {hasVariants && (
              <TouchableOpacity
                onPress={() => setVariantModalVisible(true)}
                activeOpacity={0.75}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: chipBg,
                  borderWidth: 1,
                  borderColor: chipBorderColor,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  gap: 4,
                  marginTop: 2,
                }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: chipTextColor,
                  }}>
                  {item.selectedVariant?.name ?? 'Chọn loại'}
                </Text>
                <Text style={{fontSize: 10, color: chipTextColor}}>▼</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tổng tiền & điều khiển số lượng */}
          <View style={{alignItems: 'flex-end', gap: 6}}>
            <Text style={{fontSize: 14, fontWeight: '700', color: textColor}}>
              {formatPrice(displayPrice * item.quantity)}
            </Text>

            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <TouchableOpacity
                onPress={() => onDecrease(item.product.id)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: btnBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{fontSize: 16, color: '#ef4444', lineHeight: 20}}>
                  −
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleQtyPress}
                activeOpacity={0.7}
                style={{
                  minWidth: 36,
                  height: 28,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: qtyBorder,
                  backgroundColor: qtyBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}>
                {isEditing ? (
                  <TextInput
                    ref={inputRef}
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: inputColor,
                      minWidth: 30,
                      textAlign: 'center',
                      padding: 0,
                      height: 24,
                    }}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onBlur={handleQtyBlur}
                    keyboardType="number-pad"
                    maxLength={4}
                    selectTextOnFocus
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: inputColor,
                    }}>
                    {item.quantity}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onIncrease(item.product.id)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: btnBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{fontSize: 16, color: '#3b82f6', lineHeight: 20}}>
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Variant Bottom Sheet */}
      <Modal
        visible={variantModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVariantModalVisible(false)}>
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: overlayBg,
            justifyContent: 'flex-end',
          }}
          onPress={() => setVariantModalVisible(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View
              style={{
                backgroundColor: sheetBg,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 12,
                paddingHorizontal: 16,
                paddingBottom: 32,
                maxHeight: 460,
              }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? '#4b5563' : '#d1d5db',
                  alignSelf: 'center',
                  marginBottom: 14,
                }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: textColor,
                  marginBottom: 4,
                }}>
                {item.product.name}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: '#f97316',
                  fontWeight: '600',
                  marginBottom: 14,
                }}>
                {formatPrice(displayPrice)}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: subTextColor,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}>
                Chọn loại
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 10,
                  paddingBottom: 8,
                }}>
                {variants.map(v => {
                  const isSelected = item.selectedVariant?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => handleSelectVariant(v)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: isSelected
                          ? chipActiveBorder
                          : chipInactiveBorder,
                        backgroundColor: isSelected
                          ? chipActiveBg
                          : chipInactiveBg,
                        minWidth: 52,
                        alignItems: 'center',
                      }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isSelected
                            ? '#fff'
                            : isDark
                            ? '#f9fafb'
                            : '#111827',
                        }}>
                        {v.name}
                      </Text>
                      {v.price > 0 && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: isSelected
                              ? 'rgba(255,255,255,0.85)'
                              : subTextColor,
                            marginTop: 2,
                          }}>
                          {formatPrice(v.price)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default CartItemRow;
