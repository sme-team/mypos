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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {CategoryGroup} from '../types';

interface Props {
  visible: boolean;
  groups: CategoryGroup[];
  onClose: () => void;
  onSave: (categoryId: string, name: string) => void;
}

export const AddProductModal: React.FC<Props> = ({
  visible,
  groups,
  onClose,
  onSave,
}) => {
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
      Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
      return;
    }
    if (!categoryId) {
      Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
      return;
    }
    onSave(categoryId, name.trim());
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
              Thêm sản phẩm
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
            Tên sản phẩm
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
            placeholder="Nhập tên sản phẩm"
            value={name}
            onChangeText={setName}
          />

          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#374151',
              marginBottom: 6,
            }}>
            Thuộc danh mục
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
                placeholder="Tìm danh mục..."
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
                      Không tìm thấy danh mục
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
                Hủy
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
                Thêm sản phẩm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
