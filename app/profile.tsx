import { View, Text, Button, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const handleLogout = () => {
    // Optional: clear token (if saved)
    // AsyncStorage.removeItem('accessToken');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Page</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
});
