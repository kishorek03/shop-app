import AsyncStorage from '@react-native-async-storage/async-storage';
import getEnvConfig from '../../config/env';

const { API_BASE_URL } = getEnvConfig();

export const fetchMasterData = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No access token found');
    }

    const [productsRes, flavoursRes, addOnsRes, paymentMethodsRes] = await Promise.all([
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
      }),
      fetch(`${API_BASE_URL}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    const [productsData, flavoursData, addOnsData, paymentMethodsData] = await Promise.all([
      productsRes.json(),
      flavoursRes.json(),
      addOnsRes.json(),
      paymentMethodsRes.json()
    ]);

    const products = productsData.status === 'success' 
      ? productsData.data.filter(p => p && p.id)
      : [];
    
    const flavours = flavoursData.status === 'success'
      ? flavoursData.data.filter(f => f && f.id)
      : [];
    
    const addOns = addOnsData.status === 'success'
      ? addOnsData.data.filter(a => a && a.id)
      : [];

    const paymentMethods = paymentMethodsData.status === 'success'
      ? paymentMethodsData.data.filter(pm => pm && pm.id)
      : [];

    return {
      products,
      flavours,
      addOns,
      paymentMethods,
      error: null
    };
  } catch (error) {
    console.error('Error fetching master data:', error);
    return {
      products: [],
      flavours: [],
      addOns: [],
      paymentMethods: [],
      error: error.message
    };
  }
};

export const getAvailableFlavours = (productId, products, flavours) => {
  if (!productId) return [];
  const selectedProduct = products.find(p => p.id.toString() === productId);
  if (!selectedProduct || !selectedProduct.flavourIds) return [];
  
  return flavours.filter(flavour => 
    selectedProduct.flavourIds.includes(flavour.id)
  );
};

export const getAvailableAddOns = (productId, products, addOns) => {
  if (!productId) return [];
  const selectedProduct = products.find(p => p.id.toString() === productId);
  if (!selectedProduct || !selectedProduct.addOnIds) return [];
  
  return addOns.filter(addOn => 
    selectedProduct.addOnIds.includes(addOn.id)
  );
};

// Default export containing all utility functions
export default {
  fetchMasterData,
  getAvailableFlavours,
  getAvailableAddOns
}; 