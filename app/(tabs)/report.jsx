import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
    TouchableOpacity,
    View,
} from 'react-native';
import getEnvConfig from '../../config/env';
import { fetchMasterData, getAvailableFlavours } from '../utils/masterData';

const { API_BASE_URL } = getEnvConfig();
const { width } = Dimensions.get('window');

export default function ReportScreen() {
  const router = useRouter();
  const [viewType, setViewType] = useState('sales'); // 'sales' or 'expense'
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [selectedFlavourId, setSelectedFlavourId] = useState('all');
  const [selectedAddOnId, setSelectedAddOnId] = useState('all');
  const [selectedParcel, setSelectedParcel] = useState('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('all');
  
  // Date range picker states
  const [startDate, setStartDate] = useState(() => {
    // Set initial start date to first day of current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Store product, flavour, and addon details
  const [products, setProducts] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [addOns, setAddOns] = useState([]);

  // Add state for available flavors based on selected product
  const [availableFlavours, setAvailableFlavours] = useState([]);

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedDateType, setSelectedDateType] = useState('start'); // 'start' or 'end'

  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  useEffect(() => {
    checkAccess();
  }, []);

  // Separate useEffect for fetching master data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const { products: fetchedProducts, flavours: fetchedFlavours, addOns: fetchedAddOns, error } = await fetchMasterData();
        
        if (error) {
          throw new Error(error);
        }

        setProducts(fetchedProducts);
        setFlavours(fetchedFlavours);
        setAddOns(fetchedAddOns);
      } catch (error) {
        console.error('Error fetching master data:', error);
        Alert.alert('Error', 'Failed to load master data');
      }
    };

    loadMasterData();
  }, []); // Only run once when component mounts

  useEffect(() => {
    if (viewType === 'sales') {
      fetchReportData();
    } else {
      fetchExpenseData();
    }
  }, [filterPeriod, startDate, endDate, viewType]);

  // Update available flavors when product changes
  useEffect(() => {
    if (selectedProductId === 'all') {
      setAvailableFlavours(flavours);
      setSelectedFlavourId('all');
    } else {
      const availableFlavoursForProduct = getAvailableFlavours(selectedProductId, products, flavours);
      setAvailableFlavours(availableFlavoursForProduct);
      setSelectedFlavourId('all');
    }
  }, [selectedProductId, products, flavours]);

  const checkAccess = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      const userData = JSON.parse(userDataStr);
      if (!userData.roles || !Array.isArray(userData.roles) || 
          !(userData.roles.includes('ROLE_ADMIN') || userData.roles.includes('ROLE_SUPERADMIN'))) {
        Alert.alert('Access Denied', 'You do not have permission to access this page');
        router.back();
        return;
      }

      await fetchReportData();
    } catch (error) {
      console.error('Access check error:', error);
      Alert.alert('Error', 'Failed to verify access permissions');
      router.back();
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      
      // Handle ISO date string with microseconds
      const date = new Date(dateString.replace(/\.\d+Z$/, 'Z'));
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid Date';
      }

      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString || 'N/A';
    }
  };

  const formatDateForDisplay = (date) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDateSelection = (date) => {
    if (selectedDateType === 'start') {
      setTempStartDate(date);
      if (!tempEndDate || date > tempEndDate) {
        setTempEndDate(date);
      }
    } else {
      setTempEndDate(date);
    }
    setShowDatePickerModal(false);
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // Prepare query parameters based on filters
      let queryParams = new URLSearchParams();
      
      // Add date filters based on filterPeriod or custom date range
      if (filterPeriod !== 'custom' && filterPeriod !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (filterPeriod) {
          case 'today': {
            // Get today's date in local timezone
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            
            // Convert to UTC while preserving the local date
            const startUTC = new Date(startOfDay.getTime() - startOfDay.getTimezoneOffset() * 60000);
            const endUTC = new Date(endOfDay.getTime() - endOfDay.getTimezoneOffset() * 60000);
            
            queryParams.append('startDate', startUTC.toISOString());
            queryParams.append('endDate', endUTC.toISOString());
            break;
          }
          case 'week': {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);
            const weekStartUTC = new Date(weekStart.getTime() - weekStart.getTimezoneOffset() * 60000);
            
            // Set end date to end of current day
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const endOfDayUTC = new Date(endOfDay.getTime() - endOfDay.getTimezoneOffset() * 60000);
            
            queryParams.append('startDate', weekStartUTC.toISOString());
            queryParams.append('endDate', endOfDayUTC.toISOString());
            break;
          }
          case 'month': {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);
            const monthStartUTC = new Date(monthStart.getTime() - monthStart.getTimezoneOffset() * 60000);
            
            // Set end date to end of current day
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            const endOfDayUTC = new Date(endOfDay.getTime() - endOfDay.getTimezoneOffset() * 60000);
            
            queryParams.append('startDate', monthStartUTC.toISOString());
            queryParams.append('endDate', endOfDayUTC.toISOString());
            break;
          }
          case 'year': {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            yearStart.setHours(0, 0, 0, 0);
            const yearStartUTC = new Date(yearStart.getTime() - yearStart.getTimezoneOffset() * 60000);
            queryParams.append('startDate', yearStartUTC.toISOString());
            queryParams.append('endDate', now.toISOString());
            break;
          }
        }
      } else if (filterPeriod === 'custom' && startDate && endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        queryParams.append('startDate', startDate.toISOString());
        queryParams.append('endDate', endOfDay.toISOString());
      }

      // Add other filters
      if (selectedProductId !== 'all') {
        queryParams.append('productId', selectedProductId);
      }
      if (selectedFlavourId !== 'all') {
        if (selectedFlavourId === 'none') {
          queryParams.append('noFlavour', 'true');
        } else {
          queryParams.append('flavourId', selectedFlavourId);
        }
      }
      if (selectedParcel !== 'all') {
        queryParams.append('parcel', selectedParcel === 'yes');
      }

      // Fetch sales data
      const salesResponse = await fetch(`${API_BASE_URL}/sales/fetch?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!salesResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const salesData = await salesResponse.json();
      setReportData(salesData || []);

      // Fetch payment summary
      const summaryResponse = await fetch(`${API_BASE_URL}/orders/summary?start=${queryParams.get('startDate')}&end=${queryParams.get('endDate')}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        if (summaryData.status === 'success' && Array.isArray(summaryData.data)) {
          // Aggregate the payment method totals
          const paymentMethodTotals = summaryData.data.reduce((acc, order) => {
            const { paymentMethod, totalAmount } = order;
            if (!acc[paymentMethod]) {
              acc[paymentMethod] = 0;
            }
            acc[paymentMethod] += totalAmount;
            return acc;
          }, {});

          // Convert to array format for display
          const paymentSummary = Object.entries(paymentMethodTotals).map(([method, total]) => ({
            paymentMethod: method,
            totalAmount: total
          }));

          setPaymentSummary(paymentSummary);
        }
      }

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // Prepare query parameters based on filters
      let queryParams = new URLSearchParams();
      
      // Add date filters based on filterPeriod or custom date range
      if (filterPeriod !== 'custom' && filterPeriod !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (filterPeriod) {
          case 'today': {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            
            queryParams.append('start', startOfDay.toISOString());
            queryParams.append('end', endOfDay.toISOString());
            break;
          }
          case 'week': {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            
            queryParams.append('start', weekStart.toISOString());
            queryParams.append('end', endOfDay.toISOString());
            break;
          }
          case 'month': {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            
            queryParams.append('start', monthStart.toISOString());
            queryParams.append('end', endOfDay.toISOString());
            break;
          }
          case 'year': {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            yearStart.setHours(0, 0, 0, 0);
            
            queryParams.append('start', yearStart.toISOString());
            queryParams.append('end', now.toISOString());
            break;
          }
        }
      } else if (filterPeriod === 'custom' && startDate && endDate) {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59);
        
        queryParams.append('start', startOfDay.toISOString());
        queryParams.append('end', endOfDay.toISOString());
      }

      // Fetch expense data
      const response = await fetch(`${API_BASE_URL}/expenses?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const responseData = await response.json();
      
      // Extract data from the response structure
      const expenses = responseData.data || [];
      
      // Sort data by createdAt in descending order (latest first)
      const sortedData = Array.isArray(expenses) ? expenses.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      }) : [];
      
      setExpenseData(sortedData);

      // Calculate payment method totals for insights
      const paymentMethodTotals = sortedData.reduce((acc, expense) => {
        const { paymentMethodName, amount } = expense;
        if (!acc[paymentMethodName]) {
          acc[paymentMethodName] = 0;
        }
        acc[paymentMethodName] += amount;
        return acc;
      }, {});

      // Update payment summary for expense view
      const paymentSummary = Object.entries(paymentMethodTotals).map(([method, total]) => ({
        paymentMethod: method,
        totalAmount: total
      }));

      setPaymentSummary(paymentSummary);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    // Sort data by createdAt in descending order (latest first)
    return [...reportData].sort((a, b) => {
      const dateA = new Date(a?.createdAt || 0);
      const dateB = new Date(b?.createdAt || 0);
      return dateB - dateA;
    });
  }, [reportData]);

  const insights = useMemo(() => {
    // Ensure reportData is an array
    const safeReportData = Array.isArray(reportData) ? reportData : [];
    
    const total = safeReportData.reduce((sum, item) => {
      const amount = typeof item?.salePrice === 'number' ? item.salePrice : 0;
      return sum + amount;
    }, 0);

    const count = safeReportData.length;
    const productSales = {};
    const parcelCount = safeReportData.filter(item => Boolean(item?.parcel)).length;
    const noFlavourCount = safeReportData.filter(item => !item?.flavourId).length;
    const noFlavourTotal = safeReportData
      .filter(item => !item?.flavourId)
      .reduce((sum, item) => sum + (typeof item?.salePrice === 'number' ? item.salePrice : 0), 0);

    safeReportData.forEach(item => {
      if (item && typeof item.productId !== 'undefined' && item.productId !== null) {
        const productId = item.productId.toString();
        const amount = typeof item.salePrice === 'number' ? item.salePrice : 0;
        productSales[productId] = (productSales[productId] || 0) + amount;
      }
    });

    let topProductId = null;
    let topProductAmount = 0;

    Object.entries(productSales).forEach(([id, amount]) => {
      if (amount > topProductAmount) {
        topProductId = id;
        topProductAmount = amount;
      }
    });
    
    const topProduct = topProductId 
      ? products.find(p => p?.id?.toString() === topProductId)
      : null;

    return {
      totalSales: total.toFixed(2),
      orderCount: count,
      parcelCount,
      noFlavourCount,
      noFlavourTotal: noFlavourTotal.toFixed(2),
      paymentSummary,
      topProduct: topProduct 
        ? {
            name: topProduct.name || 'NA',
            amount: topProductAmount.toFixed(2)
          }
        : { name: 'NA', amount: '0.00' }
    };
  }, [reportData, products, paymentSummary]);

  const expenseInsights = useMemo(() => {
    const safeExpenseData = Array.isArray(expenseData) ? expenseData : [];
    
    const total = safeExpenseData.reduce((sum, item) => {
      const amount = typeof item?.amount === 'number' ? item.amount : 0;
      return sum + amount;
    }, 0);

    const count = safeExpenseData.length;
    const categoryTotals = {};
    const paymentMethodTotals = {};

    safeExpenseData.forEach(item => {
      if (item.categoryName) {
        categoryTotals[item.categoryName] = (categoryTotals[item.categoryName] || 0) + item.amount;
      }
      if (item.paymentMethodName) {
        paymentMethodTotals[item.paymentMethodName] = (paymentMethodTotals[item.paymentMethodName] || 0) + item.amount;
      }
    });

    return {
      totalExpenses: total.toFixed(2),
      expenseCount: count,
      categoryTotals,
      paymentMethodTotals
    };
  }, [expenseData]);

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePickerModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setShowDatePickerModal(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setTempStartDate(startDate);
                setTempEndDate(endDate);
                setShowDatePickerModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePickerContent}>
            <View style={styles.datePickerSection}>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => {
                  setSelectedDateType('start');
                  setShowDatePickerModal(false);
                  setTimeout(() => {
                    setShowStartDatePicker(true);
                  }, 100);
                }}
              >
                <View style={styles.datePickerButtonContent}>
                  <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                  <View style={styles.datePickerButtonTextContainer}>
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                    <Text style={styles.datePickerButtonText}>
                      {formatDateForDisplay(tempStartDate)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.datePickerButton, { marginTop: 12 }]}
                onPress={() => {
                  setSelectedDateType('end');
                  setShowDatePickerModal(false);
                  setTimeout(() => {
                    setShowEndDatePicker(true);
                  }, 100);
                }}
              >
                <View style={styles.datePickerButtonContent}>
                  <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                  <View style={styles.datePickerButtonTextContainer}>
                    <Text style={styles.datePickerLabel}>End Date</Text>
                    <Text style={styles.datePickerButtonText}>
                      {formatDateForDisplay(tempEndDate)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setTempStartDate(startDate);
                setTempEndDate(endDate);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonApply]}
              onPress={() => {
                if (tempStartDate && tempEndDate) {
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  setFilterPeriod('custom');
                  setShowDatePickerModal(false);
                  fetchReportData();
                }
              }}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextApply]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const FilterButton = ({ title, value, current, onPress }) => (
    <TouchableOpacity 
      style={[
        styles.filterButton,
        filterPeriod === value && styles.filterButtonActive
      ]}
      onPress={() => {
        if (value === 'custom') {
          setTempStartDate(startDate);
          setTempEndDate(endDate);
          setShowDatePickerModal(true);
        } else {
          onPress(value);
          setStartDate(null);
          setEndDate(null);
        }
      }}
    >
      <Text style={[
        styles.filterButtonText,
        filterPeriod === value && styles.filterButtonTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 2.5 }]}>Product</Text>
      <Text style={[styles.headerCell, { flex: 1 }]}>Qty</Text>
      <Text style={[styles.headerCell, { flex: 1.8 }]}>Billed Amount</Text>
      <Text style={[styles.headerCell, { flex: 1.8 }]}>Sold Amount</Text>
      <Text style={[styles.headerCell, { flex: 1.2 }]}>Parcel</Text>
      <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const product = products.find(p => p?.id === item?.productId);
    const flavour = item?.flavourId ? flavours.find(f => f?.id === item.flavourId) : null;
    const addOn = item?.addOnId ? addOns.find(a => a?.id === item.addOnId) : null;

    return (
      <Animated.View style={[styles.tableRow, { opacity: fadeAnim }]}>
        <View style={[styles.cell, { flex: 2.5 }]}>
          <Text style={styles.productName}>
            {product?.name || `Product : ${item?.productId || 'NA'}`}
          </Text>
          <Text style={styles.categoryName}>
            {flavour ? flavour.name : 'No Flavour'}
            {addOn ? ` + ${addOn.name}` : ''}
          </Text>
        </View>
        <Text style={[styles.cell, { flex: 1 }]}>{item?.quantity || 0}</Text>
        <Text style={[styles.cell, { flex: 1.8 }]}>
          ₹{(typeof item?.amount === 'number' ? item.amount : 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.8 }]}>
          ₹{(typeof item?.salePrice === 'number' ? item.salePrice : 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 1.2 }]}>{item?.parcel ? 'Yes' : 'No'}</Text>
        <Text style={[styles.cell, { flex: 2 }]}>{formatDate(item?.createdAt)}</Text>
      </Animated.View>
    );
  };

  const renderFilters = () => {
    // Get the selected product's details
    const selectedProduct = selectedProductId !== 'all' 
      ? products.find(p => p.id.toString() === selectedProductId)
      : null;

    // Check if the selected product has flavours
    const hasFlavours = selectedProduct && 
      selectedProduct.flavourIds && 
      selectedProduct.flavourIds.length > 0;

    // Check if the selected product has add-ons
    const hasAddOns = selectedProduct && 
      selectedProduct.addOnIds && 
      selectedProduct.addOnIds.length > 0;

    return (
      <View style={styles.advancedFilters}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Product</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedProductId}
                onValueChange={(value) => {
                  setSelectedProductId(value);
                  // Reset flavour and add-on selections when product changes
                  setSelectedFlavourId('all');
                  setSelectedAddOnId('all');
                }}
                style={styles.picker}
                dropdownIconColor="#4CAF50"
              >
                <Picker.Item label="All Products" value="all" />
                {Array.isArray(products) && products.map(product => (
                  <Picker.Item 
                    key={`product-${product.id}`}
                    label={`${product.name} (₹${product.unitPrice})`}
                    value={product.id.toString()}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {selectedProductId !== 'all' && hasFlavours && (
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Flavour</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedFlavourId}
                  onValueChange={setSelectedFlavourId}
                  style={styles.picker}
                  dropdownIconColor="#4CAF50"
                >
                  <Picker.Item label="Select Flavour" value="all" />
                  {Array.isArray(availableFlavours) && availableFlavours.map(flavour => (
                    <Picker.Item 
                      key={`flavour-${flavour.id}`}
                      label={`${flavour.name} (+₹${flavour.price})`}
                      value={flavour.id.toString()}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        <View style={styles.filterRow}>
          {selectedProductId !== 'all' && hasAddOns && (
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Add-On</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedAddOnId}
                  onValueChange={setSelectedAddOnId}
                  style={styles.picker}
                  dropdownIconColor="#4CAF50"
                >
                  <Picker.Item label="Select Add-On" value="all" />
                  {Array.isArray(addOns) && addOns.map(addon => (
                    <Picker.Item 
                      key={`addon-${addon.id}`}
                      label={`${addon.name} (+₹${addon.price})`}
                      value={addon.id.toString()}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Parcel</Text>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => {
                setSelectedParcel(selectedParcel === 'yes' ? 'all' : 'yes');
              }}
            >
              <View style={styles.checkboxWrapper}>
                <Ionicons
                  name={selectedParcel === 'yes' ? 'checkbox' : 'square-outline'}
                  size={24}
                  color="#4CAF50"
                />
                <Text style={styles.checkboxLabel}>Show Parcel Orders Only</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {filterPeriod === 'custom' && renderDatePickerModal()}
      </View>
    );
  };

  const renderToggle = () => (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[
          styles.toggleOption,
          viewType === 'sales' && styles.toggleOptionActive
        ]}
        onPress={() => setViewType('sales')}
      >
        <Text style={[
          styles.toggleText,
          viewType === 'sales' && styles.toggleTextActive
        ]}>
          Sales
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleOption,
          viewType === 'expense' && styles.toggleOptionActive
        ]}
        onPress={() => setViewType('expense')}
      >
        <Text style={[
          styles.toggleText,
          viewType === 'expense' && styles.toggleTextActive
        ]}>
          Expense
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderExpenseHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { flex: 2 }]}>Item</Text>
      <Text style={[styles.headerCell, { flex: 1 }]}>Quantity</Text>
      <Text style={[styles.headerCell, { flex: 1 }]}>Unit</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Amount</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Category</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Payment</Text>
      <Text style={[styles.headerCell, { flex: 2 }]}>Date</Text>
    </View>
  );

  const renderExpenseItem = ({ item }) => (
    <Animated.View style={[styles.tableRow, { opacity: fadeAnim }]}>
      <View style={[styles.cell, { flex: 2 }]}>
        <Text style={styles.productName}>{item.item}</Text>
        {item.remarks && (
          <Text style={styles.categoryName}>{item.remarks}</Text>
        )}
      </View>
      <Text style={[styles.cell, { flex: 1 }]}>{item.quantity.toFixed(2)}</Text>
      <Text style={[styles.cell, { flex: 1 }]}>{item.unitName}</Text>
      <Text style={[styles.cell, { flex: 1.5 }]}>₹{item.amount.toFixed(2)}</Text>
      <Text style={[styles.cell, { flex: 1.5 }]}>{item.categoryName}</Text>
      <Text style={[styles.cell, { flex: 1.5 }]}>{item.paymentMethodName}</Text>
      <Text style={[styles.cell, { flex: 2 }]}>{formatDate(item.createdAt)}</Text>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Toggle Component */}
        {renderToggle()}

        {/* Insights Section */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsContainer}>
          {viewType === 'sales' ? (
            <>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Total Sales</Text>
                <Text style={styles.insightValue}>₹{insights.totalSales}</Text>
              </View>
              {insights.paymentSummary.map((summary, index) => (
                <View key={index} style={styles.insightCard}>
                  <Text style={styles.insightLabel}>{summary.paymentMethod} Sales</Text>
                  <Text style={styles.insightValue}>₹{summary.totalAmount.toFixed(2)}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.insightCard}>
                <Text style={styles.insightLabel}>Total Expenses</Text>
                <Text style={styles.insightValue}>₹{expenseInsights.totalExpenses}</Text>
              </View>
              {Object.entries(expenseInsights.paymentMethodTotals).map(([method, total], index) => (
                <View key={index} style={styles.insightCard}>
                  <Text style={styles.insightLabel}>{method} Expenses</Text>
                  <Text style={styles.insightValue}>₹{total.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* Time Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterButton title="Custom" value="custom" current={filterPeriod} onPress={setFilterPeriod} />
            <FilterButton title="Today" value="today" current={filterPeriod} onPress={setFilterPeriod} />
            <FilterButton title="This Week" value="week" current={filterPeriod} onPress={setFilterPeriod} />
            <FilterButton title="This Month" value="month" current={filterPeriod} onPress={setFilterPeriod} />
            <FilterButton title="This Year" value="year" current={filterPeriod} onPress={setFilterPeriod} />
          </ScrollView>
        </View>

        {/* Advanced Filters - Only show for Sales view */}
        {viewType === 'sales' && renderFilters()}

        {/* Date Pickers */}
        {Platform.OS !== 'web' && (
          <>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    handleDateSelection(selectedDate);
                  }
                }}
              />
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    handleDateSelection(selectedDate);
                  }
                }}
              />
            )}
          </>
        )}

        {/* Date Picker Modal */}
        {renderDatePickerModal()}

        {/* Table Section */}
        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {viewType === 'sales' ? renderHeader() : renderExpenseHeader()}
              {viewType === 'sales' ? (
                filteredData.length > 0 ? (
                  <FlatList
                    data={filteredData}
                    keyExtractor={(item, index) => `${item.id || index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No sales data available</Text>
                  </View>
                )
              ) : (
                expenseData.length > 0 ? (
                  <FlatList
                    data={expenseData}
                    keyExtractor={(item, index) => `${item.id || index}`}
                    renderItem={renderExpenseItem}
                    contentContainerStyle={styles.listContainer}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No expense data available</Text>
                  </View>
                )
              )}
            </View>
          </ScrollView>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => viewType === 'sales' ? fetchReportData() : fetchExpenseData()}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContent: {
    paddingBottom: 80, // Extra space for the refresh button
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  insightsContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  insightCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    minWidth: width * 0.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  insightLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  insightSubvalue: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  tableContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minWidth: width * 1.1,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    minWidth: width * 1.5, // Match header width
  },
  cell: {
    fontSize: 11,
    color: '#333',
    padding: 6,
    paddingHorizontal: 4,
  },
  productName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  categoryName: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  salePrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4CAF50',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  advancedFilters: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  datePickerContent: {
    marginBottom: 16,
  },
  datePickerSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  datePickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  datePickerButtonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  datePickerButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonApply: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalButtonTextApply: {
    color: '#fff',
  },
  checkboxContainer: {
    marginTop: 8,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
    margin: 15,
    marginBottom: 0,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
});