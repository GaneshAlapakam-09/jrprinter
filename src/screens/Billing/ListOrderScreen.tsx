import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView, Modal,
  Pressable, SafeAreaView, StatusBar, useColorScheme,
} from 'react-native';
import {
  format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isWithinInterval,
} from 'date-fns';
import { billingService } from '../../services/billingService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

// ─── Types ──────────────────────────────────────────────────────────────────
type Order = {
  id: number;
  date: string;
  total_amount: number;
  payment_mode: string | null;
  items?: Array<{ id: number; product_name: string; quantity: number; price: number }>;
};
type FilterOption = 'all' | 'today' | 'week' | 'month' | 'sixMonths';

// ─── Theme ──────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  success: '#059669', successBg: '#ECFDF5',
  info: '#2563EB', infoBg: '#EFF6FF',
  cash: '#D97706', cashBg: '#FFFBEB',
  upi: '#7C3AED', upiBg: '#EDE9FE',
  danger: '#EF4444',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  success: '#34D399', successBg: '#0D2A1E',
  info: '#60A5FA', infoBg: '#1E3A5F',
  cash: '#FCD34D', cashBg: '#2D2200',
  upi: '#A78BFA', upiBg: '#2D1F5E',
  danger: '#F87171',
};

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: '6 Months', value: 'sixMonths' },
];

const ListOrderScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 14 }}
          onPress={() => (navigation as any).openDrawer()}
        >
          <Icon name="menu" size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Orders List',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerShown: true,
    });
  }, [navigation, t.text, t.card]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [revenueData, setRevenueData] = useState({ total: 0, cash: 0, upi: 0 });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await billingService.getBills();
      const mapped = response.data.map((b: any) => ({
        ...b,
        date: b.created_at,
        total_amount: parseFloat(b.total_amount) || 0,
        payment_mode: b.payment_mode ?? null,
        items: (b.items ?? []).map((item: any) => ({
          ...item,
          price: parseFloat(item.price) || 0,
        })),
      }));
      setOrders(mapped);
      setFilteredOrders(mapped);
      calculateRevenue(mapped);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]); setFilteredOrders([]);
      setRevenueData({ total: 0, cash: 0, upi: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateRevenue = (list: Order[]) => {
    let total = 0, cash = 0, upi = 0;
    list.forEach(o => {
      total += o.total_amount;
      if (o.payment_mode?.toLowerCase().includes('cash')) cash += o.total_amount;
      else if (o.payment_mode?.toLowerCase().includes('upi')) upi += o.total_amount;
    });
    setRevenueData({
      total: parseFloat(total.toFixed(2)),
      cash: parseFloat(cash.toFixed(2)),
      upi: parseFloat(upi.toFixed(2)),
    });
  };

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { applyFilter(activeFilter); }, [orders, activeFilter]);

  const applyFilter = (filter: FilterOption) => {
    if (!orders.length) return;
    const now = new Date();
    let filtered: Order[];
    switch (filter) {
      case 'today':
        filtered = orders.filter(o => isWithinInterval(new Date(o.date), { start: startOfDay(now), end: endOfDay(now) }));
        break;
      case 'week':
        filtered = orders.filter(o => isWithinInterval(new Date(o.date), { start: startOfWeek(now), end: endOfWeek(now) }));
        break;
      case 'month':
        filtered = orders.filter(o => isWithinInterval(new Date(o.date), { start: startOfMonth(now), end: endOfMonth(now) }));
        break;
      case 'sixMonths':
        filtered = orders.filter(o => new Date(o.date) >= subDays(now, 180));
        break;
      default:
        filtered = [...orders];
    }
    setFilteredOrders(filtered);
    calculateRevenue(filtered);
  };

  const paymentColor = (mode: string | null) => {
    if (!mode) return t.subtext;
    if (mode.toLowerCase().includes('cash')) return t.cash;
    if (mode.toLowerCase().includes('upi')) return t.upi;
    return t.subtext;
  };
  const paymentBg = (mode: string | null) => {
    if (!mode) return t.card;
    if (mode.toLowerCase().includes('cash')) return t.cashBg;
    if (mode.toLowerCase().includes('upi')) return t.upiBg;
    return t.card;
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
        <Text style={[s.loadingText, { color: t.subtext }]}>Loading orders…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[s.centered, { backgroundColor: t.bg }]}>
        <Icon name="wifi-off" size={44} color={t.danger} />
        <Text style={[s.errorTitle, { color: t.text }]}>Couldn't load orders</Text>
        <Text style={[s.errorSub, { color: t.subtext }]}>{error}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: t.accent }]} onPress={fetchOrders}>
          <Icon name="refresh" size={16} color="#FFF" />
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── Revenue summary cards ───────────────────────────────────────── */}
      <View style={s.statRow}>
        {[
          { label: 'Total', amount: revenueData.total, color: t.accent, bg: t.accentSoft, icon: 'account-balance-wallet' },
          { label: 'Cash', amount: revenueData.cash, color: t.cash, bg: t.cashBg, icon: 'payments' },
          { label: 'UPI', amount: revenueData.upi, color: t.upi, bg: t.upiBg, icon: 'qr-code' },
        ].map(stat => (
          <View key={stat.label} style={[s.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[s.statIcon, { backgroundColor: stat.bg }]}>
              <Icon name={stat.icon} size={16} color={stat.color} />
            </View>
            <Text style={[s.statLabel, { color: t.subtext }]}>{stat.label}</Text>
            <Text style={[s.statAmount, { color: stat.color }]} numberOfLines={1}>
              ₹{stat.amount.toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterPill,
            { backgroundColor: activeFilter === f.value ? t.accent : t.card, height: 35, marginBottom: 20, borderColor: activeFilter === f.value ? t.accent : t.border }
            ]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text style={[s.filterText, { color: activeFilter === f.value ? '#FFF' : t.subtext }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Order count ─────────────────────────────────────────────────── */}
      <Text style={[s.countText, { color: t.subtext }]}>
        {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
      </Text>

      {/* ── Order list ──────────────────────────────────────────────────── */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            colors={[t.accent]}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Icon name="receipt-long" size={48} color={t.subtext} style={{ opacity: 0.4 }} />
            <Text style={[s.emptyTitle, { color: t.text }]}>No orders found</Text>
            <Text style={[s.emptySub, { color: t.subtext }]}>
              {activeFilter === 'all' ? "No orders placed yet" : `No orders in this period`}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const itemCount = item.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
          const pm = item.payment_mode || 'N/A';
          return (
            <TouchableOpacity
              style={[s.orderCard, { backgroundColor: t.card, borderColor: t.border }]}
              onPress={() => { setSelectedOrder(item); setModalVisible(true); }}
              activeOpacity={0.75}
            >
              {/* Header */}
              <View style={s.orderCardHeader}>
                <View style={[s.orderIdBox, { backgroundColor: t.accentSoft }]}>
                  <Text style={[s.orderIdText, { color: t.accent }]}>#{item.id}</Text>
                </View>
                <Text style={[s.orderDate, { color: t.subtext }]}>
                  {format(new Date(item.date), 'dd MMM yyyy · hh:mm a')}
                </Text>
              </View>

              {/* Item preview */}
              {item.items && item.items.length > 0 && (
                <Text style={[s.itemPreview, { color: t.subtext }]} numberOfLines={1}>
                  {item.items.slice(0, 3).map(i => `${i.product_name} ×${i.quantity}`).join('  ·  ')}
                  {item.items.length > 3 ? ` +${item.items.length - 3} more` : ''}
                </Text>
              )}

              {/* Footer */}
              <View style={s.orderCardFooter}>
                <View style={[s.paymentPill, { backgroundColor: paymentBg(item.payment_mode) }]}>
                  <Icon
                    name={pm.toLowerCase().includes('upi') ? 'qr-code' : 'payments'}
                    size={12}
                    color={paymentColor(item.payment_mode)}
                  />
                  <Text style={[s.paymentText, { color: paymentColor(item.payment_mode) }]}>{pm}</Text>
                </View>
                <Text style={[s.orderTotal, { color: t.success }]}>
                  ₹{item.total_amount.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Order detail modal (bottom sheet) ───────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={s.overlay} onPress={() => setModalVisible(false)} />
        {selectedOrder && (
          <View style={[s.modalSheet, { backgroundColor: t.card }]}>
            <View style={[s.dragHandle, { backgroundColor: t.border }]} />

            {/* Modal header */}
            <View style={s.modalHeader}>
              <View>
                <Text style={[s.modalTitle, { color: t.text }]}>Order #{selectedOrder.id}</Text>
                <Text style={[s.modalDate, { color: t.subtext }]}>
                  {format(new Date(selectedOrder.date), 'dd MMM yyyy · hh:mm a')}
                </Text>
              </View>
              <Pressable style={[s.closeBox, { backgroundColor: t.accentSoft }]} onPress={() => setModalVisible(false)}>
                <Icon name="close" size={16} color={t.accent} />
              </Pressable>
            </View>

            {/* Items list */}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {selectedOrder.items?.map(item => (
                <View key={item.id} style={[s.modalItemRow, { borderColor: t.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalItemName, { color: t.text }]} numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <Text style={[s.modalItemQty, { color: t.subtext }]}>×{item.quantity} @ ₹{item.price.toFixed(2)}</Text>
                  </View>
                  <Text style={[s.modalItemTotal, { color: t.accent }]}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Modal footer */}
            <View style={[s.modalFooter, { borderColor: t.border }]}>
              <View style={s.footerRow}>
                <Text style={[s.footerLabel, { color: t.subtext }]}>Payment</Text>
                <View style={[s.paymentPill, { backgroundColor: paymentBg(selectedOrder.payment_mode) }]}>
                  <Text style={[s.paymentText, { color: paymentColor(selectedOrder.payment_mode) }]}>
                    {selectedOrder.payment_mode || 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={s.footerRow}>
                <Text style={[s.footerLabel, { color: t.subtext }]}>Total</Text>
                <Text style={[s.footerTotal, { color: t.success }]}>
                  ₹{selectedOrder.total_amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  errorSub: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 18, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 12,
  },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Stat row
  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 12, borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  statAmount: { fontSize: 15, fontWeight: '800' },

  // Filters
  filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  countText: { fontSize: 12, paddingHorizontal: 14, paddingBottom: 6 },

  // Order cards
  orderCard: {
    borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 6,
  },
  orderIdBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  orderIdText: { fontSize: 12, fontWeight: '800' },
  orderDate: { fontSize: 12 },
  itemPreview: { fontSize: 12, paddingHorizontal: 12, paddingBottom: 8 },
  orderCardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  paymentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  paymentText: { fontSize: 11, fontWeight: '700' },
  orderTotal: { fontSize: 16, fontWeight: '800' },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 6 },

  // Modal
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 34,
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalDate: { fontSize: 12, marginTop: 2 },
  closeBox: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  modalItemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemName: { fontSize: 14, fontWeight: '600' },
  modalItemQty: { fontSize: 12, marginTop: 2 },
  modalItemTotal: { fontSize: 14, fontWeight: '700' },
  modalFooter: {
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 8, gap: 10,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 13, fontWeight: '600' },
  footerTotal: { fontSize: 22, fontWeight: '900' },
});

export default ListOrderScreen;