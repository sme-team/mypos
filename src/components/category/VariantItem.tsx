import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Variant} from '../../screens/category/types';

interface Props {
  variant: Variant;
  onEdit: () => void;
}

const VariantItem: React.FC<Props> = ({variant, onEdit}) => (
  <TouchableOpacity
    className="flex-row items-center bg-gray-50 rounded-xl px-3 py-3"
    onPress={onEdit}
    activeOpacity={0.7}>
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
