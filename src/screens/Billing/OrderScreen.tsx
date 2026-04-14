import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  useColorScheme,
  PermissionsAndroid,
  Modal
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Searchbar } from 'react-native-paper';
import { productService } from '../../services/productService';
import { billingService } from '../../services/billingService';
import { printReceipt, isPrinterConnected, getPrinterName, getBatteryLevel } from '../../utils/printer';

// ─── Theme ────────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  success: '#059669', successSoft: '#ECFDF5',
  danger: '#EF4444',
  sectionTitle: '#374151',
  qtyBtn: ACCENT, deleteBtn: '#EF4444',
  productCard: '#FFFFFF', categoryBtn: '#F3F4F6',
  printerOk: '#059669', printerFail: '#EF4444', printerBg: '#F3F4F6',
  syncBtn: ACCENT,
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  success: '#34D399', successSoft: '#0D2A1E',
  danger: '#F87171',
  sectionTitle: '#D1D5DB',
  qtyBtn: '#8B5CF6', deleteBtn: '#F87171',
  productCard: '#1C1A2E', categoryBtn: '#2D2B42',
  printerOk: '#34D399', printerFail: '#F87171', printerBg: '#2D2B42',
  syncBtn: '#8B5CF6',
};

type Product = {
  id: number;
  name: string;
  price: number;
  category: number;       // FK id from Django
  category_name: string;  // human-readable name from ProductSerializer
  barcode?: string;
};

type OrderItem = {
  product: Product;
  quantity: number;
};

type PaymentMode = 'Cash' | 'UPI';

const { width } = Dimensions.get('window');
const isWideScreen = width > 425;

const formatPrice = (price: unknown): string => {
  const num = typeof price === 'string' ? parseFloat(price) : Number(price);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const getIndiaTimeISO = () => {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const indiaTime = new Date(now.getTime() + offset);
  return indiaTime.toISOString();
};

const CategoryButton = ({
  category, isSelected, onPress, theme,
}: {
  category: string; isSelected: boolean; onPress: () => void; theme: typeof light;
}) => (
  <TouchableOpacity
    style={[
      {
        flex: 1, marginHorizontal: 3, borderRadius: 20, paddingVertical: 8, alignItems: 'center' as const,
        backgroundColor: isSelected ? theme.accent : theme.categoryBtn,
      }
    ]}
    onPress={onPress}
  >
    <Text style={[{ fontSize: 13, fontWeight: '600' as const, color: isSelected ? '#FFF' : theme.subtext }]}>
      {category}
    </Text>
  </TouchableOpacity>
);

const PaymentButton = ({
  mode, currentMode, onPress, theme,
}: {
  mode: PaymentMode; currentMode: PaymentMode; onPress: () => void; theme: typeof light;
}) => (
  <TouchableOpacity
    style={[{
      flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' as const,
      backgroundColor: currentMode === mode ? theme.accent : theme.categoryBtn,
    }]}
    onPress={onPress}
  >
    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: currentMode === mode ? '#FFF' : theme.subtext }}>
      {mode === 'Cash' ? '💵  Cash' : '📱  UPI'}
    </Text>
  </TouchableOpacity>
);

