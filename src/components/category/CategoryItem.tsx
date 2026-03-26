import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import VariantItem from './VariantItem';
import type {CategoryItem as CategoryItemType} from '../../screens/category/types';

interface Props {
  item: CategoryItemType & {isExpanded: boolean};
  onToggle: (id: string) => void;
  onEdit: (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => void;
  onAddVariant: (id: string) => void;
}

const CategoryItem: React.FC<Props> = ({
  item,
  onToggle,
  onEdit,
  onAddVariant,
}) => {
  const {t} = useTranslation();

  return (
    <View className="bg-gray-50 rounded-2xl mb-3 overflow-hidden">
      {/* Header: tên + expand */}
      <TouchableOpacity
        className="flex-row items-center px-4 py-4"
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}>
        <Text className="flex-1 text-base text-gray-800">{item.name}</Text>

        <View className="w-9 h-9 rounded-lg items-center justify-center">
          <Icon
            name={item.isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={22}
            color="#6e6c6c"
          />
        </View>
      </TouchableOpacity>

      {/* Expanded: biến thể */}
      {item.isExpanded && (
        <View className="px-3 pb-3">
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-xs font-bold text-gray-400 tracking-widest">
              {t('category.variants')}
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1"
              onPress={() => onAddVariant(item.id)}>
              <Icon name="add" size={16} color="#3B82F6" />
              <Text className="text-blue-500 text-sm font-medium">
                {t('category.addVariant')}
              </Text>
            </TouchableOpacity>
          </View>

          {item.variants.map(variant => (
            <VariantItem
              key={variant.id}
              variant={variant}
              onEdit={() =>
                onEdit(
                  item.id,
                  variant.id,
                  variant.name,
                  variant.price,
                  variant.unit,
                )
              }
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default CategoryItem;
