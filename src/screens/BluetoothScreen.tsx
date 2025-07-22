import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import BluetoothSerial, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { Colors, Fonts, Sizes } from '../constants/theme';

export default function BluetoothScreen() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null); // ✅ NEW

  useEffect(() => {
    const initBluetooth = async () => {
      await requestPermissions();
      await listDevices();
    };
    initBluetooth();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        if (
          granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          setError('Bluetooth permissions are required to connect to printers');
        }
      } catch (err) {
        console.error('Permission error:', err);
        setError('Failed to request Bluetooth permissions');
      }
    }
  };

  const listDevices = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const bonded = await BluetoothSerial.getBondedDevices();
      setDevices(bonded);
    } catch (err) {
      console.error('Failed to list bonded devices:', err);
      setError('Failed to get paired devices. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setConnectingId(device.id);
      const connected = await device.connect();
      setConnectingId(null);

      if (connected) {
        setConnectedDevice(device); // ✅ display connection status
      } else {
        setError('Could not connect to the selected printer');
      }
    } catch (error) {
      setConnectingId(null);
      console.error('Connection error:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const renderItem = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      onPress={() => connectToDevice(item)}
      style={styles.deviceItem}
      disabled={!!connectingId}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      {connectingId === item.id && (
        <ActivityIndicator size="small" color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select Printer</Text>
      <Text style={styles.subHeading}>Paired Bluetooth printers will appear below</Text>

      {/* ✅ Connected device status */}
      {connectedDevice && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Connected to: <Text style={styles.statusDevice}>{connectedDevice.name || connectedDevice.id}</Text>
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={listDevices}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.refreshText}>Refresh Devices</Text>
        )}
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {devices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No paired printers found</Text>
          <Text style={styles.emptySubText}>
            Make sure your printer is turned on and paired with this device
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={listDevices}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Sizes.padding,
    paddingTop: Sizes.padding,
  },
  heading: {
    ...Fonts.h2,
    color: Colors.primaryText,
    marginBottom: Sizes.base / 2,
  },
  subHeading: {
    ...Fonts.body,
    color: Colors.secondaryText,
    marginBottom: Sizes.padding,
  },
  statusContainer: {
    backgroundColor: '#e0f7e9',
    padding: Sizes.base,
    borderRadius: Sizes.radius,
    marginBottom: Sizes.padding,
  },
  statusText: {
    ...Fonts.body,
    color: '#2e7d32',
  },
  statusDevice: {
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Sizes.base,
    borderRadius: Sizes.radius,
    alignItems: 'center',
    marginBottom: Sizes.padding,
  },
  refreshText: {
    ...Fonts.bodyBold,
    color: Colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Sizes.padding * 2,
  },
  deviceItem: {
    backgroundColor: Colors.white,
    borderRadius: Sizes.radius,
    padding: Sizes.padding,
    marginBottom: Sizes.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...Fonts.bodyBold,
    color: Colors.primaryText,
    marginBottom: Sizes.base / 4,
  },
  deviceId: {
    ...Fonts.caption,
    color: Colors.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Sizes.padding * 4,
  },
  emptyText: {
    ...Fonts.h3,
    color: Colors.primaryText,
    marginBottom: Sizes.base / 2,
  },
  emptySubText: {
    ...Fonts.body,
    color: Colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: Sizes.padding * 2,
  },
  errorContainer: {
    backgroundColor: Colors.lightGray,
    padding: Sizes.base,
    borderRadius: Sizes.radius,
    marginBottom: Sizes.padding,
  },
  errorText: {
    ...Fonts.body,
    color: Colors.danger,
    textAlign: 'center',
  },
});
