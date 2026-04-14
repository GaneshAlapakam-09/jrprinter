import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, useColorScheme,
  TextInput, Modal, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Searchbar } from 'react-native-paper';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', success: '#059669',
  input: '#F9FAFB', inputBorder: '#D1D5DB'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', success: '#34D399',
  input: '#2D2B42', inputBorder: '#3D3B55'
};

export default function AddPurchaseScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierStr, setSupplierStr] = useState('Select Supplier');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const [items, setItems] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Record Purchase',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          supplierService.getSuppliers(),
          productService.getAll()
        ]);
        setSuppliers(supRes.data?.results || supRes.data || []);
        setProducts(prodRes.data?.results || prodRes.data || []);
      } catch (err) {
        Alert.alert('Error', 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddProduct = (prod: any) => {
    if (items.find(i => i.product_id === prod.id)) {
      Alert.alert('Already added', 'This product is already in the list.');
      return;
    }
    setItems([...items, {
      product_id: prod.id,
      name: prod.name,
      quantity: '1',
      cost_price: prod.purchase_price ? String(prod.purchase_price) : '',
      selling_price: prod.price ? String(prod.price) : '',
      batch_number: '',
      expiry_date: '',
      tax_percent: '0'
    }]);
    setShowProductModal(false);
    setSearchQuery('');
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    items.forEach(i => {
      const q = parseFloat(i.quantity) || 0;
      const c = parseFloat(i.cost_price) || 0;
      const tPercent = parseFloat(i.tax_percent) || 0;
      
      const lineBase = q * c;
      const lineTax = lineBase * (tPercent / 100);
      
      subtotal += lineBase;
      taxAmount += lineTax;
    });
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const handleSubmit = async () => {
    if (!supplierId) {
      Alert.alert('Validation Error', 'Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product.');
      return;
    }
    
    // Ensure all items have qty > 0 and cost
    for (let i of items) {
      if (!parseFloat(i.quantity) || parseFloat(i.quantity) <= 0) {
        Alert.alert('Validation Error', `Invalid quantity for ${i.name}`);
        return;
      }
      if (!parseFloat(i.cost_price) || parseFloat(i.cost_price) <= 0) {
        Alert.alert('Validation Error', `Invalid cost price for ${i.name}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        status: 'Completed', // Direct stock inward
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        due_amount: total, // Unpaid by default, use Supplier Payment to settle
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: parseFloat(i.quantity),
          cost_price: parseFloat(i.cost_price),
          selling_price: parseFloat(i.selling_price) || 0,
          batch_number: i.batch_number || null,
          expiry_date: i.expiry_date || null,
          tax_percent: parseFloat(i.tax_percent) || 0,
        }))
      };

      await purchaseService.createPurchase(payload);
      Alert.alert('Success', 'Purchase recorded gracefully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode || '').includes(searchQuery));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Header Info</Text>
            
            <View style={s.inputContainer}>
              <Text style={[s.label, { color: t.subtext }]}>Supplier</Text>
              <TouchableOpacity style={[s.pickerBtn, { backgroundColor: t.input, borderColor: t.inputBorder }]} onPress={() => setShowSupplierModal(true)}>
                <Text style={{ color: supplierId ? t.text : t.subtext }}>{supplierStr}</Text>
                <Icon name="arrow-drop-down" size={24} color={t.subtext} />
              </TouchableOpacity>
            </View>

            <View style={s.inputContainer}>
              <Text style={[s.label, { color: t.subtext }]}>Invoice Number</Text>
              <TextInput
                style={[s.inputWrap, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                placeholder="INV-XXXX" placeholderTextColor={t.subtext}
                value={invoiceNumber} onChangeText={setInvoiceNumber}
              />
            </View>
          </Surface>

          <Text style={[s.sectionTitle, { color: t.text, marginTop: 8, marginLeft: 4 }]}>Items ({items.length})</Text>
          
          {items.map((item, index) => (
            <Surface key={index} style={[s.itemCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
              <View style={s.itemHeader}>
                <Text style={[s.itemTitle, { color: t.text }]}>{item.name}</Text>
                <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 4 }}>
                  <Icon name="close" size={20} color={t.danger} />
                </TouchableOpacity>
              </View>

              <View style={s.itemRow}>
                <View style={s.flex1}>
                  <Text style={[s.label, { color: t.subtext }]}>Qty</Text>
                  <TextInput style={[s.miniInput, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                    keyboardType="numeric" value={item.quantity} onChangeText={(v) => updateItem(index, 'quantity', v)} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.label, { color: t.subtext }]}>Cost / Unit</Text>
                  <TextInput style={[s.miniInput, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                    keyboardType="decimal-pad" value={item.cost_price} onChangeText={(v) => updateItem(index, 'cost_price', v)} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.label, { color: t.subtext }]}>Tax %</Text>
                  <TextInput style={[s.miniInput, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                    keyboardType="decimal-pad" value={item.tax_percent} onChangeText={(v) => updateItem(index, 'tax_percent', v)} />
                </View>
              </View>
              
              <View style={s.itemRow}>
                <View style={s.flex1}>
                  <Text style={[s.label, { color: t.subtext }]}>Batch # (Opt)</Text>
                  <TextInput style={[s.miniInput, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                    value={item.batch_number} onChangeText={(v) => updateItem(index, 'batch_number', v)} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.label, { color: t.subtext }]}>Exp Date (Opt)</Text>
                  <TextInput style={[s.miniInput, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                    placeholder="YYYY-MM-DD" placeholderTextColor={t.subtext}
                    value={item.expiry_date} onChangeText={(v) => updateItem(index, 'expiry_date', v)} />
                </View>
              </View>
            </Surface>
          ))}

          <TouchableOpacity style={[s.addProdBtn, { borderColor: t.accent }]} onPress={() => setShowProductModal(true)}>
            <Icon name="add" size={20} color={t.accent} />
            <Text style={{ color: t.accent, fontWeight: '700', marginLeft: 6 }}>Add Product</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <View style={s.footerLeft}>
          <Text style={{ color: t.subtext, fontSize: 13, fontWeight: '600' }}>Total (inc. tax)</Text>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: 'bold' }}>₹{total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Save Purchase</Text>}
        </TouchableOpacity>
      </View>

      {/* Supplier Modal */}
      <Modal visible={showSupplierModal} transparent animationType="fade" onRequestClose={() => setShowSupplierModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: t.card }]}>
            <Text style={[s.modalTitle, { color: t.text }]}>Select Supplier</Text>
            <FlatList
              data={suppliers}
              keyExtractor={s => s.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.modalRow, { borderBottomColor: t.border }]}
                  onPress={() => { setSupplierId(item.id); setSupplierStr(item.name); setShowSupplierModal(false); }}>
                  <Text style={{ color: t.text, fontSize: 16 }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowSupplierModal(false)}>
              <Text style={{ color: t.accent, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Search Modal */}
      <Modal visible={showProductModal} animationType="slide" onRequestClose={() => setShowProductModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
           <View style={[s.modalHeader, { backgroundColor: t.card, borderBottomColor: t.border }]}>
             <TouchableOpacity onPress={() => setShowProductModal(false)}><Icon name="close" size={24} color={t.text}/></TouchableOpacity>
             <Text style={{ fontSize: 18, fontWeight: '700', color: t.text, marginLeft: 16 }}>Search Product</Text>
           </View>
           <View style={{ padding: 14 }}>
             <Searchbar placeholder="Name or Barcode" onChangeText={setSearchQuery} value={searchQuery}
               style={{ backgroundColor: t.input, borderRadius: 10 }} inputStyle={{ color: t.text }} iconColor={t.subtext} elevation={0} autoFocus/>
           </View>
           <FlatList
             data={filteredProducts}
             keyExtractor={p => p.id.toString()}
             contentContainerStyle={{ padding: 14 }}
             renderItem={({ item }) => (
               <TouchableOpacity style={[s.prodRow, { borderColor: t.border, backgroundColor: t.card }]} onPress={() => handleAddProduct(item)}>
                 <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                 <Text style={{ color: t.subtext, fontSize: 12 }}>Stock: {item.current_stock || 0}</Text>
               </TouchableOpacity>
             )}
           />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  inputWrap: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46 },
  
  itemCard: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  flex1: { flex: 1 },
  miniInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 40, fontSize: 14 },

  addProdBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginBottom: 16 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  footerLeft: { flex: 1 },
  submitBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 140 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '80%', maxHeight: '70%', borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  prodRow: { padding: 16, borderRadius: 10, borderWidth: 1, marginBottom: 8 }
});
