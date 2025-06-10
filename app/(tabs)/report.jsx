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

  // Add state for available flavors based on selected product
  const [availableFlavours, setAvailableFlavours] = useState([]);

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedDateType, setSelectedDateType] = useState('start'); // 'start' or 'end'

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [filterPeriod, selectedProductId, selectedFlavourId, selectedParcel, startDate, endDate]);

  // Update available flavors when product changes
  useEffect(() => {
    if (selectedProductId === 'all') {
      setAvailableFlavours(flavours);
      setSelectedFlavourId('all');
    } else {
      const selectedProduct = products.find(p => p.id.toString() === selectedProductId);
      if (selectedProduct && selectedProduct.flavours) {
        setAvailableFlavours(selectedProduct.flavours);
      } else {
        setAvailableFlavours([]);
      }
      setSelectedFlavourId('all');
    }
  }, [selectedProductId, products, flavours]);

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

      console.log('Products Response:', productsData);
      console.log('Raw Products Data:', productsData.data);
      
      if (productsData.status === 'success') {
        // Check if the data is in the expected format
        const validProducts = productsData.data.filter(p => {
          console.log('Checking product:', p);
          return p && (p.id);
        });
        console.log('Valid Products:', validProducts);
        setProducts(validProducts);
      }
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

  const handleDateSelection = (date) => {
    if (selectedDateType === 'start') {
      setStartDate(date);
      if (!endDate || date > endDate) {
        setEndDate(date);
      }
    } else {
      setEndDate(date);
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
            queryParams.append('startDate', startDate.toISOString());
            queryParams.append('endDate', new Date().toISOString());
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            queryParams.append('startDate', startDate.toISOString());
            queryParams.append('endDate', new Date().toISOString());
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            queryParams.append('startDate', startDate.toISOString());
            queryParams.append('endDate', new Date().toISOString());
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            queryParams.append('startDate', startDate.toISOString());
            queryParams.append('endDate', new Date().toISOString());
            break;
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
    const noFlavourCount = safeReportData.filter(item => !item?.flavourId).length;
    const noFlavourTotal = safeReportData
      .filter(item => !item?.flavourId)
      .reduce((sum, item) => sum + (typeof item?.amount === 'number' ? item.amount : 0), 0);

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
      noFlavourCount,
      noFlavourTotal: noFlavourTotal.toFixed(2),
      topProduct: topProduct 
        ? {
            name: topProduct.name || 'NA',
            amount: topProductAmount.toFixed(2)
          }
        : { name: 'NA', amount: '0.00' }
    };
  }, [reportData, products]);

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePickerModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDatePickerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePickerContent}>
            <View style={styles.datePickerRow}>
              <Text style={styles.datePickerLabel}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setStartDate(date);
                    if (!endDate || date > endDate) {
                      setEndDate(date);
                    }
                  }}
                  style={styles.webDateInput}
                />
              ) : (
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
                  <Text style={styles.datePickerButtonText}>
                    {formatDateForDisplay(startDate)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.datePickerRow}>
              <Text style={styles.datePickerLabel}>End Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setEndDate(date);
                  }}
                  style={styles.webDateInput}
                />
              ) : (
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => {
                    setSelectedDateType('end');
                    setShowDatePickerModal(false);
                    setTimeout(() => {
                      setShowEndDatePicker(true);
                    }, 100);
                  }}
                >
                  <Text style={styles.datePickerButtonText}>
                    {formatDateForDisplay(endDate)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
                setShowDatePickerModal(false);
              }}
            >
              <Text style={styles.modalButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonApply]}
              onPress={() => {
                if (startDate && endDate) {
                  fetchReportData();
                }
                setShowDatePickerModal(false);
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
          setShowDatePickerModal(true);
        } else {
          onPress(value);
          setStartDate(null);
          setEndDate(null);
          fetchReportData();
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
          <Text style={styles.productName}>
            {product?.name || `Product : ${item?.productId || 'NA'}`}
          </Text>
          <Text style={styles.categoryName}>
            {flavour ? flavour.name : 'No Flavour'}
            {addOn ? ` + ${addOn.name}` : ''}
          </Text>
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

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Flavour</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedFlavourId}
              onValueChange={setSelectedFlavourId}
              style={styles.picker}
              dropdownIconColor="#4CAF50"
              enabled={selectedProductId !== 'all'}
            >
              <Picker.Item label="All Flavours" value="all" />
              <Picker.Item label="No Flavour" value="none" />
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
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Add-On</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedAddOnId}
              onValueChange={setSelectedAddOnId}
              style={styles.picker}
              dropdownIconColor="#4CAF50"
            >
              <Picker.Item label="All Add-Ons" value="all" />
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

        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Parcel</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedParcel}
              onValueChange={setSelectedParcel}
              style={styles.picker}
              dropdownIconColor="#4CAF50"
            >
              <Picker.Item label="All Orders" value="all" />
              <Picker.Item label="Parcel Only" value="yes" />
              <Picker.Item label="Non-Parcel" value="no" />
            </Picker>
          </View>
        </View>
      </View>

      {filterPeriod === 'custom' && renderDatePickerModal()}
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

        {/* Date Pickers - Only show on native platforms */}
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
          {renderHeader()}
          {filteredData.length > 0 ? (
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    padding: 20,
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
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  datePickerContent: {
    marginBottom: 20,
  },
  datePickerRow: {
    marginBottom: 15,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  datePickerButtonText: {
    color: '#333',
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
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
    fontSize: 16,
    color: '#666',
  },
  modalButtonTextApply: {
    color: '#fff',
  },
  webDateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    width: '100%',
    fontSize: 16,
    color: '#333',
  },
});