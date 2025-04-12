import React, { useState } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../App';

type Props = {
  route: RouteProp<RootStackParamList, 'Order'>;
};

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
};

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
};

const initialProducts: Product[] = [
  { id: 1, name: 'Product A1', category: 'Category A', price: 100 },
  { id: 2, name: 'Product A2', category: 'Category A', price: 150 },
  { id: 3, name: 'Product B1', category: 'Category B', price: 200 },
  { id: 4, name: 'Product B2', category: 'Category B', price: 250 },
];

export default function OrderScreen({ route }: Props) {
  const device = route.params.device;
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');

  const categorizedProducts = Object.values(
    initialProducts.reduce((acc, product) => {
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

  const printReceipt = async () => {
    if (!device || orderItems.length === 0) {
      Alert.alert('Error', 'No printer connected or no items selected.');
      return;
    }
  
    const total = calculateTotal();
  
    const receiptHeader = `Rasi Jewellery\n------------------------------\n`;
    const receiptBody = orderItems
      .map(
        (item) =>
          `${item.name} ${item.quantity} x ${item.price} = Rs.${item.total}\n`
      )
      .join('');
    const receiptFooter = `------------------------------\nTotal: Rs${total}\nPayment: ${paymentMode}\n\nThank you!\n\n\n`;
  
    const fullReceipt = receiptHeader + receiptBody + receiptFooter;
  
    try {
      await device.write(fullReceipt);
      Alert.alert('Success', 'Receipt sent to printer.');
    } catch (error) {
      console.error(error);
      Alert.alert('Print Failed', 'Could not print the receipt.');
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Product Categories</Text>
      <SectionList
        sections={categorizedProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productItem}
            onPress={() => addItem(item)}
          >
            <Text style={styles.productText}>
              {item.name} - ₹{item.price}
            </Text>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
      />

      <Text style={styles.header}>Order Table</Text>
      <FlatList
        data={orderItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.orderRow}>
            <Text style={styles.orderText}>{item.name}</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() => updateQuantity(item.id, -1)}
                style={styles.qtyButton}
              >
                <Text style={styles.qtyText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.id, 1)}
                style={styles.qtyButton}
              >
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
        <Text style={styles.total}>Total: ₹{calculateTotal()}</Text>
        <TextInput
          style={styles.input}
          value={paymentMode}
          onChangeText={setPaymentMode}
          placeholder="Payment Mode"
        />
        <TouchableOpacity style={styles.printButton} onPress={printReceipt}>
          <Text style={styles.printButtonText}>Print</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', backgroundColor: '#eee', padding: 6 },
  productItem: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    marginVertical: 4,
    borderRadius: 5,
  },
  productText: { fontSize: 16 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  orderText: { flex: 1, fontSize: 16 },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  qtyButton: {
    padding: 4,
    backgroundColor: '#ddd',
    borderRadius: 4,
    marginHorizontal: 5,
  },
  qtyText: { fontSize: 16, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, width: 30, textAlign: 'center' },
  deleteText: { fontSize: 18, color: 'red', marginLeft: 10 },
  footer: { marginTop: 10 },
  total: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  printButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  printButtonText: { color: '#fff', fontSize: 16 },
});
