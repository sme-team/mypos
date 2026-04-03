import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VariantItem from './VariantItem';
import type {CategoryItem as CategoryItemType} from '../../screens/category/types';

interface Props {
  item: CategoryItemType & {isExpanded: boolean};
  selectionMode: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onEdit: (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => void;
  onEditProduct: (itemId: string) => void;
  onAddVariant: (id: string) => void;
  onToggleSelect: (itemId: string) => void;
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

const CategoryItem: React.FC<Props> = ({
  item,
  selectionMode,
  isSelected,
  onToggle,
  onEdit,
  onEditProduct,
  onAddVariant,
  onToggleSelect,
}) => (
  <View
    className="bg-white rounded-2xl mb-2 overflow-hidden"
    style={{
      borderWidth: isSelected ? 1.5 : 0,
      borderColor: isSelected ? '#93c5fd' : 'transparent',
      backgroundColor: isSelected ? '#eff6ff' : '#fff',
    }}>
    {/* Header row */}
    <TouchableOpacity
      className="flex-row items-center px-4 py-4"
      onPress={() => {
        if (selectionMode) {
          onToggleSelect(item.id);
        } else {
          onToggle(item.id);
        }
      }}
      activeOpacity={0.7}>
      {selectionMode ? (
        <Checkbox checked={isSelected} />
      ) : (
        <Icon
          name={item.isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
          color="#9ca3af"
          style={{marginRight: 8}}
        />
      )}

      <Text
        className="flex-1 text-gray-800"
        style={{fontSize: 15, fontWeight: '700'}}>
        {item.name}
      </Text>

      {/* Icon edit → mở modal Chỉnh sửa sản phẩm */}
      {!selectionMode && (
        <TouchableOpacity
          onPress={() => onEditProduct(item.id)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="edit" size={20} color="#c4c9d4" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>

    {/* Expanded: variants + add button — chỉ hiện khi không ở selection mode */}
    {!selectionMode && item.isExpanded && (
      <View className="px-3 pb-3" style={{gap: 8}}>
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

        <TouchableOpacity
          onPress={() => onAddVariant(item.id)}
          activeOpacity={0.7}
          style={{
            borderWidth: 1.5,
            borderColor: '#3b82f6',
            borderStyle: 'dashed',
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: 'center',
            marginTop: 2,
          }}>
          <Text style={{color: '#3b82f6', fontSize: 14, fontWeight: '600'}}>
            + Thêm biến thể
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

export default CategoryItem;
