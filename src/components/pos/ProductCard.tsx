import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import {Product} from '../../screens/pos/types';
import {useTheme} from '../../hooks/useTheme';

const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

interface ProductCardProps {
  product: Product;
  onAdd: (id: string) => void;
  onDecrease: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  cardWidth: number;
  quantity: number;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({product, onAdd, onDecrease, onSetQuantity, cardWidth, quantity}) => {
    const {isDark} = useTheme();
    const [inputValue, setInputValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const cardBg = isDark ? '#1f2937' : '#fff';
    const textColor = isDark ? '#f9fafb' : '#1a1a1a';
    const borderColor = isDark ? '#374151' : '#bfdbfe';
    const addBtnBg = isDark ? '#374151' : '#eff6ff';
    const qtyBg = isDark ? '#111827' : '#f8fafc';
    const qtyBorder = isDark ? '#4b5563' : '#dbeafe';
    const inputColor = isDark ? '#f9fafb' : '#1e3a8a';

    const handleQtyPress = () => {
      setInputValue(String(quantity));
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleQtyBlur = () => {
      setIsEditing(false);
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        onSetQuantity(product.id, parsed);
      }
      setInputValue('');
    };

    return (
      <View style={[styles.card, {width: cardWidth, backgroundColor: cardBg}]}>
        <View style={styles.imageContainer}>
          <Image
            source={{uri: product.image}}
            style={styles.image}
            resizeMode="cover"
          />
          {quantity > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{quantity}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
            {product.name}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>

            {quantity === 0 ? (
              <TouchableOpacity
                onPress={() => onAdd(product.id)}
                style={[
                  styles.addBtn,
                  {backgroundColor: addBtnBg, borderColor},
                ]}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.qtyControl,
                  {backgroundColor: qtyBg, borderColor: qtyBorder},
                ]}>
                <TouchableOpacity
                  onPress={() => onDecrease(product.id)}
                  style={styles.qtyBtn}
                  hitSlop={{top: 6, bottom: 6, left: 4, right: 4}}>
                  <Text style={styles.qtyBtnMinus}>−</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleQtyPress} activeOpacity={0.7}>
                  {isEditing ? (
                    <TextInput
                      ref={inputRef}
                      style={[styles.qtyInput, {color: inputColor}]}
                      value={inputValue}
                      onChangeText={setInputValue}
                      onBlur={handleQtyBlur}
                      keyboardType="number-pad"
                      maxLength={4}
                      selectTextOnFocus
                    />
                  ) : (
                    <View style={styles.qtyDisplay}>
                      <Text style={[styles.qtyText, {color: inputColor}]}>
                        {quantity}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onAdd(product.id)}
                  style={styles.qtyBtn}
                  hitSlop={{top: 6, bottom: 6, left: 4, right: 4}}>
                  <Text style={styles.qtyBtnPlus}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    elevation: 3,
  },
  imageContainer: {position: 'relative'},
  image: {width: '100%', height: 130},
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    elevation: 4,
  },
  badgeText: {color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14},
  content: {padding: 10},
  title: {fontSize: 14, fontWeight: '600', marginBottom: 6},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
    flexShrink: 1,
    marginRight: 4,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addBtnText: {fontSize: 20, color: '#3b82f6'},
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    height: 30,
  },
  qtyBtn: {
    width: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnMinus: {fontSize: 18, color: '#ef4444', lineHeight: 22},
  qtyBtnPlus: {fontSize: 18, color: '#3b82f6', lineHeight: 22},
  qtyDisplay: {
    minWidth: 26,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  qtyText: {fontSize: 13, fontWeight: '700', textAlign: 'center'},
  qtyInput: {
    minWidth: 26,
    height: 30,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    paddingHorizontal: 2,
  },
});

export default ProductCard;
