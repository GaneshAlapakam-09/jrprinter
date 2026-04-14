import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, useColorScheme, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface, Switch } from 'react-native-paper';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6'
};

export default function TaxSettingsScreen() {
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
      headerTitle: 'Tax Configuration',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const [inclusive, setInclusive] = useState(true);
  const [defaultTax, setDefaultTax] = useState('0');

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
        
        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
          <Text style={[s.sectionTitle, { color: t.text }]}>Global Tax Settings</Text>
          
          <View style={s.row}>
            <View style={{ flex: 1 }}>
               <Text style={[s.label, { color: t.text }]}>Prices Include Tax</Text>
               <Text style={[s.sub, { color: t.subtext }]}>If enabled, POS items are assumed to have GST already calculated inside MRP.</Text>
            </View>
            <Switch value={inclusive} onValueChange={setInclusive} color={t.accent} />
          </View>
        </Surface>

        <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
          <Text style={[s.sectionTitle, { color: t.text }]}>Default Tax Mode</Text>
          
          <View style={[s.radioGroup, { borderColor: t.border }]}>
             {['0', '5', '12', '18'].map(val => (
                <TouchableOpacity key={val} style={s.radioItem} onPress={() => setDefaultTax(val)}>
                   <Icon name={defaultTax === val ? "radio-button-checked" : "radio-button-unchecked"} size={22} color={defaultTax === val ? t.accent : t.subtext} />
                   <Text style={[s.radioLabel, { color: t.text }]}>GST {val}%</Text>
                </TouchableOpacity>
             ))}
          </View>
          <Text style={[s.sub, { color: t.subtext, marginTop: 10 }]}>This default will apply to new products if a specific tax rate is not given.</Text>
        </Surface>

      </ScrollView>

      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }]} onPress={() => navigation.goBack()}>
          <Text style={s.submitText}>Save Tax Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  sub: { fontSize: 13, lineHeight: 18, paddingRight: 10 },

  radioGroup: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  radioItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  radioLabel: { fontSize: 15, marginLeft: 12, fontWeight: '500' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
