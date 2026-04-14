import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useImagePicker} from '../../../hooks/useImagePicker';
import {UnitPickerModal} from './UnitPickerModal';

interface Props {
  visible: boolean;
  itemId: string;
  variantId: string;
  initialName: string;
  initialPrice: number;
  initialUnit: string;
  units: string[];
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
  const {imageUri, chooseImage} = useImagePicker();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setPrice(String(initialPrice));
      setUnit(initialUnit);
    }
  }, [visible, initialName, initialPrice, initialUnit]);

  const handleSave = () => {
    if (!name.trim() || !price.trim() || !unit.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      Alert.alert('Lỗi', 'Giá phải là số hợp lệ');
      return;
    }
    onSave(itemId, variantId, name.trim(), parsedPrice, unit.trim(), imageUri);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert('Xóa biến thể', `Bạn có chắc muốn xóa biến thể "${name}"?`, [
      {text: 'Hủy', style: 'cancel'},
      {
        text: 'Xóa',
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
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}>
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
            }}>
            <TouchableOpacity onPress={onClose} style={{marginRight: 12}}>
              <Icon name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#111827',
                flex: 1,
              }}>
              Chi tiết biến thể
            </Text>
            {/* Nút xóa ở header */}
            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="delete-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{padding: 24}}
            keyboardShouldPersistTaps="handled">
            {/* Ảnh */}
            <TouchableOpacity
              onPress={chooseImage}
              activeOpacity={0.85}
              style={{alignItems: 'center', marginBottom: 28}}>
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 20,
                  backgroundColor: '#e8d5b0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: '#ddd',
                  borderStyle: 'dashed',
                }}>
                {imageUri ? (
                  <Image
                    source={{uri: imageUri}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="add-photo-alternate" size={40} color="#b8975a" />
                )}
              </View>
              <Text style={{marginTop: 8, fontSize: 12, color: '#9ca3af'}}>
                {imageUri ? 'Nhấn để đổi ảnh' : 'Nhấn để thêm ảnh'}
              </Text>
            </TouchableOpacity>

            {/* Tên biến thể */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 6,
              }}>
              Tên biến thể
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                fontWeight: '600',
                color: '#111827',
                backgroundColor: '#f9fafb',
                marginBottom: 20,
              }}
              placeholder="Nhập tên biến thể"
              value={name}
              onChangeText={setName}
            />

            {/* Giá + Đơn vị */}
            <View style={{flexDirection: 'row', gap: 12, marginBottom: 32}}>
              <View style={{flex: 1}}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: 6,
                  }}>
                  Giá bán
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
                      paddingVertical: 13,
                      fontSize: 16,
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
                    style={{fontSize: 14, color: '#6b7280', fontWeight: '500'}}>
                    đ
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
                  Đơn vị tính
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
                    paddingVertical: 13,
                    backgroundColor: '#f9fafb',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: unit ? '#111827' : '#9ca3af',
                      fontWeight: unit ? '500' : '400',
                    }}>
                    {unit || 'Chọn'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 24,
              paddingBottom: 24,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
            }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
              }}
              onPress={onClose}>
              <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                Hủy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: '#3b82f6',
                alignItems: 'center',
              }}
              onPress={handleSave}>
              <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>
                Áp dụng
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <UnitPickerModal
        visible={showUnitPicker}
        selected={unit}
        units={units}
        onSelect={u => {
          setUnit(u);
          setShowUnitPicker(false);
        }}
        onClose={() => setShowUnitPicker(false)}
      />
    </>
  );
};
