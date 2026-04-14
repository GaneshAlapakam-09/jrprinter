import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, SafeAreaView, StatusBar, useColorScheme, Platform, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';
import { settingsService } from '../../services/settingsService';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', success: '#059669', successSoft: '#ECFDF5', dangerSoft: '#FEF2F2'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', success: '#34D399', successSoft: '#0D2A1E', dangerSoft: '#2A1515'
};

export default function BackupSyncScreen() {
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
      headerTitle: 'Cloud Sync & Backup',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await settingsService.getSyncStatus();
      setStatus(res.data);
    } catch (e) {
      console.warn('Failed to load sync status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await settingsService.pullSync();
      Alert.alert('Sync Complete', 'Device is now up to date with the cloud.');
      loadStatus();
    } catch (e) {
       Alert.alert('Sync Failed', 'Could not complete synchronization.');
    } finally {
       setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
          
          <Surface style={[s.hero, { backgroundColor: t.accent }]} elevation={2}>
             <Icon name="cloud-sync" size={64} color="#FFF" style={{ marginBottom: 16 }} />
             <Text style={s.heroTitle}>Offline-First Sync</Text>
             <Text style={s.heroSub}>All billing works offline. Data is safely pushed to the cloud in the background.</Text>
          </Surface>

          <View style={s.grid}>
             <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <View style={[s.iconWrap, { backgroundColor: t.successSoft }]}><Icon name="cloud-done" color={t.success} size={24}/></View>
                <Text style={[s.val, { color: t.text }]}>{status?.last_sync || 'Never'}</Text>
                <Text style={[s.lbl, { color: t.subtext }]}>Last Successful Sync</Text>
             </Surface>
          </View>
          
          <View style={s.gridRow}>
             <Surface style={[s.cardHalf, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <Text style={[s.valHalf, { color: t.text }]}>{status?.pending_queue || 0}</Text>
                <Text style={[s.lblHalf, { color: t.subtext }]}>Pending Items</Text>
             </Surface>
             <Surface style={[s.cardHalf, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
                <Text style={[s.valHalf, { color: status?.failed_queue > 0 ? t.danger : t.text }]}>{status?.failed_queue || 0}</Text>
                <Text style={[s.lblHalf, { color: t.subtext }]}>Failed Uploads</Text>
             </Surface>
          </View>

          <TouchableOpacity style={[s.btn, { backgroundColor: t.card, borderColor: t.accent, borderWidth: 1 }]} onPress={handleManualSync} disabled={syncing}>
             {syncing ? <ActivityIndicator size="small" color={t.accent} /> : <Icon name="sync" size={20} color={t.accent} style={{ marginRight: 8 }} />}
             <Text style={{ color: t.accent, fontSize: 16, fontWeight: 'bold' }}>{syncing ? 'Syncing...' : 'Force Manual Sync'}</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  hero: { padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  grid: { marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  val: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  lbl: { fontSize: 13 },

  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cardHalf: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  valHalf: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  lblHalf: { fontSize: 12 },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 }
});
