import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { supplierService } from '../../services/supplierService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  input: '#F9FAFB', inputBorder: '#D1D5DB'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  input: '#2D2B42', inputBorder: '#3D3B55'
};

export default function SupplierDetailsScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<any, 'any'>>();
  
  const supplierId = route.params?.supplierId;
  const [supplier, setSupplier] = useState<any>(null);
  const [history, setHistory] = useState<any>({ purchases: [], payments: [] });
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash'); // 'cash', 'bank', etc.
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 14 }} onPress={() => (navigation as any).navigate('AddSupplier', { supplierId })}>
          <Icon name="edit" size={24} color={t.accent} />
        </TouchableOpacity>
      ),
      headerTitle: 'Supplier Profile',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t, supplierId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, hRes] = await Promise.all([
        supplierService.getById(supplierId),
        supplierService.getHistory(supplierId)
      ]);
      setSupplier(sRes.data);
      setHistory(hRes.data);
    } catch (err) {
      console.warn('Failed to load supplier details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supplierId) loadData();
  }, [supplierId]);

  const handleRecordPayment = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      await supplierService.recordPayment(supplierId, {
        amount: amt,
        payment_method: payMethod,
        reference_number: payRef,
        notes: payNotes
      });
      setShowPaymentModal(false);
      setPayAmount(''); setPayRef(''); setPayNotes('');
      Alert.alert('Success', 'Payment recorded successfully.');
      loadData(); // refresh balances and history
    } catch (err: any) {
      Alert.alert('Error', err.response?.data ? JSON.stringify(err.response.data) : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !supplier) {
    return (
      <View style={[s.centered, { backgroundColor: t.bg }]}><ActivityIndicator size="large" color={t.accent} /></View>
    );
  }

  const balance = parseFloat(supplier.current_balance) || 0;
  const isOwed = balance > 0;
  
  // Combine and sort history timeline
  const timeline = [
    ...history.purchases.map((p: any) => ({ type: 'purchase', date: new Date(p.created_at), data: p })),
    ...history.payments.map((p: any) => ({ type: 'payment', date: new Date(p.created_at), data: p }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={s.scroll}>
        
        {/* Profile Header */}
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
             <View style={[s.avatar, { backgroundColor: t.accentSoft }]}>
               <Text style={{ color: t.accent, fontSize: 24, fontWeight: '800' }}>
                 {supplier.name.charAt(0).toUpperCase()}
               </Text>
             </View>
             <View style={{ marginLeft: 16, flex: 1 }}>
               <Text style={[s.supName, { color: t.text }]}>{supplier.name}</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                 {isOwed ? <Icon name="warning" size={14} color={t.danger} style={{ marginRight: 4 }}/> : <Icon name="check-circle" size={14} color={t.success} style={{ marginRight: 4 }}/>}
                 <Text style={{ color: isOwed ? t.danger : t.success, fontWeight: '700' }}>
                   {isOwed ? `Owe: ₹${balance.toFixed(2)}` : 'Settled'}
                 </Text>
               </View>
             </View>
           </View>
           
           <View style={s.contactGrid}>
             <View style={s.cItem}><Icon name="phone" size={16} color={t.subtext} style={{marginRight:6}}/><Text style={{color: t.text, flex:1}}>{supplier.phone || 'N/A'}</Text></View>
             <View style={s.cItem}><Icon name="email" size={16} color={t.subtext} style={{marginRight:6}}/><Text style={{color: t.text, flex:1}} numberOfLines={1}>{supplier.email || 'N/A'}</Text></View>
             <View style={s.cItem}><Icon name="receipt" size={16} color={t.subtext} style={{marginRight:6}}/><Text style={{color: t.text, flex:1}}>GST: {supplier.gstin || 'N/A'}</Text></View>
           </View>
           
           <TouchableOpacity 
             style={[s.payBtn, { backgroundColor: t.accent }]} 
             onPress={() => setShowPaymentModal(true)}
           >
             <Icon name="payment" size={18} color="#FFF" />
             <Text style={s.payBtnText}>Record Payment</Text>
           </TouchableOpacity>
        </Surface>

        {/* Timeline */}
        <Text style={[s.sectionTitle, { color: t.text, marginLeft: 6 }]}>Activity Timeline</Text>
        
        {timeline.length === 0 ? (
          <Text style={{ color: t.subtext, textAlign: 'center', marginTop: 20 }}>No activity recorded yet.</Text>
        ) : (
          timeline.map((item, idx) => {
            if (item.type === 'purchase') {
              const p = item.data;
              return (
                <Surface key={`pur_${p.id}`} style={[s.timeCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                  <View style={[s.iconBox, { backgroundColor: t.accentSoft }]}><Icon name="inventory-2" size={20} color={t.accent} /></View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={{ color: t.text, fontWeight: 'bold' }}>Purchase {p.invoice_number ? `(${p.invoice_number})` : `#${p.id}`}</Text>
                    <Text style={{ color: t.subtext, fontSize: 12 }}>{item.date.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: t.danger, fontWeight: '800', fontSize: 16 }}>₹{p.total_amount}</Text>
                    {p.status === 'Pending' && <Text style={{ color: t.danger, fontSize: 11, fontWeight: 'bold' }}>UNPAID</Text>}
                  </View>
                </Surface>
              );
            } else {
              const pay = item.data;
              return (
                <Surface key={`pay_${pay.id}`} style={[s.timeCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                  <View style={[s.iconBox, { backgroundColor: t.successSoft }]}><Icon name="call-made" size={20} color={t.success} /></View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={{ color: t.text, fontWeight: 'bold' }}>Payment Sent</Text>
                    <Text style={{ color: t.subtext, fontSize: 12 }}>{item.date.toLocaleString()} • {pay.payment_method.toUpperCase()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: t.success, fontWeight: '800', fontSize: 16 }}>₹{pay.amount}</Text>
                  </View>
                </Surface>
              );
            }
          })
        )}

      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.modalBox, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={s.modalHeader}>
               <Text style={[s.modalTitle, { color: t.text }]}>Record Payment</Text>
               <TouchableOpacity onPress={() => setShowPaymentModal(false)}><Icon name="close" size={24} color={t.subtext} /></TouchableOpacity>
            </View>
            
            <View style={s.inputBlock}>
              <Text style={[s.label, { color: t.subtext }]}>Amount to Pay (₹)</Text>
              <TextInput style={[s.input, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                keyboardType="decimal-pad" value={payAmount} onChangeText={setPayAmount} placeholder="0.00" placeholderTextColor={t.subtext}
              />
            </View>
            
            <View style={s.inputBlock}>
              <Text style={[s.label, { color: t.subtext }]}>Payment Method</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['cash', 'upi', 'bank_transfer'].map(method => (
                  <TouchableOpacity key={method} 
                    style={[s.methodBtn, { backgroundColor: t.input, borderColor: payMethod === method ? t.accent : t.inputBorder }]}
                    onPress={() => setPayMethod(method)}>
                    <Text style={{ color: payMethod === method ? t.accent : t.subtext, fontSize: 13, fontWeight: payMethod === method ? '700' : '500', textTransform: 'capitalize' }}>
                      {method.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.inputBlock}>
              <Text style={[s.label, { color: t.subtext }]}>Reference / Ref No</Text>
              <TextInput style={[s.input, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
                value={payRef} onChangeText={setPayRef} placeholder="Txn ID if any" placeholderTextColor={t.subtext}
              />
            </View>

            <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }, submitting && { opacity: 0.7 }]}
              onPress={handleRecordPayment} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Confirm Payment</Text>}
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 14, paddingBottom: 40 },
  
  card: { borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  supName: { fontSize: 20, fontWeight: 'bold' },
  
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  cItem: { flexDirection: 'row', alignItems: 'center', width: '45%' },
  
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  payBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  timeCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, borderBottomWidth: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  
  inputBlock: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 16 },
  
  methodBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderRadius: 8 },
  
  submitBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
