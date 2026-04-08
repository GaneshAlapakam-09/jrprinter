import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/MainStackParamList';
import api from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Types ─────────────────────────────────────────────────────────────────
type Product = {
  id: number;
  name: string;
  category: number;          // FK id from Django
  category_name: string;     // human-readable from ProductSerializer
  price: string | number;
};

type Category = { id: number; name: string };

// ─── Theme ─────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  input: '#F9FAFB', inputBorder: '#D1D5DB',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  shadow: '#000',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  input: '#2D2B42', inputBorder: '#3D3B55',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  shadow: '#000',
};

// ─── Main Component ─────────────────────────────────────────────────────────
const ListProductScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;

  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({ name: '', categoryId: 0, categoryName: '', price: '' });
  const [formErrors, setFormErrors] = useState({ name: '', category: '', price: '' });

  // ── Header button ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 14 }}
          onPress={() => (navigation as any).openDrawer()}
        >
          <Icon name="menu" size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={{
            marginRight: 14, flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
          }}
          onPress={() => navigation.navigate('Add Product')}
        >
          <Icon name="add" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      ),
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, scheme]);

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setError(null);
      const response = await api.get('/api/products/');
      if (!response.data || !Array.isArray(response.data))
        throw new Error('Invalid data format received from server');

      setProducts(
        response.data.map((item: any) => ({
          id: Number(item.id),
          name: item.name || 'Unnamed Product',
          category: item.category,
          // ✅ Use category_name (human-readable) from ProductSerializer
          category_name: item.category_name || 'Uncategorized',
          price: parseFloat(item.price) || 0,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get('/api/categories/');
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleDelete = (productId: number) => {
    Alert.alert(
      'Delete Product',
      'This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteProduct(productId) },
      ]
    );
  };

  const deleteProduct = async (productId: number) => {
    try {
      setDeletingId(productId);
      await api.delete(`/api/products/${productId}/`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch {
      Alert.alert('Error', 'Failed to delete product. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      categoryId: product.category,
      categoryName: product.category_name,
      price: typeof product.price === 'number' ? product.price.toString() : product.price,
    });
    setFormErrors({ name: '', category: '', price: '' });
    setIsEditModalVisible(true);
  };

  const validateForm = () => {
    const errs = { name: '', category: '', price: '' };
    let ok = true;
    if (!formData.name.trim()) { errs.name = 'Product name is required'; ok = false; }
    if (!formData.categoryId) { errs.category = 'Category is required'; ok = false; }
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errs.price = 'Enter a valid price'; ok = false;
    }
    setFormErrors(errs);
    return ok;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !editingProduct) return;
    try {
      await api.patch(`/api/products/${editingProduct.id}/`, {
        name: formData.name,
        category: formData.categoryId,
        price: Number(formData.price),
      });
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? { ...p, name: formData.name, category: formData.categoryId, category_name: formData.categoryName, price: Number(formData.price) }
          : p
      ));
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Product updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update product. Please try again.');
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Loading / Error ────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[s.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
        <Text style={[s.loadingText, { color: t.subtext }]}>Loading products…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[s.centered, { backgroundColor: t.bg }]}>
        <Icon name="wifi-off" size={44} color={t.danger} />
        <Text style={[s.errorTitle, { color: t.text }]}>Failed to load</Text>
        <Text style={[s.errorSub, { color: t.subtext }]}>{error}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: t.accent }]} onPress={fetchProducts}>
          <Icon name="refresh" size={16} color="#FFF" />
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Search bar */}
      <View style={[s.searchRow, { backgroundColor: t.card, borderColor: t.border }]}>
        <Icon name="search" size={20} color={t.subtext} />
        <TextInput
          style={[s.searchInput, { color: t.text }]}
          placeholder="Search products or categories…"
          placeholderTextColor={t.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={18} color={t.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* Product count pill */}
      <View style={s.countRow}>
        <Text style={[s.countText, { color: t.subtext }]}>
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProducts(); fetchCategories(); }}
            colors={[t.accent]}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Icon name="inventory-2" size={52} color={t.subtext} style={{ opacity: 0.5 }} />
            <Text style={[s.emptyTitle, { color: t.text }]}>No products found</Text>
            <Text style={[s.emptySub, { color: t.subtext }]}>
              {searchQuery ? 'Try a different search term' : 'Tap " + Add" to add your first product'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
            {/* Category pill */}
            <View style={[s.categoryPill, { backgroundColor: t.accentSoft }]}>
              <Text style={[s.categoryPillText, { color: t.accent }]} numberOfLines={1}>
                {item.category_name}
              </Text>
            </View>

            <View style={s.cardBody}>
              <Text style={[s.productName, { color: t.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[s.productPrice, { color: t.success }]}>
                ₹{Number(item.price).toFixed(2)}
              </Text>
            </View>

            <View style={[s.cardFooter, { borderTopColor: t.border }]}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: t.accentSoft }]}
                onPress={() => handleEdit(item)}
              >
                <Icon name="edit" size={16} color={t.accent} />
                <Text style={[s.actionBtnText, { color: t.accent }]}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: t.dangerSoft }]}
                onPress={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={t.danger} />
                ) : (
                  <>
                    <Icon name="delete-outline" size={16} color={t.danger} />
                    <Text style={[s.actionBtnText, { color: t.danger }]}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* ── Edit Modal (bottom sheet) ────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setIsEditModalVisible(false)} />

        <View style={[s.modalSheet, { backgroundColor: t.card }]}>
          <View style={[s.dragHandle, { backgroundColor: t.border }]} />

          <Text style={[s.modalTitle, { color: t.text }]}>Edit Product</Text>

          {/* Name */}
          <Text style={[s.label, { color: t.subtext }]}>Product Name</Text>
          <TextInput
            style={[s.input, { backgroundColor: t.input, borderColor: formErrors.name ? t.danger : t.inputBorder, color: t.text }]}
            value={formData.name}
            onChangeText={v => setFormData({ ...formData, name: v })}
            placeholder="Product name"
            placeholderTextColor={t.subtext}
          />
          {!!formErrors.name && <Text style={[s.fieldError, { color: t.danger }]}>{formErrors.name}</Text>}

          {/* Category picker */}
          <Text style={[s.label, { color: t.subtext }]}>Category</Text>
          <TouchableOpacity
            style={[s.input, s.pickerBtn, { backgroundColor: t.input, borderColor: formErrors.category ? t.danger : t.inputBorder }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={{ color: formData.categoryName ? t.text : t.subtext, fontSize: 15 }}>
              {formData.categoryName || 'Select category'}
            </Text>
            <Icon name="arrow-drop-down" size={22} color={t.subtext} />
          </TouchableOpacity>
          {!!formErrors.category && <Text style={[s.fieldError, { color: t.danger }]}>{formErrors.category}</Text>}

          {/* Price */}
          <Text style={[s.label, { color: t.subtext }]}>Price (₹)</Text>
          <TextInput
            style={[s.input, { backgroundColor: t.input, borderColor: formErrors.price ? t.danger : t.inputBorder, color: t.text }]}
            value={formData.price}
            onChangeText={v => setFormData({ ...formData, price: v })}
            placeholder="0.00"
            placeholderTextColor={t.subtext}
            keyboardType="numeric"
          />
          {!!formErrors.price && <Text style={[s.fieldError, { color: t.danger }]}>{formErrors.price}</Text>}

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: t.input, borderColor: t.border, borderWidth: 1 }]}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Text style={[s.btnText, { color: t.subtext }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: t.accent }]}
              onPress={handleSubmit}
            >
              <Text style={[s.btnText, { color: '#FFF' }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Category picker sub-modal ──────────────────────────────────── */}
      <Modal
        animationType="fade"
        transparent
        visible={showCategoryPicker}
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowCategoryPicker(false)} />
        <View style={[s.pickerSheet, { backgroundColor: t.card }]}>
          <View style={[s.dragHandle, { backgroundColor: t.border }]} />
          <Text style={[s.modalTitle, { color: t.text }]}>Select Category</Text>
          {loadingCategories ? (
            <ActivityIndicator color={t.accent} style={{ marginVertical: 20 }} />
          ) : (
            categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  s.catOption,
                  { borderColor: t.border },
                  formData.categoryId === cat.id && { backgroundColor: t.accentSoft },
                ]}
                onPress={() => {
                  setFormData({ ...formData, categoryId: cat.id, categoryName: cat.name });
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={[s.catOptionText, { color: formData.categoryId === cat.id ? t.accent : t.text }]}>
                  {cat.name}
                </Text>
                {formData.categoryId === cat.id && (
                  <Icon name="check" size={18} color={t.accent} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginTop: 10, marginBottom: 6,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  countRow: { marginHorizontal: 14, marginBottom: 8 },
  countText: { fontSize: 12 },

  // Cards
  card: {
    borderRadius: 16, borderWidth: 1, marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  categoryPill: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    margin: 12, marginBottom: 4, borderRadius: 20,
  },
  categoryPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  cardBody: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingBottom: 12,
  },
  productName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12, lineHeight: 20 },
  productPrice: { fontSize: 16, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row', gap: 10, padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // States
  loadingText: { marginTop: 12, fontSize: 14 },
  errorTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  errorSub: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 18, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 12,
  },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 34,
  },
  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 34, maxHeight: '60%',
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, marginBottom: 4,
  },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldError: { fontSize: 11, marginBottom: 8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  catOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catOptionText: { fontSize: 15, fontWeight: '500' },
});

export default ListProductScreen;