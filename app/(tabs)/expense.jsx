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

const { API_BASE_URL } = getEnvConfig();

export default function ExpenseScreen() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [successAnim] = useState(new Animated.Value(0));
  const [showSuccess, setShowSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [lastExpense, setLastExpense] = useState(null);
  const [expense, setExpense] = useState({
    item: '',
    quantity: '',
    amount: '',
    unitId: '',
    categoryId: '',
    paymentMethodId: 1,
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

      // Process and validate units
      const validUnits = unitsData.data
        .filter(unit => {
          // Check if unit exists and has required properties
          const isValid = unit && 
            (unit.id || unit.unitId) && // Check for either id or unitId
            unit.name;
          
          if (!isValid) {
            console.warn('Invalid unit found:', unit);
          }
          return isValid;
        })
        .map(unit => ({
          id: Number(unit.id || unit.unitId), // Handle both id and unitId
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
      setUnits([]); // Set empty array on error
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

      // Fetch categories
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

      // Filter only expense categories
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
      setCategories([]); // Set empty array on error
    } finally {
      setLoading(false);
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

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      // Normalize payment method
      const normalizedPaymentMode = paymentMode.trim().toUpperCase();
      const paymentMethodId = normalizedPaymentMode === 'CASH' ? 1 : 2;

      const expenseData = {
        item: expense.item,
        quantity: expense.quantity ? parseInt(expense.quantity) : 1,
        amount: parseFloat(expense.amount),
        unitId: Number(expense.unitId), // Ensure unitId is a number
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
          paymentMethodId: 1,
          remarks: ''
        });
        setPaymentMode('cash');
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
        <Text style={styles.loadingText}>Loading data...</Text>
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
            <Text style={styles.successText}>Expense recorded successfully!</Text>
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
            <Text style={styles.lastExpenseTitle}>Last Expense</Text>
          </View>
          <View style={styles.lastExpenseDetails}>
            <Text style={styles.lastExpenseItem}>{lastExpense.item}</Text>
            <Text style={styles.lastExpenseAmount}>₹{lastExpense.amount.toFixed(2)}</Text>
            <Text style={styles.lastExpenseInfo}>
              {new Date(lastExpense.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        </Animated.View>
      )}

      <Animated.View 
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>New Expense</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            placeholderTextColor="#888"
            value={expense.item}
            onChangeText={(value) => setExpense({ ...expense, item: value })}
          />
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={expense.quantity}
              onChangeText={(value) => setExpense({ ...expense, quantity: value })}
            />
          </View>

          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Unit</Text>
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
              >
                <Picker.Item label="Select Unit" value="" />
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
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={expense.amount}
            onChangeText={(value) => setExpense({ ...expense, amount: value })}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={expense.categoryId}
              onValueChange={(value) => setExpense({ ...expense, categoryId: value })}
              style={styles.picker}
              dropdownIconColor="#4CAF50"
            >
              <Picker.Item label="Select Category" value="" />
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
            ]}>Cash</Text>
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
            ]}>UPI</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.remarksInput]}
            placeholder="Enter remarks (optional)"
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
                <Text style={styles.submitButtonText}>Record Expense</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 80 : 32,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    height: 50,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
});
