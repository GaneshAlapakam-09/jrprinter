import BluetoothSerial, { BluetoothDevice } from 'react-native-bluetooth-classic';

type OrderItem = {
  product: {
    name: string;
    price: number;
  };
  quantity: number;
};

// Cafe information constants
const CAFE_INFO = {
  name: 'Nellai Thati Bellam Coffee',
  address: 'Nagari Road Puttur-AP',
  phone: '8019999973',
  gst: '37HDXPM9792N1ZU'
};

/**
 * Get the name of the currently connected Bluetooth printer
 */
export const getPrinterName = async (): Promise<string | null> => {
  try {
    const devices = await BluetoothSerial.getConnectedDevices();
    return devices.length > 0 ? devices[0].name : null;
  } catch (error) {
    console.error('Error getting printer name:', error);
    return null;
  }
};

/**
 * Check if any Bluetooth printer is currently connected
 */
export const isPrinterConnected = async (): Promise<boolean> => {
  try {
    const devices = await BluetoothSerial.getConnectedDevices();
    return devices.length > 0;
  } catch (error) {
    console.error('Printer connection check failed:', error);
    return false;
  }
};

/**
 * Get the currently connected printer device
 */
export const getConnectedPrinter = async (): Promise<BluetoothDevice | null> => {
  try {
    const devices = await BluetoothSerial.getConnectedDevices();
    return devices.length > 0 ? devices[0] : null;
  } catch (error) {
    console.error('Error getting connected printer:', error);
    return null;
  }
};

/**
 * Format long product names by word wrapping
 */
const formatProductName = (name: string, maxLength: number = 16): string[] => {
  if (name.length <= maxLength) return [name];
  
  const words = name.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + 1 + words[i].length <= maxLength) {
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
};

/**
 * Format each line of the receipt with proper alignment
 */
const formatLine = (name: string, qty: number, total: number): string => {
  const maxNameLength = 16;
  const nameLines = formatProductName(name, maxNameLength);
  const qtyStr = qty.toString().padStart(3);
  const totalStr = total.toFixed(2).padStart(10);
  
  let formattedLines = '';
  nameLines.forEach((line, index) => {
    if (index === 0) {
      // First line shows qty and price
      formattedLines += `${line.padEnd(maxNameLength)} ${qtyStr} ${totalStr}\n`;
    } else {
      // Subsequent lines just show the wrapped name
      formattedLines += `${line}\n`;
    }
  });
  
  return formattedLines;
};

/**
 * Get current India time in formatted string
 */
const getIndiaTime = (): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return new Date().toLocaleString('en-IN', options);
};

/**
 * Center align text by adding proper padding
 */
const centerText = (text: string, lineLength: number = 32): string => {
  const spaces = Math.max(0, lineLength - text.length);
  const leftSpaces = Math.floor(spaces / 2);
  return ' '.repeat(leftSpaces) + text;
};

/**
 * Send a formatted receipt to the connected Bluetooth printer
 */
export const printReceipt = async (
  orderItems: OrderItem[],
  total: number,
  paymentMode: string
): Promise<void> => {
  try {
    const printer = await getConnectedPrinter();
    if (!printer) {
      throw new Error('No printer connected');
    }

    let receipt = '';
    receipt += '\x1B\x40'; // Initialize printer
    
    // Cafe header
    receipt += '\x1B\x21\x08'; // Emphasized mode
    receipt += centerText(CAFE_INFO.name) + '\n';
    receipt += '\x1B\x21\x00'; // Normal text
    receipt += centerText(CAFE_INFO.address) + '\n';
    receipt += `GST : ${centerText(CAFE_INFO.gst)}\n`;
    receipt += centerText(getIndiaTime()) + '\n\n';
    
    // Receipt header
    receipt += '\x1B\x21\x08'; // Emphasized mode
    receipt += '     *** ORDER RECEIPT ***\n\n';
    receipt += '\x1B\x21\x00'; // Normal text
    
    receipt += '-------------------------------\n';
    receipt += 'Item              Qty     Total\n';
    receipt += '-------------------------------\n';

    // Order items
    orderItems.forEach(({ product, quantity }) => {
      receipt += formatLine(product.name, quantity, product.price * quantity);
    });

    receipt += '-------------------------------\n';
    
    // Total
    const totalLabel = `TOTAL (${paymentMode})`;
    const totalAmount = `Rs.${total.toFixed(2)}`;
    const totalSpaces = 32 - totalLabel.length - totalAmount.length;
    
    receipt += '\x1B\x21\x08'; // Emphasized on
    receipt += totalLabel + ' '.repeat(Math.max(1, totalSpaces)) + totalAmount + '\n';
    receipt += '\x1B\x21\x00'; // Emphasized off
    
    // Footer
    receipt += '-------------------------------\n';
    receipt += centerText('Thank you! Visit again.') + '\n';
    receipt += '\n\n\n\x1D\x56\x41\x03'; // Partial cut

    await BluetoothSerial.writeToDevice(printer.address, receipt);
  } catch (error) {
    console.error('Printing failed:', error);
    throw new Error(`Printing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Disconnect from current printer
 */
export const disconnectPrinter = async (): Promise<boolean> => {
  try {
    const printer = await getConnectedPrinter();
    if (printer) {
      await BluetoothSerial.disconnectFromDevice(printer.address);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Disconnection failed:', error);
    return false;
  }
};