import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiUrl = Config.API_URL;
console.log('API URL:', apiUrl);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      // API URL
      const response = await fetch(`https://dummyjson.com/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          password: password,
          expiresInMins: 30, // optional, defaults to 60
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // On successful login, save the accessToken
        const { accessToken, refreshToken } = data;

        if (accessToken) {
            await AsyncStorage.setItem('accessToken', accessToken);
          // Navigate to the next screen after successful login
          router.replace('/(tabs)/sales');
        } else {
          Alert.alert('Login Failed', 'Access Token not received');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
});
