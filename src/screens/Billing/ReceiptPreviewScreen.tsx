import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, useColorScheme } from 'react-native';
import { Surface, Button, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { billingService } from '../../services/billingService';
import { printReceipt, isPrinterConnected } from '../../utils/printer';

const ACCENT = '#7C3AED';

export default function ReceiptPreviewScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? {
    bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
    text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6'
  } : {
    bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
    text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT
  };

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ReceiptPreview'>>();
  const { orderItems, total, customerId, customerName, customerPhone, paymentMode, partialPayments, amountPaid } = route.params;

  const [isProcessing, setIsProcessing] = useState(false);

  // In a real scenario, tax could be calculated per product. Mocking 5% flat for UI purposes
  const taxAmount = total * 0.05;
  const discountAmount = 0; // If any
  const grandTotal = total; // Assuming total passed includes everything

  const getIndiaTimeISO = () => {
    const now = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    const indiaTime = new Date(now.getTime() + offset);
    return indiaTime.toISOString();
  };

  const saveOrderOffline = async (order: any) => {
    try {
      const existing = await AsyncStorage.getItem('offline_orders');
      const list = existing ? JSON.parse(existing) : [];
      
      // Generate a distinct UUID for offline bill tracking
      const offlineUuid = 'off-' + Date.now() + Math.random().toString(36).substr(2, 9);
      const offlineOrder = { ...order, offline_uuid: offlineUuid };
      
      list.push(offlineOrder);
      await AsyncStorage.setItem('offline_orders', JSON.stringify(list));
      return offlineUuid;
    } catch (err) {
      throw new Error('Error saving offline order');
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);

      const storeId = await AsyncStorage.getItem('store_id');
      const orderData = {
        items: orderItems.map((item: any) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        total: grandTotal,
        tax_total: taxAmount,
        discount_total: discountAmount,
        payment_mode: paymentMode,
        paid_amount: amountPaid,
        customer: customerId,
        store: storeId ? parseInt(storeId) : 1,
        timestamp: getIndiaTimeISO(),
        payments: partialPayments
      };

    try {
      const [netState, printerStatus] = await Promise.all([
        NetInfo.fetch(),
        isPrinterConnected()
      ]);

      let backendBillId = undefined;
      let offlineUuid = undefined;

      if (netState.isConnected) {
        try {
          const res = await billingService.createBill(orderData);
          backendBillId = res.data?.id;
        } catch(e) {
          offlineUuid = await saveOrderOffline(orderData);
        }
      } else {
        offlineUuid = await saveOrderOffline(orderData);
      }

      if (printerStatus) {
        // Prepare print data
        await printReceipt(orderItems, grandTotal, paymentMode, {
          tax: taxAmount,
          discount: discountAmount,
          customerName: customerName,
          payments: partialPayments
        }).catch(err => {
          console.error('Print error:', err);
          Alert.alert('Printing Error', 'Could not print receipt, but bill was saved.');
        });
      }

      // Navigate to success
      navigation.navigate('BillingSuccess', { billId: backendBillId, offlineUuid, customerPhone, total: grandTotal });
      
    } catch (err: any) {
      Alert.alert('Error Processing Order', err.message || 'Unknown error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={isProcessing}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Receipt Preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={[styles.receiptCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={2}>
          <Text style={[styles.storeName, { color: t.text }]}>SUPERMARKET BILL</Text>
          <Text style={[styles.storeSub, { color: t.subtext }]}>{new Date().toLocaleDateString()}</Text>
          
          <Divider style={styles.divider} />
          
          {customerName && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: t.subtext }}>Customer:</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: t.text }}>{customerName}</Text>
            </View>
          )}

          <View style={styles.tableHeader}>
            <Text style={[styles.colName, { color: t.subtext, fontWeight: 'bold' }]}>Item</Text>
            <Text style={[styles.colQty, { color: t.subtext, fontWeight: 'bold' }]}>Qty</Text>
            <Text style={[styles.colPrice, { color: t.subtext, fontWeight: 'bold' }]}>Total</Text>
          </View>

          {orderItems.map((item: any, idx: number) => (
             <View key={idx} style={styles.tableRow}>
               <Text style={[styles.colName, { color: t.text }]} numberOfLines={2}>
                 {item.product.name}
               </Text>
               <Text style={[styles.colQty, { color: t.text }]}>{item.quantity}</Text>
               <Text style={[styles.colPrice, { color: t.text }]}>
                 ₹{(item.quantity * item.product.price).toFixed(2)}
               </Text>
             </View>
          ))}

          <Divider style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={{ color: t.subtext }}>Subtotal</Text>
            <Text style={{ color: t.text }}>₹{(total).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: t.subtext }}>Tax Included</Text>
            <Text style={{ color: t.text }}>₹{taxAmount.toFixed(2)}</Text>
          </View>
          
          <Divider style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.text }}>Grand Total</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: t.accent }}>₹{grandTotal.toFixed(2)}</Text>
          </View>

          <View style={{ marginTop: 24, padding: 12, backgroundColor: t.bg, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: t.subtext, marginBottom: 8 }}>PAYMENT BREAKDOWN</Text>
            {partialPayments ? 
              partialPayments.map((p: any, i: number) => (
                <View key={i} style={styles.summaryRow}>
                  <Text style={{ textTransform: 'uppercase', color: t.text, fontSize: 13 }}>{p.mode}</Text>
                  <Text style={{ color: t.text, fontSize: 13 }}>₹{p.amount.toFixed(2)}</Text>
                </View>
              ))
              :
              <View style={styles.summaryRow}>
                <Text style={{ textTransform: 'uppercase', color: t.text, fontSize: 13 }}>{paymentMode}</Text>
                <Text style={{ color: t.text, fontSize: 13 }}>₹{amountPaid.toFixed(2)}</Text>
              </View>
            }
          </View>
        </Surface>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={isProcessing}
          disabled={isProcessing}
          buttonColor={t.accent}
          style={styles.confirmBtn}
          labelStyle={styles.confirmBtnLabel}
          icon="check-circle"
        >
          Confirm &amp; Generate Bill
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 100 },
  
  receiptCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  storeName: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  storeSub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  
  divider: { marginVertical: 16 },
  
  tableHeader: { flexDirection: 'row', marginBottom: 10 },
  tableRow: { flexDirection: 'row', marginBottom: 12 },
  colName: { flex: 3, paddingRight: 8, fontSize: 13 },
  colQty: { flex: 1, textAlign: 'center', fontSize: 13 },
  colPrice: { flex: 1.5, textAlign: 'right', fontSize: 13 },
  
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: 1 },
  confirmBtn: { borderRadius: 12, paddingVertical: 8 },
  confirmBtnLabel: { fontSize: 18, fontWeight: 'bold' }
});
