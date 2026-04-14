import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Modal, Pressable, FlatList,
  SafeAreaView, StatusBar, useColorScheme, KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { productService } from '../../services/productService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Divider } from 'react-native-paper';

// ─── Theme ──────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  input: '#F9FAFB', inputBorder: '#D1D5DB',
  success: '#059669', danger: '#EF4444'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  input: '#2D2B42', inputBorder: '#3D3B55',
  success: '#34D399', danger: '#F87171'
};

const AddProductScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Add Product'>>();
  
  const productId = route.params?.productId;
  const isEditing = !!productId;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 14 }}
          onPress={() => isEditing ? navigation.goBack() : (navigation as any).openDrawer()}
        >
          <Icon name={isEditing ? 'arrow-back' : 'menu'} size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: isEditing ? 'Edit Product' : 'Add Product',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerShown: true,
    });
  }, [navigation, t.text, t.card, isEditing]);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<{ id: number; name: string } | null>(null);
  
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  
  const [batchManaged, setBatchManaged] = useState(false);
  const [trackExpiry, setTrackExpiry] = useState(false);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProduct, setIsFetchingProduct] = useState(isEditing);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => { 
    fetchCategories(); 
    if (isEditing) fetchProductDetails();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await productService.getCategories();
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch {
      console.warn('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      const res = await productService.getById(productId!);
      const p = res.data;
      setName(p.name || '');
      setSku(p.sku || '');
      setBarcode(p.barcode || '');
      if (p.category) {
        setCategory({ id: p.category, name: p.category_name || 'Selected' });
      }
      setPurchasePrice(p.purchase_price != null ? String(p.purchase_price) : '');
      setSellingPrice(p.price != null ? String(p.price) : '');
      setMrp(p.mrp != null ? String(p.mrp) : '');
      setTaxRate(p.tax_rate != null ? String(p.tax_rate) : '');
      setReorderLevel(p.reorder_level != null ? String(p.reorder_level) : '');
      setBatchManaged(p.batch_managed || false);
      setTrackExpiry(p.track_expiry || false);
    } catch (err) {
      Alert.alert('Error', 'Failed to load product details.');
      navigation.goBack();
    } finally {
      setIsFetchingProduct(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !sellingPrice.trim() || !category) {
      Alert.alert('Incomplete Form', 'Name, Selling Price, and Category are required.');
      return;
    }
    
    const parsedPrice = parseFloat(sellingPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid selling price');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        category: category.id,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        price: parsedPrice,
        mrp: mrp ? parseFloat(mrp) : null,
        tax_rate: taxRate ? parseFloat(taxRate) : 0,
        reorder_level: reorderLevel ? parseInt(reorderLevel, 10) : 0,
        batch_managed: batchManaged,
        track_expiry: trackExpiry,
      };

      if (isEditing) {
        await productService.update(productId!, payload);
        Alert.alert('Success', 'Product updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await productService.create(payload);
        Alert.alert('Success', `"${name}" added successfully`, [
          { text: 'View List', onPress: () => { navigation.goBack(); } },
          { text: 'Add Another', onPress: () => { 
            setName(''); setSku(''); setBarcode(''); 
            setPurchasePrice(''); setSellingPrice(''); setMrp(''); 
            setBatchManaged(false); setTrackExpiry(false);
          } },
        ]);
      }
    } catch (error: any) {
      let msg = 'Failed to save product';
      if (error.response?.data) {
        msg = JSON.stringify(error.response.data);
      } else if (error instanceof Error) {
        msg = error.message;
      }
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) { Alert.alert('Error', 'Please enter a category name'); return; }
    setIsAddingCategory(true);
    try {
      const res = await productService.createCategory({ name: newCategoryName.trim() });
      await fetchCategories();
      setCategory({ id: res.data.id, name: res.data.name });
      setShowAddCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setIsAddingCategory(false);
    }
  };

  if (isFetchingProduct) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  const InputRow = ({ label, icon, value, onChange, placeholder, keyboardType = 'default', required = false }: any) => (
    <View style={s.inputContainer}>
      <Text style={[s.label, { color: t.subtext }]}>{label} {required && <Text style={{color: t.danger}}>*</Text>}</Text>
      <View style={[s.inputWrap, { backgroundColor: t.input, borderColor: t.inputBorder }]}>
        {icon && <Icon name={icon} size={18} color={t.subtext} style={{ marginRight: 10 }} />}
        <TextInput
          style={[s.input, { color: t.text }]}
          placeholder={placeholder}
          placeholderTextColor={t.subtext}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          autoCapitalize="words"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { backgroundColor: t.bg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Basic Details</Text>
            
            <InputRow label="Product Name" icon="label-outline" value={name} onChange={setName} placeholder="e.g. Filter Coffee" required />
            
            <View style={s.inputContainer}>
              <View style={s.labelRow}>
                <Text style={[s.label, { color: t.subtext }]}>Category <Text style={{color: t.danger}}>*</Text></Text>
                <TouchableOpacity
                  onPress={() => setShowAddCategoryModal(true)}
                  style={[s.newBtn, { backgroundColor: t.accentSoft }]}
                >
                  <Icon name="add" size={14} color={t.accent} />
                  <Text style={[s.newBtnText, { color: t.accent }]}>New</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[s.inputWrap, s.pickerBtn, { backgroundColor: t.input, borderColor: t.inputBorder }]}
                onPress={() => { if (!loadingCategories) setShowCategoryPicker(true); }}
                disabled={loadingCategories}
              >
                <Icon name="category" size={18} color={t.subtext} style={{ marginRight: 10 }} />
                {loadingCategories ? (
                  <ActivityIndicator size="small" color={t.accent} />
                ) : (
                  <>
                    <Text style={[s.input, { color: category ? t.text : t.subtext }]}>
                      {category ? category.name : 'Select a category'}
                    </Text>
                    <Icon name="arrow-drop-down" size={22} color={t.subtext} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Divider style={s.divider} />
            <Text style={[s.sectionTitle, { color: t.text }]}>Identification</Text>
            
            <InputRow label="SKU" icon="qr-code-scanner" value={sku} onChange={setSku} placeholder="Stock Keeping Unit" />
            <InputRow label="Barcode" icon="view-column" value={barcode} onChange={setBarcode} placeholder="Scan or type barcode" />
            
            <Divider style={s.divider} />
            <Text style={[s.sectionTitle, { color: t.text }]}>Pricing</Text>
            
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <InputRow label="Selling Price" icon="attach-money" value={sellingPrice} onChange={setSellingPrice} placeholder="0.00" keyboardType="decimal-pad" required />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <InputRow label="MRP" icon="monetization-on" value={mrp} onChange={setMrp} placeholder="0.00" keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                 <InputRow label="Purchase Price" icon="money-off" value={purchasePrice} onChange={setPurchasePrice} placeholder="0.00" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                 <InputRow label="Tax Rate (%)" icon="percent" value={taxRate} onChange={setTaxRate} placeholder="0" keyboardType="decimal-pad" />
              </View>
            </View>

            <Divider style={s.divider} />
            <Text style={[s.sectionTitle, { color: t.text }]}>Inventory Control</Text>

            <InputRow label="Reorder Level" icon="inventory" value={reorderLevel} onChange={setReorderLevel} placeholder="e.g. 10" keyboardType="numeric" />

            <View style={s.switchRow}>
              <View style={s.switchLabelContainer}>
                <Text style={[s.switchLabel, { color: t.text }]}>Batch Managed</Text>
                <Text style={[s.switchSub, { color: t.subtext }]}>Track product by multiple purchase batches</Text>
              </View>
              <Switch value={batchManaged} onValueChange={setBatchManaged} trackColor={{ true: t.accent }} />
            </View>

            <View style={s.switchRow}>
              <View style={s.switchLabelContainer}>
                <Text style={[s.switchLabel, { color: t.text }]}>Track Expiry</Text>
                <Text style={[s.switchSub, { color: t.subtext }]}>Require expiry date during purchase logs</Text>
              </View>
              <Switch value={trackExpiry} onValueChange={setTrackExpiry} trackColor={{ true: t.accent }} />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: t.accent }, isLoading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name={isEditing ? 'save' : 'add-circle-outline'} size={20} color="#FFF" />
                  <Text style={s.submitBtnText}>{isEditing ? 'Update Product' : 'Add Product'}</Text>
                </>
              )}
            </TouchableOpacity>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Picker Modal ───────────────────────── */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <Pressable style={s.overlay} onPress={() => setShowCategoryPicker(false)} />
        <View style={[s.sheet, { backgroundColor: t.card }]}>
          <View style={[s.dragHandle, { backgroundColor: t.border }]} />
          <View style={s.sheetHeader}>
            <Text style={[s.sheetTitle, { color: t.text }]}>Select Category</Text>
            <Pressable onPress={() => setShowCategoryPicker(false)}>
              <View style={[s.closeBox, { backgroundColor: t.accentSoft }]}>
                <Icon name="close" size={16} color={t.accent} />
              </View>
            </Pressable>
          </View>
          <FlatList
            data={categories}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.catRow, { borderColor: t.border }, category?.id === item.id && { backgroundColor: t.accentSoft }]}
                onPress={() => { setCategory(item); setShowCategoryPicker(false); }}
              >
                <Text style={[s.catText, { color: category?.id === item.id ? t.accent : t.text }]}>
                  {item.name}
                </Text>
                {category?.id === item.id && <Icon name="check-circle" size={18} color={t.accent} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Add Category Modal ─────────────────────────────── */}
      <Modal visible={showAddCategoryModal} transparent animationType="fade" onRequestClose={() => setShowAddCategoryModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowAddCategoryModal(false)} />
        <View style={[s.dialog, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[s.sheetTitle, { color: t.text, marginBottom: 14 }]}>New Category</Text>
          <View style={[s.inputWrap, { backgroundColor: t.input, borderColor: t.inputBorder }]}>
            <Icon name="label" size={18} color={t.subtext} style={{ marginRight: 10 }} />
            <TextInput
              style={[s.input, { color: t.text }]}
              placeholder="Category name"
              placeholderTextColor={t.subtext}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoCapitalize="words"
              autoFocus
            />
          </View>
          <View style={s.dialogBtns}>
            <TouchableOpacity
              style={[s.dialogBtn, { backgroundColor: t.input, borderColor: t.border, borderWidth: 1 }]}
              onPress={() => setShowAddCategoryModal(false)}
            >
              <Text style={[s.dialogBtnText, { color: t.subtext }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.dialogBtn, { backgroundColor: t.accent }]}
              onPress={handleAddCategory}
              disabled={isAddingCategory}
            >
              {isAddingCategory
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={[s.dialogBtnText, { color: '#FFF' }]}>Add</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 32 },
  card: {
    margin: 14, borderRadius: 18, padding: 18, borderWidth: 1,
    overflow: 'hidden'
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, marginTop: 8 },
  divider: { marginVertical: 16 },
  row: { flexDirection: 'row' },
  
  inputContainer: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  pickerBtn: { justifyContent: 'space-between', paddingVertical: 12 },
  
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 6
  },
  newBtnText: { fontSize: 12, fontWeight: '700' },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  switchLabelContainer: { flex: 1, paddingRight: 10 },
  switchLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  switchSub: { fontSize: 12, lineHeight: 16 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 24,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  // Modal
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 34, maxHeight: '65%',
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  closeBox: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  catRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catText: { fontSize: 15, fontWeight: '500' },
  
  // Dialog
  dialog: {
    position: 'absolute', alignSelf: 'center', width: '86%', top: '30%',
    borderRadius: 20, padding: 22, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  dialogBtns: { flexDirection: 'row', gap: 12, marginTop: 18 },
  dialogBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  dialogBtnText: { fontSize: 15, fontWeight: '700' },
});

export default AddProductScreen;