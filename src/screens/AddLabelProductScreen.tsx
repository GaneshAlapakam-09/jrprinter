import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { RootStackParamList } from '../navigation/types';

// Depending on how you configure your base API URL
const API_BASE_URL = 'https://p1787ms1-8000.inc1.devtunnels.ms'; // Make sure this matches your django server

const AddLabelProductScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const [name, setName] = useState('');
    const [weight, setWeight] = useState('');
    const [mrp, setMrp] = useState('');
    const [shopName, setShopName] = useState('HOT CHIPS');
    const [fssai, setFssai] = useState('fs134678');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !weight || !mrp) {
            Alert.alert('Error', 'Please fill all mandatory fields (Name, Weight, MRP)');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                name,
                weight: parseFloat(weight),
                mrp: parseFloat(mrp),
                shop_name: shopName,
                fssai: fssai,
                // Depending on your auth implementation you might need to send user ID
            };

            const response = await axios.post(`${API_BASE_URL}/api/label-items/`, payload);

            if (response.status === 201) {
                Alert.alert('Success', 'Label Product added successfully');
                setName('');
                setWeight('');
                setMrp('');
                // Option to navigate back:
                // navigation.goBack();
            }
        } catch (error) {
            console.error('Add Label Product Error:', error);
            Alert.alert('Error', 'Failed to add label product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Add Label Product</Text>

                <TextInput
                    label="Product Name *"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="Weight (g) *"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="MRP (Rs.) *"
                    value={mrp}
                    onChangeText={setMrp}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="Shop Name"
                    value={shopName}
                    onChangeText={setShopName}
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="FSSAI"
                    value={fssai}
                    onChangeText={setFssai}
                    mode="outlined"
                    style={styles.input}
                />

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                >
                    Save Product
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        marginBottom: 15,
    },
    button: {
        marginTop: 10,
        paddingVertical: 5,
    }
});

export default AddLabelProductScreen;
