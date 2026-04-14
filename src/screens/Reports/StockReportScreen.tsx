import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { reportService } from '../../services/reportService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  warning: '#F59E0B', warningSoft: '#FEF3C7',
  success: '#059669', successSoft: '#ECFDF5'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  warning: '#FBBF24', warningSoft: '#332701',
  success: '#34D399', successSoft: '#0D2A1E'
};

export default function StockReportScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Stock & Inventory Health',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getInventoryStatus();
      setData(res.data);
    } catch (err) {
      console.warn('Failed to load inventory status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <View style={[s.centered, { backgroundColor: t.bg }]}><ActivityIndicator size="large" color={t.accent} /></View>;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={s.scroll}>
        
        {/* Low Stock Section */}
        <View style={s.sectionHeader}>
           <View style={[s.iconBox, { backgroundColor: t.warningSoft, marginRight: 8 }]}><Icon name="warning" color={t.warning} size={20}/></View>
           <Text style={[s.sectionTitle, { color: t.text }]}>Low Stock Alerts ({data?.low_stock?.length || 0})</Text>
        </View>
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           {data?.low_stock && data.low_stock.length > 0 ? (
             data.low_stock.map((item: any) => (
                <View key={`ls_${item.id}`} style={s.row}>
                   <Text style={[s.rowText, { color: t.text, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                   <View style={[s.badge, { backgroundColor: t.warningSoft }]}><Text style={{ color: t.warning, fontSize: 11, fontWeight: '700' }}>RL: {item.reorder_level}</Text></View>
                </View>
             ))
           ) : (
             <Text style={{ color: t.subtext, padding: 10, textAlign: 'center' }}>Stock health is good.</Text>
           )}
        </Surface>

        {/* Expiring Soon Section */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
           <View style={[s.iconBox, { backgroundColor: t.dangerSoft, marginRight: 8 }]}><Icon name="event-busy" color={t.danger} size={20}/></View>
           <Text style={[s.sectionTitle, { color: t.text }]}>Expiring Soon ({data?.expiring_soon?.length || 0})</Text>
        </View>
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           {data?.expiring_soon && data.expiring_soon.length > 0 ? (
             data.expiring_soon.map((item: any, idx: number) => (
                <View key={`ex_${idx}`} style={s.row}>
                   <View style={{ flex: 1 }}>
                     <Text style={[s.rowText, { color: t.text }]} numberOfLines={1}>{item.product_name}</Text>
                     <Text style={{ color: t.subtext, fontSize: 12 }}>Batch: {item.batch} • Qty: {item.quantity}</Text>
                   </View>
                   <View style={[s.badge, { backgroundColor: t.dangerSoft }]}><Text style={{ color: t.danger, fontSize: 11, fontWeight: '700' }}>Exp: {item.expiry_date}</Text></View>
                </View>
             ))
           ) : (
             <Text style={{ color: t.subtext, padding: 10, textAlign: 'center' }}>No batches expiring within 30 days.</Text>
           )}
        </Surface>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  
  card: { borderRadius: 12, padding: 8, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  rowText: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 10 }
});
