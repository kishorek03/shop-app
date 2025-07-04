import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RecordCashMovementModal from '../../components/RecordCashMovementModal';
import getEnvConfig from '../../config/env';
import { useLanguage } from '../../context/LanguageContext';
import NotificationService from '../../services/NotificationService';
import { useAppFont } from '../_layout';
import { fetchMasterData, getAvailableFlavours } from '../utils/masterData';

const { API_BASE_URL } = getEnvConfig();

const { width } = Dimensions.get('window');

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export default function SalesScreen() {
  const { t } = useLanguage();
  const { fontFamily } = useAppFont();
  const isTamil = useLanguage().currentLanguage === 'ta';
  const [paymentMode, setPaymentMode] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [products, setProducts] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [refreshAnim] = useState(new Animated.Value(0));
  const [lastOrder, setLastOrder] = useState(null);
  const [sales, setSales] = useState([{ 
    productId: '', 
    quantity: '', 
    salePrice: '', 
    isParcel: false,
    flavourId: '',
    addOnId: '',
    isCustomPrice: false
  }]);
  const router = useRouter();
  const [dailySummary, setDailySummary] = useState({
    totalSales: 0,
    totalExpense: 0,
    paymentMethodSales: {},
    salesBreakdown: [],
    expenseBreakdown: [],
    openingCash: 0,
    totalCashSalesToday: 0,
    totalCashExpensesToday: 0,
    netCashMovementsToday: 0,
    currentCashBalance: 0,
  });

  const scrollViewRef = useRef(null);
  const saleItemRefs = useRef([]);
  const [highlightedSaleIndex, setHighlightedSaleIndex] = useState(null);
  const [blinkAnim] = useState(new Animated.Value(0));

  const [isModalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', data: [], type: '' });
  const [isOpeningBalanceModalVisible, setOpeningBalanceModalVisible] = useState(false);
  const [inputOpeningBalance, setInputOpeningBalance] = useState('');
  const [isCashMovementModalVisible, setCashMovementModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]).start();

      fetchInitialData();

      // No cleanup needed for fetchInitialData, as it's a one-shot fetch on focus
      // For animations, you might want to reset them here if needed on unfocus
    }, [])
  );

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { products: fetchedProducts, flavours: fetchedFlavours, addOns: fetchedAddOns, paymentMethods: fetchedPaymentMethods, error } = await fetchMasterData();
      
      if (error) {
        Alert.alert('Error', 'Failed to load data. Please check your connection.');
        return;
      }

      setProducts(fetchedProducts);
      setFlavours(fetchedFlavours);
      setAddOns(fetchedAddOns);
      setPaymentMethods(fetchedPaymentMethods);

      // Set default payment mode to the first available method
      if (fetchedPaymentMethods.length > 0 && !paymentMode) {
        setPaymentMode(fetchedPaymentMethods[0].id.toString());
      }

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSale = () => {
    setSales(prevSales => {
      const updatedSales = [...prevSales, { 
        productId: '', 
        quantity: '', 
        salePrice: '', 
        isParcel: false,
        flavourId: '',
        addOnId: '',
        isCustomPrice: false
      }];
      const newIndex = updatedSales.length - 1;
      setHighlightedSaleIndex(newIndex);

      // Reset animation value and start blinking animation
      blinkAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
        ]),
        { iterations: 6 } 
      ).start();

      // Clear the highlight after 2 seconds
      setTimeout(() => {
        setHighlightedSaleIndex(null);
        blinkAnim.setValue(0);
      }, 2000);

      // Scroll to the new item
      setTimeout(() => {
        if (scrollViewRef.current && saleItemRefs.current[newIndex]) {
          saleItemRefs.current[newIndex].measureLayout(
            scrollViewRef.current,
            (x, y, width, height) => {
              scrollViewRef.current.scrollTo({
                y: y - 50, // Adjust offset to bring it into view with some padding
                animated: true,
              });
            },
            (error) => console.error('Measure layout error:', error)
          );
        }
      }, 100); 
      return updatedSales;
    });
  };

  const removeSale = (index) => {
    if (sales.length === 1) {
      setSales([{ 
        productId: '', 
        quantity: '', 
        salePrice: '', 
        isParcel: false,
        flavourId: '',
        addOnId: '',
        isCustomPrice: false
      }]);
    } else {
      const updatedSales = [...sales];
      updatedSales.splice(index, 1);
      setSales(updatedSales);
    }
  };


  const updateSale = async (index, field, value) => {
    const updated = [...sales];
    updated[index][field] = value;
    
    if (field === 'productId') {
      updated[index].flavourId = '';
      updated[index].addOnId = '';
    }
    
    // Only calculate if we have both product and quantity and it's not custom price
    if (!updated[index].isCustomPrice && 
        updated[index].productId && 
        updated[index].quantity && 
        ['productId', 'quantity', 'isParcel', 'flavourId', 'addOnId'].includes(field)) {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          Alert.alert('Error', 'Please login first');
          return;
        }

        const saleDTO = {
          productId: parseInt(updated[index].productId),
          quantity: parseInt(updated[index].quantity),
          parcel: updated[index].isParcel,
          flavourId: updated[index].flavourId ? parseInt(updated[index].flavourId) : null,
          addOnId: updated[index].addOnId ? parseInt(updated[index].addOnId) : null
        };

        const response = await fetch(`${API_BASE_URL}/sales/calculateAmount`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saleDTO),
        });

        const json = await response.json();
        
        if (response.ok && json.status === 'success') {
          updated[index].salePrice = json.data.toString();
          updated[index].amount = json.data; // Store the calculated amount
        } else {
          console.error('Failed to calculate amount:', json.message);
        }
      } catch (error) {
        console.error('Error calculating amount:', error);
      }
    }
    
    setSales(updated);
  };

  const calculateTotal = () => {
    return sales.reduce((total, sale) => {
      return total + (parseFloat(sale.salePrice) || 0);
    }, 0).toFixed(2);
  };

  const handleSaveOpeningBalance = async () => {
    const amount = parseFloat(inputOpeningBalance);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Validation Error', 'Please enter a valid opening balance.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      const today = new Date();
      const businessDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      const response = await fetch(`${API_BASE_URL}/daily-cash-balance/today`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessDate, amount, userId: 'admin' }), // Replace 'admin' with actual userId if available
      });

      const json = await response.json();

      if (response.ok && json.status === 'success') {
        Alert.alert('Success', 'Opening balance saved successfully!');
        setOpeningBalanceModalVisible(false);
        fetchDashboardSummary(); // Refresh summary after saving
      } else {
        Alert.alert('Error', json.message || 'Failed to save opening balance.');
      }
    } catch (error) {
      console.error('Error saving opening balance:', error);
      Alert.alert('Error', 'Failed to save opening balance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    const isValid = sales.every(sale => 
      sale.productId && sale.quantity && sale.salePrice
    );

    if (!isValid) {
      Alert.alert('Validation Error', 'Please fill in all required fields for each sale item.');
      return;
    }

    if (!paymentMode) {
      Alert.alert('Validation Error', 'Please select a payment method.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // Get the selected payment method
      const selectedPaymentMethod = paymentMethods.find(method => method.id.toString() === paymentMode);
      if (!selectedPaymentMethod) {
        Alert.alert('Error', 'Invalid payment method selected.');
        return;
      }

      const orderData = {
        paymentMethodId: selectedPaymentMethod.id,
        totalAmount: parseFloat(calculateTotal()),
        sales: sales.map(sale => {
          const quantity = parseInt(sale.quantity);
          const price = sale.isCustomPrice ? parseFloat(sale.salePrice) : parseFloat(sale.amount);
          
          return {
            productId: parseInt(sale.productId),
            flavourId: sale.flavourId ? parseInt(sale.flavourId) : null,
            addOnId: sale.addOnId ? parseInt(sale.addOnId) : null,
            quantity: quantity,
            amount: parseFloat(sale.amount),
            salePrice: price,
            parcel: sale.isParcel,
            orderId: null
          };
        })
      };

      console.log('Submitting order with data:', orderData); // Debug log

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const json = await response.json();
      
      if (response.status === 201 && json.status === 'success') {
        fetchDashboardSummary();
        // Store last order details with payment method name
        setLastOrder({
          totalAmount: orderData.totalAmount,
          paymentMode: selectedPaymentMethod.name,
          timestamp: new Date().toISOString()
        });
        
        Alert.alert('Success', json.message || 'Order submitted successfully');
        setSales([{ 
          productId: '', 
          quantity: '', 
          salePrice: '', 
          isParcel: false,
          flavourId: '',
          addOnId: '',
          isCustomPrice: false
        }]);
        // Reset to first payment method
        if (paymentMethods.length > 0) {
          setPaymentMode(paymentMethods[0].id.toString());
        }
        
        // Refresh daily summary after successful order
        fetchDashboardSummary();

        // Send order notification
        NotificationService.sendOrderNotification({
          id: json.data?.id || 'New',
          totalAmount: orderData.totalAmount,
          paymentMethod: selectedPaymentMethod.name
        });
      } else {
        Alert.alert('Error', json.message || 'Failed to submit order');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('Error', 'Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableFlavoursForProduct = (productId) => {
    return getAvailableFlavours(productId, products, flavours);
  };

  // Add logging to debug the data
  useEffect(() => {
    console.log('Products:', products);
    console.log('Flavours:', flavours);
  }, [products, flavours]);

  const fetchDashboardSummary = async () => {
    // Prevent multiple simultaneous calls
    if (isRefreshing) {
      console.log('Dashboard refresh already in progress, skipping...');
      return;
    }

    try {
      setIsRefreshing(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const startUTC = new Date(startOfDay.getTime() - startOfDay.getTimezoneOffset() * 60000).toISOString();
      const endUTC = new Date(endOfDay.getTime() - endOfDay.getTimezoneOffset() * 60000).toISOString();
      
      // Get today's date in YYYY-MM-DD format reliably
      const todayDate = today.toISOString().split('T')[0];

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [salesSummaryResponse, salesDetailsResponse, expensesResponse, openingBalanceResponse, netCashMovementResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/orders/summary?start=${startUTC}&end=${endUTC}`, { headers }),
        fetch(`${API_BASE_URL}/sales/fetch?startDate=${startUTC}&endDate=${endUTC}`, { headers }),
        fetch(`${API_BASE_URL}/expenses?start=${startUTC}&end=${endUTC}`, { headers }),
        fetch(`${API_BASE_URL}/daily-cash-balance/today`, { headers }),
        fetch(`${API_BASE_URL}/cash-movements/net-movement?date=${todayDate}`, { headers })
      ]);

      let totalSales = 0;
      const paymentMethodSales = {};
      let salesBreakdown = [];
      let totalCashSalesToday = 0;

      if (salesSummaryResponse.ok && salesDetailsResponse.ok) {
        const salesSummaryData = await salesSummaryResponse.json();
        const salesDetailsData = await salesDetailsResponse.json();

        if (salesSummaryData.status === 'success' && Array.isArray(salesSummaryData.data)) {
          const ordersMap = new Map(salesSummaryData.data.map(order => [order.id, { ...order, sales: [] }]));

          if (salesDetailsData && Array.isArray(salesDetailsData.data)) {
            salesDetailsData.data.forEach(sale => {
              if (ordersMap.has(sale.orderId)) {
                const order = ordersMap.get(sale.orderId);
                
                const product = products.find(p => p.id === sale.productId);
                const flavour = flavours.find(f => f.id === sale.flavourId);

                order.sales.push({
                  ...sale,
                  productName: product ? product.name : 'Product',
                  flavourName: flavour ? flavour.name : null
                });
                
                if (!order.createdAt && sale.createdAt) {
                  order.createdAt = sale.createdAt;
                }
              }
            });
          }
          
          salesBreakdown = Array.from(ordersMap.values());

          salesBreakdown.forEach(order => {
            totalSales += order.totalAmount;
            const paymentMethod = (order.paymentMethod || 'Unknown').trim().toUpperCase();
            if (!paymentMethodSales[paymentMethod]) {
              paymentMethodSales[paymentMethod] = 0;
            }
            paymentMethodSales[paymentMethod] += order.totalAmount;

            if (paymentMethod === 'CASH') {
              totalCashSalesToday += order.totalAmount;
            }
          });
        }
      }

      let totalExpense = 0;
      let expenseBreakdown = [];
      let totalCashExpensesToday = 0;
      if (expensesResponse.ok) {
        const expenseData = await expensesResponse.json();
        if (expenseData.status === 'success' && Array.isArray(expenseData.data)) {
          expenseBreakdown = expenseData.data;
          totalExpense = expenseData.data.reduce((sum, expense) => {
            if (expense.paymentMethodName.toUpperCase() === 'CASH') {
              totalCashExpensesToday += expense.amount;
            }
            return sum + expense.amount;
          }, 0);
        }
      }

      let openingCash = 0;
      if (openingBalanceResponse.ok) {
        const obData = await openingBalanceResponse.json();
        console.log('Opening balance response:', obData); // Debug log
        if (obData.status === 'success' && obData.data !== undefined) {
          // Handle both formats: data.amount and data as direct number
          if (typeof obData.data === 'number') {
            openingCash = parseFloat(obData.data);
          } else if (obData.data && obData.data.amount !== undefined) {
            openingCash = parseFloat(obData.data.amount);
          } else {
            openingCash = 0;
          }
          setInputOpeningBalance(openingCash.toString());
        } else {
          // If no opening balance for today, set to 0
          openingCash = 0;
          setInputOpeningBalance('0');
        }
      }

      let netCashMovementsToday = 0;
      if (netCashMovementResponse.ok) {
        const nmData = await netCashMovementResponse.json();
        console.log('Net cash movement response:', nmData); // Debug log
        if (nmData.status === 'success' && nmData.data !== undefined) {
          // Handle both formats: data.netAmount and data as direct number
          if (typeof nmData.data === 'number') {
            netCashMovementsToday = parseFloat(nmData.data);
          } else if (nmData.data && nmData.data.netAmount !== undefined) {
            netCashMovementsToday = parseFloat(nmData.data.netAmount);
          } else {
            netCashMovementsToday = 0;
          }
        }
      }
      
      const currentCashBalance = openingCash + totalCashSalesToday - totalCashExpensesToday + netCashMovementsToday;

      setDailySummary({
        totalSales,
        totalExpense,
        paymentMethodSales,
        salesBreakdown,
        expenseBreakdown,
        openingCash,
        totalCashSalesToday,
        totalCashExpensesToday,
        netCashMovementsToday,
        currentCashBalance,
      });

    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Only run this when master data is available to prevent race conditions.
    if (products.length > 0 && paymentMethods.length > 0) {
      fetchDashboardSummary();
      const interval = setInterval(fetchDashboardSummary, 60000);
      return () => clearInterval(interval);
    }
  }, [products, paymentMethods]);

  const handleRefresh = () => {
    // Prevent multiple rapid refreshes
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    refreshAnim.setValue(0);
    Animated.timing(refreshAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
    fetchDashboardSummary();
  };

  const handleShowBreakdown = (type) => {
    if (type === 'sales') {
      setModalContent({
        title: t('salesBreakdown'),
        data: dailySummary.salesBreakdown,
        type: 'sales',
      });
    } else {
      setModalContent({
        title: t('expenseBreakdown'),
        data: dailySummary.expenseBreakdown,
        type: 'expenses',
      });
    }
    setModalVisible(true);
  };

  if (loading && (products.length === 0 || flavours.length === 0 || addOns.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{t('loadingData')}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      {lastOrder && (
        <Animated.View 
          style={[
            styles.lastOrderContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.lastOrderHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text
              style={[
                styles.lastOrderTitle,
                { fontFamily, fontSize: isTamil ? 22 : 16, lineHeight: isTamil ? 34 : 22, paddingVertical: isTamil ? 6 : 2 }
              ]}
            >
              {t('lastOrder')}
            </Text>
          </View>
          <View style={styles.lastOrderDetails}>
            <Text
              style={[
                styles.lastOrderAmount,
                { fontFamily, fontSize: isTamil ? 22 : 15, lineHeight: isTamil ? 34 : 22, paddingVertical: isTamil ? 6 : 2 }
              ]}
            >
              ₹{lastOrder.totalAmount.toFixed(2)}
            </Text>
            <Text style={[styles.lastOrderInfo, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>
              {lastOrder.paymentMode} • {formatDate(lastOrder.timestamp)}
            </Text>
          </View>
        </Animated.View>
      )}
      <View style={styles.mainContainer}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text
              style={[
                styles.summaryTitle,
                { fontFamily, fontSize: isTamil ? 24 : 16, lineHeight: isTamil ? 36 : 24, paddingVertical: isTamil ? 8 : 4 }
              ]}
            >
              {t('salesSummary')}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
              disabled={isRefreshing}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: refreshAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#4CAF50" />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity onPress={() => handleShowBreakdown('sales')}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="trending-up-outline" size={24} color="#4CAF50" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={[styles.summaryLabel, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{t('totalSales')}</Text>
                  <Text style={[styles.summaryValue, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>₹{dailySummary.totalSales.toFixed(2)}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {Object.entries(dailySummary.paymentMethodSales).map(([method, amount]) => (
              <View key={method} style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons 
                    name={method === 'CASH' ? 'cash-outline' : 'phone-portrait-outline'} 
                    size={24} 
                    color="#4CAF50" 
                  />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={[styles.summaryLabel, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{t(method.toLowerCase())}</Text>
                  <Text style={[styles.summaryValue, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>₹{amount.toFixed(2)}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={() => handleShowBreakdown('expenses')}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="trending-down-outline" size={24} color="#e53935" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={[styles.summaryLabel, { fontFamily, lineHeight: 20, paddingVertical: 2, color: '#e53935' }]}>{t('totalExpense')}</Text>
                  <Text style={[styles.summaryValue, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>₹{dailySummary.totalExpense.toFixed(2)}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#28a745" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { fontFamily, lineHeight: 20, paddingVertical: 2, color: '#28a745' }]}>{t('openingCash')}</Text>
                <Text style={[styles.summaryValue, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>₹{dailySummary.openingCash.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="wallet-outline" size={24} color="#FFC107" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { fontFamily, lineHeight: 20, paddingVertical: 2, color: '#FFC107' }]}>{t('currentCash')}</Text>
                <Text style={[styles.summaryValue, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>₹{dailySummary.currentCashBalance.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={{ backgroundColor: '#fdfdfd', padding: 8 }}>
          {sales.map((sale, index) => (
            <Animated.View
              key={index} 
              ref={el => (saleItemRefs.current[index] = el)}
              style={[
                styles.saleContainer,
                highlightedSaleIndex === index && {
                  backgroundColor: blinkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#fff', '#e0ffe0'],
                  }),
                  borderColor: '#2E7D32',
                  borderWidth: 2,
                }
              ]}
            >
              <View style={styles.saleHeader}>
                <Text
                  style={[
                    styles.saleTitle,
                    { fontFamily, fontSize: isTamil ? 20 : 16, lineHeight: isTamil ? 32 : 22, paddingVertical: isTamil ? 6 : 2 }
                  ]}
                >
                  {t('item')} {index + 1}
                </Text>
                <View style={styles.removeButton}>
                  {sales.length > 1 && (
                    <TouchableOpacity 
                      onPress={() => removeSale(index)}
                      style={styles.smallButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#e53935" />
                    </TouchableOpacity>
                  )}
                  {index === sales.length - 1 && (
                    <TouchableOpacity 
                      onPress={handleAddSale}
                      style={styles.smallButton}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 1 }]}>{t('product')}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sale.productId}
                  onValueChange={(value) => updateSale(index, 'productId', value)}
                  style={styles.picker}
                  mode="dropdown"
                  enabled={products.length > 0}
                >
                  <Picker.Item label={t('selectProduct')} value="" color="#888" style={{ fontFamily }} />
                  {products.map((product) => (
                    <Picker.Item 
                      key={`product-${product.id}`}
                      label={`${product.name} (₹${product.unitPrice})`}
                      value={product.id.toString()}
                    />
                  ))}
                </Picker>
              </View>

              {sale.productId && getAvailableFlavoursForProduct(sale.productId).length > 0 && (
                <>
                  <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('flavour')}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={sale.flavourId}
                      onValueChange={(value) => updateSale(index, 'flavourId', value)}
                      style={styles.picker}
                      mode="dropdown"
                    >
                      <Picker.Item label={t('selectFlavour')} value="" style={{ fontFamily }} />
                      {getAvailableFlavoursForProduct(sale.productId).map((flavour) => (
                        <Picker.Item 
                          key={`flavour-${flavour.id}`}
                          label={`${flavour.name} (+₹${flavour.price})`}
                          value={flavour.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              {sale.productId && addOns && addOns.length > 0 && (
                <>
                  <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('addOn')}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={sale.addOnId}
                      onValueChange={(value) => updateSale(index, 'addOnId', value)}
                      style={styles.picker}
                      mode="dropdown"
                    >
                      <Picker.Item label={t('noAddOn')} value="" style={{ fontFamily }} />
                      {addOns.map((addOn) => (
                        <Picker.Item 
                          key={`addon-${addOn.id}`}
                          label={`${addOn.name} (+₹${addOn.price})`}
                          value={addOn.id.toString()}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('quantity')}</Text>
                <TextInput
                  style={[styles.input, { fontFamily, lineHeight: 22, paddingVertical: 6 }]}
                  placeholder={t('enterQuantity')}
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={sale.quantity}
                  onChangeText={(value) => updateSale(index, 'quantity', value)}
                />
              </View>

              <View style={styles.parcelContainer}>
                <Text style={[styles.checkboxLabel, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('parcel')}</Text>
                <TouchableOpacity 
                  onPress={() => updateSale(index, 'isParcel', !sale.isParcel)}
                  style={styles.checkboxContainer}
                >
                  <Ionicons
                    name={sale.isParcel ? 'checkbox-outline' : 'square-outline'}
                    size={24}
                    color="#4CAF50"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.parcelContainer}>
                <Text style={[styles.checkboxLabel, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('customPrice')}</Text>
                <TouchableOpacity 
                  onPress={() => updateSale(index, 'isCustomPrice', !sale.isCustomPrice)}
                  style={styles.checkboxContainer}
                >
                  <Ionicons
                    name={sale.isCustomPrice ? 'checkbox-outline' : 'square-outline'}
                    size={24}
                    color="#4CAF50"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('salePrice')}</Text>
                <TextInput
                  style={[
                    styles.input,
                    sale.isCustomPrice && styles.priceInput,
                    { fontFamily, lineHeight: 22, paddingVertical: 6 }
                  ]}
                  placeholder={t('enterPrice')}
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  editable={sale.isCustomPrice}
                  value={sale.salePrice}
                  onChangeText={(value) => updateSale(index, 'salePrice', value)}
                />
              </View>
            </Animated.View>
          
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{t('totalAmount')}:</Text>
            <Text style={[styles.totalAmount, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{calculateTotal()}</Text>
          </View>

          <View style={styles.paymentContainer}>
            <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('paymentMode')}</Text>
            <View style={styles.radioGroupContainer}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={styles.radioButtonContainer}
                  onPress={() => setPaymentMode(method.id.toString())}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioOuterCircle}>
                    {paymentMode === method.id.toString() && <View style={styles.radioInnerCircle} />}
                  </View>
                  <Text style={[styles.radioLabel, { fontFamily }]}>{method.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmitOrder}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={styles.submitButtonContent}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitButtonInner}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={[styles.submitButtonText, { fontFamily, lineHeight: 22, paddingVertical: 2 }]}>{t('submitOrder')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setModalVisible(!isModalVisible);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{modalContent.title}</Text>
            <FlatList
              data={modalContent.data}
              keyExtractor={(item, index) => (item.id || item.expenseId || index).toString()}
              style={{ width: '100%' }}
              renderItem={({ item }) =>
                modalContent.type === 'sales' ? (
                  <View style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderTitle}>Order #{item.id}</Text>
                      <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                    {(item.sales || []).map((sale, index) => (
                      <View key={index} style={styles.saleItem}>
                        <Text style={styles.saleItemText}>
                          {sale.quantity}x {sale.productName}
                          {sale.flavourName ? ` (${sale.flavourName})` : ''}
                          {sale.parcel ? ` (${t('parcel')})` : ''}
                        </Text>
                        <Text style={styles.saleItemPrice}>₹{sale.salePrice.toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={styles.orderFooter}>
                      <Text style={styles.orderPayment}>{t(item.paymentMethod.toLowerCase())}</Text>
                      <Text style={styles.orderTotal}>Total: ₹{item.totalAmount.toFixed(2)}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownText}>
                      {item.item} - {t(item.paymentMethodName.toLowerCase())}
                    </Text>
                    <Text style={styles.breakdownAmount}>₹{item.amount.toFixed(2)}</Text>
                  </View>
                )
              }
            />
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={() => setModalVisible(!isModalVisible)}
            >
              <Text style={styles.textStyle}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isOpeningBalanceModalVisible}
        onRequestClose={() => setOpeningBalanceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{t('setOpeningBalance')}</Text>
            <TextInput
              style={[styles.input, { fontFamily, lineHeight: 26, paddingVertical: 8 }]}
              placeholder={t('enterOpeningBalance')}
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={inputOpeningBalance}
              onChangeText={setInputOpeningBalance}
            />
            <TouchableOpacity
              style={[styles.button, styles.buttonClose, { backgroundColor: '#4CAF50' }]}
              onPress={handleSaveOpeningBalance}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.textStyle}>{t('save')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonClose, { backgroundColor: '#E53935', marginTop: 10 }]}
              onPress={() => setOpeningBalanceModalVisible(false)}
            >
              <Text style={styles.textStyle}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <RecordCashMovementModal
        isVisible={isCashMovementModalVisible}
        onClose={() => setCashMovementModalVisible(false)}
        onMovementRecorded={fetchDashboardSummary}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 300,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4CAF50',
  },
  totalLabel: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  saleContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    minHeight: 100,
    borderColor: '#4CAF50',
    borderWidth: 1
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    padding: 8,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 6,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
   
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#fff',
    minHeight: 56,
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 0,
  },
  picker: {
    height: 50,
    color: '#333',
    backgroundColor: '#fff',
    width: '100%',
    fontSize: 16,
    textAlignVertical: 'center',
    paddingVertical: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    height: 56,
    width: '100%',
    textAlignVertical: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
    marginBottom: Platform.OS === 'android' ? 16 : 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  lastOrderContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  lastOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastOrderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  lastOrderDetails: {
    marginLeft: 32,
  },
  lastOrderAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  lastOrderInfo: {
    fontSize: 14,
    color: '#666',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  paymentContainer: {
    marginBottom: 0,
  },
  buttonDisabled: {
    backgroundColor: '#81C784',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    padding: 6,
  },
  priceInput: {
    backgroundColor: '#f0f9f0',
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  parcelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minWidth: width * 0.2,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '95%',
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    width: '100%',
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
    alignSelf: 'center',
    paddingHorizontal: 30,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  breakdownText: {
    fontSize: 16,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  saleItemText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  saleItemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orderPayment: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  radioGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  radioOuterCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  highlightedSaleContainer: {
    backgroundColor: '#e0ffe0',
    borderColor: '#2E7D32',
    borderWidth: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    elevation: 2,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});