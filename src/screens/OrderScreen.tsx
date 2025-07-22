import React, { useEffect, useState } from 'react';
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
  Dimensions
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from '../api/axios';
import { printReceipt, isPrinterConnected, getPrinterName } from '../utils/printer';

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
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
  category, 
  isSelected, 
  onPress 
}: { 
  category: string; 
  isSelected: boolean; 
  onPress: () => void 
}) => (
  <TouchableOpacity
    style={[
      styles.categoryButton,
      isSelected && styles.categoryButtonSelected
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.categoryButtonText,
      isSelected && styles.categoryButtonTextSelected
    ]}>
      {category}
    </Text>
  </TouchableOpacity>
);

const PaymentButton = ({ 
  mode, 
  currentMode, 
  onPress 
}: { 
  mode: PaymentMode; 
  currentMode: PaymentMode; 
  onPress: () => void 
}) => (
  <TouchableOpacity
    style={[
      styles.paymentButton,
      currentMode === mode && styles.paymentButtonSelected
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.paymentButtonText,
      currentMode === mode && styles.paymentButtonTextSelected
    ]}>
      {mode}
    </Text>
  </TouchableOpacity>
);

export default function OrderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
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
      const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
      setCategories(['All', ...uniqueCategories]);
    }
  }, [products]);

  const getProductsByCategory = (category: string | null) => {
    if (!category || category === 'All') return products;
    return products.filter((p) => p.category === category);
  };

  const checkPrinterStatus = async () => {
    try {
      const connected = await isPrinterConnected();
      setPrinterConnected(connected);
      if (connected) {
        const name = await getPrinterName();
        setPrinterName(name);
      }
    } catch (error) {
      console.error('Error checking printer status:', error);
      setPrinterConnected(false);
      setPrinterName(null);
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
      const res = await api.get('/products/');
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
          batch.map(item => api.post('/submit-order/', item))
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

  const handlePrint = async () => {
    if (orderItems.length === 0) {
      Alert.alert('No items', 'Please add items to the order.');
      return;
    }

    setIsPrinting(true);

    const orderData = {
      items: orderItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      total,
      payment_mode: paymentMode,
      timestamp: getIndiaTimeISO(),
    };

    try {
      const [netState, printerStatus] = await Promise.all([
        NetInfo.fetch(),
        isPrinterConnected()
      ]);

      setPrinterConnected(printerStatus);
      if (printerStatus) {
        const name = await getPrinterName();
        setPrinterName(name);
      }

      const submissionPromise = netState.isConnected
        ? api.post('/submit-order/', orderData).catch(() => saveOrderOffline(orderData))
        : saveOrderOffline(orderData);

      const printingPromise = printerStatus
        ? printReceipt(orderItems, total, paymentMode).catch(err => {
            console.error('Print error:', err);
            throw new Error('Printing failed');
          })
        : Promise.resolve();

      await Promise.all([submissionPromise, printingPromise]);

      showSuccess('Order processed successfully');
      setOrderItems([]);
      setPaymentMode('Cash');
    } catch (err) {
      showError('Order Error', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const renderCategoryRow = ({ item }: { item: string[] }) => (
    <View style={styles.categoryRow}>
      {item.map(category => (
        <CategoryButton
          key={category}
          category={category}
          isSelected={selectedCategory === category || (category === 'All' && selectedCategory === null)}
          onPress={() => setSelectedCategory(category === 'All' ? null : category)}
        />
      ))}
    </View>
  );

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderItem}>
      {isWideScreen ? (
        // Wide screen layout (all in one row)
        <View style={styles.wideOrderRow}>
          <View style={styles.itemNameAndPrice}>
            <Text style={styles.orderItemName} numberOfLines={1}>
              {item.product.name}
            </Text>
            <Text style={styles.unitPriceText}>
              (₹{formatPrice(item.product.price)})
            </Text>
          </View>
          <Text style={styles.orderItemPrice}>
            ₹{formatPrice(item.product.price * item.quantity)}
          </Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => changeQuantity(item.product.id, -1)}
            >
              <Icon name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => changeQuantity(item.product.id, 1)}
            >
              <Icon name="add" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeFromOrder(item.product.id)}
            >
              <Icon name="delete" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Narrow screen layout (two rows)
        <>
          <View style={styles.orderItemTopRow}>
            <View style={styles.itemNameAndPrice}>
              <Text style={styles.orderItemName} numberOfLines={1}>
                {item.product.name}
              </Text>
              <Text style={styles.unitPriceText}>
                (₹{formatPrice(item.product.price)})
              </Text>
            </View>
            <Text style={styles.orderItemPrice}>
              ₹{formatPrice(item.product.price * item.quantity)}
            </Text>
          </View>
          <View style={styles.quantityControlsRight}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => changeQuantity(item.product.id, -1)}
            >
              <Icon name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => changeQuantity(item.product.id, 1)}
            >
              <Icon name="add" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeFromOrder(item.product.id)}
            >
              <Icon name="delete" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  const categoryChunks = [];
  for (let i = 0; i < categories.length; i += 4) {
    categoryChunks.push(categories.slice(i, i + 4));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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
              colors={['#3498db']}
              tintColor={'#3498db'}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {printerConnected && (
                <View style={styles.printerStatus}>
                  <Icon name="print" size={16} color="#4CAF50" />
                  <Text style={styles.printerText}>
                    {printerName || 'Printer Connected'}
                  </Text>
                </View>
              )}
              {!printerConnected && (
                <View style={styles.printerStatus}>
                  <Icon name="print" size={16} color="#e74c3c" />
                  <Text style={styles.printerText}>No Printer</Text>
                </View>
              )}
            </View>

            {offlineOrdersCount > 0 && (
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleManualSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="sync" size={16} color="#fff" />
                    <Text style={styles.syncButtonText}>
                      Sync ({offlineOrdersCount})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentButtonsContainer}>
              <PaymentButton 
                mode="Cash" 
                currentMode={paymentMode} 
                onPress={() => setPaymentMode('Cash')} 
              />
              <PaymentButton 
                mode="UPI" 
                currentMode={paymentMode} 
                onPress={() => setPaymentMode('UPI')} 
              />
            </View>
          </View>

          {orderItems.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.orderSummary}>
                <FlatList
                  data={orderItems}
                  renderItem={renderOrderItem}
                  keyExtractor={(item) => item.product.id.toString()}
                  scrollEnabled={false}
                />
              </View>

              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>₹{formatPrice(total)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.printButton, isPrinting && styles.printButtonDisabled]}
                onPress={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <View style={styles.printButtonContent}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.printButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={styles.printButtonContent}>
                    <Icon name="receipt" size={20} color="#fff" />
                    <Text style={styles.printButtonText}>Print Receipt</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesContainer}>
            <FlatList
              data={categoryChunks}
              renderItem={renderCategoryRow}
              keyExtractor={(_, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>

          <Text style={styles.sectionTitle}>Products</Text>
          <View style={styles.productsGrid}>
            {getProductsByCategory(selectedCategory).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productCard}
                onPress={() => addToOrder(item)}
              >
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productPrice}>₹{formatPrice(item.price)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  printerText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#333',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  syncButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  paymentSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  paymentButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  paymentButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  paymentButtonSelected: {
    backgroundColor: '#3498db',
  },
  paymentButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  paymentButtonTextSelected: {
    color: '#fff',
  },
  orderSummary: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  orderItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  wideOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemNameAndPrice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: 16,
    color: '#2c3e50',
    marginRight: 4,
  },
  unitPriceText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  orderItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    minWidth: 80,
    textAlign: 'right',
    marginLeft: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  quantityControlsRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  qtyButton: {
    backgroundColor: '#3498db',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  printButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    marginBottom: 20,
  },
  printButtonDisabled: {
    opacity: 0.7,
  },
  printButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#3498db',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  productName: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});