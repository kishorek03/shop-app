import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LanguageProvider } from '../context/LanguageContext';

export default function Layout() {
  return (
    <LanguageProvider>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </View>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
