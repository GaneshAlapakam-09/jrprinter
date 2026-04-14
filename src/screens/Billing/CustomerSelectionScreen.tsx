import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useColorScheme
} from 'react-native';
import { Searchbar, Surface, Button, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { customerService } from '../../services/customerService';

const ACCENT = '#7C3AED';

export default function CustomerSelectionScreen() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? {
    bg: '#0F0D1A', card: '#1C1A2E', border: '#2D2B42',
    text: '#F3F0FF', subtext: '#9CA3AF', accent: '#8B5CF6'
  } : {
    bg: '#F5F3FF', card: '#FFFFFF', border: '#E5E7EB',
    text: '#1F1F2E', subtext: '#6B7280', accent: ACCENT
  };

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CustomerSelection'>>();
  const { orderItems, total } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New customer state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers();
      setCustomers(res.data || []);
      setFilteredCustomers(res.data || []);
    } catch (error) {
      console.log('Error fetching customers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(c => 
          c.name?.toLowerCase().includes(q) || 
          c.phone?.includes(q)
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const navigateToPayment = (customerId?: number, customerName?: string, customerPhone?: string) => {
    navigation.navigate('Payment', {
      orderItems,
      total,
      customerId,
      customerName,
      customerPhone
    });
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName) {
      Alert.alert('Required', 'Please enter a customer name');
      return;
    }
    try {
      setSavingCustomer(true);
      const payload = {
        name: newCustomerName,
        phone: newCustomerPhone,
      };
      const res = await customerService.createCustomer(payload);
      navigateToPayment(res.data?.id, res.data?.name, res.data?.phone);
    } catch (err) {
      Alert.alert('Error', 'Failed to create customer and proceed.');
      console.log(err);
    } finally {
      setSavingCustomer(false);
    }
  };

  const renderCustomer = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.customerCard, { backgroundColor: t.card, borderColor: t.border }]}
      onPress={() => navigateToPayment(item.id, item.name, item.phone)}
    >
      <View style={styles.customerIcon}>
        <Icon name="person" size={24} color={t.accent} />
      </View>
      <View style={styles.customerInfo}>
        <Text style={[styles.customerName, { color: t.text }]}>{item.name}</Text>
        {item.phone ? <Text style={[styles.customerPhone, { color: t.subtext }]}>{item.phone}</Text> : null}
      </View>
      <Icon name="chevron-right" size={24} color={t.subtext} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Select Customer</Text>
      </View>

      <View style={styles.content}>
        {/* Walk-in Button - Primary fast path */}
        <TouchableOpacity 
          style={[styles.walkInBtn, { backgroundColor: t.accent }]} 
          onPress={() => navigateToPayment()}
        >
          <Icon name="directions-walk" size={28} color="#fff" />
          <View style={styles.walkInTextContainer}>
            <Text style={styles.walkInTitle}>Walk-in Customer</Text>
            <Text style={styles.walkInSub}>Skip identification &amp; print receipt directly</Text>
          </View>
          <Icon name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: t.subtext }]}>OR SEARCH EXISTING</Text>

        <Searchbar
          placeholder="Search by name or phone"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={{ backgroundColor: t.card, marginBottom: 16 }}
          inputStyle={{ color: t.text }}
          iconColor={t.subtext}
          placeholderTextColor={t.subtext}
        />

        {loading ? (
          <ActivityIndicator size="large" color={t.accent} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomer}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchQuery ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: t.subtext, marginBottom: 16 }}>No customer found.</Text>
                  
                  {!isAddingNew ? (
                    <Button 
                      mode="outlined" 
                      onPress={() => {
                         setNewCustomerName(searchQuery.replace(/[^a-zA-Z ]/g, ''));
                         setNewCustomerPhone(searchQuery.replace(/[^0-9]/g, ''));
                         setIsAddingNew(true);
                      }}
                      textColor={t.accent}
                      style={{ borderColor: t.accent }}
                    >
                      Add New Customer
                    </Button>
                  ) : (
                    <Surface style={[styles.addForm, { backgroundColor: t.card, borderColor: t.border }]} elevation={2}>
                      <Text style={[styles.formTitle, { color: t.text }]}>New Customer Details</Text>
                      <TextInput
                        label="Name"
                        value={newCustomerName}
                        onChangeText={setNewCustomerName}
                        mode="outlined"
                        style={styles.input}
                        textColor={t.text}
                        outlineColor={t.border}
                        activeOutlineColor={t.accent}
                      />
                      <TextInput
                        label="Phone (Optional)"
                        value={newCustomerPhone}
                        onChangeText={setNewCustomerPhone}
                        keyboardType="phone-pad"
                        mode="outlined"
                        style={styles.input}
                        textColor={t.text}
                        outlineColor={t.border}
                        activeOutlineColor={t.accent}
                      />
                      <Button 
                        mode="contained" 
                        onPress={handleAddNewCustomer}
                        loading={savingCustomer}
                        buttonColor={t.accent}
                        style={{ marginTop: 8 }}
                      >
                        Save &amp; Continue
                      </Button>
                    </Surface>
                  )}
                </View>
              ) : null
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  
  walkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  walkInTextContainer: { flex: 1, marginLeft: 16 },
  walkInTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  walkInSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  customerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '600' },
  customerPhone: { fontSize: 13, marginTop: 4 },

  emptyState: { alignItems: 'center', marginTop: 30 },
  addForm: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  input: { backgroundColor: 'transparent', marginBottom: 12 },
});
