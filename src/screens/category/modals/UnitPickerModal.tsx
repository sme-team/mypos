import React from 'react';
import {View, Text, TouchableOpacity, Modal, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  visible: boolean;
  selected: string;
  units: string[];
  onSelect: (unit: string) => void;
  onClose: () => void;
}

export const UnitPickerModal: React.FC<Props> = ({
  visible,
  selected,
  units,
  onSelect,
  onClose,
}) => (
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
            Chọn đơn vị tính
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {units.length === 0 ? (
          <View style={{padding: 24, alignItems: 'center'}}>
            <Text style={{color: '#9ca3af', fontSize: 14}}>
              Chưa có đơn vị tính nào
            </Text>
          </View>
        ) : (
          <ScrollView>
            {units.map((unit, idx) => {
              const isSelected = selected === unit;
              return (
                <TouchableOpacity
                  key={unit}
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
                    {unit}
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
