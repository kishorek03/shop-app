import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
  }

  // Request permissions and get push token
  async initialize() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '656cb6dd-c26b-4d00-9aeb-b860a914a13f', // Your Expo project ID
      });
      
      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);
      
      // Store token for later use
      await AsyncStorage.setItem('expoPushToken', this.expoPushToken);
      
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Send local notification (for immediate feedback)
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Send push notification to server (for cross-device notifications)
  async sendPushNotification(title, body, data = {}) {
    if (!this.expoPushToken) {
      console.log('No push token available');
      return;
    }

    try {
      const message = {
        to: this.expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send order notification
  async sendOrderNotification(orderData) {
    const title = 'New Order Received!';
    const body = `Order #${orderData.id || 'New'} - ₹${orderData.totalAmount || 0}`;
    const data = {
      type: 'order',
      orderId: orderData.id,
      totalAmount: orderData.totalAmount,
    };

    // Send local notification immediately
    await this.sendLocalNotification(title, body, data);
    
    // You can also send to server for cross-device notifications
    // await this.sendPushNotification(title, body, data);
  }

  // Send expense notification
  async sendExpenseNotification(expenseData) {
    const title = 'New Expense Recorded!';
    const body = `${expenseData.item || 'Expense'} - ₹${expenseData.amount || 0}`;
    const data = {
      type: 'expense',
      expenseId: expenseData.id,
      amount: expenseData.amount,
      item: expenseData.item,
    };

    // Send local notification immediately
    await this.sendLocalNotification(title, body, data);
    
    // You can also send to server for cross-device notifications
    // await this.sendPushNotification(title, body, data);
  }

  // Get stored push token
  async getStoredToken() {
    try {
      return await AsyncStorage.getItem('expoPushToken');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }
}

export default new NotificationService(); 