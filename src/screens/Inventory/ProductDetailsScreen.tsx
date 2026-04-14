import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { productService } from '../../services/productService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Divider } from 'react-native-paper';

// ─── Theme ─────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  warning: '#F59E0B', warningSoft: '#FEF3C7',
  info: '#3B82F6', infoSoft: '#DBEAFE',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  warning: '#FBBF24', warningSoft: '#332701',
  info: '#60A5FA', infoSoft: '#1E3A8A',
};

// ─── Main Component ─────────────────────────────────────────────────────────
const ProductDetailsScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetails'>>();
  const productId = route.params?.productId;

  const [product, setProduct] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Header button ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 14 }}
          onPress={() => (navigation as any).navigate('Add Product', { productId })}
        >
          <Icon name="edit" size={24} color={t.accent} />
        </TouchableOpacity>
      ),
      headerTitle: 'Product Details',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, scheme, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, batchRes, moveRes] = await Promise.all([
        productService.getById(productId!),
        productService.getBatches(productId!),
        productService.getStockMovements(productId!)
      ]);
      setProduct(prodRes.data);
      setBatches(Array.isArray(batchRes.data) ? batchRes.data : []);
      // Pagination handling if applicable
      const movesData = moveRes.data?.results ? moveRes.data.results : moveRes.data;
      setMovements(Array.isArray(movesData) ? movesData : []);
    } catch (err) {
      console.warn('Failed to load product details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    return unsub;
  }, [navigation, productId]);

  if (loading || !product) {
    return (
      <SafeAreaView style={[s.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.accent} />
        <Text style={{ marginTop: 12, color: t.subtext }}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  const stockColor = product.current_stock <= 0 ? t.danger 
                   : product.current_stock <= product.reorder_level ? t.warning 
                   : t.success;

  const renderMovementIcon = (type: str) => {
    switch (type) {
      case 'purchase_in': return <Icon name="login" size={20} color={t.info} />;
      case 'sale_out': return <Icon name="logout" size={20} color={t.success} />;
      case 'adjustment': return <Icon name="tune" size={20} color={t.warning} />;
      case 'initial': return <Icon name="fiber-new" size={20} color={t.accent} />;
      default: return <Icon name="sync-alt" size={20} color={t.subtext} />;
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={s.scrollContent}>
        
        {/* Header Summary */}
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
          <View style={s.cardHeader}>
             <Text style={[s.catLabel, { color: t.subtext }]}>{product.category_name}</Text>
             <View style={[s.badge, { backgroundColor: stockColor + '20' }]}>
               <Text style={[s.badgeText, { color: stockColor }]}>Stock: {product.current_stock}</Text>
             </View>
          </View>
          <Text style={[s.productName, { color: t.text }]}>{product.name}</Text>
          
          <View style={s.pricingRow}>
            <View>
              <Text style={[s.infoLabel, { color: t.subtext }]}>Selling Price</Text>
              <Text style={[s.infoValue, { color: t.success }]}>₹{product.price}</Text>
            </View>
            <View>
              <Text style={[s.infoLabel, { color: t.subtext }]}>Purchase Price</Text>
              <Text style={[s.infoValue, { color: t.text }]}>₹{product.purchase_price || '--'}</Text>
            </View>
            <View>
              <Text style={[s.infoLabel, { color: t.subtext }]}>MRP</Text>
              <Text style={[s.infoValue, { color: t.text }]}>₹{product.mrp || '--'}</Text>
            </View>
          </View>

          <View style={s.metaWrap}>
            {product.sku ? <Text style={[s.metaText, { color: t.subtext }]}><Icon name="label" size={14}/> {product.sku}</Text> : null}
            {product.barcode ? <Text style={[s.metaText, { color: t.subtext }]}><Icon name="qr-code" size={14}/> {product.barcode}</Text> : null}
            {product.batch_managed ? <Text style={[s.metaText, { color: t.accent }]}><Icon name="inventory-2" size={14}/> Batch Managed</Text> : null}
            {product.track_expiry ? <Text style={[s.metaText, { color: t.warning }]}><Icon name="event-busy" size={14}/> Expiry Tracked</Text> : null}
          </View>
        </Surface>

        {/* Expiry Warning Banner */}
        {batches.some((b: any) => {
          if (!b.expiry_date) return false;
          const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return daysLeft <= 30 && b.current_quantity > 0;
        }) && (
          <Surface style={[s.card, { backgroundColor: t.dangerSoft, borderColor: t.danger }]} elevation={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="warning" size={20} color={t.danger} />
              <Text style={{ color: t.danger, fontWeight: 'bold', marginLeft: 8, fontSize: 14 }}>
                Expiry Alert
              </Text>
            </View>
            <Text style={{ color: t.danger, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
              One or more batches of this product are expiring within 30 days. Review the batch list below and consider markdowns or write-offs.
            </Text>
          </Surface>
        )}

        {/* Active Batches */}
        {(product.batch_managed || batches.length > 0) && (
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
             <Text style={[s.sectionTitle, { color: t.text }]}>Active Batches</Text>
             {batches.length === 0 ? (
               <Text style={{ color: t.subtext, fontSize: 13 }}>No active batches found.</Text>
             ) : (
               batches.map((b: any, i: number) => {
                 const daysLeft = b.expiry_date ? Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                 const expiryColor = daysLeft !== null && daysLeft <= 0 ? t.danger : (daysLeft !== null && daysLeft <= 30 ? t.warning : t.subtext);
                 const isExpired = daysLeft !== null && daysLeft <= 0;
                 return (
                   <View key={b.id} style={[s.batchRow, i !== 0 && { borderTopWidth: 1, borderTopColor: t.border }, isExpired && { opacity: 0.5 }]}>
                     <View>
                       <Text style={[s.batchNum, { color: t.text }]}>{b.batch_number || 'Auto-Batch'}</Text>
                       {b.expiry_date && (
                         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                           <Icon name={isExpired ? 'dangerous' : 'event'} size={12} color={expiryColor} />
                           <Text style={{ color: expiryColor, fontSize: 11, fontWeight: '600' }}>
                             {isExpired ? 'EXPIRED' : `Exp: ${b.expiry_date}`}{daysLeft !== null && daysLeft > 0 ? ` (${daysLeft}d)` : ''}
                           </Text>
                         </View>
                       )}
                     </View>
                     <View style={{ alignItems: 'flex-end' }}>
                       <Text style={[s.batchQty, { color: t.text }]}>Qty: {b.current_quantity}</Text>
                       <Text style={{ color: t.success, fontSize: 11 }}>Cost: ₹{b.purchase_price}</Text>
                     </View>
                   </View>
                 );
               })
             )}
          </Surface>
        )}

        {/* Stock Movements */}
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border, marginBottom: 40 }]} elevation={1}>
           <Text style={[s.sectionTitle, { color: t.text }]}>Recent Stock Movements</Text>
           {movements.length === 0 ? (
             <Text style={{ color: t.subtext, fontSize: 13 }}>No movements recorded.</Text>
           ) : (
             movements.slice(0, 15).map((m: any, i: number) => (
               <View key={m.id} style={[s.moveRow, i !== 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                 <View style={s.moveIconWrap}>
                   {renderMovementIcon(m.movement_type)}
                 </View>
                 <View style={{ flex: 1 }}>
                   <Text style={[s.moveTitle, { color: t.text }]}>
                     {m.movement_type.replace('_', ' ').toUpperCase()}
                   </Text>
                   <Text style={[s.moveDate, { color: t.subtext }]}>
                     {new Date(m.created_at).toLocaleString()}
                   </Text>
                   {m.notes ? <Text style={[s.moveNotes, { color: t.subtext }]}>{m.notes}</Text> : null}
                 </View>
                 <View>
                   <Text style={[
                     s.moveQty, 
                     { color: m.quantity_delta > 0 ? t.success : (m.quantity_delta < 0 ? t.danger : t.subtext) }
                   ]}>
                     {m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta}
                   </Text>
                 </View>
               </View>
             ))
           )}
        </Surface>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 14 },
  
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  
  productName: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  infoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700' },
  
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaText: { fontSize: 13, fontWeight: '600' },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  
  batchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  batchNum: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  batchQty: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  
  moveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  moveIconWrap: { width: 40, alignItems: 'flex-start' },
  moveTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  moveDate: { fontSize: 11 },
  moveNotes: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  moveQty: { fontSize: 16, fontWeight: '800' },
});

export default ProductDetailsScreen;
