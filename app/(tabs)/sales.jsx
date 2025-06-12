import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { fetchMasterData, getAvailableFlavours } from '../utils/masterData';

const API_BASE_URL = 'http://localhost:8080/api';
const { width } = Dimensions.get('window');

export default function SalesScreen() {
  const { t } = useLanguage();
  const [paymentMode, setPaymentMode] = useState('cash');
  const [products, setProducts] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
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
    totalOrders: 0,
    totalAmount: 0,
    cashAmount: 0,
    upiAmount: 0
  });

  useEffect(() => {
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
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { products: fetchedProducts, flavours: fetchedFlavours, addOns: fetchedAddOns, error } = await fetchMasterData();
      
      if (error) {
        Alert.alert('Error', 'Failed to load data. Please check your connection.');
        return;
      }

      setProducts(fetchedProducts);
      setFlavours(fetchedFlavours);
      setAddOns(fetchedAddOns);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSale = () => {
    setSales([...sales, { 
      productId: '', 
      quantity: '', 
      salePrice: '', 
      isParcel: false,
      flavourId: '',
      addOnId: '',
      isCustomPrice: false
    }]);
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

  const calculateAmount = (sale, product) => {
    if (!product || !sale.quantity) return '0';
    
    const quantity = parseInt(sale.quantity);
    const basePrice = parseFloat(product.unitPrice) || 0;
    const parcelCharge = sale.isParcel ? (parseFloat(product.parcelPrice) || 0) : 0;
    
    let flavourPrice = 0;
    if (sale.flavourId) {
      const selectedFlavour = flavours.find(f => f.id === parseInt(sale.flavourId));
      if (selectedFlavour) {
        flavourPrice = parseFloat(selectedFlavour.price);
      }
    }

    let addOnPrice = 0;
    if (sale.addOnId) {
      const selectedAddOn = addOns.find(a => a.id === parseInt(sale.addOnId));
      if (selectedAddOn) {
        addOnPrice = parseFloat(selectedAddOn.price);
      }
    }

    const pricePerUnit = basePrice + flavourPrice + addOnPrice + parcelCharge;
    const totalAmount = quantity * pricePerUnit;
    return totalAmount.toFixed(2);
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

  const handleSubmitOrder = async () => {
    const isValid = sales.every(sale => 
      sale.productId && sale.quantity && sale.salePrice
    );

    if (!isValid) {
      Alert.alert('Validation Error', 'Please fill in all required fields for each sale item.');
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

      // Normalize payment method
      const normalizedPaymentMode = paymentMode.trim().toUpperCase();
      const paymentMethodId = normalizedPaymentMode === 'CASH' ? 1 : 2;

      const orderData = {
        paymentMethodId: paymentMethodId,
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
        // Store last order details with normalized payment method
        setLastOrder({
          totalAmount: orderData.totalAmount,
          paymentMode: normalizedPaymentMode,
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
        setPaymentMode('cash');
        
        // Refresh daily summary after successful order
        fetchDailySummary();
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

  const fetchDailySummary = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        return;
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      // Convert to UTC while preserving the local date
      const startUTC = new Date(startOfDay.getTime() - startOfDay.getTimezoneOffset() * 60000);
      const endUTC = new Date(endOfDay.getTime() - endOfDay.getTimezoneOffset() * 60000);

      const response = await fetch(
        `${API_BASE_URL}/orders/summary?start=${startUTC.toISOString()}&end=${endUTC.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          // Calculate totals
          const summary = data.data.reduce((acc, order) => {
            acc.totalOrders++;
            acc.totalAmount += order.totalAmount;
            
            // Normalize payment method to handle case sensitivity and whitespace
            const paymentMethod = (order.paymentMethod || '').trim().toUpperCase();
            
            if (paymentMethod === 'CASH') {
              acc.cashAmount += order.totalAmount;
            } else if (paymentMethod === 'UPI') {
              acc.upiAmount += order.totalAmount;
            } else {
              // Handle any other payment methods or unknown cases
              console.log('Unknown payment method:', order.paymentMethod);
            }
            return acc;
          }, {
            totalOrders: 0,
            totalAmount: 0,
            cashAmount: 0,
            upiAmount: 0
          });

          // Log the summary for debugging
          console.log('Daily Summary:', summary);
          setDailySummary(summary);
        }
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  };

  useEffect(() => {
    fetchDailySummary();
    // Refresh summary every minute
    const interval = setInterval(fetchDailySummary, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && (products.length === 0 || flavours.length === 0 || addOns.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContainer}
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
            <Text style={styles.lastOrderTitle}>Last Order</Text>
          </View>
          <View style={styles.lastOrderDetails}>
            <Text style={styles.lastOrderAmount}>₹{lastOrder.totalAmount.toFixed(2)}</Text>
            <Text style={styles.lastOrderInfo}>
              {lastOrder.paymentMode === 'cash' ? 'Cash' : 'UPI'} • {new Date(lastOrder.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </Animated.View>
      )}
      <View style={styles.mainContainer}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Today's Summary</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchDailySummary}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="cart-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Today's Orders</Text>
                <Text style={styles.summaryValue}>{dailySummary.totalOrders}</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Total Amount</Text>
                <Text style={styles.summaryValue}>₹{dailySummary.totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="wallet-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Cash Sales</Text>
                <Text style={styles.summaryValue}>₹{dailySummary.cashAmount.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="phone-portrait-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>UPI Sales</Text>
                <Text style={styles.summaryValue}>₹{dailySummary.upiAmount.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {sales.map((sale, index) => (
          <Animated.View 
            key={index} 
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Item {index + 1}</Text>
              <View style={styles.cardActions}>
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

            <Text style={styles.label}>Product</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={sale.productId}
                onValueChange={(value) => updateSale(index, 'productId', value)}
                style={styles.picker}
                dropdownIconColor="#4CAF50"
              >
                <Picker.Item label="Select Product" value="" />
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
                <Text style={styles.label}>Flavour</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={sale.flavourId}
                    onValueChange={(value) => updateSale(index, 'flavourId', value)}
                    style={styles.picker}
                    dropdownIconColor="#4CAF50"
                  >
                    <Picker.Item label="Select Flavour" value="" />
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
                <Text style={styles.label}>Add-On</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={sale.addOnId}
                    onValueChange={(value) => updateSale(index, 'addOnId', value)}
                    style={styles.picker}
                    dropdownIconColor="#4CAF50"
                  >
                    <Picker.Item label="No Add-On" value="" />
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
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={sale.quantity}
                onChangeText={(value) => updateSale(index, 'quantity', value)}
              />
            </View>

            <View style={styles.parcelContainer}>
              <Text style={styles.checkboxLabel}>Parcel</Text>
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
              <Text style={styles.checkboxLabel}>Custom Price</Text>
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
              <Text style={styles.label}>Sale Price</Text>
              <TextInput
                style={[
                  styles.input,
                  sale.isCustomPrice && styles.priceInput
                ]}
                placeholder="Enter price"
                placeholderTextColor="#888"
                keyboardType="numeric"
                editable={sale.isCustomPrice}
                value={sale.salePrice}
                onChangeText={(value) => updateSale(index, 'salePrice', value)}
              />
            </View>
          </Animated.View>
        ))}

        <View style={styles.summaryContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₹{calculateTotal()}</Text>
          </View>

          <View style={styles.paymentContainer}>
            <Text style={styles.label}>Payment Mode</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={paymentMode}
                onValueChange={setPaymentMode}
                style={styles.picker}
                dropdownIconColor="#4CAF50"
              >
                <Picker.Item label="Cash" value="cash" />
                <Picker.Item label="UPI" value="upi" />
              </Picker>
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
                <Text style={styles.submitButtonText}>Submit Order</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallButton: {
    padding: 6,
  },
  label: {
    fontWeight: '600',
    marginTop: 5,
    marginBottom: 8,
    color: '#2E7D32',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#333',
  },
  priceInput: {
    backgroundColor: '#f0f9f0',
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  parcelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  checkboxLabel: {
    marginRight: 10,
    color: '#2E7D32',
    fontSize: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 46,
    color: '#333',
    fontSize: 15,
  },
  summaryContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    minWidth: width * 0.35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2E7D32',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  paymentContainer: {
    marginBottom: 0,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  inputContainer: {
    marginBottom: 16,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxContainer: {
    padding: 4,
  },
  lastOrderContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  lastOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastOrderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  lastOrderDetails: {
    marginLeft: 32,
  },
  lastOrderAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});