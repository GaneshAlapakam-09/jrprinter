import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking
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
  volume: number | null;
  category: string;
  price: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://198.38.89.78:8080/api/products/', {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
          },
        });
        setProducts(response.data.products);
        setCustomers(response.data.customers || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load products:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load products.');
      }
    };

    fetchData();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        try {
          const pending = await AsyncStorage.getItem('pending_bills');
          const pendingBills = pending ? JSON.parse(pending) : [];

          if (pendingBills.length > 0) {
            const successfulBills: any[] = [];
            const failedBills: any[] = [];

            for (const bill of pendingBills) {
              try {
                const res = await axios.post('http://juice.jrbilling.in/store_billing/', bill);
                if (res.status === 200 && res.data.success) {
                  successfulBills.push(bill);
                } else {
                  failedBills.push(bill);
                }
              } catch (err) {
                console.error('Failed to sync one bill:', err);
                failedBills.push(bill);
              }
            }

            await AsyncStorage.setItem('pending_bills', JSON.stringify(failedBills));

            if (successfulBills.length > 0) {
              Alert.alert('Synced', `${successfulBills.length} bill(s) synced successfully.`);
            }
          }
        } catch (error) {
          console.error('Error during sync:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const categorizedProducts = Object.values(
    products.reduce((acc: Record<string, { title: string; data: Product[] }>, product) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          title: product.category,
          data: [],
        };
      }
      acc[product.category].data.push(product);
      return acc;
    }, {})
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

  const calculateTotal = () => orderItems.reduce((sum, item) => sum + item.total, 0);

  const getFormattedDateTime = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year}--${hours}:${minutes}:${seconds}`;
  };

  const printReceipt = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'No items selected.');
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
      customerId: selectedCustomer || null,
      date: getFormattedDateTime(),
    };
  
    try {
      // Try to print if device is connected
      if (device && typeof device !== 'number') {
        const receipt = `         Ananya Drinks\n------------------------------\n` +
          orderItems.map(item =>
            `${item.name}` +
            (item.volume != null ? ` (${item.volume})` : '') +
            ` ${item.quantity} x ${item.price} = ${item.total}\n`
          ).join('') +
          `------------------------------\nTotal: Rs.${total} Payment: ${paymentMode}\n\n         Thank you!\n\n\n`;
        
        await device.write(receipt);
      }
  
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        const res = await axios.post('http://juice.jrbilling.in/store_billing/', billingData);
        
        if (!device || typeof device === 'number') {
          const receipt = `Ananya Drinks\n------------------------------\n` +
          orderItems.map(item =>
            `${item.name}` +
            (item.volume != null ? ` (${item.volume})` : '') +
            ` ${item.quantity} x ${item.price} = ${item.total}\n`
          ).join('') +
          `------------------------------\nTotal: Rs.${total}\nPayment: ${paymentMode}\n\nThank you!\n\n\n`;

          const message = encodeURIComponent(receipt);

          if (res.data.cust_details) {
            const phoneNumber = res.data.cust_details;
            const url = `https://wa.me/91${phoneNumber}?text=${message}`;
            Linking.openURL(url)
            .catch(() => {
              Alert.alert('Error', 'WhatsApp is not installed or the number is incorrect.');
            });
          } else {
            const phoneNumber = '916305979503';
            const url = `https://wa.me/${phoneNumber}?text=${message}`;
            Linking.openURL(url)
            .catch(() => {
              Alert.alert('Error', 'WhatsApp is not installed or the number is incorrect.');
            });
          }
        }

        if (res.status === 200 && res.data.success) {
          Alert.alert('Success', 'Order processed successfully.');
          setOrderItems([]);
        } else {
          throw new Error('API rejected the billing.');
        }
      } else {
        throw new Error('No internet connection');
      }
    } catch (error) {
      console.warn('Storing receipt locally due to error:', error);
      try {
        const pending = await AsyncStorage.getItem('pending_bills');
        const updated = pending ? JSON.parse(pending) : [];
        updated.push(billingData);
        await AsyncStorage.setItem('pending_bills', JSON.stringify(updated));
        
        const currentNetState = await NetInfo.fetch();
        Alert.alert(
          currentNetState.isConnected ? 'Error' : 'Offline',
          currentNetState.isConnected 
            ? 'Order saved locally due to server error.' 
            : 'Order saved locally. Will sync when online.'
        );
        setOrderItems([]);
      } catch (storageError) {
        console.error('Failed to save locally:', storageError);
        Alert.alert('Error', 'Failed to save order locally.');
      }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCustomer}
          onValueChange={(itemValue) => setSelectedCustomer(itemValue)}
        >
          <Picker.Item label="Select a customer" value="" />
          {customers.map((cust) => (
            <Picker.Item
              key={cust.id}
              label={`${cust.id} - ${cust.name} - ${cust.phone}`}
              value={cust.id}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.title}>🛒 Product Categories</Text>
      <SectionList
        sections={categorizedProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productItem} onPress={() => addItem(item)}>
            <Text style={styles.productText}>
              {item.name} {item.volume ? `(${item.volume})` : ''} - ₹{item.price}
            </Text>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        scrollEnabled={false}
      />

      <Text style={styles.title}>🧾 Order Summary</Text>
      {orderItems.length === 0 ? (
        <Text style={styles.emptyText}>No items added yet</Text>
      ) : (
        <FlatList
          data={orderItems}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.orderRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.orderText}>{item.name}</Text>
                {item.volume != null && (
                  <Text style={styles.volumeText}>Volume: {item.volume}</Text>
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
      )}

      <View style={styles.footer}>
        {orderItems.length > 0 && (
          <Text style={styles.total}>Total Amount: ₹{calculateTotal()}</Text>
        )}
        <Text style={styles.label}>Select Payment Mode</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={paymentMode}
            onValueChange={(itemValue) => setPaymentMode(itemValue)}
          >
            <Picker.Item label="CASH" value="CASH" />
            <Picker.Item label="UPI" value="UPI" />
          </Picker>
        </View>

        <TouchableOpacity 
          style={[styles.printButton, orderItems.length === 0 && styles.disabledButton]}
          onPress={printReceipt}
          disabled={orderItems.length === 0}
        >
          <Text style={styles.printButtonText}>🖨️ Print Receipt</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
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
  productText: {
    fontSize: 16,
    color: '#333',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  orderText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  volumeText: {
    fontSize: 12,
    color: '#666',
  },
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
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyValue: {
    fontSize: 16,
    width: 30,
    textAlign: 'center',
  },
  deleteText: {
    fontSize: 18,
    color: '#ff4d4d',
    marginLeft: 8,
  },
  footer: {
    marginTop: 20,
    paddingBottom: 50,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  label: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 4,
    color: '#555',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 10,
  },
  printButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#888',
  },
});