import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  useColorScheme,
  StatusBar,
  Platform
} from 'react-native';
import {
  TextInput,
  Button,
  RadioButton,
  Text,
  Surface,
  IconButton,
  Divider,
  Avatar
} from 'react-native-paper';
import { Buffer } from 'buffer';
import { productService } from '../../services/productService';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';

type RootStackParamList = {
  SetLabel: { userId: number };
};

type Props = NativeStackScreenProps<RootStackParamList, 'SetLabel'>;

const Bluetooth = RNBluetoothClassic;

interface ApiResponse {
  success: boolean;
  data: {
    id: number;
    item_id: string;
    name: string;
    weight: number;
    mrp: number;
  }[];
  shop_name: string | null;
  fssai: string | null;
}

const SetLabel = ({ route, navigation }: Props) => {
  const { userId } = route.params;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [items, setItems] = useState<ApiResponse['data']>([]);
  const [savedLabels, setSavedLabels] = useState<any[]>([]);
  const [item, setItem] = useState('');
  const [itemId, setItemId] = useState('');
  const [weight, setWeight] = useState(0);
  const [mrp, setMrp] = useState('');
  const [usp, setUsp] = useState(0);
  const [pkdDate, setPkdDate] = useState(new Date());
  const [expDays, setExpDays] = useState(1);
  const [printCount, setPrintCount] = useState('1');
  const [shopName, setShopName] = useState('HOT CHIPS');
  const [fssai, setFssai] = useState('fs123456');
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('disconnected');
  const [refreshing, setRefreshing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [printerModel, setPrinterModel] = useState('TSC');
  const [printerName, setPrinterName] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<string | null>(null);
  const [labelWidth] = useState(50);
  const [labelHeight, setLabelHeight] = useState(25);
  const [dpi] = useState(203);
  const [labelType, setLabelType] = useState('text');

  // Theme configuration
  const theme = {
    primary: '#6200ee',
    secondary: '#03dac4',
    background: isDarkMode ? '#121212' : '#f5f7fa',
    surface: isDarkMode ? '#1e1e1e' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#2c3e50',
    subtext: isDarkMode ? '#b0b0b0' : '#7f8c8d',
    card: isDarkMode ? '#252525' : '#ffffff',
    border: isDarkMode ? '#333333' : '#e0e6ed',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 14 }}
          onPress={() => (navigation as any).openDrawer()}
        >
          <Icon name="menu" size={28} color={theme.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <IconButton icon="cloud-sync" iconColor={theme.primary} onPress={fetchItems} style={{ backgroundColor: theme.primary + '15' }} size={24} />
      ),
      headerTitle: 'Label Studio',
      headerStyle: { backgroundColor: theme.surface },
      headerTintColor: theme.text,
      headerShown: true,
    });
  }, [navigation, theme.text, theme.surface, theme.primary]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await productService.getLabelPrinterItems(userId || 1);

      if (response.data.success) {
        setItems(response.data.data);
        if (response.data.shop_name) setShopName(response.data.shop_name);
        if (response.data.fssai) setFssai(response.data.fssai);
      } else {
        throw new Error('Failed to fetch items');
      }

      const savedRes = await productService.getPrintedLabels();
      setSavedLabels(savedRes.data);
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to load products. Please check your network.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getBatteryStatus = async (device: any) => {
    try {
      // TSC TSPL battery command is usually ~!B or ~!A
      // Zebra ZPL is ! U1 getvar "power.status"
      const cmd = device.name?.includes('TSC') ? '~!B' : '! U1 getvar "power.status"';
      await device.write(cmd);

      // Brief delay to allow printer to respond
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await device.read();
      if (response && response.length > 0) {
        // Simple regex to find numbers/percentages
        const batteryMatch = response.match(/(\d+)%/);
        if (batteryMatch) {
          setBatteryLevel(batteryMatch[1] + '%');
        } else if (response.includes('full')) {
          setBatteryLevel('100%');
        } else {
          // If response contains "volt" or "level"
          setBatteryLevel(response.substring(0, 10)); // Just a slice of what we got
        }
      }
    } catch (e) {
      console.log('Error getting battery:', e);
    }
  };

  const checkPrinterConnection = async () => {
    try {
      const devices = await Bluetooth.getConnectedDevices();
      if (devices.length > 0) {
        setPrinterStatus('connected');
        const device = devices[0];
        setPrinterName(device.name || 'Printer');
        setPrinterModel(device.name?.includes('TSC') ? 'TSC' : 'Zebra');
        getBatteryStatus(device);
      } else {
        setPrinterStatus('disconnected');
        setBatteryLevel(null);
        setPrinterName('');
      }
    } catch (error) {
      setPrinterStatus('error');
    }
  };

  useEffect(() => {
    fetchItems();
    checkPrinterConnection();

    const subscription = Bluetooth.onDeviceConnected(() => checkPrinterConnection());
    const dcSubscription = Bluetooth.onDeviceDisconnected(() => setPrinterStatus('disconnected'));

    return () => {
      subscription.remove();
      dcSubscription.remove();
    };
  }, [userId]);

  useEffect(() => {
    const selectedItem = items.find(i => i.name === item);
    if (selectedItem) {
        setWeight(selectedItem.weight);
        setMrp(selectedItem.mrp.toString());
        setItemId(selectedItem.item_id);
    }
  }, [item]);

  const handleLoadSavedLabel = (savedId: number) => {
    const saved = savedLabels.find(s => s.id === savedId);
    if (!saved) return;
    setItem(saved.label_name);
    setPkdDate(new Date(saved.pkd_date));
    
    const exp = new Date(saved.exp_date);
    const pkd = new Date(saved.pkd_date);
    const diffTime = Math.abs(exp.getTime() - pkd.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setExpDays(diffDays || 1);
    
    setPrintCount(saved.copies.toString());
  };

  useEffect(() => {
    const calculatedUsp = weight > 0 ? parseFloat(mrp) / weight : 0;
    setUsp(calculatedUsp);
  }, [mrp, weight]);

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Convert mm to dots based on DPI
  const mmToDots = (mm: number) => {
    return Math.round((mm * dpi) / 25.4);
  };

  const handlePrint = async () => {
    if (!item) return Alert.alert('Selection Required', 'Please choose a product first.');
    if (!printCount || parseInt(printCount) <= 0) return Alert.alert('Invalid Count', 'Enter a print quantity.');

    try {
      setIsLoading(true);
      const devices = await Bluetooth.getConnectedDevices();
      if (devices.length === 0) throw new Error('Printer not connected');

      const device = devices[0];
      const copies = Math.min(parseInt(printCount), 10);
      const expDate = new Date(pkdDate);
      expDate.setDate(expDate.getDate() + expDays);

      const getCenterX = (text: string, fontDotsPerChar: number) => {
        const contentWidth = text.length * fontDotsPerChar;
        return Math.max(0, Math.floor((370 - contentWidth) / 2) + 1);
      };

      const shopX = getCenterX(shopName, 24);
      const fssaiX = getCenterX(`fssai: ${fssai}`, 12);
      const itemFont = item.length > 8 ? "3" : "4";
      const itemFontWidth = itemFont === "3" ? 16 : 24;
      const itemX = getCenterX(`Item : ${item}`, itemFontWidth);
      const wtMrpX = getCenterX(`WT : ${weight}g   MRP : ${parseFloat(mrp).toFixed(2)}`, 12);
      const datesX = getCenterX(`PKD:${formatDate(pkdDate)}-EXP:${formatDate(expDate)}`, 12);

      const safeData = `{item_id:'${itemId}',i:'${item}',w:${weight},m:'${parseFloat(mrp).toFixed(2)}',p:'${formatDate(pkdDate)}',e:'${formatDate(expDate)}'}`;

      let printCommands = [
        `SIZE ${labelWidth} mm, ${labelHeight} mm\n`,
        `REFERENCE 0,0\n`,
        'DENSITY 10\n',
        'DIRECTION 0\n',
        'CODEPAGE UTF-8\n',
        'CLS\n',
      ];

      if (labelType === 'text') {
        if (labelHeight === 25) {
          printCommands.push(
            `BOX 1,25,370,195,5\n`,
            `TEXT ${shopX},40,"TSS24.BF2",0,2,1,"${shopName}"\n`,
            `TEXT ${fssaiX},65,"2",0,1,1,"fssai: ${fssai}"\n`,
            `TEXT ${itemX},95,"${itemFont}",0,1,1,"Item : ${item}"\n`,
            `TEXT ${wtMrpX},135,"2",0,1,1,"WT : ${weight}g   MRP : ${parseFloat(mrp).toFixed(2)}"\n`,
            `TEXT ${datesX},165,"2",0,1,1,"PKD:${formatDate(pkdDate)}-EXP:${formatDate(expDate)}"\n`
          );
        } else {
          printCommands.push(
            `BOX 1,20,370,230,5\n`,
            `TEXT ${shopX},40,"TSS24.BF2",0,2,1,"${shopName}"\n`,
            `TEXT ${fssaiX},65,"2",0,1,1,"fssai: ${fssai}"\n`,
            `TEXT ${itemX},100,"${itemFont}",0,1,1,"Item : ${item}"\n`,
            `TEXT ${wtMrpX},145,"2",0,1,2,"WT : ${weight}g   MRP : ${parseFloat(mrp).toFixed(2)}"\n`,
            `TEXT ${datesX},200,"2",0,1,1,"PKD:${formatDate(pkdDate)}-EXP:${formatDate(expDate)}"\n`
          );
        }
      } else if (labelType === 'qr') {
        const qrSize = 130;
        const qrX = Math.floor((370 - qrSize) / 2);
        const qrText = `ID: ${itemId}`;
        const qrY = Math.floor((labelHeight * 8 - qrSize - 25) / 2);
        const textY = qrY + qrSize + 25;

        printCommands.push(`QRCODE ${qrX},${qrY},M,4,A,0,"${safeData}"\n`);
        printCommands.push(`TEXT ${getCenterX(qrText, 12)},${textY},"2",0,1,1,"${qrText}"\n`);
      }

      printCommands.push(`PRINT ${copies},1`);

      if (!await device.isConnected()) await device.connect();
      await device.write(printCommands.join(''));

      // Send log to backend
      try {
        const itemRecord = items.find(i => i.name === item);
        if (itemRecord) {
          await productService.createPrintedLabel({
             label_item: itemRecord.id,
             user: userId || 1,
             copies: copies,
             pkd_date: pkdDate.toISOString().split('T')[0],
             exp_date: expDate.toISOString().split('T')[0],
          });
        }
      } catch (err) {
        console.warn('Failed to record print in backend:', err);
      }

      Alert.alert('Printed ✨', `${copies} label(s) sent to printer.`);
    } catch (error: any) {
      Alert.alert('Printing Error', error.message || 'Verify connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPrinterStatus = () => {
    const isConn = printerStatus === 'connected';
    const color = isConn ? theme.success : printerStatus === 'error' ? theme.error : theme.warning;

    return (
      <Surface style={[styles.statusCard, { backgroundColor: theme.card, borderColor: color }]} elevation={1}>
        <View style={styles.statusRow}>
          <Avatar.Icon size={36} icon={isConn ? "printer-check" : "printer-off"} style={{ backgroundColor: color }} color="#fff" />
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusLabel, { color: theme.subtext }]}>Printer Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={[styles.statusValue, { color: theme.text }]}>
                {isConn ? (printerName || printerModel) : 'Awaiting Connection'}
              </Text>
              {isConn && batteryLevel && (
                <View style={styles.batteryBadge}>
                  <Icon name="battery" size={12} color={theme.success} />
                  <Text style={[styles.batteryText, { color: theme.success }]}>{batteryLevel}</Text>
                </View>
              )}
            </View>
          </View>
          <IconButton icon="refresh" iconColor={theme.primary} onPress={checkPrinterConnection} />
        </View>
      </Surface>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.loadingFull, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 16, color: theme.subtext }}>Syncing with database...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchItems} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {renderPrinterStatus()}

        <Surface style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} elevation={1}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Label Configuration</Text>

          <View style={styles.radioSection}>
            <Text style={[styles.radioLabel, { color: theme.subtext }]}>Format</Text>
            <RadioButton.Group onValueChange={v => setLabelType(v)} value={labelType}>
              <View style={styles.radioRow}>
                {['text', 'qr'].map(type => (
                  <View key={type} style={styles.radioItem}>
                    <RadioButton value={type} color={theme.primary} />
                    <Text style={{ color: theme.text, textTransform: 'capitalize' }}>{type}</Text>
                  </View>
                ))}
              </View>
            </RadioButton.Group>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.radioSection}>
            <Text style={[styles.radioLabel, { color: theme.subtext }]}>Size</Text>
            <RadioButton.Group onValueChange={v => setLabelHeight(parseInt(v))} value={labelHeight.toString()}>
              <View style={styles.radioRow}>
                {['25', '30'].map(h => (
                  <View key={h} style={styles.radioItem}>
                    <RadioButton value={h} color={theme.primary} />
                    <Text style={{ color: theme.text }}>{h}mm</Text>
                  </View>
                ))}
              </View>
            </RadioButton.Group>
          </View>
        </Surface>

        <Surface style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} elevation={1}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>Product Selection</Text>
          <View style={[styles.pickerBox, { borderColor: theme.border }]}>
            <RNPickerSelect
              onValueChange={setItem}
              items={items.map(i => ({ label: i.name, value: i.name }))}
              placeholder={{ label: 'Tap to select product...', value: '' }}
              style={{
                inputAndroid: { color: theme.text, paddingRight: 30 },
                inputIOS: { color: theme.text, paddingRight: 30 }
              }}
            />
            <Icon name="chevron-down" size={20} color={theme.subtext} style={styles.pickerIcon} />
          </View>

          <View style={styles.formRow}>
            <TextInput
              label="Weight"
              value={weight ? `${weight}g` : ''}
              editable={false}
              mode="outlined"
              style={[styles.smallInput, { flex: 1 }]}
              outlineColor={theme.border}
              textColor={theme.text}
            />
            <TextInput
              label="MRP"
              value={mrp ? `₹${mrp}` : ''}
              editable={false}
              mode="outlined"
              style={[styles.smallInput, { flex: 1 }]}
              outlineColor={theme.border}
              textColor={theme.text}
            />
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1.5 }}>
              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Packing Date</Text>
              <TouchableOpacity style={[styles.dateBtn, { borderColor: theme.border }]} onPress={() => setShowPicker(true)}>
                <Text style={{ color: theme.text }}>{pkdDate.toLocaleDateString('en-GB')}</Text>
                <Icon name="calendar-edit" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Shelf Life</Text>
              <View style={[styles.miniPicker, { borderColor: theme.border }]}>
                <RNPickerSelect
                  onValueChange={v => setExpDays(v)}
                  items={Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1} Days`, value: i + 1 }))}
                  value={expDays}
                  style={{ inputAndroid: { color: theme.text }, inputIOS: { color: theme.text } }}
                />
              </View>
            </View>
          </View>

          <TextInput
            label="Copies"
            value={printCount}
            keyboardType="numeric"
            onChangeText={t => /^\d*$/.test(t) && setPrintCount(t)}
            mode="outlined"
            style={styles.fullInput}
            outlineColor={theme.border}
            activeOutlineColor={theme.primary}
            textColor={theme.text}
          />
        </Surface>

        <Button
          mode="text"
          onPress={() => setShowPreview(!showPreview)}
          labelStyle={{ color: theme.primary, fontWeight: 'bold' }}
        >
          {showPreview ? 'Hide Live Preview' : 'Show Live Preview'}
        </Button>

        <Surface style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]} elevation={1}>
          <Text style={[styles.sectionHeading, { color: theme.text, fontSize: 16 }]}>Quick Load Recent Print</Text>
          <View style={[styles.pickerBox, { borderColor: theme.border, marginBottom: 0 }]}>
            <RNPickerSelect
              onValueChange={(val) => {
                if (val) handleLoadSavedLabel(val);
              }}
              items={savedLabels.map(sl => ({
                label: `${sl.label_name} (${sl.copies} labels, PKD: ${sl.pkd_date})`,
                value: sl.id
              }))}
              placeholder={{ label: 'Select a recently printed label...', value: '' }}
              style={{
                inputAndroid: { color: theme.text, paddingRight: 30 },
                inputIOS: { color: theme.text, paddingRight: 30 }
              }}
            />
            <Icon name="history" size={20} color={theme.subtext} style={styles.pickerIcon} />
          </View>
        </Surface>

        {showPreview && item && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Live Print Preview</Text>
              <Text style={styles.previewDimensions}>{labelWidth}mm x {labelHeight}mm</Text>
            </View>

            <Surface style={[styles.previewCard, { backgroundColor: '#fff' }]} elevation={4}>
              <View style={[styles.labelCanvas, { width: 370, height: labelHeight * 8 }]}>
                {/* Print Boundary Box */}
                <View style={[
                  styles.printBox,
                  {
                    top: labelHeight === 25 ? 25 : 20,
                    height: labelHeight === 25 ? 170 : 210
                  }
                ]} />

                {labelType === 'text' ? (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pvShop, { top: 40 }]}>{shopName}</Text>
                    <Text style={[styles.pvFssai, { top: 65 }]}>fssai: {fssai}</Text>
                    <Text style={[
                      styles.pvItem,
                      {
                        top: labelHeight === 25 ? 95 : 100,
                        fontSize: item.length > 8 ? 16 : 22
                      }
                    ]}>
                      Item : {item}
                    </Text>
                    <Text style={[styles.pvDetails, { top: labelHeight === 25 ? 135 : 145 }]}>
                      WT : {weight}g   MRP : {parseFloat(mrp).toFixed(2)}
                    </Text>
                    <Text style={[styles.pvDates, { top: labelHeight === 25 ? 165 : 200 }]}>
                      PKD:{formatDate(pkdDate)}-EXP:{formatDate(new Date(new Date(pkdDate).getTime() + expDays * 24 * 60 * 60 * 1000))}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.codeLabelContent}>
                    <QRCode
                      value={`{item_id:'${itemId}',i:'${item}',w:${weight},m:'${parseFloat(mrp).toFixed(2)}',p:'${formatDate(pkdDate)}',e:'${formatDate(new Date(new Date(pkdDate).getTime() + expDays * 24 * 60 * 60 * 1000))}'}`}
                      size={labelHeight > 25 ? 120 : 100}
                      quietZone={5}
                    />
                    <Text numberOfLines={1} style={styles.pvSafeData}>ID: {itemId}</Text>
                  </View>
                )}
              </View>
            </Surface>
            <View style={styles.previewFooter}>
              <Icon name="information-outline" size={14} color={theme.subtext} />
              <Text style={[styles.footerHint, { color: theme.subtext }]}>Coordinates are matched to printer dots (203 DPI)</Text>
            </View>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handlePrint}
          loading={isLoading}
          disabled={isLoading || printerStatus !== 'connected'}
          style={styles.printBtn}
          labelStyle={styles.printBtnLabel}
          buttonColor={theme.primary}
        >
          {isDarkMode ? 'SEND TO PRINTER' : 'Print Premium Label'}
        </Button>

        <DateTimePickerModal
          isVisible={showPicker}
          mode="date"
          onConfirm={d => { setPkdDate(d); setShowPicker(false); }}
          onCancel={() => setShowPicker(false)}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 10
  },
  appTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusTextContainer: { flex: 1, marginLeft: 16 },
  statusLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  statusValue: { fontSize: 16, fontWeight: 'bold' },
  card: { padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1 },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  radioSection: { marginVertical: 8 },
  radioLabel: { fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  radioRow: { flexDirection: 'row', justifyContent: 'space-between' },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  divider: { marginVertical: 12, opacity: 0.5 },
  pickerBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative'
  },
  pickerIcon: { position: 'absolute', right: 12 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  smallInput: { backgroundColor: 'transparent' },
  fullInput: { backgroundColor: 'transparent', marginBottom: 10 },
  fieldLabel: { fontSize: 12, marginBottom: 6, marginLeft: 4 },
  dateBtn: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between'
  },
  miniPicker: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: 'center'
  },
  previewContainer: {
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewDimensions: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  labelCanvas: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  printBox: {
    position: 'absolute',
    left: 1,
    width: 368,
    borderWidth: 2,
    borderColor: '#000',
  },
  pvShop: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    lineHeight: 22,
  },
  pvFssai: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    color: '#000',
    lineHeight: 12,
  },
  pvItem: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 24,
  },
  pvDetails: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    color: '#000',
    lineHeight: 14,
  },
  pvDates: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    color: '#000',
    lineHeight: 13,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  footerHint: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  codeLabelContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pvSafeData: { fontSize: 10, color: '#666', marginTop: 5 },
  printBtn: {
    borderRadius: 16,
    paddingVertical: 10,
    marginTop: 10,
    shadowColor: "#6200ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  printBtnLabel: { fontSize: 18, fontWeight: 'bold' },
  batteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#4caf5015',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default SetLabel;