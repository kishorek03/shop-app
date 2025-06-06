import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as atob } from 'base-64';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_BASE_URL = 'http://localhost:8080/api';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handleLogin = async () => {
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const json = await response.json();

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
          
          await AsyncStorage.setItem('accessToken', json.data.accessToken);
          await AsyncStorage.setItem('refreshToken', json.data.refreshToken);
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          
          router.replace('/(tabs)/sales');
        } else {
          alert('Invalid token received');
        }
      } else {
        alert(json.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
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

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={[styles.welcomeText, { color: '#333' }]}>Welcome Back!</Text>
          <Text style={[styles.subtitleText, { color: '#666' }]}>Sign in to continue</Text>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#444" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#444"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#444" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#444"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#444" />
              </Pressable>
            </View>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Pressable
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={animateButton}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
    borderRadius: 20,
    padding: 25,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#222',
  },
  loginButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});