import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Button,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/MainStackParamList';
import api from '../api/axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNPickerSelect from 'react-native-picker-select';

type Product = {
  id: number;
  name: string;
  category: string;
  price: string | number;
};

type Category = {
  id: number;
  name: string;
};

const ListProductScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formErrors, setFormErrors] = useState({
    name: '',
    category: '',
    price: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginRight: 20 }}>
          <Button
            title="Add Product"
            onPress={() => navigation.navigate('Add Product')}
          />
        </View>
      ),
    });
  }, [navigation]);

  const fetchProducts = async () => {
    try {
      setError(null);
      const response = await api.get('/products');

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid data format received from server');
      }

      const formattedProducts = response.data.map((item: any) => ({
        id: Number(item.id),
        name: item.name || 'Unnamed Product',
        category: item.category || 'Uncategorized',
        price: typeof item.price === 'number' ? item.price.toFixed(2) : item.price
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error('Failed to load products', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get('/categories/');
      if (response.data && response.data.categories && Array.isArray(response.data.categories)) {
        setCategories(response.data.categories.map((name: string, index: number) => ({
          id: index + 1,
          name: name
        })));
      } else {
        throw new Error('Invalid categories format from API');
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleDelete = (productId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(productId),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteProduct = async (productId: number) => {
    try {
      setDeletingId(productId);
      await api.delete(`/delete/product/${productId}`);

      setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
    } catch (err) {
      console.error('Failed to delete product', err);
      Alert.alert(
        'Error',
        'Failed to delete product. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: typeof product.price === 'number' ? product.price.toString() : product.price,
    });
    setIsEditModalVisible(true);
    setFormErrors({
      name: '',
      category: '',
      price: '',
    });
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      name: '',
      category: '',
      price: '',
    };

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
      valid = false;
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
      valid = false;
    }

    if (!formData.price) {
      newErrors.price = 'Price is required';
      valid = false;
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
      valid = false;
    }

    setFormErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !editingProduct) return;

    try {
      const updatedProduct = {
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
      };

      await api.put(`/update/product/${editingProduct.id}`, updatedProduct);

      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === editingProduct.id
            ? {
                ...product,
                name: formData.name,
                category: formData.category,
                price: Number(formData.price),
              }
            : product
        )
      );

      setIsEditModalVisible(false);
      Alert.alert('Success', 'Product updated successfully');
    } catch (err) {
      console.error('Failed to update product', err);
      Alert.alert(
        'Error',
        'Failed to update product. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    fetchCategories();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchProducts}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products available</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.namePriceRow}>
              <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
              <View style={styles.priceDeleteRow}>
                <Text style={styles.priceText}>
                  ₹{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                </Text>
                <TouchableOpacity 
                  onPress={() => handleEdit(item)}
                  style={styles.editButton}
                >
                  <Icon name="edit" size={24} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  style={styles.deleteButton}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#dc3545" />
                  ) : (
                    <Icon name="delete" size={24} color="#dc3545" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      />

      {/* Edit Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput
                style={[styles.input, formErrors.name ? styles.inputError : null]}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                placeholder="Enter product name"
              />
              {formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              {loadingCategories ? (
                <ActivityIndicator size="small" color="#007bff" />
              ) : (
                <View style={[styles.pickerContainer, formErrors.category ? styles.inputError : null]}>
                  <RNPickerSelect
                    onValueChange={(value) => setFormData({...formData, category: value})}
                    items={categories.map(cat => ({
                      label: cat.name,
                      value: cat.name,
                      key: cat.id.toString(),
                    }))}
                    value={formData.category}
                    placeholder={{ label: 'Select a category', value: null }}
                    style={pickerSelectStyles}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              )}
              {formErrors.category ? <Text style={styles.errorText}>{formErrors.category}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Price (₹)</Text>
              <TextInput
                style={[styles.input, formErrors.price ? styles.inputError : null]}
                value={formData.price}
                onChangeText={(text) => setFormData({...formData, price: text})}
                placeholder="Enter price"
                keyboardType="numeric"
              />
              {formErrors.price ? <Text style={styles.errorText}>{formErrors.price}</Text> : null}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: '#ced4da',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
  },
  placeholder: {
    color: '#6c757d',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  itemContainer: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  namePriceRow: {
    flexDirection: 'row',
    marginBottom: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceDeleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    color: '#343a40',
  },
  priceText: {
    marginRight: 16,
    fontWeight: '600',
    color: '#28a745',
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  retryText: {
    color: '#007bff',
    fontSize: 16,
    textDecorationLine: 'underline',
    padding: 8,
  },
  editButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: '15%',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#343a40',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontSize: 16,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    minWidth: '100%',
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ListProductScreen;