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
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  info: '#3B82F6', infoSoft: '#DBEAFE',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  info: '#60A5FA', infoSoft: '#1E3A8A',
};

export default function ProfitLossScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Profit & Loss',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getProfitLossReport(period);
      setData(res.data);
    } catch (err) {
      console.warn('Failed to load P&L:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [period]);

  const periods = [
    { id: 'today', label: 'Today' },
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
              key={p.id} selected={period === p.id} onPress={() => setPeriod(p.id)}
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
          
          <Surface style={[s.heroCard, { backgroundColor: data.gross_profit >= 0 ? t.success : t.danger }]} elevation={2}>
             <Text style={s.heroLabel}>Gross Profit</Text>
             <Text style={s.heroValue}>₹{(data.gross_profit || 0).toFixed(2)}</Text>
             <Icon name={data.gross_profit >= 0 ? "trending-up" : "trending-down"} size={80} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
          </Surface>

          <View style={s.gridRow}>
            <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
              <View style={[s.iconBox, { backgroundColor: t.infoSoft }]}><Icon name="payments" size={18} color={t.info}/></View>
              <Text style={[s.cardLabel, { color: t.subtext }]}>Revenue</Text>
              <Text style={[s.cardValue, { color: t.text }]}>₹{(data.revenue || 0).toFixed(2)}</Text>
            </Surface>
            <TouchableOpacity style={{ justifyContent: 'center', marginHorizontal: 4 }} disabled><Icon name="remove" size={16} color={t.subtext}/></TouchableOpacity>
            <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
              <View style={[s.iconBox, { backgroundColor: t.warningSoft }]}><Icon name="inventory-2" size={18} color={t.warning}/></View>
              <Text style={[s.cardLabel, { color: t.subtext }]}>COGS</Text>
              <Text style={[s.cardValue, { color: t.text }]}>₹{(data.cogs || 0).toFixed(2)}</Text>
            </Surface>
          </View>
          
          <View style={s.gridRow}>
            <TouchableOpacity style={{ justifyContent: 'center', marginHorizontal: 4 }} disabled><Icon name="remove" size={16} color={t.subtext}/></TouchableOpacity>
            <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
              <View style={[s.iconBox, { backgroundColor: t.dangerSoft }]}><Icon name="percent" size={18} color={t.danger}/></View>
              <Text style={[s.cardLabel, { color: t.subtext }]}>Sales Tax Output</Text>
              <Text style={[s.cardValue, { color: t.text }]}>₹{(data.tax || 0).toFixed(2)}</Text>
            </Surface>
            <TouchableOpacity style={{ justifyContent: 'center', marginHorizontal: 4 }} disabled><Icon name="drag-handle" size={16} color={t.subtext}/></TouchableOpacity>
            <Surface style={[s.gridCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
              <View style={[s.iconBox, { backgroundColor: t.successSoft }]}><Icon name="savings" size={18} color={t.success}/></View>
              <Text style={[s.cardLabel, { color: t.subtext }]}>Gross Margin</Text>
              <Text style={[s.cardValue, { color: t.text }]}>
                {data.revenue > 0 ? ((data.gross_profit / data.revenue) * 100).toFixed(1) + '%' : '0%'}
              </Text>
            </Surface>
          </View>

        </ScrollView>
      ) : (
        <View style={s.centered}><Text style={{ color: t.subtext }}>No P&L data available.</Text></View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerFilters: { paddingVertical: 12, borderBottomWidth: 1 },
  scroll: { padding: 14, paddingBottom: 40 },
  
  heroCard: { padding: 24, borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  heroValue: { color: '#FFF', fontSize: 36, fontWeight: '900' },

  gridRow: { flexDirection: 'row', marginBottom: 12 },
  gridCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '800' },
});
