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
  View,
} from 'react-native';
import getEnvConfig from '../../config/env';
import { useLanguage } from '../../context/LanguageContext';
import NotificationService from '../../services/NotificationService';
import { useAppFont } from '../_layout';

const { API_BASE_URL } = getEnvConfig();

export default function ExpenseScreen() {
  const { t } = useLanguage();
  const { fontFamily } = useAppFont();
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [successAnim] = useState(new Animated.Value(0));
  const [showSuccess, setShowSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMode, setPaymentMode] = useState('');
  const [lastExpense, setLastExpense] = useState(null);
  const [expense, setExpense] = useState({
    item: '',
    quantity: '',
    amount: '',
    unitId: '',
    categoryId: '',
    paymentMethodId: '',
    remarks: ''
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

    fetchCategories();
    fetchUnits();
    fetchPaymentMethods();
  }, []);

  const fetchUnits = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const unitsResponse = await fetch(`${API_BASE_URL}/units`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!unitsResponse.ok) {
        const errorData = await unitsResponse.json();
        console.error('Units API Error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch units');
      }

      const unitsData = await unitsResponse.json();
      console.log('Units Response:', unitsData);
      
      if (!unitsData.data || !Array.isArray(unitsData.data)) {
        console.error('Invalid units data format:', unitsData);
        throw new Error('Invalid units data format');
      }

      const validUnits = unitsData.data
        .filter(unit => {
          const isValid = unit && 
            (unit.id || unit.unitId) && 
            unit.name;
          
          if (!isValid) {
            console.warn('Invalid unit found:', unit);
          }
          return isValid;
        })
        .map(unit => ({
          id: Number(unit.id || unit.unitId), 
          name: unit.name,
          abbreviation: unit.abbreviation || ''
        }));

      console.log('Processed Units:', validUnits);

      if (validUnits.length === 0) {
        console.error('No valid units found in response');
        throw new Error('No valid units found');
      }

      setUnits(validUnits);
    } catch (error) {
      console.error('Error loading units:', error);
      Alert.alert('Error', error.message || 'Failed to load units. Please check your connection.');
      setUnits([]); 
    }
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }


      const categoriesResponse = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!categoriesResponse.ok) {
        const errorData = await categoriesResponse.json();
        console.error('Categories API Error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch categories');
      }

      const categoriesData = await categoriesResponse.json();
      console.log('Categories Response:', categoriesData);
      
      if (!categoriesData.data || !Array.isArray(categoriesData.data)) {
        console.error('Invalid categories data format:', categoriesData);
        throw new Error('Invalid categories data format');
      }

      const expenseCategories = categoriesData.data.filter(
        category => category && category.categoryType === 'EXPENSE'
      );

      if (expenseCategories.length === 0) {
        console.error('No expense categories found');
        throw new Error('No expense categories found');
      }

      setCategories(expenseCategories);

    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', error.message || 'Failed to load categories. Please check your connection.');
      setCategories([]); 
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      
      if (data.status === 'success' && Array.isArray(data.data)) {
        setPaymentMethods(data.data);
        // Set default payment mode to cash (id: 1)
        if (!paymentMode) {
          setPaymentMode('cash');
        }
      } else {
        console.error('Invalid payment methods data format:', data);
        // Fallback to default payment methods if API fails
        setPaymentMethods([
          { id: 1, name: 'CASH' },
          { id: 2, name: 'UPI' }
        ]);
        if (!paymentMode) {
          setPaymentMode('cash');
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Fallback to default payment methods if API fails
      setPaymentMethods([
        { id: 1, name: 'CASH' },
        { id: 2, name: 'UPI' }
      ]);
      if (!paymentMode) {
        setPaymentMode('cash');
      }
    }
  };

  const showSuccessMessage = () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSuccess(false);
    });
  };

  const handleSubmitExpense = async () => {
    const isValid = expense.item && expense.amount && expense.categoryId && expense.unitId;

    if (!isValid) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
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
        return;
      }

      // Get the selected payment method ID based on UI selection
      let paymentMethodId;
      if (paymentMode === 'cash') {
        paymentMethodId = 1;
      } else if (paymentMode === 'upi') {
        paymentMethodId = 2;
      } else {
        Alert.alert('Error', 'Invalid payment method selected.');
        return;
      }

      const expenseData = {
        item: expense.item,
        quantity: expense.quantity ? parseInt(expense.quantity) : 1,
        amount: parseFloat(expense.amount),
        unitId: Number(expense.unitId), 
        categoryId: parseInt(expense.categoryId),
        paymentMethodId: paymentMethodId,
        remarks: expense.remarks || ''
      };

      console.log('Submitting expense data:', expenseData);

      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const json = await response.json();
      console.log('Expense API Response:', json);
      
      if (response.status === 201 && json.status === 'success') {
        setLastExpense({
          amount: expenseData.amount,
          item: expenseData.item,
          timestamp: new Date().toISOString()
        });
        
        showSuccessMessage();
        setExpense({
          item: '',
          quantity: '',
          amount: '',
          unitId: '',
          categoryId: '',
          paymentMethodId: '',
          remarks: ''
        });
        // Reset to first payment method
        if (paymentMethods.length > 0) {
          setPaymentMode('cash');
        }

        // Send expense notification
        NotificationService.sendExpenseNotification({
          id: json.data?.id || 'New',
          amount: expenseData.amount,
          item: expenseData.item,
          category: categories.find(cat => cat.id.toString() === expenseData.categoryId.toString())?.categoryName || 'Unknown'
        });
      } else {
        throw new Error(json.message || 'Failed to record expense');
      }
    } catch (error) {
      console.error('Error submitting expense:', error);
      Alert.alert('Error', error.message || 'Failed to record expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{t('loadingData')}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContainer}
    >
      {showSuccess && (
        <Animated.View 
          style={[
            styles.successContainer,
            {
              opacity: successAnim,
              transform: [{
                translateY: successAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.successContent}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={[styles.successText, { fontFamily, lineHeight: 22, paddingVertical: 2 }]}>{t('expenseRecorded')}</Text>
          </View>
        </Animated.View>
      )}

      {lastExpense && (
        <Animated.View 
          style={[
            styles.lastExpenseContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.lastExpenseHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={[styles.lastExpenseTitle, { fontFamily, lineHeight: 22, paddingVertical: 2 }]}>{t('lastExpense')}</Text>
          </View>
          <View style={styles.lastExpenseDetails}>
            <Text style={[styles.lastExpenseItem, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>{lastExpense.item}</Text>
            <Text style={[styles.lastExpenseAmount, { fontFamily, lineHeight: 20, paddingVertical: 2 }]}>₹{lastExpense.amount.toFixed(2)}</Text>
            <Text style={[styles.lastExpenseInfo, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>
              {new Date(lastExpense.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('item')}</Text>
          <TextInput
            style={[styles.input, { fontFamily, lineHeight: 22, paddingVertical: 6 }]}
            placeholder={t('enterItem')}
            placeholderTextColor="#888"
            value={expense.item}
            onChangeText={(value) => setExpense({ ...expense, item: value })}
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('quantity')}</Text>
            <TextInput
              style={[styles.input, { fontFamily, lineHeight: 22, paddingVertical: 6 }]}
              placeholder={t('enterQuantity')}
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={expense.quantity}
              onChangeText={(value) => setExpense({ ...expense, quantity: value })}
            />
          </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('unit')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={expense.unitId}
                onValueChange={(value) => {
                  console.log('Selected Unit ID:', value);
                  setExpense({ 
                    ...expense, 
                    unitId: value
                  });
                }}
                style={styles.picker}
                dropdownIconColor="#4CAF50"
                mode="dropdown"
                enabled={units.length > 0}
              >
                <Picker.Item label={t('selectUnit')} value="" color="#888" style={{ fontFamily }} />
                {units.map((unit) => (
                  <Picker.Item 
                    key={`unit-${unit.id}`}
                    label={`${unit.name} (${unit.abbreviation || ''})`}
                    value={unit.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('amount')}</Text>
          <TextInput
            style={[styles.input, { fontFamily, lineHeight: 22, paddingVertical: 6 }]}
            placeholder={t('enterAmount')}
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={expense.amount}
            onChangeText={(value) => setExpense({ ...expense, amount: value })}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('category')}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={expense.categoryId}
              onValueChange={(value) => setExpense({ ...expense, categoryId: value })}
              style={styles.picker}
              dropdownIconColor="#4CAF50"
              mode="dropdown"
              enabled={categories.length > 0}
            >
              <Picker.Item label={t('selectCategory')} value="" color="#888" style={{ fontFamily }} />
              {Array.isArray(categories) && categories.map((category) => (
                category && category.id && category.categoryName ? (
                  <Picker.Item 
                    key={`category-${category.id}`}
                    label={category.categoryName}
                    value={category.id.toString()}
                  />
                ) : null
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.paymentModeContainer}>
          <TouchableOpacity
            style={[
              styles.paymentModeButton,
              paymentMode === 'cash' && styles.paymentModeButtonActive,
            ]}
            onPress={() => setPaymentMode('cash')}
          >
            <Text style={[
              styles.paymentModeText,
              paymentMode === 'cash' && styles.paymentModeTextActive,
              { fontFamily, lineHeight: 18, paddingVertical: 2 }
            ]}>{t('cash')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentModeButton,
              paymentMode === 'upi' && styles.paymentModeButtonActive,
            ]}
            onPress={() => setPaymentMode('upi')}
          >
            <Text style={[
              styles.paymentModeText,
              paymentMode === 'upi' && styles.paymentModeTextActive,
              { fontFamily, lineHeight: 18, paddingVertical: 2 }
            ]}>{t('upi')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('remarks')}</Text>
          <TextInput
            style={[styles.input, styles.remarksInput, { fontFamily, lineHeight: 22, paddingVertical: 6 }]}
            placeholder={t('enterRemarks')}
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            value={expense.remarks}
            onChangeText={(value) => setExpense({ ...expense, remarks: value })}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmitExpense}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={styles.submitButtonContent}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitButtonInner}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={[styles.loginButtonText, { fontFamily, lineHeight: 22, paddingVertical: 2 }]}>{t('submitExpense')}</Text>
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
    backgroundColor: '#fff',
    minHeight: 300,
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
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    borderColor: '#ccc', 
    borderWidth: 1,
  },
  inputContainer: {
    marginBottom: 16,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    height: 50,
    width: '100%',
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
  paymentModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  paymentModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  paymentModeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  paymentModeButtonInactive: {
    backgroundColor: '#f5f5f5',
  },
  paymentModeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentModeTextActive: {
    color: '#fff',
  },
  paymentModeTextInactive: {
    color: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
  successContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  lastExpenseContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
  },
  lastExpenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lastExpenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  lastExpenseText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
  lastExpenseAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  lastExpenseInfo: {
    fontSize: 13,
    color: '#666',
  },
  remarksInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#81C784',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
