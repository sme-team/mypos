import React, {useState, useMemo} from 'react';
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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useImagePicker} from '../../../hooks/useImagePicker';
import type {CategoryGroup} from '../types';

interface Props {
  visible: boolean;
  groups: CategoryGroup[];
  onClose: () => void;
  onSave: (categoryId: string, name: string, imageUri?: string) => void;
}

export const AddProductModal: React.FC<Props> = ({
  visible,
  groups,
  onClose,
  onSave,
}) => {
  const {t} = useTranslation();
  const {imageUri, chooseImage} = useImagePicker();
  const [name, setName] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(
    () =>
      groups.filter(g =>
        g.label.toLowerCase().includes(categorySearch.toLowerCase()),
      ),
    [groups, categorySearch],
  );

  const handleClose = () => {
    setName('');
    setCategorySearch('');
    setCategoryId('');
    setShowSuggestions(false);
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('alert.error'), t('pos.category.nameRequired'));
      return;
    }
    if (!categoryId) {
      Alert.alert(t('alert.error'), t('pos.category.categoryRequired'));
      return;
    }
    onSave(categoryId, name.trim(), imageUri);
    handleClose();
  };

  return (
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
              marginBottom: 24,
            }}>
            <Text style={{fontSize: 18, fontWeight: '700', color: '#111827'}}>
              {t('pos.category.addProduct')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Ảnh + Tên sản phẩm — nằm ngang */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 8,
            }}>
            {t('pos.category.productName')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}>
            {/* Ảnh sản phẩm */}
            <TouchableOpacity
              onPress={chooseImage}
              activeOpacity={0.8}
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#e5e7eb',
                borderStyle: imageUri ? 'solid' : 'dashed',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
              {imageUri ? (
                <Image
                  source={{uri: imageUri}}
                  style={{width: '100%', height: '100%'}}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="add-photo-alternate" size={24} color="#9ca3af" />
              )}
            </TouchableOpacity>

            {/* Input tên */}
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: '#111827',
                fontSize: 15,
              }}
              placeholder={t('pos.category.productNamePlaceholder')}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 6,
            }}>
            {t('pos.category.belongsToCategory')}
          </Text>
          <View style={{position: 'relative', marginBottom: 24}}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: categoryId ? '#3b82f6' : '#d1d5db',
                borderRadius: 12,
                paddingHorizontal: 12,
                backgroundColor: categoryId ? '#eff6ff' : '#fff',
              }}>
              <Icon
                name="search"
                size={18}
                color={categoryId ? '#3b82f6' : '#9ca3af'}
                style={{marginRight: 6}}
              />
              <TextInput
                style={{flex: 1, paddingVertical: 12, color: '#111827'}}
                placeholder={t('pos.category.searchPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={categorySearch}
                onChangeText={text => {
                  setCategorySearch(text);
                  setCategoryId('');
                  setShowSuggestions(text.length > 0);
                }}
                onFocus={() => setShowSuggestions(categorySearch.length > 0)}
              />
              {categoryId && (
                <TouchableOpacity
                  onPress={() => {
                    setCategorySearch('');
                    setCategoryId('');
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
                  maxHeight: 180,
                  overflow: 'hidden',
                }}>
                {suggestions.length === 0 ? (
                  <View style={{padding: 14, alignItems: 'center'}}>
                    <Text style={{color: '#9ca3af', fontSize: 13}}>
                      {t('pos.category.noCategoryFound')}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{maxHeight: 180}}>
                    {suggestions.map((g, idx) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => {
                          setCategoryId(g.id);
                          setCategorySearch(g.label);
                          setShowSuggestions(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderBottomWidth:
                            idx < suggestions.length - 1 ? 1 : 0,
                          borderBottomColor: '#f3f4f6',
                        }}>
                        <Icon
                          name="folder-open"
                          size={16}
                          color="#3b82f6"
                          style={{marginRight: 8}}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            color: '#111827',
                            fontWeight: '500',
                          }}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
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
              <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: '#f97316',
                alignItems: 'center',
              }}
              onPress={handleSave}>
              <Text style={{color: '#fff', fontWeight: '600', fontSize: 15}}>
                {t('pos.category.addProduct')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
