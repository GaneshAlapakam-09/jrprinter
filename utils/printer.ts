const BluetoothSerial: any = require('react-native-bluetooth-classic');

export async function printReceipt(device: any, text: string) {
  try {
    const connected = await BluetoothSerial.isConnected();
    if (!connected) {
      await BluetoothSerial.connect(device.id);
    }
    await BluetoothSerial.write(text);
  } catch (err) {
    console.error('Print failed', err);
  }
}
