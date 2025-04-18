import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  route: RouteProp<RootStackParamList, 'Order'>;
};

type Product = {
  id: number;
  name: string;
  volume: number;
  category: string;
  price: number;
};

type OrderItem = {
  id: number;
  name: string;
  volume?: number;
  quantity: number;
  price: number;
  total: number;
};

export default function OrderScreen({ route }: Props) {
  const device = route.params.device;
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    axios.get('http://198.38.89.78:8080/api/products/', {
      timeout: 10000,
      headers: {
        Accept: 'application/json',
      },
    })
      .then((response) => {
        setProducts(response.data.products);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load products:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load products.');
      });

    // Sync offline bills when online
    let isSyncing = false;
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected && !isSyncing) {
        isSyncing = true;
        try {
          const pending = await AsyncStorage.getItem('pending_bills');
          const pendingBills = pending ? JSON.parse(pending) : [];

          if (pendingBills.length > 0) {
            const successfulBills: any[] = [];

            for (const bill of pendingBills) {
              try {
                const res = await axios.post('http://juice.jrbilling.in/store_billing/', bill);
                if (res.status === 200 && res.data.success) {
                  successfulBills.push(bill);
                }
              } catch (err) {
                console.error('Failed to sync one bill:', err);
              }
            }

            const remaining = pendingBills.filter((b: any) => !successfulBills.includes(b));
            await AsyncStorage.setItem('pending_bills', JSON.stringify(remaining));

            if (successfulBills.length > 0) {
              Alert.alert('Synced', `${successfulBills.length} bill(s) synced.`);
            }
          }
        } finally {
          isSyncing = false;
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const categorizedProducts = Object.values(
    products.reduce((acc, product) => {
      acc[product.category] = acc[product.category] || {
        title: product.category,
        data: [],
      };
      acc[product.category].data.push(product);
      return acc;
    }, {} as Record<string, { title: string; data: Product[] }>)
  );

  const addItem = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
              ...item,
              quantity: item.quantity + 1,
              total: (item.quantity + 1) * item.price,
            }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            volume: product.volume ?? undefined,
            quantity: 1,
            price: product.price,
            total: product.price,
          },
        ];
      }
    });
  };

  const removeItem = (id: number) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity: Math.max(1, item.quantity + delta),
            total: Math.max(1, item.quantity + delta) * item.price,
          }
          : item
      )
    );
  };

  const calculateTotal = () =>
    orderItems.reduce((sum, item) => sum + item.total, 0);


  function getFormattedDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year}--${hours}:${minutes}:${seconds}`;
  }


  const printReceipt = async () => {
    if (!device || orderItems.length === 0) {
      Alert.alert('Error', 'No printer connected or no items selected.');
      return;
    }

    const total = calculateTotal();
    const billingData = {
      items: orderItems.map((item) => ({
        productId: item.id,
        productName: item.name,
        volume: item.volume,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
      totalAmount: total,
      paymentMode,
      date: getFormattedDateTime(),
    };
    console.log("77777777777777777777",billingData)

    const receipt = `Ananya Drinks\n------------------------------\n` +
      orderItems.map(item =>
        `${item.name}` +
        (item.volume != null ? ` (${item.volume})` : '') +
        ` ${item.quantity} x ${item.price} = ${item.total}\n`
      ).join('') +
      `------------------------------\nTotal: Rs.${total}\nPayment: ${paymentMode}\n\nThank you!\n\n\n`;

    try {
      await device.write(receipt);

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const res = await axios.post('http://juice.jrbilling.in/store_billing/', billingData);
        console.log("888888888888888888",res)
        if (res.status === 200 && res.data.success) {
          Alert.alert('Success', 'Receipt printed and data stored.');

          const pending = await AsyncStorage.getItem('pending_bills');
          if (pending) {
            const offlineBills = JSON.parse(pending);
            for (let bill of offlineBills) {
              await axios.post('http://juice.jrbilling.in/store_billing/', bill);
            }
            await AsyncStorage.removeItem('pending_bills');
            console.log('Pending offline bills synced and cleared.');
          }
        } else {
          throw new Error('API rejected the billing.');
        }
      } else {
        throw new Error('No internet');
      }
    } catch (error) {
      console.warn('Storing receipt locally due to error:', error);
      const pending = await AsyncStorage.getItem('pending_bills');
      const updated = pending ? JSON.parse(pending) : [];
      updated.push(billingData);
      await AsyncStorage.setItem('pending_bills', JSON.stringify(updated));
      Alert.alert('Offline', 'Receipt printed. Will sync when online.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10 }}>Loading Products...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🛒 Product Categories</Text>
      <SectionList
        sections={categorizedProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productItem} onPress={() => addItem(item)}>
            <Text style={styles.productText}>
              {item.name} {item.volume} - ₹{item.price}
            </Text>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        scrollEnabled={false}
      />

      <Text style={styles.title}>🧾 Order Summary</Text>
      <FlatList
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.orderRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.orderText}>{item.name}</Text>
              {item.volume != null && (
                <Text style={{ fontSize: 12, color: '#666' }}>Volume: {item.volume}</Text>
              )}
            </View>
            <View style={styles.quantityControl}>
              <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyButton}>
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyButton}>
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.orderText}>₹{item.total}</Text>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Text style={styles.deleteText}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Text style={styles.total}>Total Amount: ₹{calculateTotal()}</Text>
        <Text style={styles.label}>Select Payment Mode</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={paymentMode}
            onValueChange={(itemValue) => setPaymentMode(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="CASH" value="CASH" />
            <Picker.Item label="UPI" value="UPI" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.printButton} onPress={printReceipt}>
          <Text style={styles.printButtonText}>🖨️ Print Receipt</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginVertical: 12, color: '#333' },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#d6e4ff',
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  productItem: {
    padding: 12,
    backgroundColor: '#eef3ff',
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8d6ff',
  },
  productText: { fontSize: 16, color: '#333' },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  orderText: { flex: 1, fontSize: 16, color: '#333' },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  qtyButton: {
    padding: 6,
    backgroundColor: '#bcd4ff',
    borderRadius: 4,
    marginHorizontal: 2,
  },
  qtyText: { fontSize: 16, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, width: 30, textAlign: 'center' },
  deleteText: { fontSize: 18, color: '#ff4d4d', marginLeft: 8 },
  footer: { marginTop: 20, paddingBottom: 50 },
  total: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  label: { fontSize: 14, marginTop: 10, marginBottom: 4, color: '#555' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  printButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  printButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
