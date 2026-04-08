import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ScrollView, ActivityIndicator, Modal, Pressable, FlatList,
  SafeAreaView, StatusBar, useColorScheme, KeyboardAvoidingView, Platform,
} from 'react-native';
import api from '../api/axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Theme ──────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  input: '#F9FAFB', inputBorder: '#D1D5DB',
  success: '#059669',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  input: '#2D2B42', inputBorder: '#3D3B55',
  success: '#34D399',
};

const AddProductScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
      headerTitle: 'Add Product',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerShown: true,
    });
  }, [navigation, t.text, t.card]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get('/api/categories/');
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
        if (response.data.length > 0 && !category) {
          setCategory(response.data[0].name);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price.trim() || !category) {
      Alert.alert('Incomplete Form', 'Please fill in all fields');
      return;
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }
    setIsLoading(true);
    try {
      const categoryObj = categories.find(c => c.name === category);
      await api.post('/api/products/', {
        name,
        category: categoryObj?.id,
        price: parseFloat(price),
      });
      Alert.alert('✓ Product Added', `"${name}" has been added successfully`, [
        {
          text: 'View Products',
          onPress: () => { setName(''); setPrice(''); navigation.navigate('List Products' as any); },
        },
        { text: 'Add Another', onPress: () => { setName(''); setPrice(''); } },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) { Alert.alert('Error', 'Please enter a category name'); return; }
    setIsAddingCategory(true);
    try {
      await api.post('/api/categories/', { name: newCategoryName.trim() });
      await fetchCategories();
      setCategory(newCategoryName.trim());
      setShowAddCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add category');
    } finally {
      setIsAddingCategory(false);
    }
  };

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
          {/* Form card */}

          {/* Form card */}
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>

            {/* Product Name */}
            <Text style={[s.label, { color: t.subtext }]}>Product Name</Text>
            <View style={[s.inputWrap, { backgroundColor: t.input, borderColor: t.inputBorder }]}>
              <Icon name="label-outline" size={18} color={t.subtext} style={{ marginRight: 10 }} />
              <TextInput
                style={[s.input, { color: t.text }]}
                placeholder="e.g. Masala Dosa"
                placeholderTextColor={t.subtext}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Category */}
            <View style={s.labelRow}>
              <Text style={[s.label, { color: t.subtext }]}>Category</Text>
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
                    {category || 'Select a category'}
                  </Text>
                  <Icon name="arrow-drop-down" size={22} color={t.subtext} />
                </>
              )}
            </TouchableOpacity>

            {/* Price */}
            <Text style={[s.label, { color: t.subtext }]}>Price (₹)</Text>
            <View style={[s.inputWrap, { backgroundColor: t.input, borderColor: t.inputBorder }]}>
              <Text style={{ color: t.subtext, fontSize: 16, marginRight: 8 }}>₹</Text>
              <TextInput
                style={[s.input, { color: t.text }]}
                placeholder="0.00"
                placeholderTextColor={t.subtext}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
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
                  <Icon name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={s.submitBtnText}>Add Product</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category Picker Modal (bottom sheet) ───────────────────────── */}
      <Modal visible={showCategoryPicker} transparent animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}>
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
                style={[s.catRow, { borderColor: t.border },
                category === item.name && { backgroundColor: t.accentSoft }]}
                onPress={() => { setCategory(item.name); setShowCategoryPicker(false); }}
              >
                <Text style={[s.catText, { color: category === item.name ? t.accent : t.text }]}>
                  {item.name}
                </Text>
                {category === item.name && <Icon name="check-circle" size={18} color={t.accent} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── Add Category Modal (centered) ─────────────────────────────── */}
      <Modal visible={showAddCategoryModal} transparent animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}>
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
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, marginTop: 4 },
  card: {
    margin: 14, borderRadius: 18, padding: 18, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  pickerBtn: { justifyContent: 'space-between' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  newBtnText: { fontSize: 12, fontWeight: '700' },
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
    padding: 20, paddingBottom: 34, maxHeight: '55%',
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