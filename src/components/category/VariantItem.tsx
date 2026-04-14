import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Variant} from '../../screens/category/types';

interface Props {
  variant: Variant;
  onEdit: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (variantId: string) => void;
}

const Checkbox = ({checked}: {checked: boolean}) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: checked ? '#3b82f6' : '#d1d5db',
      backgroundColor: checked ? '#3b82f6' : '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    }}>
    {checked && <Icon name="check" size={14} color="#fff" />}
  </View>
);

const VariantItem: React.FC<Props> = ({
  variant,
  onEdit,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => (
  <TouchableOpacity
    className="flex-row items-center bg-gray-50 rounded-xl px-3 py-3"
    onPress={() => {
      if (selectionMode) {
        onToggleSelect?.(variant.id);
      } else {
        onEdit();
      }
    }}
    activeOpacity={0.7}
    style={{
      borderWidth: isSelected ? 1.5 : 0,
      borderColor: isSelected ? '#93c5fd' : 'transparent',
      backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
    }}>
    {/* Checkbox khi selection mode */}
    {selectionMode && (
      <TouchableOpacity onPress={() => onToggleSelect?.(variant.id)}>
        <Checkbox checked={isSelected} />
      </TouchableOpacity>
    )}

    {/* Thumbnail */}
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        backgroundColor: '#e8d5b0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
      }}>
      {variant.imageUri ? (
        <Image
          source={{uri: variant.imageUri}}
          style={{width: '100%', height: '100%'}}
          resizeMode="cover"
        />
      ) : (
        <Icon name="receipt-long" size={22} color="#b8975a" />
      )}
    </View>

    {/* Name */}
    <Text
      className="flex-1 text-gray-800"
      style={{fontSize: 14, fontWeight: '500'}}>
      {variant.name}
    </Text>

    {/* Price */}
    <Text style={{color: '#3b82f6', fontSize: 14, fontWeight: '700'}}>
      {variant.price.toLocaleString('vi-VN')}đ
    </Text>
  </TouchableOpacity>
);

export default VariantItem;
