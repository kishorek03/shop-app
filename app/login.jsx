import { Ionicons } from '@expo/vector-icons';
import { decode as atob } from 'base-64';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import getEnvConfig from '../config/env';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAppFont } from './_layout';

const { API_BASE_URL } = getEnvConfig();
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.8;
const FULL_DRAWER_HEIGHT = SCREEN_HEIGHT;

// Static image imports - this ensures they're bundled correctly
const IMAGES = {
  background: require('../assets/images/SugarcaneWallpaper.png'),
  logo: require('../assets/images/appicon.png'),
};

const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

export default function LoginScreen() {
  const { t } = useLanguage();
  const { fontFamily } = useAppFont();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const router = useRouter();
  const scaleAnim = useState(new Animated.Value(1))[0];
  const drawerAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }

    try {
      setLoading(true);
      
      // Log the API configuration
      console.log('=== LOGIN REQUEST DEBUG ===');
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full login URL:', `${API_BASE_URL}/auth/login`);
      console.log('==========================');
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers));
      
      const json = await response.json();
      console.log('Response body:', json);

      if (response.ok && json.status === 'success') {
        console.log('Login Response:', json.data);
        
        // Decode the JWT token
        const decodedToken = decodeJWT(json.data.accessToken);
        console.log('Decoded token:', decodedToken);
        
        if (decodedToken) {
          const userData = {
            name: decodedToken.sub,
            roles: decodedToken.roles,
            userId: username
          };
          
          console.log('Storing user data:', userData);
          
          await login(json.data.accessToken, json.data.refreshToken, userData);
          router.replace('/');
        } else {
          alert('Invalid token received');
        }
      } else {
        alert(json?.message || 'Login failed. Please check your username and password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.circle),
        useNativeDriver: true,
      })
    ]).start(() => handleLogin());
  };

  const showDrawer = () => {
    setDrawerVisible(true);
    setIsFullScreen(false);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: SCREEN_HEIGHT - DRAWER_HEIGHT,
        duration: 300,
        easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)),
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        easing: Easing.in(Easing.bezier(0.55, 0.06, 0.68, 0.19)),
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setDrawerVisible(false);
      setIsFullScreen(false);
    });
  };

  const expandToFullScreen = () => {
    setIsFullScreen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)),
      useNativeDriver: false,
    }).start();
  };

  const collapseToHalfScreen = () => {
    setIsFullScreen(false);
    Animated.timing(drawerAnim, {
      toValue: SCREEN_HEIGHT - DRAWER_HEIGHT,
      duration: 300,
      easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)),
      useNativeDriver: false,
    }).start();
  };

  const onGestureEvent = (event) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      const currentPosition = isFullScreen ? 0 : SCREEN_HEIGHT - DRAWER_HEIGHT;
      const newPosition = currentPosition + translationY;
      
      // Allow full range of movement with better bounds
      const clampedPosition = Math.max(0, Math.min(SCREEN_HEIGHT, newPosition));
      drawerAnim.setValue(clampedPosition);
    } else if (state === State.END) {
      const { velocityY } = event.nativeEvent;
      const currentPosition = drawerAnim._value;
      
      // More responsive gesture detection for Android
      const velocityThreshold = Platform.OS === 'android' ? 300 : 500;
      const positionThreshold = SCREEN_HEIGHT / 2;
      
      if (velocityY < -velocityThreshold || (currentPosition < positionThreshold && velocityY < -50)) {
        // Swipe up - expand to full screen
        expandToFullScreen();
      } else if (velocityY > velocityThreshold || (currentPosition > positionThreshold && velocityY > 50)) {
        // Swipe down - collapse to half screen or close
        if (isFullScreen) {
          collapseToHalfScreen();
        } else {
          hideDrawer();
        }
      } else {
        // Return to previous state based on position
        if (currentPosition < positionThreshold) {
          expandToFullScreen();
        } else if (currentPosition < SCREEN_HEIGHT - 100) {
          collapseToHalfScreen();
        } else {
          hideDrawer();
        }
      }
    }
  };

  // Background with SugarcaneWallpaper.png
  const SugarcaneBackground = () => (
    <View style={styles.backgroundContainer}>
      <ImageBackground
        source={IMAGES.background}
        style={styles.backgroundImage}
        resizeMode="cover"
        onLoad={() => {
          console.log('Background image loaded successfully');
          setBackgroundLoaded(true);
        }}
        onError={(error) => {
          console.log('Background image error:', error);
          setBackgroundLoaded(false);
        }}
      >
        <View style={styles.overlayGradient} />
      </ImageBackground>
      
      {/* Fallback background if image fails to load */}
      {!backgroundLoaded && (
        <View style={styles.fallbackBackground}>
          <View style={styles.overlayGradient} />
        </View>
      )}
      
      <View style={styles.contentOverlay}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image 
              source={IMAGES.logo}
              style={styles.logoImage}
              resizeMode="contain"
              onLoad={() => {
                console.log('Logo image loaded successfully');
                setLogoLoaded(true);
              }}
              onError={(error) => {
                console.log('Logo image error:', error);
                setLogoLoaded(false);
              }}
            />
            {/* Fallback icon if logo fails to load */}
            {!logoLoaded && (
              <Ionicons name="leaf" size={40} color="#1ed760" />
            )}
          </View>
          {/* App title reverted to original style (no gradient, no border) */}
          <Text style={[styles.appTitle, { fontFamily }]}>{t('appName')}</Text>
          {/* App subtitle reverted to original style (no gradient, no border) */}
          <Text style={[styles.appSubtitle, { fontFamily }]}>{t('appSubtitle')}</Text>
        </View>
        {/* Gradient sign-in button with scale animation */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPressIn={() => scaleAnim.setValue(0.96)}
            onPressOut={() => scaleAnim.setValue(1)}
            onPress={showDrawer}
            style={{ borderRadius: 30, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#b2ff59', '#43ea7a', '#1ed760', '#1db954', '#0a8f3d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loginPromptButton}
            >
              <Text style={[styles.loginPromptText, { fontFamily }]}> {t('signIn')} </Text>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      {/* Background */}
      <SugarcaneBackground />
      
      {/* Overlay */}
      {drawerVisible && (
        <Animated.View 
          style={[styles.overlay, { opacity: overlayAnim }]}
        >
          <Pressable style={styles.overlayPressable} onPress={hideDrawer} />
        </Animated.View>
      )}
      
      {/* Bottom Drawer */}
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <Animated.View 
          style={[
            styles.drawer, 
            { 
              transform: [{ translateY: drawerAnim }],
              height: isFullScreen ? FULL_DRAWER_HEIGHT : DRAWER_HEIGHT
            }
          ]}
        >
          <View style={styles.drawerHandle} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.drawerContent}
            keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
          >
            <Text style={[styles.welcomeText, { fontFamily }]}>{t('welcomeBack')}</Text>
            <Text style={[styles.subtitleText, { fontFamily }]}>{t('signInToContinue')}</Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily }]}
                  placeholder={t('username')}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { fontFamily }]}
                  placeholder={t('password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                    size={20} 
                    color="#666" 
                  />
                </Pressable>
              </View>
              
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Pressable
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={animateButton}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.loginButtonText, { fontFamily }]}>
                      {t('login')}
                    </Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayGradient: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fallbackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2E7D32',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 30 : 50,
    paddingBottom: Platform.OS === 'android' ? 40 : 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  logoWrapper: {
    width: Platform.OS === 'android' ? 70 : 80,
    height: Platform.OS === 'android' ? 70 : 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Platform.OS === 'android' ? 35 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: Platform.OS === 'android' ? 5 : 0,
    shadowColor: Platform.OS === 'android' ? '#000' : 'transparent',
    shadowOffset: Platform.OS === 'android' ? { width: 0, height: 2 } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'android' ? 0.3 : 0,
    shadowRadius: Platform.OS === 'android' ? 4 : 0,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Platform.OS === 'android' ? 33 : 38,
  },
  appTitle: {
    fontSize: Platform.OS === 'android' ? 28 : 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: '#1ed760',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    color: '#fff',
    textShadowColor: '#1ed760',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  loginPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: Platform.OS === 'android' ? 18 : 22,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    borderRadius: 18,
    borderWidth: 0,
    elevation: Platform.OS === 'android' ? 10 : 7,
    shadowColor: '#1ed760',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
  loginPromptText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: 1,
    textShadowColor: '#1ed760',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  overlayPressable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    zIndex: 2,
    elevation: Platform.OS === 'android' ? 15 : 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  drawerHandle: {
    width: Platform.OS === 'android' ? 45 : 50,
    height: Platform.OS === 'android' ? 4 : 5,
    backgroundColor: '#4CAF50',
    borderRadius: Platform.OS === 'android' ? 2 : 3,
    alignSelf: 'center',
    marginTop: Platform.OS === 'android' ? 10 : 12,
    marginBottom: Platform.OS === 'android' ? 15 : 20,
    elevation: Platform.OS === 'android' ? 4 : 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'android' ? 25 : 30,
  },
  welcomeText: {
    fontSize: Platform.OS === 'android' ? 24 : 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 25 : 30,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    height: Platform.OS === 'android' ? 50 : 56,
    backgroundColor: '#f8f9fa',
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    alignItems: 'center',
    marginTop: 10,
    elevation: Platform.OS === 'android' ? 4 : 3,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#81C784',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
  },
});