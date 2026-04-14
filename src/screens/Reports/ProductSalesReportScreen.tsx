import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { reportService } from '../../services/reportService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Chip } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', success: '#059669', info: '#3B82F6', infoSoft: '#DBEAFE'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', success: '#34D399', info: '#60A5FA', infoSoft: '#1E3A8A'
};

export default function ProductSalesReportScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [period, setPeriod] = useState('monthly'); // default to this month to get good product data
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Product Performance',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getTopProducts(period);
      setProducts(res.data || []);
    } catch (err) {
      console.warn('Failed to load top products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [period]);

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'weekly', label: 'Last 7 Days' },
    { id: 'monthly', label: 'This Month' },
  ];

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
      <View style={s.rankBox}>
        <Text style={[s.rankText, { color: index < 3 ? t.accent : t.subtext }]}>#{index + 1}</Text>
      </View>
      <View style={s.content}>
        <Text style={[s.name, { color: t.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.sub, { color: t.subtext }]}>Sold: <Text style={{ fontWeight: 'bold', color: t.text }}>{item.quantity}</Text> units</Text>
      </View>
      <View style={s.valBox}>
         <Text style={[s.valLabel, { color: t.subtext }]}>Revenue</Text>
         <Text style={[s.valText, { color: t.success }]}>₹{item.revenue.toFixed(2)}</Text>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[s.headerFilters, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 14, gap: 10 }}>
          {periods.map(p => (
            <Chip
              key={p.id}
              selected={period === p.id}
              onPress={() => setPeriod(p.id)}
              style={{ backgroundColor: period === p.id ? t.accent : t.bg, borderRadius: 20 }}
              textStyle={{ color: period === p.id ? '#FFF' : t.text, fontWeight: 'bold' }}
            >
              {p.label}
            </Chip>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, idx) => `${item.product_id}_${idx}`}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <Text style={[s.sectionTitle, { color: t.text }]}>Top Selling Products</Text>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="insert-chart-outlined" size={48} color={t.subtext} />
              <Text style={{ color: t.subtext, marginTop: 16 }}>No sales data for {period}.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerFilters: { paddingVertical: 12, borderBottomWidth: 1 },
  
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { padding: 14, paddingBottom: 40 },
  
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  rankBox: { width: 40 },
  rankText: { fontSize: 18, fontWeight: '900' },
  
  content: { flex: 1, paddingRight: 10 },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sub: { fontSize: 13 },
  
  valBox: { alignItems: 'flex-end' },
  valLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 },
  valText: { fontSize: 16, fontWeight: '800' },
  
  empty: { padding: 40, alignItems: 'center' }
});
