import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, useColorScheme,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';
import { customerService } from '../../services/customerService';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', input: '#F9FAFB', inputBorder: '#D1D5DB'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', input: '#2D2B42', inputBorder: '#3D3B55'
};

export default function AddCustomerScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<any, 'any'>>();
  
  const isEditing = !!route.params?.customerId;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: isEditing ? 'Edit Customer' : 'Add Customer',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t, isEditing]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditBalance, setCreditBalance] = useState('');
  
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (isEditing) {
      customerService.getById(route.params.customerId).then(res => {
        const c = res.data;
        setName(c.name || '');
        setPhone(c.phone || '');
        setAddress(c.address || '');
        setCreditBalance(c.credit_balance ? String(c.credit_balance) : '0');
        setLoading(false);
      }).catch(err => {
        Alert.alert('Error', 'Failed to load customer');
        navigation.goBack();
      });
    }
  }, [isEditing]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer Name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        credit_balance: creditBalance ? parseFloat(creditBalance) : 0,
      };

      if (isEditing) {
        await customerService.updateCustomer(route.params!.customerId, payload);
        Alert.alert('Success', 'Customer updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await customerService.createCustomer(payload);
        Alert.alert('Success', 'Customer added successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data ? JSON.stringify(err.response.data) : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: t.bg }]}><ActivityIndicator size="large" color={t.accent}/></View>
    );
  }

  const InputField = ({ label, value, onChange, placeholder, keyboardType="default", multiline=false }: any) => (
    <View style={s.inputContainer}>
      <Text style={[s.label, { color: t.subtext }]}>{label}</Text>
      <TextInput
        style={[s.input, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={t.subtext} keyboardType={keyboardType} multiline={multiline}
      />
    </View>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Basic Info</Text>
            
            <InputField label="Customer Name *" value={name} onChange={setName} placeholder="e.g. John Doe" />
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="10-digit number" keyboardType="phone-pad" />
            
            {!isEditing && (
              <InputField label="Opening Due (₹)" value={creditBalance} onChange={setCreditBalance} placeholder="0.00" keyboardType="decimal-pad" />
            )}

            <InputField label="Address (Optional)" value={address} onChange={setAddress} placeholder="Street, Area..." multiline />
            
          </Surface>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>{isEditing ? 'Save Changes' : 'Add Customer'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 15 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
