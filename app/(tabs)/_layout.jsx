import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { IconButton, Menu, Provider as PaperProvider } from 'react-native-paper';

export default function TabsLayout() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleSignOut = () => {
    closeMenu();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
              setTimeout(() => {
                router.replace('/');
              }, 100);
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <PaperProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#2e7d50',
          tabBarInactiveTintColor: '#81c784',
          tabBarLabelStyle: styles.tabLabel,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerRight: () => (
            <View style={styles.menuContainer}>
              <Menu
                visible={menuVisible}
                onDismiss={closeMenu}
                anchor={
                  <IconButton
                    icon="menu"
                    size={24}
                    onPress={openMenu}
                    style={styles.menuButton}
                    color="#2e7d50"
                  />
                }
                contentStyle={styles.menuContent}
              >
                <Menu.Item 
                  onPress={handleSignOut}
                  title="Sign Out"
                  leadingIcon="logout"
                  titleStyle={styles.menuItemText}
                />
              </Menu>
            </View>
          ),
        }}
      >
        <Tabs.Screen 
          name="sales" 
          options={{ 
            title: 'Sales',
            tabBarIcon: ({ color }) => (
              <Ionicons name="cash-outline" size={24} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="expense" 
          options={{ 
            title: 'Expense',
            tabBarIcon: ({ color }) => (
              <Ionicons name="wallet-outline" size={24} color={color} />
            ),
          }} 
        />
      </Tabs>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 3,
    borderTopColor: '#e9ecef',
    height: 60,
    paddingBottom: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginBottom: 5,
  },
  header: {
    backgroundColor: '#ffffff',
    shadowColor: '#2e7d50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    color: '#2e7d50',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
  },
  menuContainer: {
    marginRight: 8,
  },
  menuButton: {
    margin: 0,
  },
  menuContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 40,
    minWidth: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItemText: {
    color: '#2e7d50',
    fontSize: 16,
    fontWeight: '500',
  },
});