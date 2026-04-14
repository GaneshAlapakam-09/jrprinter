import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, useColorScheme,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';
import { inventoryService } from '../../services/inventoryService';
import { productService } from '../../services/productService';

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

const ADJ_TYPES = [
  { id: 'adjustment_add', label: 'Manual Add', deltaMult: 1 },
  { id: 'adjustment_reduce', label: 'Manual Reduce', deltaMult: -1 },
  { id: 'damage', label: 'Damage', deltaMult: -1 },
  { id: 'expiry_writeoff', label: 'Expiry Write-off', deltaMult: -1 },
];

export default function StockAdjustmentScreen() {
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
      headerTitle: 'Stock Adjustment',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjType, setAdjType] = useState<any>(ADJ_TYPES[1]);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
     productService.getProducts().then(res => setProducts(res.data.results || res.data)).catch(console.warn);
  }, []);

  const handleSubmit = async () => {
    if (!selectedProduct) { Alert.alert('Error', 'Please select a product'); return; }
    const delta = parseFloat(qty);
    if (!delta || delta <= 0) { Alert.alert('Error', 'Please enter a valid quantity'); return; }

    setSubmitting(true);
    try {
      await inventoryService.createStockMovement({
        product: selectedProduct.id,
        movement_type: adjType.id,
        quantity_delta: delta * adjType.deltaMult,
        reason: reason.trim(),
        reference_type: 'Manual Adjustment'
      });
      // Optionally deduct from product's actual stock if the backend doesn't automate it via signals. Assuming Django logic covers it.
      Alert.alert('Success', 'Stock adjusted successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data ? JSON.stringify(err.response.data) : 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

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
            <Text style={[s.sectionTitle, { color: t.text }]}>Item Details</Text>
            
            {/* Simple product picker mock */}
            <View style={s.inputContainer}>
              <Text style={[s.label, { color: t.subtext }]}>Select Product *</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {products.map(p => (
                     <TouchableOpacity key={p.id} onPress={() => setSelectedProduct(p)} style={[s.pill, { backgroundColor: selectedProduct?.id === p.id ? t.accent : t.input, borderColor: selectedProduct?.id === p.id ? t.accent : t.inputBorder }]}>
                        <Text style={{ color: selectedProduct?.id === p.id ? '#FFF' : t.text, fontWeight: '600' }}>{p.name}</Text>
                     </TouchableOpacity>
                  ))}
               </ScrollView>
               {!selectedProduct && <Text style={{ color: t.danger, fontSize: 11, marginTop: 4 }}>* Required</Text>}
            </View>

            <View style={s.inputContainer}>
              <Text style={[s.label, { color: t.subtext }]}>Adjustment Type *</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {ADJ_TYPES.map(a => (
                     <TouchableOpacity key={a.id} onPress={() => setAdjType(a)} style={[s.pill, { backgroundColor: adjType.id === a.id ? t.accent : t.input, borderColor: adjType.id === a.id ? t.accent : t.inputBorder }]}>
                        <Text style={{ color: adjType.id === a.id ? '#FFF' : t.text, fontWeight: '600' }}>{a.label}</Text>
                     </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>
            
            <InputField label="Quantity *" value={qty} onChange={setQty} placeholder="0" keyboardType="numeric" />
            <InputField label="Reason / Remarks" value={reason} onChange={setReason} placeholder="Explain why..." multiline />
            
          </Surface>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Submit Adjustment</Text>}
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
  
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 15 },

  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
