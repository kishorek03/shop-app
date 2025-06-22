import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import NotificationService from '../services/NotificationService';

const FontContext = createContext({ fontFamily: undefined });

function FontProvider({ children }) {
  const { currentLanguage } = useLanguage();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        NotoSansTamil: require('../assets/fonts/NotoSansTamil-Regular.ttf'),
      });
      setFontsLoaded(true);
    })();

    // Initialize notifications
    NotificationService.initialize().then(success => {
      if (success) {
        console.log('Notifications initialized successfully');
      } else {
        console.log('Failed to initialize notifications');
      }
    });
  }, []);

  // Choose font based on language
  const fontFamily = currentLanguage === 'ta' ? 'NotoSansTamil' : undefined;

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <FontContext.Provider value={{ fontFamily }}>
      {children}
    </FontContext.Provider>
  );
}

export const useAppFont = () => {
  return useContext(FontContext);
};

function RootLayoutNav() {
  const { currentLanguage } = useLanguage();
  const [fontFamily, setFontFamily] = useState('System');

  useEffect(() => {
    // ... font loading logic ...
    // Note: The font loading logic might need to be adjusted based on the original full file content.
    // This is a simplified representation.
    if (currentLanguage === 'ta') {
      setFontFamily('NotoSansTamil-Regular');
    } else {
      setFontFamily('System');
    }
  }, [currentLanguage]);

  return (
    <FontContext.Provider value={{ fontFamily }}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </FontContext.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Initialize notifications
    NotificationService.initialize().then(success => {
      if (success) {
        console.log('Notifications initialized successfully');
      } else {
        console.log('Failed to initialize notifications');
      }
    });

    // Font loading logic
    (async () => {
      await Font.loadAsync({
        'NotoSansTamil-Regular': require('../assets/fonts/NotoSansTamil-Regular.ttf'),
      });
      setFontsLoaded(true);
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <RootLayoutNav />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
