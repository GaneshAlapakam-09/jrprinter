import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { productService } from '../../services/productService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';

// ─── Theme ─────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  warning: '#F59E0B', warningSoft: '#FEF3C7',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  warning: '#FBBF24', warningSoft: '#332701',
};

const LowStockScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => (navigation as any).openDrawer()}>
          <Icon name="menu" size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Low Stock Alerts',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      // We pass low_stock=true, our backend should return products where current_stock <= reorder_level
      // Wait, in productService we only have getAll() without params.
      // We'll need to pass params to getAll or use a direct axios call here.
      // Actually, since productService.getAll doesn't accept params yet, let's use the direct API here for simplicity or update productService.
      const res = await productService.getAll();
      const allProds = res.data?.results ? res.data.results : res.data;
      
      // Since productService getAll doesn't bubble up params by default, 
      // let's do a client-side filter just in case the backend annotation doesn't trigger if param isn't sent.
      // Actually we will fetch manually or rely on local filter.
      // A client side filter logic:
      const lowStockItems = Array.isArray(allProds) 
            ? allProds.filter(p => p.reorder_level > 0 && (p.current_stock || 0) <= p.reorder_level)
            : [];
            
      setProducts(lowStockItems.sort((a,b) => (a.current_stock || 0) - (b.current_stock || 0)));
    } catch (err) {
      console.warn('Failed to load low stock products', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const renderItem = ({ item }: { item: any }) => {
    const stockQty = item.current_stock || 0;
    const isOos = stockQty <= 0;
    const alertColor = isOos ? t.danger : t.warning;
    const alertBg = isOos ? t.dangerSoft : t.warningSoft;

    return (
      <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
        <View style={s.cardHeader}>
          <Text style={[s.catText, { color: t.subtext }]}>{item.category_name || 'Uncategorized'}</Text>
          <View style={[s.badge, { backgroundColor: alertBg }]}>
             <Icon name={isOos ? 'error' : 'warning'} size={14} color={alertColor} style={{ marginRight: 4 }}/>
             <Text style={[s.badgeText, { color: alertColor }]}>
               {isOos ? 'Out of Stock' : 'Low Stock'}
             </Text>
          </View>
        </View>

        <Text style={[s.nameText, { color: t.text }]}>{item.name}</Text>
        
        <View style={s.statsRow}>
          <View style={s.statBox}>
             <Text style={[s.statLabel, { color: t.subtext }]}>Current Stock</Text>
             <Text style={[s.statVal, { color: alertColor, fontSize: 18 }]}>{stockQty}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.statBox}>
             <Text style={[s.statLabel, { color: t.subtext }]}>Reorder Level</Text>
             <Text style={[s.statVal, { color: t.text }]}>{item.reorder_level}</Text>
          </View>
        </View>

        <View style={s.actions}>
           <TouchableOpacity 
             style={[s.btn, { backgroundColor: t.accentSoft }]}
             onPress={() => (navigation as any).navigate('ProductDetails', { productId: item.id })}
           >
             <Icon name="visibility" size={16} color={t.accent} />
             <Text style={[s.btnText, { color: t.accent }]}>View Details</Text>
           </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[s.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <FlatList
        data={products}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        renderItem={renderItem}
        onRefresh={() => { setRefreshing(true); loadData(); }}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={s.empty}>
             <Icon name="check-circle-outline" size={48} color={t.subtext} style={{ marginBottom: 16 }} />
             <Text style={{ color: t.subtext, fontSize: 16 }}>Inventory looks good!</Text>
             <Text style={{ color: t.subtext, fontSize: 13, marginTop: 4 }}>No low stock alerts right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14, paddingBottom: 40 },
  
  card: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  nameText: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 10, padding: 12, marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: '80%', backgroundColor: '#D1D5DB' },
  statLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  statVal: { fontSize: 16, fontWeight: '800' },

  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnText: { fontSize: 13, fontWeight: '700' },

  empty: { paddingVertical: 60, alignItems: 'center' }
});

export default LowStockScreen;
