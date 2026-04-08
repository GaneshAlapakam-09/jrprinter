import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import {
  View, Text, FlatList, PermissionsAndroid, Platform,
  StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView,
  StatusBar, useColorScheme, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BluetoothSerial, { BluetoothDevice } from 'react-native-bluetooth-classic';
import Icon from 'react-native-vector-icons/MaterialIcons';

// ─── Theme ──────────────────────────────────────────────────────────────────
const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  success: '#059669', successBg: '#ECFDF5',
  danger: '#EF4444', dangerBg: '#FEF2F2',
  shadow: '#000',
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  success: '#34D399', successBg: '#0D2A1E',
  danger: '#F87171', dangerBg: '#2A1515',
  shadow: '#000',
};

export default function BluetoothScreen() {
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
      headerTitle: 'Bluetooth Printer',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
      headerShown: true,
    });
  }, [navigation, t.text, t.card]);

  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const connectionAttempt = useRef(0);

  const handleCancel = async (deviceId?: string) => {
    connectionAttempt.current++;
    setConnectingId(null);
    setError('Connection request cancelled');

    // Attempt to forcefully disconnect if we have a device ID
    if (deviceId) {
      try {
        const device = devices.find(d => d.id === deviceId);
        if (device) {
          await device.disconnect();
        }
      } catch (e) {
        console.log('Force disconnect failed:', e);
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      await requestPermissions();
      await listDevices();
    };
    init();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      const allGranted = Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
      if (!allGranted) setError('Bluetooth permissions are required to connect to printers');
    } catch {
      setError('Failed to request Bluetooth permissions');
    }
  };

  const listDevices = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const bonded = await BluetoothSerial.getBondedDevices();
      setDevices(bonded);
    } catch {
      setError('Failed to get paired devices. Make sure Bluetooth is enabled.');
    } finally {
      setRefreshing(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    const currentAttemptId = ++connectionAttempt.current;
    try {
      setConnectingId(device.id);
      setError(null);

      // Use a timeout to avoid long hangs when device is off
      const connectPromise = device.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Make sure the printer is on.')), 15000)
      );

      const connected = await Promise.race([connectPromise, timeoutPromise]) as boolean;

      if (currentAttemptId !== connectionAttempt.current) return;

      if (connected) {
        setConnectedDevice(device);
        setError(null);
      } else {
        setError('Could not connect to the selected printer');
      }
    } catch (err: any) {
      if (currentAttemptId !== connectionAttempt.current) return;

      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('already attempting')) {
        setError('A connection attempt is already in progress. Please wait a moment or try clicking Cancel first.');
      } else {
        setError(msg);
      }
    } finally {
      if (currentAttemptId === connectionAttempt.current) {
        setConnectingId(null);
      }
    }
  };

  const isConnected = (device: BluetoothDevice) => connectedDevice?.id === device.id;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Connected status banner */}

      {/* Connected status banner */}
      {connectedDevice && (
        <View style={[s.statusBanner, { backgroundColor: t.successBg, borderColor: t.success }]}>
          <Icon name="check-circle" size={18} color={t.success} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[s.statusLabel, { color: t.success }]}>Connected</Text>
            <Text style={[s.statusName, { color: t.success }]}>
              {connectedDevice.name || connectedDevice.id}
            </Text>
          </View>
        </View>
      )}

      {/* Error banner */}
      {error && (
        <View style={[s.errorBanner, { backgroundColor: t.dangerBg, borderColor: t.danger }]}>
          <Icon name="error-outline" size={18} color={t.danger} />
          <Text style={[s.errorText, { color: t.danger }]}>{error}</Text>
        </View>
      )}

      {/* Connecting status banner */}
      {connectingId && (
        <View style={[s.connectingBanner, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text style={[s.connectingText, { color: t.accent, flex: 1, marginLeft: 10 }]} numberOfLines={1}>
            Connecting to {devices.find(d => d.id === connectingId)?.name || 'Printer'}...
          </Text>
          <TouchableOpacity onPress={() => handleCancel(connectingId)} style={[s.cancelBtnSmall, { borderColor: t.danger + '30' }]}>
            <Text style={[s.cancelBtnTextSmall, { color: t.danger }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Refresh button */}
      <TouchableOpacity
        style={[s.scanBtn, { backgroundColor: t.accent }]}
        onPress={listDevices}
        disabled={refreshing}
      >
        {refreshing
          ? <ActivityIndicator size="small" color="#FFF" />
          : <>
            <Icon name="bluetooth-searching" size={18} color="#FFF" />
            <Text style={s.scanBtnText}>Scan Paired Devices</Text>
          </>
        }
      </TouchableOpacity>

      {/* Device list */}
      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={listDevices}
            colors={[t.accent]}
            tintColor={t.accent}
          />
        }
        ListEmptyComponent={
          !refreshing ? (
            <View style={s.emptyContainer}>
              <View style={[s.emptyIconBox, { backgroundColor: t.accentSoft }]}>
                <Icon name="bluetooth-disabled" size={40} color={t.accent} />
              </View>
              <Text style={[s.emptyTitle, { color: t.text }]}>No paired printers</Text>
              <Text style={[s.emptySub, { color: t.subtext }]}>
                Make sure your printer is turned on and already paired in your device settings
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const connected = isConnected(item);
          const connecting = connectingId === item.id;
          return (
            <TouchableOpacity
              style={[
                s.deviceCard,
                { backgroundColor: t.card, borderColor: connected ? t.success : t.border },
              ]}
              onPress={() => connectToDevice(item)}
              disabled={!!connectingId}
              activeOpacity={0.75}
            >
              {/* Icon */}
              <View style={[s.deviceIcon, { backgroundColor: connected ? t.successBg : t.accentSoft }]}>
                <Icon
                  name={connected ? 'bluetooth-connected' : 'print'}
                  size={22}
                  color={connected ? t.success : t.accent}
                />
              </View>

              {/* Info */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.deviceName, { color: t.text }]} numberOfLines={1}>
                  {item.name || 'Unknown Device'}
                </Text>
                <Text style={[s.deviceId, { color: t.subtext }]} numberOfLines={1}>
                  {item.id}
                </Text>
              </View>

              {/* Right side */}
              {connecting ? (
                <ActivityIndicator size="small" color={t.accent} />
              ) : connected ? (
                <View style={[s.connectedPill, { backgroundColor: t.successBg }]}>
                  <Text style={[s.connectedText, { color: t.success }]}>Connected</Text>
                </View>
              ) : (
                <Icon name="chevron-right" size={20} color={t.subtext} />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, marginTop: 4 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  statusLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusName: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  errorText: { fontSize: 13, flex: 1 },

  connectingBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 14, marginBottom: 8,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  connectingText: { fontSize: 13, fontWeight: '600' },
  cancelBtnSmall: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  cancelBtnTextSmall: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 14, marginVertical: 10,
    paddingVertical: 13, borderRadius: 14,
  },
  scanBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  deviceCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  deviceIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 15, fontWeight: '700' },
  deviceId: { fontSize: 11, marginTop: 3 },
  connectedPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  connectedText: { fontSize: 11, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
