import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Modal, Pressable} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type DisplayMode = 'day' | 'week' | 'month';

interface DisplayModeOption {
  label: string;
  value: DisplayMode;
}

interface DisplayModeDropdownProps {
  displayMode: DisplayMode;
  displayModeOptions: DisplayModeOption[];
  onDisplayModeChange: (mode: DisplayMode) => void;
  isDark?: boolean;
}

// ─── DisplayModeDropdown ───────────────────────────────────────────────────────
export const DisplayModeDropdown: React.FC<DisplayModeDropdownProps> = ({
  displayMode,
  displayModeOptions,
  onDisplayModeChange,
  isDark = false,
}) => {
  const {t} = useTranslation();
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  return (
    <View>
      <Text
        className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
          isDark ? 'text-gray-500' : 'text-gray-500'
        }`}>
        {t('report.filter.displayAs')}
      </Text>
      <TouchableOpacity
        onPress={() => setShowModeDropdown(!showModeDropdown)}
        className={`flex-row items-center border rounded-xl px-3 py-2.5 ${
          isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
        }`}>
        <Icon name="trending-up" size={18} color="#3B82F6" />
        <Text
          className={`ml-2.5 text-sm flex-1 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
          {t(
            displayModeOptions.find(o => o.value === displayMode)?.label ?? '',
          )}
        </Text>
        <Icon
          name={showModeDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={18}
          color={isDark ? '#9CA3AF' : '#9CA3AF'}
        />
      </TouchableOpacity>

      {/* Mode Dropdown Modal */}
      <Modal visible={showModeDropdown} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/20"
          onPress={() => setShowModeDropdown(false)}>
          <Pressable
            className={`border rounded-xl mx-4 mt-40 overflow-hidden ${
              isDark
                ? 'border-gray-600 bg-gray-800'
                : 'border-gray-200 bg-white'
            }`}
            onPress={e => e.stopPropagation()}>
            {displayModeOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  onDisplayModeChange(opt.value);
                  setShowModeDropdown(false);
                }}
                className={`px-4 py-3 flex-row items-center justify-between border-b last:border-b-0 ${
                  opt.value === displayMode
                    ? isDark
                      ? 'bg-blue-900/50'
                      : 'bg-blue-50'
                    : isDark
                    ? 'bg-gray-800'
                    : 'bg-white'
                } ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <Text
                  className={`text-sm ${
                    opt.value === displayMode
                      ? 'text-blue-600 font-semibold'
                      : isDark
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}>
                  {t(opt.label)}
                </Text>
                {opt.value === displayMode && (
                  <Icon name="check" size={16} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};
