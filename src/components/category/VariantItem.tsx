import React from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Variant} from '../../screens/category/types';

interface Props {
  variant: Variant;
  onEdit: () => void;
}

const VariantItem: React.FC<Props> = ({variant, onEdit}) => (
  <View className="flex-row items-center py-3 px-4 bg-white rounded-xl mb-2">
    {/* Ảnh */}
    <View className="w-14 h-14 rounded-lg bg-amber-50 items-center justify-center mr-4 overflow-hidden">
      {variant.imageUri ? (
        <Image
          source={{uri: variant.imageUri}}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <Text className="text-amber-300 text-xs text-center">
          No{'\n'}image
        </Text>
      )}
    </View>

    {/* Tên */}
    <Text className="flex-1 text-base font-semibold text-gray-800">
      {variant.name}
    </Text>

    {/* Giá + đơn vị */}
    <Text className="text-blue-500 font-semibold text-base mr-3">
      {variant.price.toLocaleString('vi-VN')}đ
      <Text className="text-gray-400 font-normal text-sm">
        {' / '}
        {variant.unit}
      </Text>
    </Text>

    {/* Nút edit */}
    <TouchableOpacity
      onPress={onEdit}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
      <Icon name="chevron-right" size={22} color="#9CA3AF" />
    </TouchableOpacity>
  </View>
);

export default VariantItem;
