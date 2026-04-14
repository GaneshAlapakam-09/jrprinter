import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { Searchbar, Surface, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { customerService } from '../../services/customerService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2',
  success: '#059669', successSoft: '#ECFDF5',
  input: '#F9FAFB'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515',
  success: '#34D399', successSoft: '#0D2A1E',
  input: '#2D2B42'
};

const CustomerListScreen = () => {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDue, setFilterDue] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => (navigation as any).openDrawer()}>
          <Icon name="menu" size={28} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Customers',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 14 }} onPress={() => (navigation as any).navigate('AddCustomer' as any)}>
          <Icon name="person-add" size={26} color={t.accent} />
        </TouchableOpacity>
      )
    });
  }, [navigation, t]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers();
      const data = res.data?.results || res.data || [];
      setCustomers(Array.isArray(data) ? data.sort((a,b) => a.name.localeCompare(b.name)) : []);
    } catch (err) {
      console.warn('Failed to load customers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  const filteredData = customers.filter(c => {
    const matchesSearch = !searchQuery || 
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.phone || '').includes(searchQuery);
    
    // In our backend models, 'credit_balance' > 0 implies customer owes us logic, but usually credit balance means we owe them or they owe us. 
    // Wait, in POS, credit balance > 0 usually means they have outstanding debt.
    const isDue = parseFloat(c.credit_balance) > 0;
    const matchesDue = !filterDue || isDue;
    
    return matchesSearch && matchesDue;
  });

  const renderItem = ({ item }: { item: any }) => {
    const bal = parseFloat(item.credit_balance) || 0;
    
    return (
      <TouchableOpacity 
        onPress={() => (navigation as any).navigate('CustomerDetails' as any, { customerId: item.id })}
        activeOpacity={0.7}
      >
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
          <View style={s.cardHeader}>
             <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
               <View style={[s.avatar, { backgroundColor: t.accentSoft }]}>
                 <Text style={{ color: t.accent, fontSize: 18, fontWeight: '800' }}>
                   {item.name.charAt(0).toUpperCase()}
                 </Text>
               </View>
               <View style={{ marginLeft: 12, flex: 1 }}>
                 <Text style={[s.nameText, { color: t.text }]} numberOfLines={1}>{item.name}</Text>
                 <Text style={[s.phoneText, { color: item.phone ? t.subtext : t.dangerSoft }]}>
                   <Icon name="phone" size={12}/> {item.phone || 'No Phone'}
                 </Text>
               </View>
             </View>
             
             <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
               <Text style={[s.balLabel, { color: t.subtext }]}>{bal > 0 ? 'DUE' : 'BALANCE'}</Text>
               <Text style={[s.balAmount, { color: bal > 0 ? t.danger : t.success }]}>
                 ₹{Math.abs(bal).toFixed(2)}
               </Text>
             </View>
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={s.searchWrap}>
        <Searchbar
           placeholder="Search Name or Phone..."
           onChangeText={setSearchQuery}
           value={searchQuery}
           style={[s.searchbar, { backgroundColor: t.input, borderColor: t.border }]}
           inputStyle={{ color: t.text, padding: 0 }}
           iconColor={t.subtext}
           placeholderTextColor={t.subtext}
           elevation={0}
        />
        <View style={s.filterRow}>
           <Chip
             selected={filterDue}
             onPress={() => setFilterDue(!filterDue)}
             style={[s.chip, filterDue ? { backgroundColor: t.accent } : { backgroundColor: t.card, borderColor: t.border }]}
             textStyle={[s.chipText, { color: filterDue ? '#FFF' : t.text }]}
             mode="outlined"
           >
             Show Due Only
           </Chip>
        </View>
      </View>
      
      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={t.accent} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadData(); }}
          ListEmptyComponent={
             <View style={s.empty}>
               <Icon name="groups" size={64} color={t.border} />
               <Text style={{ marginTop: 16, fontSize: 16, color: t.subtext }}>No customers found.</Text>
             </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: 14, paddingBottom: 0 },
  searchbar: { height: 46, borderRadius: 12, borderWidth: 1 },
  filterRow: { flexDirection: 'row', marginTop: 12, marginBottom: 4 },
  chip: { borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 14, paddingBottom: 30 },
  
  card: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  nameText: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  phoneText: { fontSize: 13 },
  
  balLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  balAmount: { fontSize: 16, fontWeight: '800' },
  
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 }
});

export default CustomerListScreen;
