// src/navigation/types.ts
import { BluetoothDevice } from 'react-native-bluetooth-classic';

export type RootStackParamList = {
  Login: undefined;
  Main: { role: string };
  Bluetooth: undefined;
  Order: { deviceId: BluetoothDevice };
};
