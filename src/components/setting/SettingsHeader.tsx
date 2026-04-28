import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';

const SettingsHeader = ({onOpenMenu}: {onOpenMenu: () => void}) => {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  return (
    <View className={`flex-row items-center justify-between px-4 py-3 ${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-white'}`}>
      <View className="flex-row items-center">
        <TouchableOpacity onPress={onOpenMenu}>
          <Icon name="menu" size={28} color={isDark ? '#e5e7eb' : '#000'} />
        </TouchableOpacity>
        <Text className={`text-2xl font-black ml-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {t('settings.title')}
        </Text>
      </View>

      <View className="flex-row">
        <TouchableOpacity className="mr-3">
          <Icon name="notifications-outline" size={22} color={isDark ? '#e5e7eb' : '#000'} />
        </TouchableOpacity>

        <TouchableOpacity>
          <Icon name="search-outline" size={22} color={isDark ? '#e5e7eb' : '#000'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettingsHeader;
