import React, { useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6'
};

const PERMISSIONS = [
  { module: 'Billing (POS)', roles: ['Admin', 'Billing'] },
  { module: 'Sales Dashboard', roles: ['Admin'] },
  { module: 'Customer Ledger', roles: ['Admin', 'Billing'] },
  { module: 'Product Master', roles: ['Admin', 'Inventory'] },
  { module: 'Purchasing & Receiving', roles: ['Admin', 'Inventory'] },
  { module: 'Supplier Credit/Payments', roles: ['Admin'] },
  { module: 'Store Settings', roles: ['Admin'] },
  { module: 'Employee Management', roles: ['Admin'] },
  { module: 'Profit & Loss Reports', roles: ['Admin'] }
];

export default function RolePermissionsScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Access Matrix',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
        
        <Text style={[s.infoText, { color: t.subtext }]}>
           This matrix outlines the capabilities granted to each operational role within your store profile.
        </Text>

        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           {/* Header Row */}
           <View style={[s.row, { borderBottomColor: t.border, paddingBottom: 10, marginTop: 4 }]}>
              <Text style={[s.th, { color: t.text, flex: 2 }]}>Module</Text>
              <Text style={[s.th, { color: t.text, flex: 1, textAlign: 'center' }]}>ADM</Text>
              <Text style={[s.th, { color: t.text, flex: 1, textAlign: 'center' }]}>BIL</Text>
              <Text style={[s.th, { color: t.text, flex: 1, textAlign: 'center' }]}>INV</Text>
           </View>

           {/* Permission Rows */}
           {PERMISSIONS.map((perm, idx) => {
              const isAdmin = perm.roles.includes('Admin');
              const isBilling = perm.roles.includes('Billing');
              const isInv = perm.roles.includes('Inventory');

              return (
                 <View key={idx} style={[s.row, { borderBottomColor: t.border }]}>
                    <Text style={[s.td, { color: t.text, flex: 2 }]} numberOfLines={2}>{perm.module}</Text>
                    <View style={s.checkCell}>
                       <Icon name={isAdmin ? "check-circle" : "cancel"} size={18} color={isAdmin ? "#10B981" : t.border} />
                    </View>
                    <View style={s.checkCell}>
                       <Icon name={isBilling ? "check-circle" : "cancel"} size={18} color={isBilling ? "#3B82F6" : t.border} />
                    </View>
                    <View style={s.checkCell}>
                       <Icon name={isInv ? "check-circle" : "cancel"} size={18} color={isInv ? "#F59E0B" : t.border} />
                    </View>
                 </View>
              );
           })}
        </Surface>

        <View style={{ marginTop: 20 }}>
           <Text style={{ color: t.text, fontWeight: 'bold', marginBottom: 8 }}>Legend:</Text>
           <Text style={{ color: t.subtext, fontSize: 13, marginBottom: 4 }}><Icon name="circle" size={12} color="#10B981"/> ADM - Admin (Full Store Control)</Text>
           <Text style={{ color: t.subtext, fontSize: 13, marginBottom: 4 }}><Icon name="circle" size={12} color="#3B82F6"/> BIL - Billing Staff (Front POS)</Text>
           <Text style={{ color: t.subtext, fontSize: 13 }}><Icon name="circle" size={12} color="#F59E0B"/> INV - Inventory Staff (Stock Room)</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  infoText: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  th: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  td: { fontSize: 13, fontWeight: '500' },
  
  checkCell: { flex: 1, alignItems: 'center' }
});
