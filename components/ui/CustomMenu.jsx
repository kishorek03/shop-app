import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';

export function CustomMenu({ visible, onDismiss, menuItems }) {
  const MenuButton = () => (
    <IconButton
      icon="menu"
      size={24}
      onPress={() => onDismiss(true)}
      style={styles.menuButton}
      color="#2e7d50"
    />
  );

  const MenuItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed
      ]}
      onPress={() => {
        item.onPress();
        onDismiss(false);
      }}
    >
      <View style={styles.menuItemInner}>
        <IconButton
          icon={item.icon}
          size={20}
          color="#2e7d50"
          style={styles.menuItemIcon}
        />
        <Text style={styles.menuItemText}>{item.title}</Text>
      </View>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <MenuButton />
        {visible && (
          <View style={styles.webMenuContent}>
            {menuItems.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <>
      <MenuButton />
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => onDismiss(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => onDismiss(false)}
        >
          <View style={styles.modalContent}>
            {menuItems.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  menuButton: {
    margin: 0,
  },
  webMenuContent: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  menuItemIcon: {
    margin: 0,
    marginRight: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#2e7d50',
    fontWeight: '500',
  },
}); 