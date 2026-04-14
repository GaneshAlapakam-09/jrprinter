import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  ActivityIndicator, SafeAreaView, StatusBar, useColorScheme, Alert
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Chip } from 'react-native-paper';
import { queueManager, SyncJob } from '../../sync/queueManager';
import { syncEngine } from '../../sync/syncEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', dangerSoft: '#FEF2F2', warning: '#F59E0B', warningSoft: '#FEF3C7',
  success: '#059669', successSoft: '#ECFDF5'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', dangerSoft: '#2A1515', warning: '#FBBF24', warningSoft: '#332701',
  success: '#34D399', successSoft: '#0D2A1E'
};

export default function SyncStatusScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const focused = useIsFocused();

  const [queue, setQueue] = useState<SyncJob[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Never');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
      ),
      headerTitle: 'Sync Engine Health',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const loadHealth = async () => {
    const q = await queueManager.getQueue();
    setQueue(q);
    const ls = await AsyncStorage.getItem('@last_sync_upload');
    if (ls) setLastSync(new Date(ls).toLocaleTimeString());
  };

  useEffect(() => {
    if (focused) loadHealth();
  }, [focused]);

  const handleManualSync = async () => {
    setSyncing(true);
    await syncEngine.uploadQueue();
    await loadHealth();
    setSyncing(false);
  };

  const resolveConflict = async (job: SyncJob) => {
    Alert.alert(
      "Conflict Detected",
      `The server rejected this ${job.entityType} entry based on overlapping or conflicting constraints.\n\n` + 
      "Would you like to force overwrite server or drop local change?",
      [
        { text: "Drop Local", onPress: async () => { await queueManager.removeJob(job.id); loadHealth(); }, style: "destructive" },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const pending = queue.filter(q => q.status === 'pending').length;
  const failed = queue.filter(q => q.status === 'failed').length;
  const conflicts = queue.filter(q => q.status === 'conflict');

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>

        <Surface style={[s.statCard, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
           <Text style={[s.sectionTitle, { color: t.text }]}>Queue Overview</Text>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                 <Text style={{ fontSize: 24, fontWeight: '900', color: t.accent }}>{pending}</Text>
                 <Text style={{ fontSize: 12, color: t.subtext }}>Pending</Text>
              </View>
              <View style={{ width: 1, backgroundColor: t.border }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                 <Text style={{ fontSize: 24, fontWeight: '900', color: failed > 0 ? t.danger : t.text }}>{failed}</Text>
                 <Text style={{ fontSize: 12, color: t.subtext }}>Failed</Text>
              </View>
              <View style={{ width: 1, backgroundColor: t.border }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                 <Text style={{ fontSize: 24, fontWeight: '900', color: conflicts.length > 0 ? t.warning : t.text }}>{conflicts.length}</Text>
                 <Text style={{ fontSize: 12, color: t.subtext }}>Conflicts</Text>
              </View>
           </View>
           
           <Text style={{ color: t.subtext, fontSize: 11, textAlign: 'center', marginBottom: 14 }}>Last checked: {lastSync}</Text>
           
           <TouchableOpacity style={[s.btn, { backgroundColor: t.accent }]} onPress={handleManualSync} disabled={syncing}>
              {syncing ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Push Queue Now</Text>}
           </TouchableOpacity>
        </Surface>

        {conflicts.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Actionable Conflicts ({conflicts.length})</Text>
            {conflicts.map(c => (
               <Surface key={c.id} style={[s.conflictCard, { backgroundColor: t.warningSoft, borderColor: t.warning }]} elevation={0}>
                  <View style={{ flex: 1 }}>
                     <Text style={{ fontWeight: 'bold', color: t.warning }}>{c.entityType.toUpperCase()}</Text>
                     <Text style={{ fontSize: 12, color: t.subtext, marginTop: 4 }}>{c.errorMessage || 'Unknown conflict'}</Text>
                  </View>
                  <TouchableOpacity style={[s.resolveBtn, { borderColor: t.warning }]} onPress={() => resolveConflict(c)}>
                     <Text style={{ color: t.warning, fontSize: 11, fontWeight: 'bold' }}>RESOLVE</Text>
                  </TouchableOpacity>
               </Surface>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  statCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  btn: { padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  conflictCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  resolveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 6, marginLeft: 10 }
});
