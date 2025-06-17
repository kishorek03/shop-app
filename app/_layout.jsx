import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';

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

export function useAppFont() {
  return useContext(FontContext);
}

export default function Layout() {
  return (
    <LanguageProvider>
      <FontProvider>
        <View style={styles.container}>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </View>
      </FontProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
