// src/screens/AddProductScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl,
} from 'react-native';
import api from '../api/axios';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';

const AddProductScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.get('/categories/');
      if (response.data && Array.isArray(response.data.categories)) {
        setCategories(response.data.categories);
        if (response.data.categories.length > 0 && !category) {
          setCategory(response.data.categories[0]);
        }
      } else {
        throw new Error('Invalid categories format from API');
      }
    } catch (error) {
      console.error('Category fetch error:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price.trim() || !category) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (isNaN(Number(price))) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/products/', {
        name,
        category,
        price: parseFloat(price),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Product added successfully', [
          {
            text: 'OK',
            onPress: () => {
              setName('');
              setPrice('');
              navigation.goBack();
            },
          },
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add product error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setIsAddingCategory(true);

    try {
      const response = await api.post('/categories/', {
        name: newCategoryName.trim(),
      });

      if (response.data.success) {
        await fetchCategories();
        setCategory(newCategoryName.trim());
        setShowAddCategoryModal(false);
        setNewCategoryName('');
        Alert.alert('Success', 'Category added successfully');
      } else {
        throw new Error(response.data.message || 'Failed to add category');
      }
    } catch (error) {
      console.error('Add category error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add category');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.pickerItem}
      onPress={() => {
        setCategory(item);
        setShowCategoryPicker(false);
      }}
    >
      <Text style={styles.pickerItemText}>{item}</Text>
      {category === item && (
        <Icon name="checkmark" size={20} color="#28a745" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#28a745']}
          tintColor={'#28a745'}
        />
      }
    >
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.categoryHeader}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity 
              style={styles.addCategoryButton}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <Icon name="add" size={20} color="#28a745" />
              <Text style={styles.addCategoryButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.categoryInput}
            onPress={() => {
              if (!loadingCategories) setShowCategoryPicker(true);
            }}
            disabled={loadingCategories}
          >
            {loadingCategories ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <Text style={styles.categoryText}>{category || 'Select a category'}</Text>
                <Icon name="chevron-down" size={20} color="#495057" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter price"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Add Product</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Icon name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item}
            style={styles.pickerList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#28a745']}
                tintColor={'#28a745'}
              />
            }
          />
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        visible={showAddCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddCategoryModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.addCategoryModal}>
          <View style={styles.addCategoryHeader}>
            <Text style={styles.addCategoryTitle}>Add New Category</Text>
            <TouchableOpacity onPress={() => setShowAddCategoryModal(false)}>
              <Icon name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>

          <View style={styles.addCategoryForm}>
            <TextInput
              style={styles.addCategoryInput}
              placeholder="Enter category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoCapitalize="words"
              autoFocus={true}
            />
            
            <TouchableOpacity
              style={styles.addCategorySubmitButton}
              onPress={handleAddCategory}
              disabled={isAddingCategory}
            >
              {isAddingCategory ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.addCategorySubmitButtonText}>Add Category</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 20,
  },
  formContainer: {
    padding: 20,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  addCategoryButtonText: {
    color: '#28a745',
    marginLeft: 5,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
    elevation: 1,
  },
  categoryInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  categoryText: {
    fontSize: 16,
    color: '#212529',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: '50%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  pickerList: {
    paddingHorizontal: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#212529',
  },
  addCategoryModal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    alignSelf: 'center',
    marginTop: '30%',
    elevation: 5,
  },
  addCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  addCategoryForm: {
    width: '100%',
  },
  addCategoryInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
    marginBottom: 20,
    elevation: 1,
  },
  addCategorySubmitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCategorySubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddProductScreen;