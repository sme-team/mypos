import React, {useState} from 'react';
import {View, Text, Image, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../../hooks/useTheme';

export type CustomerType = 'selling' | 'storage';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type?: CustomerType;
  hasKey?: boolean;
  imageUri?: string; //  có thì hiện ảnh, không có thì dùng initials
  // Các field từ CCCD
  id_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  nationality?: string;
  email?: string;
  notes?: string;
  customer_group?: 'regular' | 'vip' | 'wholesale' | 'corporate' | 'staff';
}

interface CustomerCardProps {
  customer: Customer;
  onPress?: (customer: Customer) => void;
  onLongPress?: (customer: Customer) => void;
  // Selection mode props
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (customerId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (
      parts[parts.length - 2][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  '#3b82f6',
  '#f97316',
  '#a855f7',
  '#14b8a6',
  '#6366f1',
  '#ec4899',
  '#10b981',
  '#f59e0b',
];

const getAvatarColor = (id: string): string => {
  const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

// ─── Sub-component: Avatar ────────────────────────────────────────────────────

interface AvatarProps {
  customer: Customer;
  isSelected: boolean;
  isDark: boolean;
}

const Avatar: React.FC<AvatarProps> = ({customer, isSelected, isDark}) => {
  const [imageError, setImageError] = useState(false);

  const showImage = !!customer.imageUri && !imageError;
  const initials = getInitials(customer.name);
  const avatarColor = getAvatarColor(customer.id);

  return (
    <View
      className="w-11 h-11 rounded-full items-center justify-center overflow-hidden"
      style={{backgroundColor: showImage ? 'transparent' : avatarColor}}>
      {showImage ? (
        <Image
          source={{uri: customer.imageUri}}
          className="w-11 h-11 rounded-full"
          onError={() => setImageError(true)}
        />
      ) : (
        <Text style={{fontSize: 13, fontWeight: '700', color: '#fff'}}>
          {initials}
        </Text>
      )}

      {/* Overlay khi selected */}
      {isSelected && (
        <View
          className="absolute inset-0 rounded-full items-center justify-center"
          style={{backgroundColor: 'rgba(0,0,0,0.35)'}}>
          <Icon name="check" size={22} color="#fff" />
        </View>
      )}
    </View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onPress,
  onLongPress,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const {isDark} = useTheme();
  const handlePress = () => {
    if (selectionMode) {
      onToggleSelect?.(customer.id);
    } else {
      onPress?.(customer);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={() => onLongPress?.(customer)}
      delayLongPress={350}
      className={`flex-row items-center rounded-2xl px-4 py-3 mb-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
      style={{
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: isSelected ? '#3b82f6' : 'transparent',
      }}>
      {/* Avatar */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => selectionMode && onToggleSelect?.(customer.id)}
        disabled={!selectionMode}
        className="mr-3">
        <Avatar customer={customer} isSelected={isSelected} isDark={isDark} />
      </TouchableOpacity>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            className={`font-semibold text-[15px] mr-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {customer.name}
          </Text>
          {customer.hasKey && !selectionMode && (
            <Text className="text-base">🔑</Text>
          )}
        </View>
        <Text className={`text-sm mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{customer.phone}</Text>
      </View>

      {/* Right indicator */}
      {selectionMode ? (
        <View className="w-8 h-8 items-center justify-center">
          {isSelected && <Icon name="check-circle" size={22} color="#3b82f6" />}
        </View>
      ) : (
        <View className={`w-8 h-8 border-dashed rounded-lg items-center justify-center ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
          <Icon name="chevron-right" size={18} color={isDark ? '#4b5563' : '#9ca3af'} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CustomerCard;
