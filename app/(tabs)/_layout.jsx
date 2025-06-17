import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, useWindowDimensions, View } from 'react-native';
import { IconButton, Provider as PaperProvider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomMenu } from '../../components/ui/CustomMenu';
import { useLanguage } from '../../context/LanguageContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    checkUserRole();
  }, []);

  const isLargeScreen = width > 400; 
  const headerHeight = Platform.select({
    ios: isLargeScreen ? 96 : 80,  // 🔼 increased
    android: isLargeScreen ? 84 : 72,
  }) + insets.top;
  
  const tabBarHeight = Platform.select({
    ios: isLargeScreen ? 90 : 72,  // 🔼 increased
    android: isLargeScreen ? 84 : 72,
  }) + insets.bottom;
  
  const headerTitleSize = isLargeScreen ? 20 : 18;
  const tabLabelSize = isLargeScreen ? 14 : 12;
  const checkUserRole = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.roles && Array.isArray(userData.roles)) {
          const isAdminUser = userData.roles.includes('ROLE_ADMIN') || userData.roles.includes('ROLE_SUPERADMIN');
          setIsAdmin(isAdminUser);
        } else {
          setIsAdmin(false);
        }
      } else {
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
      console.error('Log out error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to Log out. Please try again.');  
      }
    }
  };

  const handleSignOut = useCallback(() => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('logoutConfirm'))) {
        handleSignOutConfirmed();
      }
    } else {
      Alert.alert(
        t('logout'),
        t('logoutConfirm'),
        [
          {
            text: t('cancel'),
            style: 'cancel'
          },
          {
            text: t('logout'),
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
    setTimeout(() => {
      router.push('/(tabs)/report');
    }, 100);
  }, [router]);

  const handleSettings = useCallback(() => {
    setMenuVisible(false);
    setTimeout(() => {
      router.push({
        pathname: '/settings',
        params: { isAdmin: isAdmin.toString() } 
      });
    }, 100);
  }, [isAdmin, router]);

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
      onPress: handleSettings, 
    });

    items.push({
      title: t('logout'),
      icon: 'logout',
      onPress: handleSignOut
    });
    
    return items;
  }, [isAdmin, handleReport, handleSignOut, handleSettings, t]);

  return (
    <PaperProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#eee',
            height: tabBarHeight,
            paddingBottom: Platform.select({
              ios: insets.bottom,
              android: insets.bottom + (isLargeScreen ? 12 : 8),
            }),
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarActiveTintColor: '#2e7d50',
          tabBarInactiveTintColor: '#81c784',
          tabBarLabelStyle: {
            fontSize: tabLabelSize,
            fontWeight: '600', 
            
            paddingTop: 4,
          },
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            height: headerHeight,
          },
          headerTitleStyle: {
            color: '#4CAF50',
            fontSize: 23,
            fontWeight: '800', 
            includeFontPadding: false,
            lineHeight: headerTitleSize + 6,
          },
          headerRightContainerStyle: {
            paddingRight: 16,
            paddingBottom: Platform.select({
              ios: insets.top / 2,
              android: 0,
            }),
          },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon={({ color, size }) => (
                  <Ionicons name="menu-outline" size={size} color={color} />
                )}
                size={24}
                onPress={() => setMenuVisible(true)}
                accessibilityLabel="Open menu"
              />
              <CustomMenu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
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
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings'),
            href: null, 
          }}
        />
      </Tabs>
    </PaperProvider>
  );
}