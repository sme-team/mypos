import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CategoryItem from './CategoryItem';
import type {CategoryGroup} from '../../screens/category/types';

type GroupWithExpand = Omit<CategoryGroup, 'items'> & {
  items: (CategoryGroup['items'][0] & {isExpanded: boolean})[];
};

interface Props {
  group: GroupWithExpand;
  onDeleteGroup: (id: string) => void;
  onEditGroup: (id: string) => void;
  onAddItem: (groupId: string) => void;
  onToggleItem: (itemId: string) => void;
  onEditItem: (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => void;
  onAddVariant: (itemId: string) => void;
}

const CategorySection: React.FC<Props> = ({
  group,
  onDeleteGroup,
  onEditGroup,
  onAddItem,
  onToggleItem,
  onEditItem,
  onAddVariant,
}) => (
  <View className="mb-4">
    {/* Group header */}
    <View className="flex-row items-center justify-between mb-2 px-1">
      <Text className="text-xs font-bold text-gray-400 tracking-widest">
        {group.label}
      </Text>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          className="w-8 h-8 rounded-lg items-center justify-center mr-2"
          onPress={() => onDeleteGroup(group.id)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="delete" size={22} color="#EF4444" />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-8 h-8 rounded-lg items-center justify-center mr-2"
          onPress={() => onEditGroup(group.id)}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Icon name="edit" size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-8 h-8 rounded-lg bg-blue-500 items-center justify-center"
          onPress={() => onAddItem(group.id)}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>

    {/* Items */}
    {group.items.map(item => (
      <CategoryItem
        key={item.id}
        item={item}
        onToggle={onToggleItem}
        onEdit={onEditItem}
        onAddVariant={onAddVariant}
      />
    ))}
  </View>
);

export default CategorySection;
