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
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
};

const MODE_COLORS: Record<string, string> = {
  cash: '#10B981', // green
  upi: '#7C3AED', // purple
  card: '#3B82F6', // blue
  bank_transfer: '#F59E0B' // amber
};

export default function PaymentReportScreen() {
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
      headerTitle: 'Collections & Payments',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getPaymentReport(period);
      setData(res.data);
    } catch (err) {
      console.warn('Failed to load payment report:', err);
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

  const pieData = data?.mix ? data.mix.map((m: any) => ({
    name: m.mode.toUpperCase(),
    value: m.amount,
    color: MODE_COLORS[m.mode.toLowerCase()] || t.subtext,
    legendFontColor: t.text,
    legendFontSize: 12
  })) : [];

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
          
          <Surface style={[s.heroCard, { backgroundColor: t.danger }]} elevation={2}>
             <Text style={s.heroLabel}>Pending Credit Extended</Text>
             <Text style={s.heroValue}>₹{(data.total_due || 0).toFixed(2)}</Text>
             <Icon name="account-balance-wallet" size={80} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
          </Surface>

          <Text style={[s.sectionTitle, { color: t.text }]}>Collection Mix</Text>
          <Surface style={[s.chartCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
             {pieData.length > 0 ? (
               <PieChart
                 data={pieData}
                 width={SCREEN_W - 60}
                 height={200}
                 chartConfig={{ color: () => t.text }}
                 accessor={"value"}
                 backgroundColor={"transparent"}
                 paddingLeft={"15"}
                 absolute
               />
             ) : (
               <Text style={{ color: t.subtext, textAlign: 'center', padding: 20 }}>No payments recorded for this period.</Text>
             )}
          </Surface>

          {data.mix?.map((m: any, idx: number) => (
             <Surface key={idx} style={[s.rowCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <View style={[s.modeDot, { backgroundColor: MODE_COLORS[m.mode.toLowerCase()] || t.subtext }]} />
                   <Text style={{ color: t.text, fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' }}>{m.mode.replace('_', ' ')}</Text>
                </View>
                <Text style={{ color: t.text, fontSize: 16, fontWeight: '800' }}>₹{m.amount.toFixed(2)}</Text>
             </Surface>
          ))}
          
        </ScrollView>
      ) : (
        <View style={s.centered}><Text style={{ color: t.subtext }}>No data available.</Text></View>
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

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, marginLeft: 4 },
  
  chartCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, alignItems: 'center' },
  rowCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  modeDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 }
});
