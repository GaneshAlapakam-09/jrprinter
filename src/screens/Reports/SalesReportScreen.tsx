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

export default function SalesReportScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Sales Report',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getSalesReport(period);
      setData(res.data);
    } catch (err) {
      console.warn('Failed to load sales report:', err);
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

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[s.headerFilters, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}>
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
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>
      ) : data ? (
        <ScrollView contentContainerStyle={s.scroll}>
          
          <Surface style={[s.heroCard, { backgroundColor: t.accent }]} elevation={2}>
             <Text style={s.heroLabel}>Total Revenue</Text>
             <Text style={s.heroValue}>₹{(data.summary.total_revenue || 0).toFixed(2)}</Text>
             <Icon name="trending-up" size={80} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
          </Surface>

          <View style={s.grid}>
             <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <View style={[s.iconBox, { backgroundColor: t.infoSoft }]}><Icon name="receipt" size={20} color={t.info}/></View>
                <Text style={[s.gridLabel, { color: t.subtext }]}>Invoice Count</Text>
                <Text style={[s.gridVal, { color: t.text }]}>{data.summary.bill_count || 0}</Text>
             </Surface>
             <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <View style={[s.iconBox, { backgroundColor: t.accentSoft }]}><Icon name="calculate" size={20} color={t.accent}/></View>
                <Text style={[s.gridLabel, { color: t.subtext }]}>Average Bill</Text>
                <Text style={[s.gridVal, { color: t.text }]}>₹{data.summary.bill_count > 0 ? (data.summary.total_revenue / data.summary.bill_count).toFixed(2) : '0.00'}</Text>
             </Surface>
          </View>
          
          <View style={s.grid}>
             <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <View style={[s.iconBox, { backgroundColor: t.successSoft }]}><Icon name="percent" size={20} color={t.success}/></View>
                <Text style={[s.gridLabel, { color: t.subtext }]}>Total Tax</Text>
                <Text style={[s.gridVal, { color: t.text }]}>₹{(data.summary.total_tax || 0).toFixed(2)}</Text>
             </Surface>
             <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <View style={[s.iconBox, { backgroundColor: t.accentSoft }]}><Icon name="local-offer" size={20} color={t.accent}/></View>
                <Text style={[s.gridLabel, { color: t.subtext }]}>Discounts Given</Text>
                <Text style={[s.gridVal, { color: t.text }]}>₹{(data.summary.total_discount || 0).toFixed(2)}</Text>
             </Surface>
          </View>

        </ScrollView>
      ) : (
        <View style={s.centered}>
          <Text style={{ color: t.subtext }}>No data available.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerFilters: { paddingVertical: 12, borderBottomWidth: 1 },
  scroll: { padding: 14, paddingBottom: 40 },
  
  heroCard: { padding: 24, borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  heroValue: { color: '#FFF', fontSize: 36, fontWeight: '900' },

  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  gridLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  gridVal: { fontSize: 22, fontWeight: '800' },
});
