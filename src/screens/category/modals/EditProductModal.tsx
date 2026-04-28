import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useImagePicker} from '../../../hooks/useImagePicker';
import type {CategoryGroup, CategoryItem} from '../types';

interface Props {
  visible: boolean;
  itemId: string;
  groups: CategoryGroup[];
  onClose: () => void;
  onSave: (
    itemId: string,
    name: string,
    groupId: string,
    imageUri?: string,
  ) => void;
  onAddVariant: (itemId: string) => void;
  onEditVariant: (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => void;
}

export const EditProductModal: React.FC<Props> = ({
  visible,
  itemId,
  groups,
  onClose,
  onSave,
  onAddVariant,
  onEditVariant,
}) => {
  const {t} = useTranslation();
  const [name, setName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const {imageUri, setImageUri, chooseImage} = useImagePicker();

  const item: CategoryItem | undefined = useMemo(
    () => groups.flatMap(g => g.items).find(i => i.id === itemId),
    [groups, itemId],
  );

  const currentGroup = useMemo(
    () => groups.find(g => g.items.some(i => i.id === itemId)),
    [groups, itemId],
  );

  useEffect(() => {
    if (visible && item && currentGroup) {
      setName(item.name);
      setGroupId(currentGroup.id);
      setGroupSearch(currentGroup.label);
      setImageUri(item.imageUri);
    }
  }, [visible, item, currentGroup, setImageUri]);

  const groupSuggestions = useMemo(
    () =>
      groups.filter(g =>
        g.label.toLowerCase().includes(groupSearch.toLowerCase()),
      ),
    [groups, groupSearch],
  );

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('alert.error'), t('pos.category.nameRequired'));
      return;
    }
    onSave(itemId, name.trim(), groupId, imageUri ?? undefined);
    onClose();
  };

  return (
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
            padding: 24,
            maxHeight: '90%',
          }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
            <Text style={{fontSize: 18, fontWeight: '700', color: '#111827'}}>
              {t('pos.category.editProduct')}
            </Text>
            <TouchableOpacity onPress={onClose}>
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
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                fontWeight: '600',
                color: '#111827',
                backgroundColor: '#f9fafb',
              }}
              placeholder={t('pos.category.productNamePlaceholder')}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Danh mục */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 6,
            }}>
            {t('pos.category.belongsToCategory')}
          </Text>
          <View style={{position: 'relative', marginBottom: 20}}>
            <TouchableOpacity
              onPress={() => setShowGroupSuggestions(prev => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: groupId ? '#3b82f6' : '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                backgroundColor: groupId ? '#eff6ff' : '#f9fafb',
              }}>
              <Text
                style={{
                  fontSize: 14,
                  color: groupId ? '#1d4ed8' : '#374151',
                  fontWeight: groupId ? '600' : '400',
                }}>
                {groupSearch || t('pos.category.selectCategory')}
              </Text>
              <Icon
                name="keyboard-arrow-down"
                size={20}
                color={groupId ? '#3b82f6' : '#6b7280'}
              />
            </TouchableOpacity>
            {showGroupSuggestions && (
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
                  elevation: 10,
                  maxHeight: 180,
                  overflow: 'hidden',
                }}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={{maxHeight: 180}}>
                  {groupSuggestions.map((g, idx) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => {
                        setGroupId(g.id);
                        setGroupSearch(g.label);
                        setShowGroupSuggestions(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderBottomWidth:
                          idx < groupSuggestions.length - 1 ? 1 : 0,
                        borderBottomColor: '#f3f4f6',
                        backgroundColor: g.id === groupId ? '#eff6ff' : '#fff',
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
                          flex: 1,
                        }}>
                        {g.label}
                      </Text>
                      {g.id === groupId && (
                        <Icon name="check" size={16} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Biến thể */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#9ca3af',
                letterSpacing: 1.2,
              }}>
              {t('pos.category.manageVariants')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onAddVariant(itemId);
              }}
              style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="add-circle-outline" size={18} color="#3b82f6" />
              <Text style={{fontSize: 13, fontWeight: '600', color: '#3b82f6'}}>
                {t('pos.category.addNew')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{maxHeight: 200}}
            showsVerticalScrollIndicator={false}>
            {item?.variants.map(v => (
              <TouchableOpacity
                key={v.id}
                onPress={() => {
                  onClose();
                  onEditVariant(itemId, v.id, v.name, v.price, v.unit);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 8,
                }}>
                <View style={{flex: 1}}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: 2,
                    }}>
                    {v.name}
                  </Text>
                  <Text
                    style={{fontSize: 13, color: '#3b82f6', fontWeight: '700'}}>
                    {v.price.toLocaleString('vi-VN')}{t('pos.currency_symbol')} / {v.unit}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Buttons */}
          <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
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
                {t('common.cancel')}
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
              <Text style={{color: '#fff', fontWeight: '600', fontSize: 15}}>
                {t('pos.category.saveChanges')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
