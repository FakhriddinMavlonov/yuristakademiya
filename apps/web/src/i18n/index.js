import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from '../locales/uz.json';
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import ru from '../locales/ru.json';

const savedLang = localStorage.getItem('ya_lang') || 'uz';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      en: { translation: en },
      tr: { translation: tr },
      ru: { translation: ru },
    },
    lng: savedLang,
    fallbackLng: 'uz',
    interpolation: { escapeValue: false },
  });

export default i18n;
