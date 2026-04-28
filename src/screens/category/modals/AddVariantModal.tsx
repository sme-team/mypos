import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {UnitPickerModal} from './UnitPickerModal';
import type {CategoryItem, UnitOption} from '../types';

interface Props {
  visible: boolean;
  initialItemId?: string;
  allItems: CategoryItem[];
  units: UnitOption[];
  onClose: () => void;
  onSave: (
    itemId: string,
    name: string,
    price: number,
    unit: string,
    imageUri?: string,
  ) => void;
}

export const AddVariantModal: React.FC<Props> = ({
  visible,
  initialItemId,
  allItems,
  units,
  onClose,
  onSave,
}) => {
  const {t} = useTranslation();

  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  useEffect(() => {
    if (visible && initialItemId) {
      const item = allItems.find(i => i.id === initialItemId);
      if (item) {
        setProductId(item.id);
        setProductSearch(item.name);
      }
    }
  }, [visible, initialItemId, allItems]);

  const suggestions = useMemo(() => {
    const keyword = productSearch.toLowerCase();
    return allItems
      .filter(i => i.name.toLowerCase().includes(keyword))
      .slice(0, 50);
  }, [allItems, productSearch]);

  const handleClose = () => {
    setProductSearch('');
    setProductId('');
    setShowSuggestions(false);
    setName('');
    setPrice('');
    setSelectedUnit(null);
    onClose();
  };

  const handleSave = () => {
    if (!productId) {
      Alert.alert(t('alert.error'), t('pos.category.selectProduct'));
      return;
    }
    if (!name.trim() || !price.trim() || !selectedUnit) {
      Alert.alert(t('alert.error'), t('pos.category.allFieldsRequired'));
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      Alert.alert(t('alert.error'), t('pos.category.invalidPrice'));
      return;
    }
    onSave(productId, name.trim(), parsedPrice, selectedUnit.name);
    handleClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}>
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
              padding: 24,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#111827'}}>
                {t('category.addVariant')}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Tìm sản phẩm */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 6,
              }}>
              {t('pos.category.belongToProduct')}
            </Text>
            <View style={{position: 'relative', marginBottom: 16}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: productId ? '#10b981' : '#d1d5db',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: productId ? '#f0fdf4' : '#fff',
                }}>
                <Icon
                  name="search"
                  size={18}
                  color={productId ? '#10b981' : '#9ca3af'}
                  style={{marginRight: 6}}
                />
                <TextInput
                  style={{flex: 1, paddingVertical: 12, color: '#111827'}}
                  placeholder={t('pos.category.searchProductPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={productSearch}
                  onChangeText={text => {
                    setProductSearch(text);
                    setProductId('');
                    setShowSuggestions(text.length > 0);
                  }}
                  onFocus={() => setShowSuggestions(productSearch.length > 0)}
                />
                {productId && (
                  <TouchableOpacity
                    onPress={() => {
                      setProductSearch('');
                      setProductId('');
                      setShowSuggestions(false);
                    }}>
                    <Icon name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
              {showSuggestions && (
                <View
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    zIndex: 999,
                    elevation: 8,
                    maxHeight: 160,
                    overflow: 'hidden',
                  }}>
                  {suggestions.length === 0 ? (
                    <View style={{padding: 14, alignItems: 'center'}}>
                      <Text style={{color: '#9ca3af', fontSize: 13}}>
                        {t('pos.category.noProductFound')}
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={suggestions}
                      keyExtractor={i => i.id}
                      keyboardShouldPersistTaps="handled"
                      style={{maxHeight: 160}}
                      renderItem={({item, index}) => (
                        <TouchableOpacity
                          onPress={() => {
                            setProductId(item.id);
                            setProductSearch(item.name);
                            setShowSuggestions(false);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderBottomWidth:
                              index < suggestions.length - 1 ? 1 : 0,
                            borderBottomColor: '#f3f4f6',
                          }}>
                          <Icon
                            name="inventory-2"
                            size={16}
                            color="#f97316"
                            style={{marginRight: 8}}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              color: '#111827',
                              fontWeight: '500',
                            }}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              )}
            </View>

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
                borderColor: '#d1d5db',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                marginBottom: 16,
                color: '#111827',
              }}
              placeholder={t('pos.category.variantNamePlaceholder')}
              value={name}
              onChangeText={setName}
            />

            {/* Giá + Đơn vị */}
            <View style={{flexDirection: 'row', gap: 12, marginBottom: 24}}>
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
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                  }}>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      color: '#3b82f6',
                      fontWeight: '700',
                      fontSize: 15,
                    }}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                  <Text style={{color: '#6b7280', fontSize: 14}}>{t('pos.currency_symbol')}</Text>
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
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: selectedUnit ? '#111827' : '#9ca3af',
                    }}>
                    {selectedUnit ? selectedUnit.name : t('pos.category.selectUnit')}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                }}
                onPress={handleClose}>
                <Text
                  style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: '#10b981',
                  alignItems: 'center',
                }}
                onPress={handleSave}>
                <Text style={{color: '#fff', fontWeight: '600', fontSize: 15}}>
                  {t('pos.category.saveChanges')}
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
