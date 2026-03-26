import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';

const SettingsHeader = ({onOpenMenu}: {onOpenMenu: () => void}) => {
  const {t} = useTranslation();

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={onOpenMenu}>
          <Icon name="menu" size={28} />
        </TouchableOpacity>
        <Text className="text-2xl font-black text-gray-800 font-semibold ml-3">
          {t('settings.title')}
        </Text>
      </View>

      <View className="flex-row">
        <TouchableOpacity className="mr-3">
          <Icon name="notifications-outline" size={22} />
        </TouchableOpacity>

        <TouchableOpacity>
          <Icon name="search-outline" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SettingsHeader;
