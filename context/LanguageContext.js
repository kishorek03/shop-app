import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export const languages = {
  en: {
    settings: 'Settings',
    preferences: 'Preferences',
    language: 'Language',
    account: 'Account',
    deleteAccount: 'Delete Account',
    logout: 'Logout',
    selectLanguage: 'Select Language',
    confirmDelete: 'Are you sure you want to delete your account? This action cannot be undone.',
    cancel: 'Cancel',
    delete: 'Delete',
    error: 'Error',
    tryAgain: 'Please try again.',
    loggingOut: 'Logging out...',
    report: 'Report',
    sales: 'Sales',
    expense: 'Expense',
  },
  ta: {
    settings: 'அமைப்புகள்',
    preferences: 'விருப்பங்கள்',
    language: 'மொழி',
    account: 'கணக்கு',
    deleteAccount: 'கணக்கை நீக்கு',
    logout: 'வெளியேறு',
    selectLanguage: 'மொழியைத் தேர்வு செய்க',
    confirmDelete: 'உங்கள் கணக்கை நீக்க விரும்புகிறீர்களா? இந்த செயலை மீளமைக்க முடியாது.',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    error: 'பிழை',
    tryAgain: 'தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
    loggingOut: 'வெளியேறுகிறது...',
    report: 'அறிக்கை',
    sales: 'விற்பனைகள்',
    expense: 'செலவுகள்',
  }
};

export const languageNames = {
  en: {
    native: 'English',
    script: 'ஆங்கிலம்',
  },
  ta: {
    native: 'தமிழ்',
    script: 'Tamil',
  }
};

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (languageCode) => {
    try {
      await AsyncStorage.setItem('appLanguage', languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key) => {
    return languages[currentLanguage]?.[key] || languages['en'][key] || key;
  };

  const getLanguageName = (code) => {
    const lang = languageNames[code];
    if (!lang) return code;
    return `${lang.native} (${lang.script})`;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t, getLanguageName }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 