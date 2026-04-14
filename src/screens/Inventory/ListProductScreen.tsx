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
  TextInput,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { productService } from '../../services/productService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Chip } from 'react-native-paper';

// ─── Types ─────────────────────────────────────────────────────────────────
type Product = {
  id: number;
  name: string;
  category: number;
  category_name: string;
  price: number;
  barcode: string;
  sku: string;
  current_stock: number;
  reorder_level: number;
};

type Category = { id: number; name: string };
type StockFilter = 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock';

// ─── Theme ─────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  input: '#F9FAFB', inputBorder: '#D1D5DB',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  warning: '#F59E0B', warningSoft: '#FEF3C7',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  input: '#2D2B42', inputBorder: '#3D3B55',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  warning: '#FBBF24', warningSoft: '#332701',
};

// ─── Main Component ─────────────────────────────────────────────────────────
const ListProductScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>('All');

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
          onPress={() => (navigation as any).navigate('Add Product')}
        >
          <Icon name="add" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      ),
      headerTitle: 'Product Catalog',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, scheme]);

  // ── Data fetching ──────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setError(null);
      const response = await productService.getAll();
      if (!response.data || !Array.isArray(response.data))
        throw new Error('Invalid data format received from server');

      setProducts(response.data.map((item: any) => ({
        id: Number(item.id),
        name: item.name || 'Unnamed Product',
        category: item.category,
        category_name: item.category_name || 'Uncategorized',
        price: parseFloat(item.price) || 0,
        barcode: item.barcode || '',
        sku: item.sku || '',
        current_stock: Number(item.current_stock) || 0,
        reorder_level: Number(item.reorder_level) || 0,
      })));
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
      const response = await productService.getCategories();
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch {
      console.warn('Failed to load categories');
    }
  };

  useEffect(() => { 
    // Add focus listener to refresh data when returning to screen
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts(); 
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation]);

  // ── Filtered list ──────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    // text search
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    // category filter
    const matchesCategory = selectedCategory === null || p.category === selectedCategory;

    // stock filter
    let matchesStock = true;
    if (stockFilter === 'In Stock') {
      matchesStock = p.current_stock > p.reorder_level;
    } else if (stockFilter === 'Low Stock') {
      matchesStock = p.current_stock > 0 && p.current_stock <= p.reorder_level;
    } else if (stockFilter === 'Out of Stock') {
      matchesStock = p.current_stock <= 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

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

  const getStockColor = (stock: number, reorder: number) => {
    if (stock <= 0) return t.danger;
    if (stock <= reorder) return t.warning;
    return t.success;
  };

  const getStockLabel = (stock: number, reorder: number) => {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= reorder) return 'Low Stock';
    return 'In Stock';
  };

  // ── Main Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Search bar */}
      <View style={[s.searchRow, { backgroundColor: t.card, borderColor: t.border }]}>
        <Icon name="search" size={20} color={t.subtext} />
        <TextInput
          style={[s.searchInput, { color: t.text }]}
          placeholder="Search by name, barcode or SKU…"
          placeholderTextColor={t.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={18} color={t.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={s.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
          <Chip 
            selected={stockFilter === 'All'} 
            onPress={() => setStockFilter('All')}
            style={[s.chip, stockFilter === 'All' && { backgroundColor: t.accentSoft }]}
            textStyle={{ color: stockFilter === 'All' ? t.accent : t.subtext }}
          >
            All Stock
          </Chip>
          <Chip 
            selected={stockFilter === 'In Stock'} 
            onPress={() => setStockFilter('In Stock')}
            style={[s.chip, stockFilter === 'In Stock' && { backgroundColor: t.successSoft }]}
            textStyle={{ color: stockFilter === 'In Stock' ? t.success : t.subtext }}
          >
            In Stock
          </Chip>
          <Chip 
            selected={stockFilter === 'Low Stock'} 
            onPress={() => setStockFilter('Low Stock')}
            style={[s.chip, stockFilter === 'Low Stock' && { backgroundColor: t.warningSoft }]}
            textStyle={{ color: stockFilter === 'Low Stock' ? t.warning : t.subtext }}
          >
            Low Stock
          </Chip>
          <Chip 
            selected={stockFilter === 'Out of Stock'} 
            onPress={() => setStockFilter('Out of Stock')}
            style={[s.chip, stockFilter === 'Out of Stock' && { backgroundColor: t.dangerSoft }]}
            textStyle={{ color: stockFilter === 'Out of Stock' ? t.danger : t.subtext }}
          >
            Out of Stock
          </Chip>

          <View style={{ width: 1, height: 20, backgroundColor: t.border, marginHorizontal: 8, alignSelf: 'center' }} />

          <Chip 
            selected={selectedCategory === null} 
            onPress={() => setSelectedCategory(null)}
            style={[s.chip, selectedCategory === null && { backgroundColor: t.accentSoft }]}
            textStyle={{ color: selectedCategory === null ? t.accent : t.subtext }}
          >
            All Categories
          </Chip>
          {categories.map((c) => (
             <Chip 
               key={c.id}
               selected={selectedCategory === c.id} 
               onPress={() => setSelectedCategory(c.id)}
               style={[s.chip, selectedCategory === c.id && { backgroundColor: t.accentSoft }]}
               textStyle={{ color: selectedCategory === c.id ? t.accent : t.subtext }}
             >
               {c.name}
             </Chip>
          ))}
        </ScrollView>
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
              {searchQuery ? 'Try a different search term' : 'Tap "Add" to add your first product'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <TouchableOpacity 
              style={s.cardBody}
              onPress={() => (navigation as any).navigate('ProductDetails', { productId: item.id })}
            >
              <View style={s.cardMeta}>
                <Text style={[s.categoryLabel, { color: t.subtext }]}>{item.category_name}</Text>
                <View style={[s.stockBadge, { backgroundColor: getStockColor(item.current_stock, item.reorder_level) + '20' }]}>
                  <Text style={[s.stockBadgeText, { color: getStockColor(item.current_stock, item.reorder_level) }]}>
                    {getStockLabel(item.current_stock, item.reorder_level)}
                  </Text>
                </View>
              </View>

              <View style={s.cardMain}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.productName, { color: t.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={s.identRow}>
                    {item.barcode ? <Text style={[s.identText, { color: t.subtext }]}><Icon name="qr-code-scanner" size={12}/> {item.barcode}</Text> : null}
                    {item.sku ? <Text style={[s.identText, { color: t.subtext }]}><Icon name="label-outline" size={12}/> {item.sku}</Text> : null}
                  </View>
                </View>
                <View style={s.cardRight}>
                  <Text style={[s.productPrice, { color: t.success }]}>
                    ₹{item.price.toFixed(2)}
                  </Text>
                  <Text style={[s.stockValue, { color: t.text }]}>
                    <Text style={{fontWeight:'normal', color: t.subtext}}>Stock: </Text>{item.current_stock}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[s.cardFooter, { borderTopColor: t.border }]}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => (navigation as any).navigate('Add Product', { productId: item.id })}
              >
                <Icon name="edit" size={16} color={t.accent} />
                <Text style={[s.actionBtnText, { color: t.accent }]}>Edit</Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: t.border }} />
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => (navigation as any).navigate('ProductDetails', { productId: item.id })}
              >
                <Icon name="visibility" size={16} color={t.subtext} />
                <Text style={[s.actionBtnText, { color: t.subtext }]}>Details</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        )}
      />
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
    marginHorizontal: 14, marginTop: 10, marginBottom: 8,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  
  filtersContainer: { marginBottom: 12 },
  filtersScroll: { paddingHorizontal: 14, alignItems: 'center', gap: 8 },
  chip: { borderRadius: 20 },

  // Cards
  card: {
    borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden',
  },
  cardBody: { padding: 14 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  stockBadgeText: { fontSize: 11, fontWeight: 'bold' },
  
  cardMain: { flexDirection: 'row', justifyContent: 'space-between' },
  productName: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  identRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  identText: { fontSize: 12 },
  
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 12 },
  productPrice: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  stockValue: { fontSize: 13, fontWeight: 'bold' },

  cardFooter: {
    flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

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
});

export default ListProductScreen;