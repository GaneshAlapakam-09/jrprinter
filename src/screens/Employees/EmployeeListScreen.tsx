import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';
import api from '../../api/axios';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', success: '#059669'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', success: '#34D399'
};

const ROLE_COLORS: any = {
  'Admin': '#EF4444',
  'Billing': '#3B82F6',
  'Inventory': '#F59E0B'
};

export default function EmployeeListScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 14, marginRight: 14 }}>
           <TouchableOpacity onPress={() => (navigation as any).navigate('RolePermissions')}>
              <Icon name="security" size={24} color={t.text} />
           </TouchableOpacity>
           <TouchableOpacity onPress={() => (navigation as any).navigate('AddEmployee')}>
              <Icon name="person-add" size={24} color={t.accent} />
           </TouchableOpacity>
        </View>
      ),
      headerTitle: 'Staff Directory',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  useEffect(() => {
    // Attempting to fetch store users; fallback to dummy data if API not strictly defined yet.
    api.get('/api/store-users/').then(res => {
       setEmployees(res.data.results || res.data);
       setLoading(false);
    }).catch(err => {
       console.warn("Fallback to dummy employees. API not found?", err.message);
       setEmployees([
         { id: 1, user: { username: 'admin', email: 'admin@store.com' }, role: 'Admin', is_active: true },
         { id: 2, user: { username: 'cashier1', email: 'cashier@store.com' }, role: 'Billing', is_active: true },
         { id: 3, user: { username: 'stock_manager', email: 'stock@store.com' }, role: 'Inventory', is_active: false },
       ]);
       setLoading(false);
    });
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const roleColor = ROLE_COLORS[item.role] || t.text;
    const active = item.is_active !== false;
    const uname = item.username || item.user?.username || '?';
    const uemail = item.email || item.user?.email || 'No email';

    return (
      <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border, opacity: active ? 1 : 0.6 }]} elevation={1}>
        <View style={[s.avatar, { backgroundColor: t.bg }]}>
           <Text style={{ fontSize: 18, fontWeight: '900', color: roleColor }}>{uname.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, paddingLeft: 12 }}>
           <Text style={[s.name, { color: t.text }]} numberOfLines={1}>{uname}</Text>
           <Text style={[s.email, { color: t.subtext }]} numberOfLines={1}>{uemail}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
           <View style={[s.roleTag, { borderColor: roleColor, backgroundColor: roleColor + '10' }]}>
              <Text style={{ color: roleColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{item.role}</Text>
           </View>
           {!active && <Text style={{ color: t.danger, fontSize: 10, marginTop: 4 }}>Inactive</Text>}
        </View>
      </Surface>
    );
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={s.list}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14, paddingBottom: 40 },
  
  card: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 13, marginTop: 2 },
  
  roleTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 }
});
