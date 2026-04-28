import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, Modal} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

interface Props {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const EditCategoryModal: React.FC<Props> = ({
  visible,
  initialName,
  onClose,
  onSave,
}) => {
  const {t} = useTranslation();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {setName(initialName);}
  }, [visible, initialName]);

  const handleSave = () => {
    if (!name.trim()) {return;}
    onSave(name.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
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
              {t('pos.category.editCategory')}
            </Text>
            <TouchableOpacity onPress={onClose}>
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
              onPress={onClose}>
              <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                {t('common.cancel')}
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
                {t('pos.category.saveChanges')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
