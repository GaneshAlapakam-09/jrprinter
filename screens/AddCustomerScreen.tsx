import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

interface CustomerFormData {
//   customer_id: string;
  name: string;
  phone: string;
}

const API_URL = 'http://198.38.89.78:8080/api/customer';

const CustomerManagement: React.FC = () => {
  const [formData, setFormData] = useState<CustomerFormData>({
    // customer_id: 'new_id',
    name: '',
    phone: ''
  });
  const [phoneError, setPhoneError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleInputChange = (name: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Phone validation
    if (name === 'phone') {
      if (value.length > 15) {
        setPhoneError('Phone number is too long');
      } else if (!/^\d*$/.test(value)) {
        setPhoneError('Only numbers are allowed');
      } else {
        setPhoneError('');
      }
    }
  };

  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Network check failed:', error);
      return false;
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return false;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return false;
    }

    if (phoneError) {
      Alert.alert('Error', 'Please fix phone number errors before submitting');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      Alert.alert('Error', 'Please check your internet connection and try again');
      return;
    }

    setIsSubmitting(true);
    
    try {
        const response = await axios.post('http://juice.jrbilling.in/api/customer', formData, {
            timeout: 10000, // 10 seconds timeout
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",response.data.customer);
      
      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Customer created successfully!');
        // Reset form
        setFormData({
        //   customer_id: 'new_id',
          name: '',
          phone: ''
        });
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || 
                      error.message || 
                      'Network request failed';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.panel}>
        <Text style={styles.panelHeading}>Customer Management</Text>
        
        <View style={styles.panelBody}>
          {/* Customer Id */}
          {/* <View style={styles.formGroup}>
            <Text style={styles.label}>Customer Id</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              placeholder="Auto-generated"
              value={formData.customer_id}
              editable={false}
            />
          </View> */}
          
          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name*</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              maxLength={50}
              accessibilityLabel="Customer name input"
            />
          </View>
          
          {/* Phone */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone*</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              maxLength={15}
              accessibilityLabel="Phone number input"
            />
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : (
              <Text style={styles.hintText}>Maximum 15 digits</Text>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button, 
                (isSubmitting || phoneError || !formData.name || !formData.phone) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !!phoneError || !formData.name || !formData.phone}
              accessibilityRole="button"
              accessibilityLabel="Submit customer form"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 15,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  panelHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: '#333',
  },
  panelBody: {
    padding: 15,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#888',
  },
  errorText: {
    color: '#d9534f',
    fontSize: 14,
    marginTop: 5,
  },
  hintText: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 4,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerManagement;