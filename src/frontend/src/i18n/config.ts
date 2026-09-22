import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './locales/en/common.json';
import bom from './locales/en/bom.json';
import errors from './locales/en/errors.json';
import users from './locales/en/users.json';
import releaseTemplates from './locales/en/releaseTemplates.json';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'bom', 'errors', 'users', 'releaseTemplates'],
  defaultNS: 'common',
  resources: {
    en: { common, bom, errors, users, releaseTemplates },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
