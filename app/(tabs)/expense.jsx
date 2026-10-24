import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const [expenseItems, setExpenseItems] = useState([]);
  const [selectedExpenseItem, setSelectedExpenseItem] = useState(null);
  const [isCustomExpense, setIsCustomExpense] = useState(false);
  const [itemSearchModalVisible, setItemSearchModalVisible] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
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
    fetchExpenseItems();
  }, []);

  const fetchExpenseItems = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/expense-items?activeOnly=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch expense items, status:', response.status);
        return;
      }

      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        const validItems = json.data.filter(item => item && item.id);
        setExpenseItems(validItems);
      }
    } catch (error) {
      console.error('Error fetching expense items:', error);
    }
  };

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

  const filteredExpenseItems = useMemo(() => {
    if (!itemSearchQuery.trim()) {
      return expenseItems;
    }
    const q = itemSearchQuery.toLowerCase().trim();
    return expenseItems.filter(item => {
      const nameMatch = item.name && item.name.toLowerCase().includes(q);
      const tamilMatch = item.tamilName && item.tamilName.toLowerCase().includes(q);
      const categoryMatch = item.categoryName && item.categoryName.toLowerCase().includes(q);
      return nameMatch || tamilMatch || categoryMatch;
    });
  }, [expenseItems, itemSearchQuery]);

  const handleSelectExpenseItem = (item) => {
    setSelectedExpenseItem(item);
    setIsCustomExpense(false);
    setItemSearchModalVisible(false);
    setItemSearchQuery('');

    const currentQty = parseFloat(expense.quantity) || 1;
    const newAmount = item.defaultPrice != null 
      ? (currentQty * parseFloat(item.defaultPrice)).toFixed(2)
      : expense.amount;

    setExpense(prev => ({
      ...prev,
      item: item.name,
      categoryId: item.categoryId ? item.categoryId.toString() : prev.categoryId,
      unitId: item.defaultUnitId ? Number(item.defaultUnitId) : prev.unitId,
      quantity: prev.quantity || '1',
      amount: newAmount || prev.amount,
    }));
  };

  const handleSelectCustomExpense = () => {
    setSelectedExpenseItem(null);
    setIsCustomExpense(true);
    setItemSearchModalVisible(false);
    setItemSearchQuery('');
    setExpense(prev => ({
      ...prev,
      item: '',
    }));
  };

  const handleQuantityChange = (qty) => {
    const newExpense = { ...expense, quantity: qty };
    if (selectedExpenseItem && selectedExpenseItem.defaultPrice != null) {
      const parsedQty = parseFloat(qty);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        newExpense.amount = (parsedQty * parseFloat(selectedExpenseItem.defaultPrice)).toFixed(2);
      }
    }
    setExpense(newExpense);
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
    const isItemValid = isCustomExpense ? !!expense.item?.trim() : !!selectedExpenseItem;
    const isValid = isItemValid && expense.amount && expense.categoryId && expense.unitId;

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

      let expenseData;
      if (selectedExpenseItem) {
        expenseData = {
          expenseItemId: selectedExpenseItem.id,
          quantity: expense.quantity ? parseFloat(expense.quantity) : 1,
          amount: parseFloat(expense.amount),
          unitId: Number(expense.unitId), 
          categoryId: parseInt(expense.categoryId),
          paymentMethodId: paymentMethodId,
          remarks: expense.remarks || ''
        };
      } else {
        expenseData = {
          expenseItemId: null,
          item: expense.item.trim(),
          quantity: expense.quantity ? parseFloat(expense.quantity) : 1,
          amount: parseFloat(expense.amount),
          unitId: Number(expense.unitId), 
          categoryId: parseInt(expense.categoryId),
          paymentMethodId: paymentMethodId,
          remarks: expense.remarks || ''
        };
      }

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
        const recordedItemName = selectedExpenseItem 
          ? `${selectedExpenseItem.name}${selectedExpenseItem.tamilName ? ` (${selectedExpenseItem.tamilName})` : ''}`
          : expenseData.item;

        setLastExpense({
          amount: expenseData.amount,
          item: recordedItemName,
          timestamp: new Date().toISOString()
        });
        
        showSuccessMessage();
        setSelectedExpenseItem(null);
        setIsCustomExpense(false);
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
          item: recordedItemName,
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
          <View style={styles.labelRow}>
            <Text style={[styles.label, { fontFamily, lineHeight: 18, paddingVertical: 2 }]}>{t('item')}</Text>
            {isCustomExpense ? (
              <TouchableOpacity 
                style={styles.switchModeButton}
                onPress={() => setItemSearchModalVisible(true)}
              >
                <Ionicons name="list-outline" size={14} color="#2E7D32" />
                <Text style={[styles.switchModeText, { fontFamily }]}>{t('browseCatalog')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.switchModeButton}
                onPress={handleSelectCustomExpense}
              >
                <Ionicons name="create-outline" size={14} color="#2E7D32" />
                <Text style={[styles.switchModeText, { fontFamily }]}>{t('customExpense')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isCustomExpense ? (
            <View>
              <TextInput
                style={[styles.input, { fontFamily, lineHeight: 22, paddingVertical: 6 }]}
                placeholder={t('enterItem')}
                placeholderTextColor="#888"
                value={expense.item}
                onChangeText={(value) => setExpense({ ...expense, item: value })}
              />
              <Text style={[styles.helperText, { fontFamily }]}>
                {t('customExpenseDesc')}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.itemSelectorButton, selectedExpenseItem && styles.itemSelectorButtonSelected]}
              onPress={() => setItemSearchModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.itemSelectorContent}>
                {selectedExpenseItem ? (
                  <View style={styles.selectedItemInfo}>
                    <Text style={[styles.selectedItemTitle, { fontFamily }]}>
                      {selectedExpenseItem.name}{selectedExpenseItem.tamilName ? ` (${selectedExpenseItem.tamilName})` : ''}
                    </Text>
                    <View style={styles.itemTagsRow}>
                      {selectedExpenseItem.categoryName ? (
                        <View style={styles.itemTag}>
                          <Text style={[styles.itemTagText, { fontFamily }]}>{selectedExpenseItem.categoryName}</Text>
                        </View>
                      ) : null}
                      {selectedExpenseItem.defaultUnitName ? (
                        <View style={styles.itemTag}>
                          <Text style={[styles.itemTagText, { fontFamily }]}>{selectedExpenseItem.defaultUnitName}</Text>
                        </View>
                      ) : null}
                      {selectedExpenseItem.defaultPrice != null && (
                        <View style={[styles.itemTag, styles.priceTag]}>
                          <Text style={[styles.priceTagText, { fontFamily }]}>₹{selectedExpenseItem.defaultPrice}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.placeholderRow}>
                    <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
                    <Text style={[styles.placeholderText, { fontFamily }]}>
                      {t('selectExpenseItem')}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
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
              onChangeText={handleQuantityChange}
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
          {selectedExpenseItem?.defaultPrice != null && (
            <Text style={[styles.unitRateHint, { fontFamily }]}>
              ₹{selectedExpenseItem.defaultPrice} × {expense.quantity || '1'} {units.find(u => u.id === expense.unitId)?.abbreviation || selectedExpenseItem.defaultUnitName || ''} = ₹{expense.amount || '0.00'}
            </Text>
          )}
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

      {/* Expense Item Search Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={itemSearchModalVisible}
        onRequestClose={() => {
          setItemSearchModalVisible(false);
          setItemSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="pricetags-outline" size={20} color="#2E7D32" />
                <Text style={[styles.modalTitle, { fontFamily }]}>{t('selectExpenseItem')}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setItemSearchModalVisible(false);
                  setItemSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { fontFamily }]}
                placeholder={t('searchExpenseItem')}
                placeholderTextColor="#888"
                value={itemSearchQuery}
                onChangeText={setItemSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {itemSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setItemSearchQuery('')} style={styles.searchClearButton}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {/* List of Items */}
            <FlatList
              data={filteredExpenseItems}
              keyExtractor={(item) => `expense-item-${item.id}`}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <View>
                  {/* Top Option: + Custom Expense / Other */}
                  <TouchableOpacity
                    style={[styles.customExpenseOptionCard, isCustomExpense && styles.customExpenseOptionCardActive]}
                    onPress={handleSelectCustomExpense}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customExpenseIconContainer}>
                      <Ionicons name="add-circle" size={24} color="#2E7D32" />
                    </View>
                    <View style={styles.customExpenseTextContainer}>
                      <Text style={[styles.customExpenseOptionTitle, { fontFamily }]}>
                        {t('customExpense')}
                      </Text>
                      <Text style={[styles.customExpenseOptionDesc, { fontFamily }]}>
                        {t('customExpenseDesc')}
                      </Text>
                    </View>
                    {isCustomExpense && (
                      <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    )}
                  </TouchableOpacity>

                  <View style={styles.sectionDivider}>
                    <Text style={[styles.sectionTitle, { fontFamily }]}>
                      {t('recurringItems')} ({filteredExpenseItems.length})
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedExpenseItem?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.expenseItemRow, isSelected && styles.expenseItemRowSelected]}
                    onPress={() => handleSelectExpenseItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemMainInfo}>
                      <Text style={[styles.itemRowTitle, { fontFamily }]}>
                        {item.name}{item.tamilName ? ` (${item.tamilName})` : ''}
                      </Text>
                      <View style={styles.itemTagsRow}>
                        {item.categoryName ? (
                          <View style={styles.itemTag}>
                            <Text style={[styles.itemTagText, { fontFamily }]}>{item.categoryName}</Text>
                          </View>
                        ) : null}
                        {item.defaultUnitName ? (
                          <View style={styles.itemTag}>
                            <Text style={[styles.itemTagText, { fontFamily }]}>{item.defaultUnitName}</Text>
                          </View>
                        ) : null}
                        {item.defaultPrice != null && (
                          <View style={[styles.itemTag, styles.priceTag]}>
                            <Text style={[styles.priceTagText, { fontFamily }]}>₹{item.defaultPrice}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  <Ionicons name="search-outline" size={32} color="#aaa" />
                  <Text style={[styles.emptyListText, { fontFamily }]}>
                    No items matching "{itemSearchQuery}"
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyCustomButton}
                    onPress={handleSelectCustomExpense}
                  >
                    <Text style={[styles.emptyCustomButtonText, { fontFamily }]}>
                      {t('customExpense')}
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  helperText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    marginLeft: 2,
  },
  unitRateHint: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '600',
  },
  itemSelectorButton: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  itemSelectorButtonSelected: {
    backgroundColor: '#F1F8E9',
    borderColor: '#4CAF50',
  },
  itemSelectorContent: {
    flex: 1,
    marginRight: 8,
  },
  selectedItemInfo: {
    flexDirection: 'column',
  },
  selectedItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#777',
  },
  itemTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  itemTag: {
    backgroundColor: '#EAEAEA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemTagText: {
    fontSize: 11,
    color: '#555',
  },
  priceTag: {
    backgroundColor: '#C8E6C9',
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '85%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 6,
  },
  searchClearButton: {
    padding: 4,
  },
  customExpenseOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  customExpenseOptionCardActive: {
    backgroundColor: '#C8E6C9',
    borderStyle: 'solid',
  },
  customExpenseIconContainer: {
    marginRight: 10,
  },
  customExpenseTextContainer: {
    flex: 1,
  },
  customExpenseOptionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  customExpenseOptionDesc: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  sectionDivider: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#777',
    textTransform: 'uppercase',
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseItemRowSelected: {
    backgroundColor: '#F1F8E9',
    borderRadius: 6,
  },
  itemMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptyListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyListText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCustomButton: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyCustomButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
