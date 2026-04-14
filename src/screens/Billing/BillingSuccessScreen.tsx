import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, useColorScheme, Linking } from 'react-native';
import { Surface, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { billingService } from '../../services/billingService';
import { printReceipt, isPrinterConnected } from '../../utils/printer';

const ACCENT = '#7C3AED';

export default function BillingSuccessScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? {
    bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
    text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6',
    success: '#34D399', primaryBtn: '#8B5CF6', secondaryBtn: '#2D1F5E'
  } : {
    bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
    text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT,
    success: '#059669', primaryBtn: ACCENT, secondaryBtn: '#EDE9FE'
  };

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BillingSuccess'>>();
  const { billId, offlineUuid, customerPhone, total } = route.params;

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintAgain = async () => {
    setIsPrinting(true);
    try {
      if (!billId) {
        Alert.alert('Info', 'Cannot reprint offline bills directly from success screen yet.');
        return;
      }
      const printerStatus = await isPrinterConnected();
      if (!printerStatus) {
        Alert.alert('No Printer', 'Bluetooth printer is not connected.');
        return;
      }
      
      const res = await billingService.getBillById(billId);
      const billData = res.data;
      
      const orderItems = billData.items.map((i: any) => ({
        product: {
          name: i.product_name || i.product?.name,
          price: parseFloat(i.unit_price || i.price)
        },
        quantity: i.quantity
      }));
      
      const payments = billData.payments || [];
      
      await printReceipt(orderItems, parseFloat(billData.total_amount), billData.payment_mode, {
        tax: parseFloat(billData.tax_total || 0),
        discount: parseFloat(billData.discount_total || 0),
        customerName: billData.customer_name || undefined,
        payments: payments.map((p: any) => ({ mode: p.payment_method || p.mode, amount: parseFloat(p.amount) }))
      });
      Alert.alert('Success', 'Reprinted successfully.');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to retrieve/print the bill.');
    } finally {
      setIsPrinting(false);
    }
  };

  const shareOnWhatsApp = () => {
    if (!customerPhone) return;
    const phone = customerPhone.startsWith('+') ? customerPhone : `+91${customerPhone}`;
    const amountStr = total ? ` of Rs. ${total}` : '';
    const idStr = billId ? ` #${billId}` : '';
    const text = `Thank you for your purchase${amountStr}! Your invoice${idStr} is successfully processed.`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed or could not be opened.');
    });
  };

  const handleNextBill = () => {
    // Navigate back to the very beginning ('HomeTabs' inside 'Main')
    // Reset or navigate as per app routing. Often going back to 'Order' Tab is enough.
    navigation.reset({
      index: 0,
       routes: [{ name: 'Main', params: { role: 'admin' } }] // 'admin' or 'billing' role logic can be dynamically sourced but we just take 'admin' as fallback or better, popToTop
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={styles.successContainer}>
        <Surface style={[styles.iconCircle, { backgroundColor: t.success + '20' }]} elevation={0}>
          <Icon name="check" size={80} color={t.success} />
        </Surface>
        <Text style={[styles.successTitle, { color: t.text }]}>Bill Saved Successfully!</Text>
        <Text style={[styles.subTitle, { color: t.subtext }]}>
          {billId ? `Bill ID: #${billId}` : `Offline Saved: ${offlineUuid?.substring(0, 8)}...`}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          icon="print"
          onPress={handlePrintAgain}
          loading={isPrinting}
          disabled={isPrinting}
          style={[styles.actionBtn, { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }]}
          labelStyle={{ color: t.text, fontSize: 16 }}
        >
          Print Again
        </Button>

        {customerPhone ? (
          <Button
            mode="contained"
            icon="share"
            onPress={shareOnWhatsApp}
            style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
            labelStyle={{ color: '#fff', fontSize: 16 }}
          >
            Share via WhatsApp
          </Button>
        ) : null}

        <Button
          mode="contained"
          icon="add-shopping-cart"
          onPress={handleNextBill}
          style={[styles.actionBtn, { backgroundColor: t.primaryBtn, marginTop: 16 }]}
          labelStyle={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Start Next Bill
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  successContainer: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subTitle: { fontSize: 16, textAlign: 'center' },
  
  actionsContainer: { paddingHorizontal: 20 },
  actionBtn: { borderRadius: 12, marginBottom: 12, elevation: 0 }
});
