import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useAppFont } from '../../app/_layout';

export function CustomMenu({ visible, onDismiss, menuItems }) {
  const { fontFamily } = useAppFont();

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
        <Text style={{ fontFamily, lineHeight: 26, paddingVertical: 2, fontSize: 15 }}>{item.title}</Text>
      </View>
    </Pressable>
  );

  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <>
        <Pressable 
          style={styles.webOverlay}
          onPress={() => onDismiss(false)}
        />
        <View style={styles.webMenuContent}>
          {menuItems.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </View>
      </>
    );
  }

  return (
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
        <Pressable 
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {menuItems.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  menuButton: {
    margin: 0,
  },
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  webMenuContent: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 200,
    boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
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
    boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
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