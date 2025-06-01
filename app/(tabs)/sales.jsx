import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const API_BASE_URL = 'http://localhost:8080/api';

export default function SalesScreen() {
  const [sales, setSales] = useState([{ 
    productId: '', 
    quantity: '', 
    salePrice: '', 
    isParcel: false,
    flavourId: '',
    addOnId: ''
  }]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [products, setProducts] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

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
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const [productsRes, flavoursRes, addOnsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/flavours`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/addons`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      const [productsJson, flavoursJson, addOnsJson] = await Promise.all([
        productsRes.json(),
        flavoursRes.json(),
        addOnsRes.json()
      ]);

      if (productsRes.ok && productsJson.status === 'success') {
        setProducts(productsJson.data.filter(p => p && p.unitId).map(p => ({
          ...p,
          id: p.unitId
        })));
      }

      if (flavoursRes.ok && flavoursJson.status === 'success') {
        setFlavours(flavoursJson.data.filter(f => f && f.id));
      }

      if (addOnsRes.ok && addOnsJson.status === 'success') {
        setAddOns(addOnsJson.data.filter(a => a && a.id));
      }

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
      addOnId: ''
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
        addOnId: ''
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

  const updateSale = (index, field, value) => {
    const updated = [...sales];
    updated[index][field] = value;
    
    if (field === 'productId') {
      updated[index].flavourId = '';
      updated[index].addOnId = '';
    }
    
    if (updated[index].productId) {
      const product = products.find(p => p.id === parseInt(updated[index].productId));
      if (product) {
        updated[index].salePrice = calculateAmount(updated[index], product);
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
        return;
      }

      const orderData = {
        paymentMethodId: paymentMode === 'cash' ? 1 : 2,
        totalAmount: parseFloat(calculateTotal()),
        sales: sales.map(sale => ({
          productId: parseInt(sale.productId),
          flavourId: sale.flavourId ? parseInt(sale.flavourId) : null,
          addOnId: sale.addOnId ? parseInt(sale.addOnId) : null,
          quantity: parseInt(sale.quantity),
          amount: parseFloat(sale.salePrice),
          salePrice: parseFloat(sale.salePrice) / parseInt(sale.quantity),
          parcel: sale.isParcel,
          orderId: null
        }))
      };

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
        Alert.alert('Success', json.message || 'Order submitted successfully');
        setSales([{ 
          productId: '', 
          quantity: '', 
          salePrice: '', 
          isParcel: false,
          flavourId: '',
          addOnId: ''
        }]);
        setPaymentMode('cash');
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
      <View>
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

            {sale.productId && (
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
                    {flavours.map((flavour) => (
                      <Picker.Item 
                        key={`flavour-${flavour.id}`}
                        label={`${flavour.name} (+₹${flavour.price})`}
                        value={flavour.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Add-On</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={sale.addOnId}
                    onValueChange={(value) => updateSale(index, 'addOnId', value)}
                    style={styles.picker}
                    dropdownIconColor="#4CAF50"
                  >
                    <Picker.Item label="No Add-On" value="" />
                    {addOns && addOns.length > 0 && addOns.map((addOn) => (
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

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={sale.quantity}
              onChangeText={(value) => updateSale(index, 'quantity', value)}
            />

            <View style={styles.parcelContainer}>
              <Text style={styles.checkboxLabel}>Parcel</Text>
              <TouchableOpacity onPress={() => updateSale(index, 'isParcel', !sale.isParcel)}>
                <Ionicons
                  name={sale.isParcel ? 'checkbox-outline' : 'square-outline'}
                  size={24}
                  color="#4CAF50"
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="Sale Price"
              placeholderTextColor="#888"
              keyboardType="numeric"
              editable={false}
              value={sale.salePrice}
            />
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
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Order</Text>
              </>
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
    backgroundColor: '#f9f9f9',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
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
});