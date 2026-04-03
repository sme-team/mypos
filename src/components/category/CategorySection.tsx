import React, {useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CategoryItem from './CategoryItem';
import type {CategoryGroup} from '../../screens/category/types';

type GroupWithExpand = Omit<CategoryGroup, 'items'> & {
  items: (CategoryGroup['items'][0] & {isExpanded: boolean})[];
};

interface Props {
  group: GroupWithExpand;
  selectionMode: boolean;
  isGroupSelected: boolean;
  selectedItems: Set<string>;
  onDeleteGroup: (id: string) => void;
  onEditGroup: (id: string) => void;
  onToggleItem: (itemId: string) => void;
  onEditItem: (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => void;
  onEditProduct: (itemId: string) => void;
  onAddVariant: (itemId: string) => void;
  onToggleSelectGroup: (groupId: string) => void;
  onToggleSelectItem: (itemId: string) => void;
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

const CategorySection: React.FC<Props> = ({
  group,
  selectionMode,
  isGroupSelected,
  selectedItems,
  onDeleteGroup,
  onEditGroup,
  onToggleItem,
  onEditItem,
  onEditProduct,
  onAddVariant,
  onToggleSelectGroup,
  onToggleSelectItem,
}) => {
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  return (
    <View
      className="mb-4 rounded-2xl"
      style={{
        backgroundColor: isGroupSelected ? '#eff6ff' : '#f1f4f8',
        borderWidth: isGroupSelected ? 1.5 : 0,
        borderColor: isGroupSelected ? '#93c5fd' : 'transparent',
        padding: 14,
      }}>
      {/* Group header */}
      <TouchableOpacity
        className="flex-row items-center justify-between mb-1"
        onPress={() => {
          if (selectionMode) {
            onToggleSelectGroup(group.id);
          } else {
            setIsSectionExpanded(prev => !prev);
          }
        }}
        activeOpacity={0.7}>
        <View className="flex-row items-center flex-1">
          {selectionMode && <Checkbox checked={isGroupSelected} />}

          {/* Chevron mở/đóng — chỉ hiện khi không ở selection mode */}
          {!selectionMode && (
            <Icon
              name={
                isSectionExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
              }
              size={20}
              color="#9ca3af"
              style={{marginRight: 6}}
            />
          )}

          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#9ca3af',
              letterSpacing: 1.5,
            }}>
            {group.label.toUpperCase()}
          </Text>
        </View>

        {!selectionMode && (
          <View className="flex-row items-center" style={{gap: 12}}>
            <TouchableOpacity
              onPress={() => onEditGroup(group.id)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="edit" size={20} color="#c4c9d4" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDeleteGroup(group.id)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="delete-outline" size={20} color="#c4c9d4" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Items — ẩn/hiện theo isSectionExpanded */}
      {isSectionExpanded && (
        <View style={{marginTop: 8}}>
          {group.items.map(item => (
            <CategoryItem
              key={item.id}
              item={item}
              selectionMode={selectionMode}
              isSelected={selectedItems.has(item.id)}
              onToggle={onToggleItem}
              onEdit={onEditItem}
              onEditProduct={onEditProduct}
              onAddVariant={onAddVariant}
              onToggleSelect={onToggleSelectItem}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default CategorySection;
