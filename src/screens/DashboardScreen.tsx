import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  useColorScheme,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DataTable, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// ─── Types ────────────────────────────────────────────────────────────────────
type SalesData = {
  labels: string[];
  datasets: { data: number[] }[];
};

type ItemSales = {
  item: string;
  total_sales: number;
  amount: number;
};

type ItemHourlySales = {
  labels: string[];
  datasets: { data: number[] }[];
};

// ─── Theme ───────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const ACCENT_LIGHT = '#8B5CF6';
const ACCENT_SOFT = '#EDE9FE';

const light = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1F1F2E',
  subtext: '#6B7280',
  accent: ACCENT,
  accentLight: ACCENT_LIGHT,
  accentSoft: ACCENT_SOFT,
  chartBg: '#FFFFFF',
  chartLabel: '#374151',
  tableBg: '#FFFFFF',
  tableHeaderBg: '#F9FAFB',
  tableRowAlt: '#F5F3FF',
  shadow: '#000',
  pill: '#EDE9FE',
  pillText: ACCENT,
  inputBg: '#F3F4F6',
  modalBg: '#FFFFFF',
  noDataIcon: '#D1D5DB',
};

const dark = {
  bg: '#0F0D1A',
  card: '#1C1A2E',
  border: '#2D2B42',
  text: '#F3F0FF',
  subtext: '#9CA3AF',
  accent: ACCENT_LIGHT,
  accentLight: '#A78BFA',
  accentSoft: '#2D1F5E',
  chartBg: '#1C1A2E',
  chartLabel: '#D1D5DB',
  tableBg: '#1C1A2E',
  tableHeaderBg: '#13112A',
  tableRowAlt: '#221F38',
  shadow: '#000',
  pill: '#2D1F5E',
  pillText: '#A78BFA',
  inputBg: '#2D2B42',
  modalBg: '#1C1A2E',
  noDataIcon: '#4B5563',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
import { BASE_URL } from '../api/axios';
const { width: SCREEN_W } = Dimensions.get('window');

const formatINR = (val: number) =>
  `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  title,
  theme,
}: {
  icon: string;
  title: string;
  theme: typeof light;
}) => (
  <View style={sectionHeaderStyles.row}>
    <View style={[sectionHeaderStyles.iconBox, { backgroundColor: theme.accentSoft }]}>
      <Icon name={icon} size={18} color={theme.accent} />
    </View>
    <Text style={[sectionHeaderStyles.title, { color: theme.text }]}>{title}</Text>
  </View>
);

const sectionHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});

const EmptyState = ({ icon, message, theme }: { icon: string; message: string; theme: typeof light }) => (
  <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 36 }}>
    <Icon name={icon} size={38} color={theme.noDataIcon} />
    <Text style={{ color: theme.subtext, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
      {message}
    </Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const DashboardScreen = () => {
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
      headerTitle: 'Dashboard',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerShown: true,
    });
  }, [navigation, t.text, t.card]);

  const [todayData, setTodayData] = useState<SalesData | null>(null);
  const [monthData, setMonthData] = useState<SalesData | null>(null);
  const [yearData, setYearData] = useState<SalesData | null>(null);
  const [itemSales, setItemSales] = useState<ItemSales[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemHourlyData, setItemHourlyData] = useState<ItemHourlySales | null>(null);
  const [itemLoading, setItemLoading] = useState(false);

  const todayRef = React.useRef<ScrollView>(null);
  const monthRef = React.useRef<ScrollView>(null);
  const yearRef = React.useRef<ScrollView>(null);

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [todayRes, monthRes, yearRes, itemRes] = await Promise.all([
        fetch(`${BASE_URL}/api/sales/today/`),
        fetch(`${BASE_URL}/api/sales/this-month/`),
        fetch(`${BASE_URL}/api/sales/this-year/`),
        fetch(`${BASE_URL}/api/yesterday-sales/`),
      ]);
      if (!todayRes.ok || !monthRes.ok || !yearRes.ok || !itemRes.ok)
        throw new Error('Failed to fetch data');

      const [todayJson, monthJson, yearJson, itemJson] = await Promise.all([
        todayRes.json(), monthRes.json(), yearRes.json(), itemRes.json(),
      ]);

      setTodayData(todayJson.labels?.length ? processTodayData(todayJson) : todayJson);
      setMonthData(monthJson);
      setYearData(yearJson.labels?.length ? processYearData(yearJson) : yearJson);
      setItemSales(itemJson);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchItemHourlyData = async (itemName: string) => {
    try {
      setItemLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/sales/item-hourly/${encodeURIComponent(itemName)}/`
      );
      if (!res.ok) throw new Error('Failed to fetch item data');
      const data = await res.json();
      setItemHourlyData(
        data.labels?.length
          ? { labels: data.labels, datasets: [{ data: data.datasets[1].data }] }
          : null
      );
    } catch {
      setItemHourlyData(null);
    } finally {
      setItemLoading(false);
    }
  };

  const processTodayData = (data: SalesData): SalesData => ({
    labels: data.labels.map((l, i) =>
      i < data.labels.length - 1 ? `${l}-${data.labels[i + 1]}` : l
    ),
    datasets: data.datasets,
  });

  const processYearData = (data: SalesData): SalesData => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { labels: data.labels.map(l => names[parseInt(l) - 1] || l), datasets: data.datasets };
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (todayData?.labels?.length) {
      setTimeout(() => todayRef.current?.scrollTo({ x: todayData.labels.length * 50, animated: false }), 100);
    }
  }, [todayData]);
  useEffect(() => {
    if (monthData?.labels?.length) {
      setTimeout(() => monthRef.current?.scrollTo({ x: monthData.labels.length * 40, animated: false }), 100);
    }
  }, [monthData]);
  useEffect(() => {
    if (yearData?.labels?.length) {
      setTimeout(() => yearRef.current?.scrollTo({ x: yearData.labels.length * 60, animated: false }), 100);
    }
  }, [yearData]);

  const isEmpty = (data: SalesData | null) =>
    !data || !data.labels?.length || !data.datasets?.[0]?.data?.length;

  const getPeakHour = () => {
    if (!itemHourlyData?.datasets[0]?.data.length) return 'N/A';
    const max = Math.max(...itemHourlyData.datasets[0].data);
    return itemHourlyData.labels[itemHourlyData.datasets[0].data.indexOf(max)] || 'N/A';
  };

  const getTotalRevenue = () =>
    itemHourlyData?.datasets[0]?.data.reduce((s, v) => s + v, 0) ?? 0;

  // ─── Chart config ───────────────────────────────────────────────────────────
  const chartConfig = {
    backgroundGradientFrom: t.chartBg,
    backgroundGradientTo: t.chartBg,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: (opacity = 1) =>
      scheme === 'dark'
        ? `rgba(209, 213, 219, ${opacity})`
        : `rgba(55, 65, 81, ${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: ACCENT },
    propsForLabels: { fontSize: 10 },
    fillShadowGradient: ACCENT,
    fillShadowGradientOpacity: 0.15,
    style: { borderRadius: 14 },
  };

  // ─── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={[styles.loadingCard, { backgroundColor: t.card }]}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingText, { color: t.accent }]}>
            Loading Dashboard…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: t.bg }]}>
        <View style={[styles.errorCard, { backgroundColor: t.card }]}>
          <Icon name="wifi-off" size={44} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: t.text }]}>Something went wrong</Text>
          <Text style={[styles.errorSub, { color: t.subtext }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: t.accent }]}
            onPress={fetchData}
          >
            <Icon name="refresh" size={18} color="#FFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: t.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            colors={[t.accent]}
            tintColor={t.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageSubtitle, { color: t.subtext }]}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshPill, { backgroundColor: t.accentSoft }]}
            onPress={() => { setRefreshing(true); fetchData(); }}
          >
            <Icon name="refresh" size={16} color={t.accent} />
          </TouchableOpacity>
        </View>

        {/* ── Today's Hourly Sales ── */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <SectionHeader icon="schedule" title="Today's Hourly Sales" theme={t} />
          {!isEmpty(todayData) ? (
            <ScrollView
              ref={todayRef}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <LineChart
                data={todayData!}
                width={Math.max(SCREEN_W - 48, todayData!.labels.length * 52)}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withVerticalLines={false}
                withHorizontalLines
                segments={4}
                fromZero
              />
            </ScrollView>
          ) : (
            <EmptyState icon="hourglass-empty" message="No sales recorded today yet" theme={t} />
          )}
        </View>

        {/* ── Yesterday's Item Sales ── */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <SectionHeader icon="bar-chart" title="Yesterday's Item Sales" theme={t} />
          {itemSales.length > 0 ? (
            <DataTable>
              <DataTable.Header style={{ backgroundColor: t.tableHeaderBg }}>
                <DataTable.Title textStyle={{ color: t.subtext, fontSize: 12, fontWeight: '700' }}>
                  Item
                </DataTable.Title>
                <DataTable.Title numeric textStyle={{ color: t.subtext, fontSize: 12, fontWeight: '700' }}>
                  Qty
                </DataTable.Title>
                <DataTable.Title numeric textStyle={{ color: t.subtext, fontSize: 12, fontWeight: '700' }}>
                  Amount
                </DataTable.Title>
              </DataTable.Header>

              {itemSales.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setSelectedItem(item.item);
                    setModalVisible(true);
                    fetchItemHourlyData(item.item);
                  }}
                  activeOpacity={0.7}
                >
                  <DataTable.Row
                    style={{
                      backgroundColor: i % 2 === 0 ? t.card : t.tableRowAlt,
                      borderBottomColor: t.border,
                    }}
                  >
                    <DataTable.Cell>
                      <Text style={{ color: t.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                        {item.item}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <View style={[styles.badge, { backgroundColor: t.accentSoft }]}>
                        <Text style={{ color: t.accent, fontSize: 11, fontWeight: '700' }}>
                          {item.total_sales}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>
                        ₹{item.amount.toFixed(0)}
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                </TouchableOpacity>
              ))}
            </DataTable>
          ) : (
            <EmptyState icon="receipt-long" message="No item sales data for yesterday" theme={t} />
          )}
          {itemSales.length > 0 && (
            <Text style={[styles.tapHint, { color: t.subtext }]}>
              ↑ Tap any row to view hourly breakdown
            </Text>
          )}
        </View>

        {/* ── Monthly Daily Sales ── */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <SectionHeader icon="calendar-today" title="This Month — Daily Sales" theme={t} />
          {!isEmpty(monthData) ? (
            <ScrollView ref={monthRef} horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={monthData!}
                width={Math.max(SCREEN_W - 48, monthData!.labels.length * 42)}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withVerticalLines={false}
                withHorizontalLines
                segments={4}
                fromZero
              />
            </ScrollView>
          ) : (
            <EmptyState icon="event-busy" message="No monthly sales data available" theme={t} />
          )}
        </View>

        {/* ── Yearly Monthly Sales ── */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <SectionHeader icon="date-range" title="This Year — Monthly Sales" theme={t} />
          {!isEmpty(yearData) ? (
            <ScrollView ref={yearRef} horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={yearData!}
                width={Math.max(SCREEN_W - 48, yearData!.labels.length * 62)}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withVerticalLines={false}
                withHorizontalLines
                segments={4}
                fromZero
              />
            </ScrollView>
          ) : (
            <EmptyState icon="insert-chart-outlined" message="No yearly sales data available" theme={t} />
          )}
        </View>

        {/* ── Contact Support ── */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <SectionHeader icon="support-agent" title="Contact Support" theme={t} />
          <TouchableOpacity
            style={[styles.contactRow, { borderColor: t.border }]}
            onPress={() => Linking.openURL('mailto:project.jrtechnologies@gmail.com')}
          >
            <View style={[styles.contactIcon, { backgroundColor: t.accentSoft }]}>
              <Icon name="email" size={16} color={t.accent} />
            </View>
            <Text style={[styles.contactText, { color: t.text }]}>
              project.jrtechnologies@gmail.com
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactRow, { borderColor: t.border, borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL('tel:+919600332679')}
          >
            <View style={[styles.contactIcon, { backgroundColor: t.accentSoft }]}>
              <Icon name="phone" size={16} color={t.accent} />
            </View>
            <Text style={[styles.contactText, { color: t.text }]}>+91 96003 32679</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerTime, { color: t.subtext }]}>
            Last updated: {new Date().toLocaleTimeString('en-IN')}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('http://www.jrtechnologiesindia.com/')}>
            <Text style={[styles.footerBrand, { color: t.accent }]}>
              Developed by JR Technologies
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Item Hourly Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        />
        <View style={[styles.modalSheet, { backgroundColor: t.modalBg }]}>
          {/* drag handle */}
          <View style={[styles.dragHandle, { backgroundColor: t.border }]} />

          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: t.text }]} numberOfLines={1}>
                {selectedItem}
              </Text>
              <Text style={[styles.modalSub, { color: t.subtext }]}>
                Yesterday's hourly revenue
              </Text>
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: t.accentSoft }]}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={18} color={t.accent} />
            </Pressable>
          </View>

          {itemLoading ? (
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          ) : itemHourlyData ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={itemHourlyData}
                  width={Math.max(SCREEN_W - 40, itemHourlyData.labels.length * 62)}
                  height={210}
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  bezier
                  style={styles.modalChart}
                  withVerticalLines={false}
                  withHorizontalLines
                  segments={4}
                  fromZero
                />
              </ScrollView>

              {/* Stat pills */}
              <View style={styles.statRow}>
                <View style={[styles.statPill, { backgroundColor: t.accentSoft }]}>
                  <Text style={[styles.statLabel, { color: t.subtext }]}>Peak Hour</Text>
                  <Text style={[styles.statValue, { color: t.accent }]}>{getPeakHour()}</Text>
                </View>
                <View style={[styles.statPill, { backgroundColor: t.accentSoft }]}>
                  <Text style={[styles.statLabel, { color: t.subtext }]}>Total Revenue</Text>
                  <Text style={[styles.statValue, { color: t.accent }]}>
                    {formatINR(getTotalRevenue())}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <EmptyState icon="hourglass-empty" message="No hourly data available for this item" theme={t} />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingCard: {
    alignItems: 'center', padding: 32, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  loadingText: { marginTop: 14, fontSize: 15, fontWeight: '600' },
  errorCard: {
    alignItems: 'center', padding: 32, borderRadius: 20, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  errorSub: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20,
    paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12,
  },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },

  // Page header
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, marginTop: 8,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, marginTop: 2 },
  refreshPill: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },

  // Card
  card: {
    borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8, elevation: 2,
  },

  // Chart
  chart: { borderRadius: 12, marginLeft: -8 },

  // Table badges
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tapHint: { fontSize: 11, textAlign: 'right', marginTop: 10, fontStyle: 'italic' },

  // Contact
  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactIcon: {
    width: 32, height: 32, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  contactText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Footer
  footer: { alignItems: 'center', paddingTop: 8, paddingBottom: 8 },
  footerTime: { fontSize: 11, marginBottom: 4 },
  footerBrand: { fontSize: 12, fontWeight: '700' },

  // Modal
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
    maxHeight: '78%',
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },
  modalLoader: { height: 210, justifyContent: 'center', alignItems: 'center' },
  modalChart: { borderRadius: 12, marginLeft: -8 },

  // Stat pills in modal
  statRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statPill: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '800' },
});

export default DashboardScreen;