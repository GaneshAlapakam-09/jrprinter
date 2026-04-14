import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { TextInput, Button, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

const ACCENT = '#7C3AED';

type PaymentMode = 'cash' | 'upi' | 'card' | 'credit';

interface PartialPayment {
  mode: PaymentMode;
  amount: number;
}

export default function PaymentScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? {
    bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
    text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6',
    danger: '#F87171', success: '#34D399'
  } : {
    bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
    text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT,
    danger: '#EF4444', success: '#059669'
  };

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Payment'>>();
  const { orderItems, total, customerId, customerName, customerPhone } = route.params;

  const [payments, setPayments] = useState<PartialPayment[]>([]);
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('cash');
  const [amountStr, setAmountStr] = useState('');

  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const balance = total - totalPaid;

  // Auto-fill amount with remaining balance when a mode is picked
  const handleModeSelect = (mode: PaymentMode) => {
    setSelectedMode(mode);
    if (balance > 0) {
      setAmountStr(balance.toString());
    } else {
      setAmountStr('');
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (amount > balance && selectedMode !== 'cash') {
       Alert.alert('Exceeds Balance', `You cannot pay more than the remaining balance of ₹${balance.toFixed(2)} with ${selectedMode.toUpperCase()}.`);
       return;
    }
    
    // Check credit restriction
    if (selectedMode === 'credit' && !customerId) {
      Alert.alert('Customer Required', 'Credit payment requires a selected customer. Please go back and select a customer.');
      return;
    }

    setPayments([...payments, { mode: selectedMode, amount }]);
    setAmountStr('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleProceed = () => {
    if (balance > 0) {
      Alert.alert('Incomplete Payment', `There is still a remaining balance of ₹${balance.toFixed(2)}.`);
      return;
    }
    
    navigation.navigate('ReceiptPreview', {
      orderItems,
      total,
      customerId,
      customerName,
      customerPhone,
      paymentMode: payments.length === 1 ? payments[0].mode : 'split',
      partialPayments: payments,
      amountPaid: totalPaid
    });
  };

  // Standard payment methods template
  const PAYMENT_OPTIONS: { id: PaymentMode; label: string; icon: string }[] = [
    { id: 'cash', label: 'Cash', icon: 'payments' },
    { id: 'upi', label: 'UPI', icon: 'qr-code-scanner' },
    { id: 'card', label: 'Card', icon: 'credit-card' },
    { id: 'credit', label: 'Credit', icon: 'account-balance-wallet' },
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { backgroundColor: t.card }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Payment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={[styles.summaryCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={2}>
          <Text style={[styles.summaryTitle, { color: t.subtext }]}>Amount Payable</Text>
          <Text style={[styles.summaryAmount, { color: t.accent }]}>₹{total.toFixed(2)}</Text>
          {customerName && (
             <View style={styles.customerLine}>
               <Icon name="person" size={16} color={t.subtext} />
               <Text style={{ color: t.subtext, marginLeft: 4 }}>{customerName}</Text>
             </View>
          )}
        </Surface>

        {/* Added Payments List */}
        {payments.length > 0 && (
          <View style={styles.paymentsList}>
            <Text style={[styles.sectionHeading, { color: t.text }]}>Partial Payments</Text>
            {payments.map((p, index) => (
              <View key={index} style={[styles.paymentRow, { backgroundColor: t.border }]}>
                <Text style={{ textTransform: 'uppercase', color: t.text, fontWeight: 'bold' }}>{p.mode}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: t.text, marginRight: 16, fontSize: 16 }}>₹{p.amount.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleRemovePayment(index)}>
                    <Icon name="close" size={20} color={t.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {balance > 0 ? (
          <Surface style={[styles.addPaymentCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={2}>
            <Text style={[styles.balanceText, { color: t.danger }]}>Remaining Balance: ₹{balance.toFixed(2)}</Text>
            
            <View style={styles.methodsGrid}>
              {PAYMENT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.methodBtn,
                    { backgroundColor: t.bg, borderColor: t.border },
                    selectedMode === opt.id && { borderColor: t.accent, backgroundColor: t.accent + '15' }
                  ]}
                  onPress={() => handleModeSelect(opt.id)}
                >
                  <Icon name={opt.icon} size={24} color={selectedMode === opt.id ? t.accent : t.subtext} />
                  <Text style={[styles.methodTxt, { color: selectedMode === opt.id ? t.accent : t.text }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                label="Amount"
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                mode="outlined"
                style={styles.amountInput}
                textColor={t.text}
                outlineColor={t.border}
                activeOutlineColor={t.accent}
                left={<TextInput.Affix text="₹ " />}
              />
              <Button 
                mode="contained" 
                onPress={handleAddPayment}
                buttonColor={t.accent}
                style={styles.addBtn}
              >
                Add
              </Button>
            </View>
          </Surface>
        ) : (
          <Surface style={[styles.successCard, { backgroundColor: t.success + '20', borderColor: t.success }]} elevation={0}>
             <Icon name="check-circle" size={48} color={t.success} />
             <Text style={[styles.successText, { color: t.success }]}>Payment Complete</Text>
             {totalPaid > total && (
               <Text style={{ color: t.text, marginTop: 8, fontWeight: 'bold' }}>
                 Change Due: ₹{(totalPaid - total).toFixed(2)}
               </Text>
             )}
          </Surface>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <Button
          mode="contained"
          onPress={handleProceed}
          disabled={balance > 0}
          buttonColor={t.accent}
          style={styles.proceedBtn}
          labelStyle={styles.proceedBtnLabel}
        >
          {balance > 0 ? `Pay ₹${balance.toFixed(2)} more` : 'Proceed to Receipt'}
        </Button>
      </View>
    </KeyboardAvoidingView>
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
  summaryCard: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: '600' },
  summaryAmount: { fontSize: 36, fontWeight: '900', marginVertical: 8 },
  customerLine: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  
  paymentsList: { marginBottom: 20 },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 12, marginBottom: 8
  },
  
  addPaymentCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  balanceText: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  methodBtn: {
    width: '48%', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8
  },
  methodTxt: { fontSize: 16, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: { flex: 1, backgroundColor: 'transparent' },
  addBtn: { borderRadius: 8, paddingVertical: 4 },
  
  successCard: { padding: 30, borderRadius: 16, borderWidth: 2, alignItems: 'center', marginTop: 20 },
  successText: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },

  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16, borderTopWidth: 1 },
  proceedBtn: { borderRadius: 12, paddingVertical: 8 },
  proceedBtnLabel: { fontSize: 18, fontWeight: 'bold' }
});