export default function OrderScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

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
      headerTitle: 'New Order',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerShown: true,
    });
  }, [navigation, t.text, t.card]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [offlineOrdersCount, setOfflineOrdersCount] = useState(0);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [syncTimeout, setSyncTimeout] = useState<NodeJS.Timeout | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // --- Camera Permission ---
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS is handled by Info.plist
  };

  const handleScanBarcode = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) setIsScanning(true);
    else Alert.alert('Error', 'Camera permission required to scan products.');
  };

  const onBarcodeRead = (event: any) => {
    const code = event.nativeEvent.codeStringValue;
    setIsScanning(false);
    
    // Find product by barcode
    const match = products.find(p => p.barcode === code);
    if (match) {
       addToOrder(match);
       // Optional: could show a small toast: "Added [name] to cart"
    } else {
       Alert.alert('Not Found', 'No product matching this barcode exists in the master.');
    }
  };

  useLayoutEffect(() => {
    const fetchStore = async () => {
      const storeName = await AsyncStorage.getItem('store_name');
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            style={{ marginLeft: 14 }}
            onPress={() => (navigation as any).openDrawer()}
          >
            <Icon name="menu" size={28} color={t.text} />
          </TouchableOpacity>
        ),
        headerTitle: `New Order (${storeName || 'Main Branch'})`,
        headerStyle: { backgroundColor: t.card },
        headerTintColor: t.text,
      });
    };
    fetchStore();
  }, [navigation, t.text, t.card]);


  const loadData = async () => {
    try {
      setRefreshing(true);
      await fetchProducts();
      await checkOfflineOrders();
      await checkPrinterStatus();
      await syncOfflineOrders();
      setHasSynced(true);
    } catch (error) {
      showError('Failed to load data', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && !hasSynced) {
        const timeout = setTimeout(async () => {
          await syncOfflineOrders();
          setHasSynced(true);
        }, 60000);
        setSyncTimeout(timeout);
      }
      if (!state.isConnected) {
        if (syncTimeout) {
          clearTimeout(syncTimeout);
          setSyncTimeout(null);
        }
        setHasSynced(false);
      }
    });

    return () => {
      unsubscribe();
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
    };
  }, [hasSynced]);

  useEffect(() => {
    if (products.length > 0) {
      const uniqueCategories = Array.from(new Set(products.map(p => p.category_name || String(p.category))));
      setCategories(['All', ...uniqueCategories]);
    }
  }, [products]);

  const getProductsByCategory = (category: string | null) => {
    let list = products;
    if (category && category !== 'All') {
      list = list.filter((p) => (p.category_name || p.category) === category);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q)) || 
        String(p.id) === q
      );
    }
    return list;
  };

  const handleSearchSubmit = () => {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const exactMatch = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === q) || 
      String(p.id) === q || 
      p.name.toLowerCase() === q
    );
    if (exactMatch) {
      addToOrder(exactMatch);
      setSearchQuery('');
    }
  };

  const checkPrinterStatus = async () => {
    try {
      const connected = await isPrinterConnected();
      setPrinterConnected(connected);
      if (connected) {
        const name = await getPrinterName();
        setPrinterName(name);
        const batt = await getBatteryLevel();
        setBatteryLevel(batt);
      } else {
        setBatteryLevel(null);
      }
    } catch (error) {
      console.error('Error checking printer status:', error);
      setPrinterConnected(false);
      setPrinterName(null);
      setBatteryLevel(null);
    }
  };

  const checkOfflineOrders = async () => {
    try {
      const saved = await AsyncStorage.getItem('offline_orders');
      const count = saved ? JSON.parse(saved).length : 0;
      setOfflineOrdersCount(count);
      return count;
    } catch (error) {
      console.error('Error checking offline orders:', error);
      return 0;
    }
  };

  const handleRefresh = async () => {
    await loadData();
    showSuccess('Data refreshed successfully');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const countBefore = offlineOrdersCount;
      await syncOfflineOrders();
      const countAfter = await checkOfflineOrders();

      if (countBefore > 0 && countAfter === 0) {
        showSuccess('All offline orders synced successfully!');
      } else if (countAfter < countBefore) {
        showSuccess(`${countBefore - countAfter} orders synced. ${countAfter} remaining.`);
      } else {
        showError('Sync Failed', 'Could not sync offline orders. Please try again.');
      }
    } catch (error) {
      showError('Sync Error', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll();
      const validated = res.data.map((p: any) => ({ ...p, price: Number(p.price) || 0 }));
      setProducts(validated);
    } catch (err) {
      throw new Error(`Failed to fetch products`);
    }
  };

  const addToOrder = (product: Product) => {
    const existingIndex = orderItems.findIndex((item) => item.product.id === product.id);
    if (existingIndex !== -1) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, { product, quantity: 1 }]);
    }
  };

  const removeFromOrder = (id: number) => {
    setOrderItems(orderItems.filter((item) => item.product.id !== id));
  };

  const changeQuantity = (id: number, delta: number) => {
    setOrderItems(
      orderItems.map((item) =>
        item.product.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const total = calculateTotal();

  const showError = (title: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    Alert.alert(title, msg);
  };

  const showSuccess = (msg: string) => {
    Alert.alert('Success', msg);
  };

  const saveOrderOffline = async (order: any) => {
    try {
      const existing = await AsyncStorage.getItem('offline_orders');
      const list = existing ? JSON.parse(existing) : [];
      list.push(order);
      await AsyncStorage.setItem('offline_orders', JSON.stringify(list));
      await checkOfflineOrders();
    } catch (err) {
      throw new Error('Error saving offline order');
    }
  };

  const syncOfflineOrders = async () => {
    setIsSyncing(true);
    try {
      const state = await NetInfo.fetch();
      if (!state.isConnected) return;

      const saved = await AsyncStorage.getItem('offline_orders');
      if (!saved) return;

      const list: any[] = JSON.parse(saved);
      const successList: any[] = [];

      const batchSize = 5;
      for (let i = 0; i < list.length; i += batchSize) {
        const batch = list.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(item => billingService.createBill(item))
        );

        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successList.push(batch[idx]);
          }
        });
      }

      if (successList.length > 0) {
        const remaining = list.filter((item) => !successList.includes(item));
        await AsyncStorage.setItem('offline_orders', JSON.stringify(remaining));
        await checkOfflineOrders();
      }
    } catch (err) {
      console.log('Sync error', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderCategoryRow = ({ item }: { item: string[] }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      {item.map(category => (
        <CategoryButton
          key={category}
          category={category}
          isSelected={selectedCategory === category || (category === 'All' && selectedCategory === null)}
          onPress={() => setSelectedCategory(category === 'All' ? null : category)}
          theme={t}
        />
      ))}
    </View>
  );

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View style={[styles.orderItem, { borderBottomColor: t.border }]}>
      {isWideScreen ? (
        <View style={styles.wideOrderRow}>
          <View style={styles.itemNameAndPrice}>
            <Text style={[styles.orderItemName, { color: t.text }]} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={[styles.unitPriceText, { color: t.subtext }]}>
              (₹{formatPrice(item.product.price)})
            </Text>
          </View>
          <Text style={[styles.orderItemPrice, { color: t.accent }]}>
            ₹{formatPrice(item.product.price * item.quantity)}
          </Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.qtyButton, { backgroundColor: t.qtyBtn }]}
              onPress={() => changeQuantity(item.product.id, -1)}
            >
              <Icon name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: t.text }]}>{item.quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyButton, { backgroundColor: t.qtyBtn }]}
              onPress={() => changeQuantity(item.product.id, 1)}
            >
              <Icon name="add" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: t.deleteBtn }]}
              onPress={() => removeFromOrder(item.product.id)}
            >
              <Icon name="delete" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.orderItemTopRow}>
            <View style={styles.itemNameAndPrice}>
              <Text style={[styles.orderItemName, { color: t.text }]} numberOfLines={1}>
                {item.product.name}
              </Text>
              <Text style={[styles.unitPriceText, { color: t.subtext }]}>
                (₹{formatPrice(item.product.price)})
              </Text>
            </View>
            <Text style={[styles.orderItemPrice, { color: t.accent }]}>
              ₹{formatPrice(item.product.price * item.quantity)}
            </Text>
          </View>
          <View style={styles.quantityControlsRight}>
            <TouchableOpacity
              style={[styles.qtyButton, { backgroundColor: t.qtyBtn }]}
              onPress={() => changeQuantity(item.product.id, -1)}
            >
              <Icon name="remove" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: t.text }]}>{item.quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyButton, { backgroundColor: t.qtyBtn }]}
              onPress={() => changeQuantity(item.product.id, 1)}
            >
              <Icon name="add" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: t.deleteBtn }]}
              onPress={() => removeFromOrder(item.product.id)}
            >
              <Icon name="delete" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
        <Text style={{ color: t.subtext, marginTop: 12 }}>Loading products…</Text>
      </SafeAreaView>
    );
  }

  const categoryChunks = [];
  for (let i = 0; i < categories.length; i += 4) {
    categoryChunks.push(categories.slice(i, i + 4));
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[t.accent]}
              tintColor={t.accent}
            />
          }
        >
          {/* Header row: printer status + sync */}
          <View style={styles.header}>
            <View style={[styles.printerStatus, { backgroundColor: t.printerBg }]}>
              <Icon name="print" size={16} color={printerConnected ? t.printerOk : t.printerFail} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.printerText, { color: printerConnected ? t.printerOk : t.printerFail }]}>
                  {printerConnected ? (printerName || 'Printer Ready') : 'No Printer'}
                </Text>
                {printerConnected && batteryLevel && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: t.success + '20', paddingHorizontal: 4, borderRadius: 4 }}>
                    <Icon name="battery-std" size={10} color={t.success} />
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: t.success }}>{batteryLevel}</Text>
                  </View>
                )}
              </View>
            </View>

            {offlineOrdersCount > 0 && (
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: t.syncBtn }]}
                onPress={handleManualSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="sync" size={14} color="#fff" />
                    <Text style={styles.syncButtonText}>Sync ({offlineOrdersCount})</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Order summary */}
          {orderItems.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: t.sectionTitle }]}>Order Summary</Text>
              <View style={[styles.orderSummary, { backgroundColor: t.card, borderColor: t.border }]}>
                <FlatList
                  data={orderItems}
                  renderItem={renderOrderItem}
                  keyExtractor={(item) => item.product.id.toString()}
                  scrollEnabled={false}
                />
              </View>

              <View style={[styles.totalContainer, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.totalLabel, { color: t.subtext }]}>Total</Text>
                <Text style={[styles.totalAmount, { color: t.success }]}>₹{formatPrice(total)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.printButton, { backgroundColor: t.accent }]}
                onPress={() => navigation.navigate('CustomerSelection', { orderItems, total })}
              >
                <View style={styles.printButtonContent}>
                  <Text style={styles.printButtonText}>Proceed to Checkout</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* Categories */}
          <Text style={[styles.sectionTitle, { color: t.sectionTitle }]}>Categories</Text>
          <View style={styles.categoriesContainer}>
            <FlatList
              data={categoryChunks}
              renderItem={renderCategoryRow}
              keyExtractor={(_, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Searchbar
              placeholder="Scan barcode or manual search"
              onChangeText={setSearchQuery}
              value={searchQuery}
              onSubmitEditing={handleSearchSubmit}
              style={{ flex: 1, backgroundColor: t.card }}
              inputStyle={{ color: t.text }}
              iconColor={t.subtext}
              placeholderTextColor={t.subtext}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={{ marginLeft: 10, padding: 12, backgroundColor: t.accent, borderRadius: 12 }} onPress={handleScanBarcode}>
               <Icon name="qr-code-scanner" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          {/* Products grid */}
          <Text style={[styles.sectionTitle, { color: t.sectionTitle }]}>Products</Text>
          <View style={styles.productsGrid}>
            {getProductsByCategory(selectedCategory).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.productCard, { backgroundColor: t.card, borderColor: t.border }]}
                onPress={() => addToOrder(item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.productName, { color: t.text }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.productPrice, { color: t.success }]}>₹{formatPrice(item.price)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barcode Scanner Modal */}
      <Modal visible={isScanning} animationType="slide" onRequestClose={() => setIsScanning(false)}>
         <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Camera
               style={{ flex: 1 }}
               scanBarcode={true}
               onReadCode={onBarcodeRead}
               showFrame={true}
               laserColor="red"
               frameColor="white"
            />
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20 }} onPress={() => setIsScanning(false)}>
               <Icon name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' }}>
               <Text style={{ color: '#FFF', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}>Scan Product Barcode</Text>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 14 },
  contentContainer: { paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginVertical: 12,
  },
  printerStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
  },
  printerText: { fontSize: 12, fontWeight: '600' },
  syncButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20,
  },
  syncButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 4, letterSpacing: 0.1 },
  paymentButtonsContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },

  orderSummary: {
    borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  orderItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  wideOrderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNameAndPrice: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderItemName: { fontSize: 14, fontWeight: '600' },
  unitPriceText: { fontSize: 12 },
  orderItemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItemPrice: { fontSize: 15, fontWeight: '700', minWidth: 70, textAlign: 'right' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  quantityControlsRight: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 15, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  deleteButton: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  totalContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },
  totalLabel: { fontSize: 15, fontWeight: '600' },
  totalAmount: { fontSize: 22, fontWeight: '900' },

  printButton: {
    borderRadius: 14, paddingVertical: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  printButtonDisabled: { opacity: 0.65 },
  printButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  printButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  categoriesContainer: { marginBottom: 14 },

  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  productCard: {
    width: '47.5%', borderRadius: 14, padding: 14, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  productName: { fontSize: 14, fontWeight: '600', marginBottom: 6, lineHeight: 18 },
  productPrice: { fontSize: 16, fontWeight: '800' },
});
