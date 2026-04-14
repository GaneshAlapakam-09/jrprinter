import React, { useState, useLayoutEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
    StatusBar,
    TouchableOpacity
} from 'react-native';
import { TextInput, Button, Text, Surface, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootDrawerParamList } from '../../navigation/DrawerNavigator';
import { productService } from '../../services/productService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AddLabelProductScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootDrawerParamList>>();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [name, setName] = useState('');
    const [weight, setWeight] = useState('');
    const [mrp, setMrp] = useState('');
    const [shopName, setShopName] = useState('HOT CHIPS');
    const [fssai, setFssai] = useState('fs134678');
    const [loading, setLoading] = useState(false);

    const theme = {
        primary: '#6200ee',
        background: isDarkMode ? '#121212' : '#f8f9fa',
        surface: isDarkMode ? '#1e1e1e' : '#ffffff',
        text: isDarkMode ? '#ffffff' : '#212121',
        subtext: isDarkMode ? '#b0b0b0' : '#757575',
        card: isDarkMode ? '#2c2c2c' : '#ffffff',
        border: isDarkMode ? '#333333' : '#e0e0e0',
        error: '#ff5252',
        success: '#4caf50'
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
            headerTitle: 'New Product',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerShown: true,
        });
    }, [navigation, theme.text, theme.surface]);

    const handleSubmit = async () => {
        if (!name || !weight || !mrp) {
            Alert.alert('Required Fields', 'Please fill in the Product Name, Weight, and MRP.');
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
            };

            const response = await productService.createLabelItem(payload);

            if (response.status === 201) {
                Alert.alert('Success ✨', 'Product added successfully!', [
                    {
                        text: 'Add More', onPress: () => {
                            setName('');
                            setWeight('');
                            setMrp('');
                        }
                    },
                    { text: 'View List', onPress: () => navigation.navigate('ListLabelProduct') }
                ]);
            }
        } catch (error) {
            console.error('Add Label Product Error:', error);
            Alert.alert('Error', 'Could not save the product. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <Surface style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} elevation={2}>
                    <View style={styles.iconContainer}>
                        <Icon name="tag-plus" size={40} color={theme.primary} />
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Product Details</Text>

                    <TextInput
                        label="Product Name"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        maxLength={15}
                        error={name.length >= 15}
                        placeholder="e.g. Potato Chips"
                        style={styles.input}
                        right={<TextInput.Affix text={`${name.length}/15`} />}
                        outlineColor={theme.border}
                        activeOutlineColor={theme.primary}
                        textColor={theme.text}
                    />

                    <View style={styles.row}>
                        <TextInput
                            label="Weight (g)"
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                            mode="outlined"
                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                            right={<TextInput.Affix text="g" />}
                            outlineColor={theme.border}
                            activeOutlineColor={theme.primary}
                            textColor={theme.text}
                        />

                        <TextInput
                            label="MRP"
                            value={mrp}
                            onChangeText={setMrp}
                            keyboardType="numeric"
                            mode="outlined"
                            style={[styles.input, { flex: 1 }]}
                            right={<TextInput.Affix text="₹" />}
                            outlineColor={theme.border}
                            activeOutlineColor={theme.primary}
                            textColor={theme.text}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>Business Info</Text>

                    <TextInput
                        label="Shop Name"
                        value={shopName}
                        onChangeText={setShopName}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={theme.border}
                        activeOutlineColor={theme.primary}
                        textColor={theme.text}
                    />

                    <TextInput
                        label="FSSAI Number"
                        value={fssai}
                        onChangeText={setFssai}
                        mode="outlined"
                        style={styles.input}
                        outlineColor={theme.border}
                        activeOutlineColor={theme.primary}
                        textColor={theme.text}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        labelStyle={styles.buttonLabel}
                        buttonColor={theme.primary}
                    >
                        Save Product
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('ListLabelProduct')}
                        style={[styles.button, { marginTop: 12, borderColor: theme.primary }]}
                        labelStyle={[styles.buttonLabel, { color: theme.primary }]}
                    >
                        View All Products
                    </Button>
                </Surface>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    card: {
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 20,
        borderWidth: 1,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    input: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    button: {
        marginTop: 10,
        borderRadius: 12,
        paddingVertical: 8,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});

export default AddLabelProductScreen;
