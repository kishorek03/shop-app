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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE_URL = 'http://localhost:8080/api';
const { width } = Dimensions.get('window');

export default function ReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [selectedFlavourId, setSelectedFlavourId] = useState('all');
  const [selectedAddOnId, setSelectedAddOnId] = useState('all');
  const [selectedParcel, setSelectedParcel] = useState('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('all');
  
  // Date range picker states
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Store product, flavour, and addon details
  const [products, setProducts] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [addOns, setAddOns] = useState([]);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [filterPeriod, selectedProductId, selectedFlavourId, selectedParcel, startDate, endDate]);

  // Fetch master data
  const fetchMasterData = async (token) => {
    try {
      const [productsRes, flavoursRes, addOnsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/flavours`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/addons`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [productsData, flavoursData, addOnsData] = await Promise.all([
        productsRes.json(),
        flavoursRes.json(),
        addOnsRes.json(),
      ]);

      if (productsData.status === 'success') setProducts(productsData.data);
      if (flavoursData.status === 'success') setFlavours(flavoursData.data);
      if (addOnsData.status === 'success') setAddOns(addOnsData.data);

    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

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
      const date = new Date(dateString);
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

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.replace('/');
        return;
      }

      // First fetch master data
      await fetchMasterData(token);

      // Prepare query parameters based on filters
      let queryParams = new URLSearchParams();
      
      // Add date filters based on filterPeriod or custom date range
      if (filterPeriod !== 'custom' && filterPeriod !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (filterPeriod) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setDate(1));
            break;
          case 'year':
            startDate = new Date(now.setMonth(0, 1));
            break;
        }
        
        if (startDate) {
          queryParams.append('startDate', startDate.toISOString());
          queryParams.append('endDate', new Date().toISOString());
        }
      } else if (filterPeriod === 'custom' && startDate && endDate) {
        queryParams.append('startDate', startDate.toISOString());
        queryParams.append('endDate', endDate.toISOString());
      }

      // Add other filters
      if (selectedProductId !== 'all') {
        queryParams.append('productId', selectedProductId);
      }
      if (selectedFlavourId !== 'all') {
        queryParams.append('flavourId', selectedFlavourId);
      }
      if (selectedParcel !== 'all') {
        queryParams.append('parcel', selectedParcel === 'yes');
      }

      const response = await fetch(`${API_BASE_URL}/sales/fetch?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setReportData(data || []);

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

  const filteredData = useMemo(() => {
    return reportData;
  }, [reportData]);

  const insights = useMemo(() => {
    // Ensure reportData is an array
    const safeReportData = Array.isArray(reportData) ? reportData : [];
    
    const total = safeReportData.reduce((sum, item) => {
      const amount = typeof item?.amount === 'number' ? item.amount : 0;
      return sum + amount;
    }, 0);

    const count = safeReportData.length;
    const productSales = {};
    const parcelCount = safeReportData.filter(item => Boolean(item?.parcel)).length;

    safeReportData.forEach(item => {
      if (item && typeof item.productId !== 'undefined' && item.productId !== null) {
        const productId = item.productId.toString();
        const amount = typeof item.amount === 'number' ? item.amount : 0;
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
      topProduct: topProduct 
        ? {
            name: topProduct.name || 'NA',
            amount: topProductAmount.toFixed(2)
          }
        : { name: 'NA', amount: '0.00' }
    };
  }, [reportData, products]);

  const FilterButton = ({ title, value, current, onPress }) => (
    <TouchableOpacity 
      style={[
        styles.filterButton,
        filterPeriod === value && styles.filterButtonActive
      ]}
      onPress={() => {
        onPress(value);
        if (value !== 'custom') {
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
      <Text style={[styles.headerCell, { flex: 2 }]}>Product</Text>
      <Text style={[styles.headerCell, { flex: 1 }]}>Qty</Text>
      <Text style={[styles.headerCell, { flex: 1.5 }]}>Amount</Text>
      <Text style={[styles.headerCell, { flex: 0.8 }]}>Parcel</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const product = products.find(p => p?.id === item?.productId);
    const flavour = item?.flavourId ? flavours.find(f => f?.id === item.flavourId) : null;
    const addOn = item?.addOnId ? addOns.find(a => a?.id === item.addOnId) : null;

    return (
      <Animated.View style={[styles.tableRow, { opacity: fadeAnim }]}>
        <View style={[styles.cell, { flex: 2 }]}>
          <Text style={styles.productName}>{product?.name || 'NA'}</Text>
          {(flavour || addOn) && (
            <Text style={styles.categoryName}>
              {[
                flavour?.name,
                addOn?.name
              ].filter(Boolean).join(' + ')}
            </Text>
          )}
          <Text style={styles.salePrice}>
            ₹{(typeof item?.salePrice === 'number' ? item.salePrice : 0).toFixed(2)} each
          </Text>
        </View>
        <Text style={[styles.cell, { flex: 1 }]}>{item?.quantity || 0}</Text>
        <Text style={[styles.cell, { flex: 1.5 }]}>
          ₹{(typeof item?.amount === 'number' ? item.amount : 0).toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 0.8 }]}>{item?.parcel ? 'Yes' : 'No'}</Text>
      </Animated.View>
    );
  };

  const renderDateRangePicker = () => (
    <View style={styles.dateRangeContainer}>
      <TouchableOpacity 
        style={styles.dateInput}
        onPress={() => setShowStartDatePicker(true)}
      >
        <Text style={styles.dateInputText}>{formatDateForDisplay(startDate)}</Text>
      </TouchableOpacity>
      <Text style={styles.dateRangeSeparator}>to</Text>
      <TouchableOpacity 
        style={styles.dateInput}
        onPress={() => setShowEndDatePicker(true)}
      >
        <Text style={styles.dateInputText}>{formatDateForDisplay(endDate)}</Text>
      </TouchableOpacity>

      {(showStartDatePicker || showEndDatePicker) && (
        <DateTimePicker
          value={showStartDatePicker ? (startDate || new Date()) : (endDate || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (showStartDatePicker) {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
                if (!endDate || selectedDate > endDate) {
                  setEndDate(selectedDate);
                }
              }
            } else if (showEndDatePicker) {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }
          }}
        />
      )}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.advancedFilters}>
      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Product</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProductId}
              onValueChange={setSelectedProductId}
              style={styles.picker}
            >
              <Picker.Item label="All Products" value="all" />
              {Array.isArray(products) && products.map(product => (
                product && product.id ? (
                  <Picker.Item 
                    key={`product-${product.id}`}
                    label={product.name || 'NA'} 
                    value={product.id.toString()}
                  />
                ) : null
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Flavour</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedFlavourId}
              onValueChange={setSelectedFlavourId}
              style={styles.picker}
            >
              <Picker.Item label="All Flavours" value="all" />
              {Array.isArray(flavours) && flavours.map(flavour => (
                flavour && flavour.id ? (
                  <Picker.Item 
                    key={`flavour-${flavour.id}`}
                    label={flavour.name || 'NA'} 
                    value={flavour.id.toString()}
                  />
                ) : null
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Add-On</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedAddOnId}
              onValueChange={setSelectedAddOnId}
              style={styles.picker}
            >
              <Picker.Item label="All Add-Ons" value="all" />
              {Array.isArray(addOns) && addOns.map(addon => (
                addon && addon.id ? (
                  <Picker.Item 
                    key={`addon-${addon.id}`}
                    label={addon.name || 'NA'} 
                    value={addon.id.toString()}
                  />
                ) : null
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Parcel</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedParcel}
              onValueChange={setSelectedParcel}
              style={styles.picker}
            >
              <Picker.Item label="All Orders" value="all" />
              <Picker.Item label="Parcel Only" value="yes" />
              <Picker.Item label="Non-Parcel" value="no" />
            </Picker>
          </View>
        </View>
      </View>

      {filterPeriod === 'custom' && renderDateRangePicker()}
    </View>
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
        {/* Insights Section */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsContainer}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Total Sales</Text>
            <Text style={styles.insightValue}>₹{insights.totalSales}</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Orders</Text>
            <Text style={styles.insightValue}>{insights.orderCount}</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Parcel Orders</Text>
            <Text style={styles.insightValue}>{insights.parcelCount}</Text>
          </View>
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

        {/* Advanced Filters */}
        {renderFilters()}

        {/* Table Section */}
        <View style={styles.tableContainer}>
          {renderHeader()}
          {filteredData.length > 0 ? (
            <FlatList
              data={filteredData}
              keyExtractor={(item, index) => `${item.id || index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              scrollEnabled={false} // Disable scrolling since we're in a ScrollView
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No sales data available</Text>
            </View>
          )}
        </View>

        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchReportData}
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
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    minWidth: width * 0.35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
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
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  cell: {
    fontSize: 14,
    color: '#333',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryName: {
    fontSize: 12,
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
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  dateInputText: {
    color: '#333',
  },
  dateRangeSeparator: {
    marginHorizontal: 10,
    color: '#666',
  },
});