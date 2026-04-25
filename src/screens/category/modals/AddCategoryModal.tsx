import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const AddCategoryModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
}) => {
  const {t} = useTranslation();
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) {return;}
    onSave(name.trim());
    setName('');
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <View
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
              marginBottom: 24,
            }}>
            <Text style={{fontSize: 18, fontWeight: '700', color: '#111827'}}>
              {t('category.addCategory')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 6,
            }}>
            {t('category.categoryName')}
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginBottom: 24,
              color: '#111827',
            }}
            placeholder={t('category.categoryName')}
            value={name}
            onChangeText={setName}
            autoFocus
          />

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
              <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                Hủy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: '#3b82f6',
                alignItems: 'center',
              }}
              onPress={handleSave}>
              <Text style={{color: '#fff', fontWeight: '600', fontSize: 15}}>
                Lưu
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
