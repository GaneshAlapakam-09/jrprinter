// screens/BluetoothScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BluetoothSerial, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Bluetooth'>;
};

export default function BluetoothScreen({ navigation }: Props) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const listDevices = async () => {
    try {
      const bonded = await BluetoothSerial.getBondedDevices();
      setDevices(bonded);
    } catch (err) {
      console.error('Error listing bonded devices:', err);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      const connected = await device.connect();
      if (connected) {
        setConnectedDevice(device);
        navigation.navigate('Order', { device }); // ✅ Navigate to Order screen
      } else {
        console.warn('Failed to connect');
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const renderItem = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity onPress={() => connectToDevice(item)} style={styles.deviceItem}>
      <Text style={styles.deviceText}>{item.name || item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Select a Paired Bluetooth Printer</Text>
      <Button title="Refresh Paired Devices" onPress={listDevices} />
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 18, marginBottom: 12, fontWeight: 'bold' },
  list: { marginTop: 10 },
  deviceItem: { padding: 15, backgroundColor: '#e0e0e0', borderRadius: 8, marginVertical: 5 },
  deviceText: { fontSize: 16 },
});
