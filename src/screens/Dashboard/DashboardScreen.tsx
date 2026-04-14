import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Dimensions, ActivityIndicator,
  RefreshControl, StyleSheet, TouchableOpacity, Linking,
  useColorScheme, StatusBar, SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Surface, Divider } from 'react-native-paper';
import { reportService } from '../../services/reportService';
import { billingService } from '../../services/billingService';
import { LineChart } from 'react-native-chart-kit';

// ─── Theme ───────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', success: '#059669', warning: '#F59E0B',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', success: '#34D399', warning: '#FBBF24',
};

const SCREEN_W = Dimensions.get('window').width;

export default function DashboardScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<any>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Overview',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesSummary, setSalesSummary] = useState({ revenue: 0, bills: 0 });
  const [invStatus, setInvStatus] = useState({ low_stock: 0, expiring: 0 });
  const [recentTrans, setRecentTrans] = useState<any[]>([]);
  const [todayChartData, setTodayChartData] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesRes, invRes, billsRes, chartRes] = await Promise.all([
        reportService.getSalesReport('today').catch(() => null),
        reportService.getInventoryStatus().catch(() => null),
        billingService.getBills().catch(() => null),
        reportService.getTodaySales().catch(() => null)
      ]);
      
      if (salesRes?.data) {
        setSalesSummary({
          revenue: salesRes.data.summary?.total_revenue || 0,
          bills: salesRes.data.summary?.bill_count || 0
        });
      }
      
      if (invRes?.data) {
        setInvStatus({
          low_stock: invRes.data.low_stock?.length || 0,
          expiring: invRes.data.expiring_soon?.length || 0
        });
      }
      
      if (billsRes?.data) {
         const list = billsRes.data.results || billsRes.data || [];
         setRecentTrans(list.slice(0, 5));
      }

      if (chartRes?.data?.labels?.length) {
         setTodayChartData(chartRes.data);
      } else {
         setTodayChartData(null);
      }
    } catch (e) {
      console.warn("Dashboard Load Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const chartConfig = {
    backgroundGradientFrom: t.card, backgroundGradientTo: t.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => t.subtext,
    propsForDots: { r: '4', strokeWidth: '2', stroke: t.accent },
    fillShadowGradient: t.accent, fillShadowGradientOpacity: 0.15,
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.centered, { backgroundColor: t.bg }]}><ActivityIndicator size="large" color={t.accent} /></View>
    );
  }

  const QuickAction = ({ icon, label, navTo }: any) => (
    <TouchableOpacity style={[s.actionBtn, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => navigation.navigate(navTo)}>
      <View style={[s.iconWrap, { backgroundColor: t.accentSoft }]}><Icon name={icon} size={24} color={t.accent}/></View>
      <Text style={[s.actionText, { color: t.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView 
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={t.accent} />}
      >
        
        {/* Highlight KPI row */}
        <View style={s.kpiRow}>
          <Surface style={[s.kpiCard, { backgroundColor: t.accent, flex: 2 }]} elevation={2}>
            <Text style={s.kpiLabelLight}>Today's Revenue</Text>
            <Text style={s.kpiValueLight}>₹{salesSummary.revenue.toFixed(0)}</Text>
            <View style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.2 }}><Icon name="request-quote" size={80} color="#FFF"/></View>
          </Surface>
          
          <Surface style={[s.kpiCard, { backgroundColor: t.card, borderColor: t.border, flex: 1, borderWidth: 1 }]} elevation={1}>
            <Text style={[s.kpiLabel, { color: t.subtext }]}>Orders</Text>
            <Text style={[s.kpiValue, { color: t.text }]}>{salesSummary.bills}</Text>
          </Surface>
        </View>

        {/* Inventory Alerts */}
        <Text style={[s.sectionTitle, { color: t.text }]}>Operations Alerts</Text>
        <View style={s.alertRow}>
           <Surface style={[s.alertCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
             <View style={[s.alertIcon, { backgroundColor: t.warning + '20' }]}><Icon name="inventory" size={20} color={t.warning}/></View>
             <View>
               <Text style={[s.alertTitle, { color: t.warning }]}>{invStatus.low_stock} Low Stock</Text>
               <Text style={[s.alertSub, { color: t.subtext }]}>Items below reorder level</Text>
             </View>
           </Surface>

           <Surface style={[s.alertCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
             <View style={[s.alertIcon, { backgroundColor: t.danger + '20' }]}><Icon name="event-busy" size={20} color={t.danger}/></View>
             <View>
               <Text style={[s.alertTitle, { color: t.danger }]}>{invStatus.expiring} Expiring</Text>
               <Text style={[s.alertSub, { color: t.subtext }]}>Batches tracking 30d expiry</Text>
             </View>
           </Surface>
        </View>

        {/* Quick Actions */}
        <Text style={[s.sectionTitle, { color: t.text }]}>Quick Actions</Text>
        <View style={s.actionGrid}>
          <QuickAction icon="point-of-sale" label="New POS Bill" navTo="Order" />
          <QuickAction icon="shopping-cart" label="Record Purchase" navTo="AddPurchase" />
          <QuickAction icon="group-add" label="Add Customer" navTo="AddCustomer" />
          <QuickAction icon="storefront" label="Add Supplier" navTo="AddSupplier" />
        </View>

        {/* Recent Transactions */}
        <Surface style={[s.blockCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
             <Text style={[s.blockTitle, { color: t.text }]}>Recent Transactions</Text>
             <TouchableOpacity><Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>View All</Text></TouchableOpacity>
           </View>
           {recentTrans.length === 0 ? <Text style={{ color: t.subtext, textAlign: 'center', padding: 20 }}>No transactions yet.</Text> : null}
           {recentTrans.map((tx: any, idx: number) => (
             <View key={idx}>
               {idx > 0 && <Divider style={{ backgroundColor: t.border, marginVertical: 8 }} />}
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <View style={[s.txIcon, { backgroundColor: t.accentSoft }]}><Icon name="receipt" size={16} color={t.accent}/></View>
                     <View style={{ marginLeft: 10 }}>
                        <Text style={{ color: t.text, fontWeight: 'bold' }}>Bill {tx.invoice_number ? `#${tx.invoice_number}` : `#${tx.id}`}</Text>
                        <Text style={{ color: t.subtext, fontSize: 12 }}>{new Date(tx.created_at).toLocaleTimeString()}</Text>
                     </View>
                  </View>
                  <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>₹{tx.total_amount}</Text>
               </View>
             </View>
           ))}
        </Surface>

        {/* Today's Chart */}
        {todayChartData && (
          <Surface style={[s.blockCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
             <Text style={[s.blockTitle, { color: t.text, marginBottom: 16 }]}>Today's Hourly Pulse</Text>
             <LineChart
               data={todayChartData}
               width={Math.max(SCREEN_W - 60, todayChartData.labels.length * 52)}
               height={180}
               yAxisLabel="₹" yAxisSuffix=""
               chartConfig={chartConfig}
               bezier
               style={{ marginLeft: -16 }}
               withHorizontalLines={true} withVerticalLines={false}
             />
          </Surface>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 14, paddingBottom: 40 },
  
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiCard: { borderRadius: 16, padding: 16, justifyContent: 'center', overflow: 'hidden' },
  kpiLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: '900' },
  kpiLabelLight: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 4 },
  kpiValueLight: { fontSize: 32, fontWeight: '900', color: '#FFF' },

  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },

  alertRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  alertCard: { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  alertIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  alertTitle: { fontSize: 16, fontWeight: '900' },
  alertSub: { fontSize: 10, marginTop: 2, marginRight: 20 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  actionBtn: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  actionText: { fontSize: 13, fontWeight: '700', flex: 1 },

  blockCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  blockTitle: { fontSize: 16, fontWeight: '800' },
  txIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});