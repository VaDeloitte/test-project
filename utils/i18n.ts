import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your translation JSON files
import en from '../public/locales/en/common.json';
import fr from '../public/locales/fr/common.json'; // Example French

i18n
  .use(initReactI18next) // Pass i18next instance to react-i18next
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;
