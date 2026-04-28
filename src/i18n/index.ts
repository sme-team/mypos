import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

const resources = {
  vi: {
    translation: vi,
  },
  en: {
    translation: en,
  },
  zh: {
    translation: zh,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'vi', // Mặc định tiếng Việt
  fallbackLng: 'en',

  interpolation: {escapeValue: false},
});

export default i18n;
