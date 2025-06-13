import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { CustomMenu } from '../../components/ui/CustomMenu';
import { useLanguage } from '../../context/LanguageContext';

export default function TabsLayout() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLanguage();

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
        title: t('report'),
        icon: 'chart-bar',
        onPress: handleReport
      });
    }

    items.push({
      title: t('settings'),
      icon: 'cog',
      onPress: () => {
        router.push('/settings');
        setMenuVisible(false);
      },
    });

    items.push({
      title: t('logout'),
      icon: 'logout',
      onPress: handleSignOut
    });
    
    return items;
  }, [isAdmin, handleReport, handleSignOut, router, t]);

  return (
    <PaperProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#2e7d50',
          tabBarInactiveTintColor: '#81c784',
          tabBarLabelStyle: styles.tabLabel,
          headerStyle: {
            backgroundColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
            height: Platform.OS === 'android' ? 64 : 56,
          },
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
            title: t('sales'),
            tabBarIcon: ({ color }) => (
              <Ionicons name="cash-outline" size={24} color={color} />
            ),
          }} 
        /> 
        <Tabs.Screen 
          name="expense" 
          options={{ 
            title: t('expense'),
            tabBarIcon: ({ color }) => (
              <Ionicons name="wallet-outline" size={24} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="report" 
          options={{ 
            title: t('report'),
            href: null,
          }} 
        />
      </Tabs>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: Platform.OS === 'android' ? 64 : 56,
    paddingBottom: Platform.OS === 'android' ? 8 : 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: Platform.OS === 'android' ? 4 : 2,
  },
  headerTitle: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: '600',
  },
  menuContainer: {
    marginRight: 8,
    padding: 4,
  },
});