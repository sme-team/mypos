import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {UnitPickerModal} from './UnitPickerModal';
import type {UnitOption} from '../types';

interface Props {
  visible: boolean;
  itemId: string;
  variantId: string;
  initialName: string;
  initialPrice: number;
  initialUnit: string;
  units: UnitOption[];
  onClose: () => void;
  onSave: (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
    imageUri?: string,
  ) => void;
  onDelete: (variantId: string) => void;
}

export const VariantDetailModal: React.FC<Props> = ({
  visible,
  itemId,
  variantId,
  initialName,
  initialPrice,
  initialUnit,
  units,
  onClose,
  onSave,
  onDelete,
}) => {
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPrice(String(initialPrice));
      const matched = units.find(u => u.name === initialUnit) ?? null;
      setSelectedUnit(matched);
    }
  }, [visible, initialName, initialPrice, initialUnit, units]);

  const handleSave = () => {
    if (!name.trim() || !price.trim() || !selectedUnit) {
      Alert.alert(t('alert.error'), t('pos.category.allFieldsRequired'));
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      Alert.alert(t('alert.error'), t('pos.category.invalidPrice'));
      return;
    }
    onSave(itemId, variantId, name.trim(), parsedPrice, selectedUnit.name);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(t('pos.category.deleteVariant'), t('pos.category.deleteVariantConfirm', { name }), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          onClose();
          onDelete(variantId);
        },
      },
    ]);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '70%',
            }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: '#111827',
                }}>
                {t('pos.category.variantDetail')}
              </Text>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <TouchableOpacity
                  onPress={handleDelete}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Icon name="delete-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <Icon name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {/* Tên loại */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 6,
                }}>
                {t('pos.category.variantName')}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#111827',
                  backgroundColor: '#f9fafb',
                  marginBottom: 16,
                }}
                placeholder={t('pos.category.variantNamePlaceholder')}
                value={name}
                onChangeText={setName}
              />

              {/* Giá + Đơn vị */}
              <View style={{flexDirection: 'row', gap: 12, marginBottom: 20}}>
                <View style={{flex: 1}}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: 6,
                    }}>
                    {t('pos.category.price')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      backgroundColor: '#f9fafb',
                    }}>
                    <TextInput
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#3b82f6',
                      }}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: '#6b7280',
                        fontWeight: '500',
                      }}>
                      {t('pos.currency_symbol')}
                    </Text>
                  </View>
                </View>

                <View style={{flex: 1}}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: 6,
                    }}>
                    {t('pos.category.unit')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowUnitPicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: '#f9fafb',
                    }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: selectedUnit ? '#111827' : '#9ca3af',
                        fontWeight: selectedUnit ? '500' : '400',
                      }}>
                      {selectedUnit ? selectedUnit.name : t('common.select')}
                    </Text>
                    <Icon
                      name="keyboard-arrow-down"
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Bottom buttons */}
            <View style={{flexDirection: 'row', gap: 12, marginTop: 4}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                }}
                onPress={onClose}>
                <Text
                  style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                }}
                onPress={handleSave}>
                <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>
                  {t('common.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <UnitPickerModal
        visible={showUnitPicker}
        selected={selectedUnit?.id ?? ''}
        units={units}
        onSelect={u => {
          setSelectedUnit(u);
          setShowUnitPicker(false);
        }}
        onClose={() => setShowUnitPicker(false)}
      />
    </>
  );
};
