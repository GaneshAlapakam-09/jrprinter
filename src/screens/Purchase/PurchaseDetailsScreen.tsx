import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Divider } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  warning: '#F59E0B', warningSoft: '#FEF3C7',
  info: '#3B82F6', infoSoft: '#DBEAFE',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  warning: '#FBBF24', warningSoft: '#332701',
  info: '#60A5FA', infoSoft: '#1E3A8A',
};

export default function PurchaseDetailsScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<any, 'any'>>();
  
  const purchaseId = route.params?.purchaseId;
  const [purchase, setPurchase] = useState<any>(null);
  const [supplierName, setSupplierName] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Purchase Details',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const pRes = await purchaseService.getById(purchaseId);
        setPurchase(pRes.data);

        // Fetch supplier
        if (pRes.data.supplier) {
          const sRes = await supplierService.getSuppliers();
          const supps = sRes.data?.results || sRes.data || [];
          const sup = supps.find((s: any) => s.id === pRes.data.supplier);
          setSupplierName(sup ? sup.name : 'Unknown Supplier');
        } else {
          setSupplierName('No Supplier');
        }
      } catch (err) {
        console.warn('Failed to load purchase details:', err);
      } finally {
        setLoading(false);
      }
    };
    if (purchaseId) loadData();
  }, [purchaseId]);

  if (loading || !purchase) {
    return (
      <View style={[s.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Paid') return t.success;
    if (status === 'Pending') return t.warning;
    return t.danger;
  };
  const statusColor = getStatusColor(purchase.status);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={s.scroll}>
        
        {/* Header summary */}
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
          <View style={s.cardHeader}>
             <Text style={[s.invText, { color: t.text }]}>
               {purchase.invoice_number ? `INV: ${purchase.invoice_number}` : `PO #${purchase.id}`}
             </Text>
             <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
               <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                 {purchase.status}
               </Text>
             </View>
          </View>
          
          <Text style={[s.supName, { color: t.text }]}>{supplierName}</Text>
          <Text style={[s.dateText, { color: t.subtext }]}>
            Date: {purchase.invoice_date || new Date(purchase.created_at).toLocaleDateString()}
          </Text>
        </Surface>

        {/* Financials summary */}
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           <Text style={[s.sectionTitle, { color: t.text }]}>Financials</Text>
           <View style={s.finRow}>
             <Text style={[s.finLabel, { color: t.subtext }]}>Subtotal</Text>
             <Text style={[s.finValue, { color: t.text }]}>₹{purchase.subtotal}</Text>
           </View>
           <View style={s.finRow}>
             <Text style={[s.finLabel, { color: t.subtext }]}>Tax Amount</Text>
             <Text style={[s.finValue, { color: t.text }]}>₹{purchase.tax_amount}</Text>
           </View>
           <View style={s.finRow}>
             <Text style={[s.finLabel, { color: t.subtext }]}>Discount</Text>
             <Text style={[s.finValue, { color: t.text }]}>₹{purchase.discount_amount}</Text>
           </View>
           <Divider style={{ marginVertical: 8, backgroundColor: t.border }} />
           <View style={s.finRow}>
             <Text style={[s.finLabel, { color: t.text, fontWeight: 'bold' }]}>Grand Total</Text>
             <Text style={[s.finValue, { color: t.accent, fontWeight: 'bold' }]}>₹{purchase.total_amount}</Text>
           </View>
           
           <View style={s.paidDueWrap}>
              <View style={s.pdBox}>
                <Text style={[s.pdLabel, { color: t.subtext }]}>Paid</Text>
                <Text style={[s.pdVal, { color: t.success }]}>₹{purchase.paid_amount}</Text>
              </View>
              <View style={s.pdBox}>
                <Text style={[s.pdLabel, { color: t.subtext }]}>Due</Text>
                <Text style={[s.pdVal, { color: purchase.due_amount > 0 ? t.danger : t.text }]}>₹{purchase.due_amount}</Text>
              </View>
           </View>
        </Surface>

        {/* Items */}
        <Text style={[s.sectionTitle, { color: t.text, marginLeft: 14, marginBottom: 10 }]}>Line Items</Text>
        {purchase.items && purchase.items.length > 0 ? (
          purchase.items.map((it: any, idx: number) => (
            <Surface key={idx} style={[s.itemCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
              <View style={{ flex: 1 }}>
                <Text style={[s.itemName, { color: t.text }]}>{it.product_name}</Text>
                <View style={s.itemMeta}>
                   <Text style={{ color: t.subtext, fontSize: 12 }}>Qty: <Text style={{ color: t.text, fontWeight: 'bold' }}>{it.quantity}</Text></Text>
                   <Text style={{ color: t.subtext, fontSize: 12 }}>Cost: ₹{it.cost_price}</Text>
                   {it.tax_percent > 0 && <Text style={{ color: t.subtext, fontSize: 12 }}>Tax: {it.tax_percent}%</Text>}
                </View>
                {(it.batch_number || it.expiry_date) ? (
                  <View style={[s.batchBadge, { backgroundColor: t.accentSoft }]}>
                    {it.batch_number && <Text style={{ fontSize: 11, color: t.accent, fontWeight: '600' }}>Batch: {it.batch_number}</Text>}
                    {it.expiry_date && <Text style={{ fontSize: 11, color: t.danger, fontWeight: '600', marginLeft: 8 }}>Exp: {it.expiry_date}</Text>}
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                 <Text style={{ fontSize: 15, fontWeight: 'bold', color: t.text }}>
                   ₹{(it.quantity * it.cost_price).toFixed(2)}
                 </Text>
              </View>
            </Surface>
          ))
        ) : (
          <Text style={{ color: t.subtext, textAlign: 'center', marginTop: 20 }}>No items recorded.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 14, paddingBottom: 40 },
  
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invText: { fontSize: 15, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  supName: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  dateText: { fontSize: 13 },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finLabel: { fontSize: 14 },
  finValue: { fontSize: 14, fontWeight: '600' },
  
  paidDueWrap: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: 10 },
  pdBox: { flex: 1, alignItems: 'center' },
  pdLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  pdVal: { fontSize: 16, fontWeight: '800' },

  itemCard: { borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, flexDirection: 'row' },
  itemName: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  itemMeta: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  batchBadge: { alignSelf: 'flex-start', flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4 }
});
