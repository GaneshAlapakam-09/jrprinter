import React from 'react';
import { View, Text, Button } from 'react-native';

export default function ProductItem({ product, onAddToCart }: any) {
  return (
    <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#f2f2f2' }}>
      <Text style={{ fontSize: 16 }}>{product.name} - ₹{product.price}</Text>
      <Button title="Add to Cart" onPress={() => onAddToCart(product)} />
    </View>
  );
}
