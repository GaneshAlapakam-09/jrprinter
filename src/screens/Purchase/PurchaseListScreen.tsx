import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { Searchbar, Surface, Chip, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', success: '#059669', warning: '#F59E0B'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', success: '#34D399', warning: '#FBBF24'
};

const PurchaseListScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => (navigation as any).openDrawer()}>
          <Icon name="menu" size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Purchases',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 14 }} onPress={() => (navigation as any).navigate('AddPurchase' as any)}>
          <Icon name="add" size={28} color={t.accent} />
        </TouchableOpacity>
      )
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchRes, supRes] = await Promise.all([
        purchaseService.getPurchases(),
        supplierService.getSuppliers()
      ]);
      const pData = purchRes.data?.results || purchRes.data || [];
      const sData = supRes.data?.results || supRes.data || [];
      
      const sMap: Record<number, string> = {};
      sData.forEach((s: any) => sMap[s.id] = s.name);
      
      setSuppliers(sMap);
      setPurchases(Array.isArray(pData) ? pData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []);
    } catch (err) {
      console.warn('Failed to load purchases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const filteredData = purchases.filter(p => {
    const qMatches = !searchQuery || 
      (p.invoice_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (suppliers[p.supplier] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter - backend might return strings. We assume Pending, Completed
    const statusMatches = statusFilter === 'All' || p.status === statusFilter;
    
    return qMatches && statusMatches;
  });

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'Paid') return t.success;
    if (status === 'Pending') return t.warning;
    return t.danger;
  };

  const renderItem = ({ item }: { item: any }) => {
    const sName = suppliers[item.supplier] || 'Unknown Supplier';
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity onPress={() => (navigation as any).navigate('PurchaseDetails' as any, { purchaseId: item.id })}>
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
          <View style={s.cardHeader}>
             <Text style={[s.invText, { color: t.text }]}>
               {item.invoice_number ? `INV: ${item.invoice_number}` : `PO #${item.id}`}
             </Text>
             <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
               <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                 {item.status}
               </Text>
             </View>
          </View>
          
          <Text style={[s.supName, { color: t.text }]}>{sName}</Text>
          <Text style={[s.dateText, { color: t.subtext }]}>{item.invoice_date || new Date(item.created_at).toLocaleDateString()}</Text>
          
          <View style={s.totalsRow}>
            <View>
              <Text style={[s.totalLabel, { color: t.subtext }]}>Total Ext</Text>
              <Text style={[s.totalAmount, { color: t.text }]}>₹{item.total_amount}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.totalLabel, { color: t.subtext }]}>Due</Text>
              <Text style={[s.totalAmount, { color: item.due_amount > 0 ? t.danger : t.success }]}>
                ₹{item.due_amount}
              </Text>
            </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={s.searchWrap}>
        <Searchbar
           placeholder="Search Supplier or Invoice..."
           onChangeText={setSearchQuery}
           value={searchQuery}
           style={[s.searchbar, { backgroundColor: t.input, borderColor: t.border }]}
           inputStyle={{ color: t.text, padding: 0 }}
           iconColor={t.subtext}
           placeholderTextColor={t.subtext}
           elevation={0}
        />
        <View style={s.filterRow}>
          {['All', 'Completed', 'Pending'].map(status => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
              style={[s.chip, statusFilter === status ? { backgroundColor: t.accent } : { backgroundColor: t.card, borderColor: t.border }]}
              textStyle={[s.chipText, { color: statusFilter === status ? '#FFF' : t.text }]}
              mode="outlined"
            >
              {status}
            </Chip>
          ))}
        </View>
      </View>
      
      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={t.accent} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          ListEmptyComponent={
             <View style={s.empty}>
               <Icon name="receipt" size={64} color={t.border} />
               <Text style={{ marginTop: 16, fontSize: 16, color: t.subtext }}>No purchases found.</Text>
             </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: 14, paddingBottom: 0 },
  searchbar: { height: 46, borderRadius: 12, borderWidth: 1 },
  filterRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4, gap: 8 },
  chip: { borderRadius: 20 },
  chipText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 14, paddingBottom: 30 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invText: { fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  supName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  dateText: { fontSize: 12, marginBottom: 14 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ccc', paddingTop: 12 },
  totalLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  totalAmount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 }
});

export default PurchaseListScreen;
