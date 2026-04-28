import React from 'react';
import {Modal, View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../../hooks/useTheme';
import {useTranslation} from 'react-i18next';

interface ConfirmDeleteModalProps {
  visible: boolean;
  /** Tên/mô tả của thứ sắp bị xóa, ví dụ: 'danh mục "Cà phê"' hoặc '3 mục đã chọn' */
  targetLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  visible,
  targetLabel,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const {isDark} = useTheme();
  const {t} = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
        <View
          style={{
            backgroundColor: isDark ? '#1f2937' : 'white',
            borderRadius: 16,
            width: '100%',
            padding: 24,
          }}>
          {/* Icon */}
          <View style={{alignItems: 'center', marginBottom: 16}}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isDark ? '#451a1a' : '#fef2f2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
              <Icon name="delete-outline" size={32} color="#ef4444" />
            </View>
            <Text style={{fontSize: 17, fontWeight: '700', color: isDark ? '#f1f5f9' : '#111827'}}>
              {t('common.confirm_delete', 'Xác nhận xóa')}
            </Text>
          </View>

          {/* Message */}
          <Text
            style={{
              color: isDark ? '#94a3b8' : '#6b7280',
              textAlign: 'center',
              marginBottom: 24,
              fontSize: 14,
              lineHeight: 20,
            }}>
            {t('common.confirm_delete_msg1', 'Bạn có chắc chắn muốn xóa')}{' '}
            <Text style={{fontWeight: '700', color: isDark ? '#f1f5f9' : '#111827'}}>
              {targetLabel}
            </Text>
            ?{'\n'}{t('common.cannot_undo', 'Hành động này không thể hoàn tác.')}
          </Text>

          {/* Buttons */}
          <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: isDark ? '#374151' : '#f3f4f6',
              }}
              onPress={onCancel}>
              <Text style={{color: isDark ? '#d1d5db' : '#374151', fontSize: 15, fontWeight: '600'}}>
                {t('common.cancel', 'Hủy')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: '#ef4444',
              }}
              onPress={onConfirm}>
              <Text style={{color: '#fff', fontSize: 15, fontWeight: '700'}}>
                {t('common.delete', 'Xóa')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
