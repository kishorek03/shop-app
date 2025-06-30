import * as Font from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
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

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return true;
    // exp is in seconds, Date.now() is ms
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && segments[0] !== 'login') {
        router.replace('/login');
      }
      if (isAuthenticated && (segments[0] === 'login' || segments[0] === '')) {
        router.replace('/(tabs)/sales');
      }
    }
  }, [loading, isAuthenticated, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
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
    <AuthProvider>
      <LanguageProvider>
        <RootLayoutNav />
      </LanguageProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
