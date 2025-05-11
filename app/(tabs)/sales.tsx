import React, { useState } from 'react';
import { View, Text, TextInput, Button, Picker, CheckBox, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';


export default function SalesScreen() {
    const [sales, setSales] = useState([
        { product: '', flavour: '', quantity: '', isParcel: false },
      ]);
    
      const [paymentMode, setPaymentMode] = useState('cash');
      const [products, setProducts] = useState([
        { productId: 1, name: 'Sugar Cane', unitPrice: 20 },
        { productId: 2, name: 'Mango Juice', unitPrice: 30 },
        { productId: 3, name: 'Strawberry Milkshake', unitPrice: 40 },
      ]);
      const [loading, setLoading] = useState(false);
    
      const handleAddSale = () => {
        setSales([...sales, { product: '', flavour: '', quantity: '', isParcel: false }]);
      };

      

      // Function to remove a sale item
  const removeSale = (index) => {
    const updatedSales = sales.filter((_, i) => i !== index);
    setSales(updatedSales);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
  
      const response = await fetch('https://your-api-url.com/api/product', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      const json = await response.json();
      if (json.result?.code === 200) {
        setProducts(json.data);
      } else {
        console.error('Product load failed:', json.result?.description);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };
    
      const updateSale = (index, field, value) => {
        const updated = [...sales];
        updated[index][field] = value as never;
        setSales(updated);
      };
    
      return (
        <ScrollView style={styles.container}>
          {sales.map((sale, index) => (
            <View key={index} style={styles.saleItem}>
                <View style={styles.saleHeader}>
                    <Text>Sale #{index + 1}</Text>
                    {/* Close icon */}
                    <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color="blue"
                    onPress={() => removeSale(index)} // Close (remove) sale on press
                    />
                </View>
    
              <View style={styles.row}>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={sale.product}
          onValueChange={(value) => updateSale(index, 'product', value)}
        >
          {products.map((prod) => (
  <Picker.Item key={prod.productId} label={prod.name} value={prod.productId.toString()} />
))}
        </Picker>
      </View>

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={sale.flavour}
          onValueChange={(value) => updateSale(index, 'flavour', value)}
        >
          <Picker.Item label="Select Flavour" value="" />
          <Picker.Item label="Mango" value="mango" />
          <Picker.Item label="Strawberry" value="strawberry" />
        </Picker>
      </View>
    </View>
    
              <View style={styles.row}>
                <TextInput
                    placeholder="Quantity"
                    keyboardType="numeric"
                    style={styles.input}
                    value={sale.quantity}
                    onChangeText={(text) => updateSale(index, 'quantity', text)}
                />
        
                <View style={styles.checkboxContainer}>
                    <CheckBox
                    value={sale.isParcel}
                    onValueChange={(newValue) => updateSale(index, 'isParcel', newValue)}
                    />
                    <Text>   Parcel</Text>
                </View>
              </View>

              <View style={styles.row}>
                <TextInput
                    placeholder="SalePrice"
                    keyboardType="numeric"
                    style={styles.input}
                    value={sale.salePrice}
                    onChangeText={(text) => updateSale(index, 'salePrice', text)}
                />
        
                <View style={styles.checkboxContainer}>
                    <Text>Amount : </Text>
                </View>
              </View>
            </View>
          ))}
    
          <Button title="Add Sale Item" onPress={handleAddSale} />
    
          <Text style={styles.paymentTitle}>Payment Mode</Text>
          <View style={styles.radioGroup}>
            <Button
              title="Cash"
              onPress={() => setPaymentMode('cash')}
              color={paymentMode === 'cash' ? 'green' : 'gray'}
            />
            <Button
              title="UPI"
              onPress={() => setPaymentMode('upi')}
              color={paymentMode === 'upi' ? 'green' : 'gray'}
            />
          </View>
    
          <View style={styles.orderButton}>
          <Button title="Submit Order" onPress={() => console.log({ sales, paymentMode })} />
          </View>
        </ScrollView>
      );
    }
    
    const styles = StyleSheet.create({
      container: { padding: 16 },
      saleItem: { marginBottom: 20, padding: 10, borderWidth: 1, borderRadius: 8 },
      input: { borderWidth: 1, padding: 8, marginTop: 8 },
      checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
      paymentTitle: { marginTop: 20, fontWeight: 'bold' },
      radioGroup: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
      row: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
      },
      pickerWrapper: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginHorizontal: 5,
      },
      saleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
      },
      orderButton: {
        marginTop: 10,
      }
    });