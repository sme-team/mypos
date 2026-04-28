import React from 'react';
import {View, Text, TouchableOpacity, Modal, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import type {UnitOption} from '../types';

interface Props {
  visible: boolean;
  selected: string; // unit id
  units: UnitOption[];
  onSelect: (unit: UnitOption) => void;
  onClose: () => void;
}

export const UnitPickerModal: React.FC<Props> = ({
  visible,
  selected,
  units,
  onSelect,
  onClose,
}) => {
  const {t} = useTranslation();
  return (
    <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}>
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
      }}
      activeOpacity={1}
      onPress={onClose}>
      <View
        style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 32,
          maxHeight: '60%',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}>
          <Text style={{fontSize: 16, fontWeight: '700', color: '#111827'}}>
            {t('pos.category.selectUnit')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {units.length === 0 ? (
          <View style={{padding: 24, alignItems: 'center'}}>
            <Text style={{color: '#9ca3af', fontSize: 14}}>
              {t('pos.category.noUnitsFound', 'Chưa có đơn vị tính nào')}
            </Text>
          </View>
        ) : (
          <ScrollView>
            {units.map((unit, idx) => {
              const isSelected = selected === unit.id;
              return (
                <TouchableOpacity
                  key={unit.id}
                  onPress={() => onSelect(unit)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: idx < units.length - 1 ? 1 : 0,
                    borderBottomColor: '#f9fafb',
                    backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: isSelected ? '#3b82f6' : '#374151',
                      fontWeight: isSelected ? '600' : '400',
                    }}>
                    {unit.name}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={18} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </TouchableOpacity>
  </Modal>
);
}
