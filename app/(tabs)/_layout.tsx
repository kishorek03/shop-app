import { Tabs, useRouter } from 'expo-router';
import { Menu, Divider, IconButton, Provider as PaperProvider } from 'react-native-paper';
import { useState } from 'react';

export default function TabsLayout() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const goToProfile = () => {
    closeMenu();
    router.push('/profile');
  };

  const handleLogout = () => {
    closeMenu();
    // Add any logout cleanup logic here
    router.replace('/');
  };

  return (
    <PaperProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: { // Customize the tab bar style
            display: 'flex', // Ensures the tabs are displayed
          },
          tabBarIconStyle: { // Customize tab bar icon style
            display: 'none', // If you don't want any icons
          },
          tabBarLabelStyle: { // Adjust the style of the tab labels
            fontSize: 16, // Custom font size if needed
          },
          headerRight: () => (
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <IconButton
                  icon="menu" // hamburger icon
                  size={24}
                  onPress={openMenu}
                  style={{ marginRight: 10 }}
                />
              }
            >
              <Menu.Item onPress={goToProfile} title="Profile" />
              <Divider />
              <Menu.Item onPress={handleLogout} title="Logout" />
            </Menu>
          ),
        }}
      >
        <Tabs.Screen name="sales" options={{ title: 'Sales' }} />
        <Tabs.Screen name="expense" options={{ title: 'Expense' }} />
      </Tabs>
    </PaperProvider>
  );
}
