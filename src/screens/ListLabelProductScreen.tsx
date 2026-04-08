import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    useColorScheme,
    StatusBar,
    Platform,
    RefreshControl,
    Modal
} from 'react-native';
import {
    Text,
    Surface,
    IconButton,
    Avatar,
    TextInput,
    Button,
    Searchbar,
    Divider
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootDrawerParamList } from '../navigation/DrawerNavigator';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { BASE_URL as API_BASE_URL } from '../api/axios';

interface Product {
    id: number;
    name: string;
    weight: number;
    mrp: number;
}

interface ApiResponse {
    success: boolean;
    data: Product[];
}

const ListLabelProductScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootDrawerParamList>>();
    const route = useRoute<any>();
    const userId = route.params?.userId || 1;
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Modal State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editName, setEditName] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editMrp, setEditMrp] = useState('');
    const [saving, setSaving] = useState(false);

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
            headerRight: () => (
                <IconButton icon="plus-circle" iconColor={theme.primary} onPress={() => navigation.navigate('AddLabelProduct')} />
            ),
            headerTitle: 'Label Products',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerShown: true,
        });
    }, [navigation, theme.text, theme.surface, theme.primary]);

    const fetchProducts = async () => {
        try {
            const response = await axios.get<ApiResponse>(`${API_BASE_URL}/api/label/printer/items/${userId}/`);
            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Fetch products error:', error);
            Alert.alert('Error', 'Failed to load label products.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchProducts();
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await axios.delete(`${API_BASE_URL}/api/label-items/${id}/`);
                            Alert.alert('Deleted', 'Product removed successfully.');
                            fetchProducts();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete product.');
                        } finally {
                            setLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setEditName(product.name);
        setEditWeight(product.weight.toString());
        setEditMrp(product.mrp.toString());
        setIsEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editingProduct) return;
        if (!editName || !editWeight || !editMrp) {
            Alert.alert('Error', 'Please fill all fields.');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: editName,
                weight: parseFloat(editWeight),
                mrp: parseFloat(editMrp)
            };
            await axios.patch(`${API_BASE_URL}/api/label-items/${editingProduct.id}/`, payload);
            setIsEditModalVisible(false);
            Alert.alert('Success', 'Product updated successfully.');
            fetchProducts();
        } catch (error) {
            Alert.alert('Error', 'Failed to update product.');
        } finally {
            setSaving(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: Product }) => (
        <Surface style={[styles.productCard, { backgroundColor: theme.card, borderColor: theme.border }]} elevation={1}>
            <View style={styles.cardHeader}>
                <View style={styles.nameContainer}>
                    <Text style={[styles.productName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.productDetails, { color: theme.subtext }]}>
                        {item.weight}g • ₹{parseFloat(item.mrp.toString()).toFixed(2)}
                    </Text>
                </View>
                <Avatar.Text
                    size={40}
                    label={item.name.substring(0, 2).toUpperCase()}
                    style={{ backgroundColor: theme.primary }}
                    color="#fff"
                />
            </View>
            <Divider style={styles.divider} />
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.editButton, { backgroundColor: theme.primary + '15' }]}
                    onPress={() => openEditModal(item)}
                >
                    <Icon name="pencil" size={20} color={theme.primary} />
                    <Text style={[styles.actionText, { color: theme.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.error + '15' }]}
                    onPress={() => handleDelete(item.id)}
                >
                    <Icon name="trash-can-outline" size={20} color={theme.error} />
                    <Text style={[styles.actionText, { color: theme.error }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </Surface>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <Searchbar
                placeholder="Search products..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme.card }]}
                inputStyle={{ color: theme.text }}
                iconColor={theme.primary}
                placeholderTextColor={theme.subtext}
            />

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ marginTop: 10, color: theme.subtext }}>Fetching products...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Icon name="tag-off" size={60} color={theme.subtext} />
                            <Text style={[styles.emptyText, { color: theme.subtext }]}>No products found.</Text>
                        </View>
                    }
                />
            )}

            {/* Edit Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Surface style={[styles.modalContent, { backgroundColor: theme.surface }]} elevation={5}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Product</Text>

                        <TextInput
                            label="Product Name"
                            value={editName}
                            onChangeText={setEditName}
                            mode="outlined"
                            maxLength={15}
                            style={styles.modalInput}
                            outlineColor={theme.border}
                            activeOutlineColor={theme.primary}
                            textColor={theme.text}
                            right={<TextInput.Affix text={`${editName.length}/15`} />}
                        />

                        <View style={styles.row}>
                            <TextInput
                                label="Weight (g)"
                                value={editWeight}
                                onChangeText={setEditWeight}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                                outlineColor={theme.border}
                                activeOutlineColor={theme.primary}
                                textColor={theme.text}
                            />
                            <TextInput
                                label="MRP"
                                value={editMrp}
                                onChangeText={setEditMrp}
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.modalInput, { flex: 1 }]}
                                outlineColor={theme.border}
                                activeOutlineColor={theme.primary}
                                textColor={theme.text}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <Button
                                mode="outlined"
                                onPress={() => setIsEditModalVisible(false)}
                                style={styles.modalButton}
                                textColor={theme.text}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSaveEdit}
                                loading={saving}
                                disabled={saving}
                                style={styles.modalButton}
                                buttonColor={theme.primary}
                            >
                                Save Changes
                            </Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 40 : 10,
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchBar: {
        margin: 16,
        borderRadius: 12,
        elevation: 2,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    productCard: {
        borderRadius: 16,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameContainer: {
        flex: 1,
        marginRight: 10,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    productDetails: {
        fontSize: 14,
    },
    divider: {
        marginVertical: 12,
        opacity: 0.5,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionText: {
        marginLeft: 6,
        fontWeight: '600',
        fontSize: 14,
    },
    editButton: {},
    deleteButton: {},
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        padding: 24,
        borderRadius: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    modalInput: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    row: {
        flexDirection: 'row',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 10,
    },
    modalButton: {
        borderRadius: 10,
    },
});

export default ListLabelProductScreen;
