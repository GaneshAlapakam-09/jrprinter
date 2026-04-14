import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, useColorScheme,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Switch } from 'react-native-paper';
import { settingsService } from '../../services/settingsService';

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

export default function StoreSettingsScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Store Identity',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [storeId, setStoreId] = useState<number>(1);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [prefix, setPrefix] = useState('INV-');

  useEffect(() => {
    const loadAll = async () => {
      try {
        // Fetch store identity
        const storeRes = await settingsService.getStore(1);
        const store = storeRes.data;
        setStoreId(store.id);
        setName(store.name || '');
        setAddress(store.address || '');
        setGstin(store.gstin || '');
        setReceiptHeader(store.receipt_header || '');
        setReceiptFooter(store.receipt_footer || '');

        // Fetch operational settings
        const settingsRes = await settingsService.getStoreSettings();
        const settings = settingsRes.data.results ? settingsRes.data.results[0] : settingsRes.data[0];
        if (settings) {
          setSettingsId(settings.id);
          setPrefix(settings.bill_number_prefix || 'INV-');
        }
      } catch (err) {
        console.warn('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // Update store identity
      await settingsService.updateStore(storeId, {
        name, address, gstin,
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter
      });

      // Update operational settings
      if (settingsId) {
        await settingsService.updateStoreSettings(settingsId, {
          store: storeId,
          bill_number_prefix: prefix
        });
      }

      Alert.alert('Success', 'Store configuration updated');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({ label, value, onChange, placeholder, multiline=false }: any) => (
    <View style={s.inputContainer}>
      <Text style={[s.label, { color: t.subtext }]}>{label}</Text>
      <TextInput
        style={[s.input, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.subtext} multiline={multiline}
      />
    </View>
  );

  if (loading) return <View style={[s.centered, { backgroundColor: t.bg }]}><ActivityIndicator size="large" color={t.accent}/></View>;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>General Identity</Text>
            <InputField label="Store Name" value={name} onChange={setName} placeholder="Your Supermarket Name" />
            <InputField label="Store Address" value={address} onChange={setAddress} placeholder="Full address" multiline />
            <InputField label="Tax / GSTIN Number" value={gstin} onChange={setGstin} placeholder="e.g. 33AABCD1234E1Z" />
          </Surface>

          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Invoice Rules</Text>
            <InputField label="Invoice Number Prefix" value={prefix} onChange={setPrefix} placeholder="e.g. INV-" />
            <InputField label="Receipt Header Text" value={receiptHeader} onChange={setReceiptHeader} placeholder="Text at top of bill slip" multiline />
            <InputField label="Receipt Footer Text" value={receiptFooter} onChange={setReceiptFooter} placeholder="Thank you message" multiline />
          </Surface>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }, submitting && { opacity: 0.7 }]}
          onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Save Settings</Text>}
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
