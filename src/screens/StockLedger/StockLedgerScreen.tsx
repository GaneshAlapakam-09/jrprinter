import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { inventoryService } from '../../services/inventoryService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Chip } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  warning: '#F59E0B', warningSoft: '#FEF3C7',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  warning: '#FBBF24', warningSoft: '#332701',
};

const MOVE_PROPS: any = {
  'purchase_in': { icon: 'input', color: 'success', label: 'Purchase In' },
  'sale_out': { icon: 'outbox', color: 'danger', label: 'Sale Out' },
  'adjustment_add': { icon: 'add-circle-outline', color: 'success', label: 'Adj Add' },
  'adjustment_reduce': { icon: 'remove-circle-outline', color: 'danger', label: 'Adj Reduce' },
  'damage': { icon: 'broken-image', color: 'warning', label: 'Damage' },
  'expiry_writeoff': { icon: 'event-busy', color: 'warning', label: 'Expiry Write-off' },
  'return_in': { icon: 'keyboard-return', color: 'success', label: 'Return In' },
  'return_out': { icon: 'keyboard-return', color: 'danger', label: 'Return Out' },
};

export default function StockLedgerScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 14 }} onPress={() => (navigation as any).navigate('StockAdjustment')}>
          <Icon name="add" size={24} color={t.accent} />
        </TouchableOpacity>
      ),
      headerTitle: 'Stock Ledger',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getStockMovements();
      let data = res.data.results || res.data || [];
      // Sort desc date natively if needed, backend should return ordered though.
      // Temporary filtering logic
      if (filterType) {
         if (filterType === 'in') data = data.filter((d: any) => parseFloat(d.quantity_delta) > 0);
         if (filterType === 'out') data = data.filter((d: any) => parseFloat(d.quantity_delta) < 0);
      }
      setMovements(data);
    } catch (e) {
      console.warn("Failed loading stock movements", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMovements(); }, [filterType]);

  const renderItem = ({ item }: { item: any }) => {
    const props = MOVE_PROPS[item.movement_type] || { icon: 'swap-horiz', color: 'text', label: item.movement_type };
    const colorKey = props.color as keyof typeof t;
    const isOut = parseFloat(item.quantity_delta) < 0;
    const displayColor = isOut ? t.danger : t.success;
    
    return (
      <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
        <View style={[s.iconBox, { backgroundColor: (t as any)[colorKey + 'Soft'] || t.accentSoft }]}>
           <Icon name={props.icon} size={20} color={(t as any)[colorKey] || t.text} />
        </View>
        <View style={{ flex: 1, paddingLeft: 12 }}>
           <Text style={[s.prodName, { color: t.text }]} numberOfLines={1}>Product #{item.product}</Text>
           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={[s.typeTag, { backgroundColor: t.bg }]}><Text style={{ color: t.subtext, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{props.label}</Text></View>
              {item.reference_id ? <Text style={{ color: t.subtext, fontSize: 11, marginLeft: 8 }}>Ref: {item.reference_id}</Text> : null}
           </View>
           <Text style={{ color: t.subtext, fontSize: 11, marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
           <Text style={{ fontSize: 18, fontWeight: '900', color: displayColor }}>
              {isOut ? '' : '+'}{item.quantity_delta}
           </Text>
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[s.filterScroll, { backgroundColor: t.card, borderBottomColor: t.border }]}>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}>
            <Chip selected={filterType === null} onPress={() => setFilterType(null)} style={{ backgroundColor: filterType === null ? t.accent : t.bg }}>
               <Text style={{ color: filterType === null ? '#FFF' : t.text }}>All</Text>
            </Chip>
            <Chip selected={filterType === 'in'} onPress={() => setFilterType('in')} style={{ backgroundColor: filterType === 'in' ? t.success : t.bg }}>
               <Text style={{ color: filterType === 'in' ? '#FFF' : t.text }}>Inwards</Text>
            </Chip>
            <Chip selected={filterType === 'out'} onPress={() => setFilterType('out')} style={{ backgroundColor: filterType === 'out' ? t.danger : t.bg }}>
               <Text style={{ color: filterType === 'out' ? '#FFF' : t.text }}>Outwards</Text>
            </Chip>
         </ScrollView>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="history" size={48} color={t.subtext} />
              <Text style={{ color: t.subtext, marginTop: 16 }}>No stock movements recorded.</Text>
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
  filterScroll: { paddingVertical: 12, borderBottomWidth: 1 },
  list: { padding: 14, paddingBottom: 40 },
  
  card: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  prodName: { fontSize: 15, fontWeight: 'bold' },
  typeTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(150,150,150,0.2)' },
  
  empty: { padding: 40, alignItems: 'center' }
});
