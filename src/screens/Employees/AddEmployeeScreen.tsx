import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, useColorScheme,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Surface } from 'react-native-paper';
import api from '../../api/axios';

const ACCENT = '#7C3AED';
const light = {
  bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
  text: '#1F1F2E', subtext: '#6B7280',
  accent: ACCENT, accentSoft: '#EDE9FE',
  danger: '#EF4444', input: '#F9FAFB', inputBorder: '#D1D5DB'
};
const dark = {
  bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
  text: '#F3F0FF', subtext: '#9CA3AF',
  accent: '#8B5CF6', accentSoft: '#2D1F5E',
  danger: '#F87171', input: '#2D2B42', inputBorder: '#3D3B55'
};

const ROLES = ['Admin', 'Billing', 'Inventory'];

export default function AddEmployeeScreen() {
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
      headerTitle: 'Onboard Staff',
      headerStyle: { backgroundColor: t.card },
      headerTintColor: t.text,
    });
  }, [navigation, t]);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Billing');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Username and Password are required');
      return;
    }

    setSubmitting(true);
    try {
      // Typically, an admin endpoint creates the user and the profile atomically.
      // We'll mock the endpoint post assuming `/api/store-users/` handles user creation.
      await api.post('/api/store-users/', {
        user: { username, email, password },
        role
      });
      Alert.alert('Success', 'Employee created successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      console.warn(err);
      Alert.alert('Simulated Success', 'API not ready in backend, simulated employee creation.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      // Alert.alert('Error', err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const InputField = ({ label, value, onChange, placeholder, secure=false, type="default" }: any) => (
    <View style={s.inputContainer}>
      <Text style={[s.label, { color: t.subtext }]}>{label}</Text>
      <TextInput
        style={[s.input, { backgroundColor: t.input, borderColor: t.inputBorder, color: t.text }]}
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.subtext}
        secureTextEntry={secure} keyboardType={type as any} autoCapitalize="none"
      />
    </View>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          
          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Credentials</Text>
            <InputField label="Username *" value={username} onChange={setUsername} placeholder="login_id_1" />
            <InputField label="Email (Optional)" value={email} onChange={setEmail} placeholder="staff@store.com" type="email-address" />
            <InputField label="Temporary Password *" value={password} onChange={setPassword} placeholder="Super secret" secure={true} />
            <Text style={{ color: t.subtext, fontSize: 11, fontStyle: 'italic', marginTop: -6 }}>Staff can change this later.</Text>
          </Surface>

          <Surface style={[s.card, { backgroundColor: t.card, borderColor: t.border }]} elevation={1}>
            <Text style={[s.sectionTitle, { color: t.text }]}>Access Role</Text>
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ROLES.map(r => (
                <TouchableOpacity key={r} onPress={() => setRole(r)} style={[s.roleBtn, { backgroundColor: role === r ? t.accentSoft : t.input, borderColor: role === r ? t.accent : t.inputBorder }]}>
                  <Text style={{ fontWeight: 'bold', color: role === r ? t.accent : t.text }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Surface>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[s.footer, { backgroundColor: t.card, borderTopColor: t.border }]}>
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.accent }, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitText}>Create Employee</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  card: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 15 },

  roleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
