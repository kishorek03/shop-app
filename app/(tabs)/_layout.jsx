import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { CustomMenu } from '../../components/ui/CustomMenu';

export default function TabsLayout() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      console.log('Checking user role...');
      const userDataStr = await AsyncStorage.getItem('userData');
      console.log('Raw userData from storage:', userDataStr);
      
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        console.log('Parsed userData:', userData);
        
        // Check if roles array exists and contains admin role
        if (userData.roles && Array.isArray(userData.roles)) {
          const isAdminUser = userData.roles.includes('ROLE_ADMIN') || userData.roles.includes('ROLE_SUPERADMIN');
          console.log('Is admin?', isAdminUser);
          setIsAdmin(isAdminUser);
        } else {
          console.log('No roles array found in userData');
          setIsAdmin(false);
        }
      } else {
        console.log('No userData found in storage');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAdmin(false);
    }
  };

  const handleSignOutConfirmed = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData']);
      router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    }
  };

  const handleSignOut = useCallback(() => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        handleSignOutConfirmed();
      }
    } else {
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
            onPress: handleSignOutConfirmed
          }
        ],
        { cancelable: true }
      );
    }
  }, []);

  const handleReport = useCallback(() => {
    setMenuVisible(false);
    // Use setTimeout to ensure the menu is closed before navigation
    setTimeout(() => {
      router.push('/(tabs)/report');
    }, 100);
  }, [router]);

  const getMenuItems = useCallback(() => {
    const items = [];
    
    if (isAdmin) {
      items.push({
        icon: 'chart-bar',
        title: 'Report',
        onPress: handleReport
      });
    }
    
    items.push({
      icon: 'logout',
      title: 'Sign Out',
      onPress: handleSignOut
    });
    
    return items;
  }, [isAdmin, handleReport, handleSignOut]);

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
              <CustomMenu
                visible={menuVisible}
                onDismiss={setMenuVisible}
                menuItems={getMenuItems()}
              />
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
        <Tabs.Screen 
          name="report" 
          options={{ 
            href: null,
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
});