import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker'; // Assuming Picker is installed
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import getEnvConfig from '../config/env';
import { useLanguage } from '../context/LanguageContext';

const { API_BASE_URL } = getEnvConfig();

const RecordCashMovementModal = ({ isVisible, onClose, onMovementRecorded }) => {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('DEPOSIT'); // Default type
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveMovement = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t('error'), t('enterValidAmount'));
      return;
    }

    const today = new Date();
    const businessDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

    let direction;
    // Determine direction based on type
    if (type === 'DEPOSIT' || type === 'PAYOUT' || type === 'PROFIT_WITHDRAWAL') {
      direction = 'OUT';
    } else if (type === 'CASH_IN' || type === 'INITIAL_FLOAT') {
      direction = 'IN';
    } else {
      direction = 'OUT'; // Fallback
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert(t('error'), t('pleaseLoginFirst'));
        return;
      }

      const response = await fetch(`${API_BASE_URL}/cash-movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessDate,
          type,
          amount: parsedAmount,
          direction,
          remarks,
          userId: 'admin', // Placeholder, replace with actual userId
        }),
      });

      const json = await response.json();

      if (response.ok && json.status === 'success') {
        Alert.alert(t('success'), t('cashMovementRecorded'));
        onMovementRecorded(); // Callback to refresh summary in SalesScreen
        onClose();
        // Reset form fields
        setAmount('');
        setRemarks('');
        setType('DEPOSIT');
      } else {
        Alert.alert(t('error'), json.message || t('failedRecordMovement'));
      }
    } catch (error) {
      console.error('Error recording cash movement:', error);
      Alert.alert(t('error'), t('failedRecordMovementTryAgain'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>{t('recordCashMovement')}</Text>

          <Text style={modalStyles.label}>{t('amount')}</Text>
          <TextInput
            style={modalStyles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder={t('enterAmount')}
            placeholderTextColor="#888"
          />

          <Text style={modalStyles.label}>{t('movementType')}</Text>
          <View style={modalStyles.pickerContainer}>
            <Picker
              selectedValue={type}
              onValueChange={(itemValue) => setType(itemValue)}
              style={modalStyles.picker}
            >
              <Picker.Item label={t('cashDeposit')} value="DEPOSIT" />
              <Picker.Item label={t('cashPayout')} value="PAYOUT" />
              <Picker.Item label={t('profitWithdrawal')} value="PROFIT_WITHDRAWAL" />
              <Picker.Item label={t('cashIn')} value="CASH_IN" />
              {/* Add more specific types as needed, e.g., 'Initial Float' if you want to track it this way too */}
            </Picker>
          </View>

          <Text style={modalStyles.label}>{t('remarks')}</Text>
          <TextInput
            style={modalStyles.input}
            value={remarks}
            onChangeText={setRemarks}
            placeholder={t('enterRemarksOptional')}
            placeholderTextColor="#888"
            multiline
          />

          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity style={modalStyles.button} onPress={handleSaveMovement} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.buttonText}>{t('save')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={onClose}>
              <Text style={modalStyles.buttonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 35, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
  modalTitle: { marginBottom: 15, textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
  label: { alignSelf: 'flex-start', marginLeft: 5, marginBottom: 5, fontWeight: '600', color: '#333' },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginBottom: 15 },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, width: '100%', marginBottom: 15 },
  picker: { width: '100%' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  button: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 10, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  cancelButton: { backgroundColor: '#E53935' },
  buttonText: { color: 'white', fontWeight: 'bold' },
});

export default RecordCashMovementModal; 