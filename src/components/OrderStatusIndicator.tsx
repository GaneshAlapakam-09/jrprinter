// src/components/OrderStatusIndicator.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Sizes } from '../constants/theme';

type Status = 'pending' | 'processing' | 'completed' | 'cancelled';

const statusColors = {
  pending: Colors.warning,
  processing: Colors.secondary,
  completed: Colors.success,
  cancelled: Colors.danger,
};

const statusText = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const OrderStatusIndicator: React.FC<{ status: Status }> = ({ status }) => {
  return (
    <View style={[styles.container, { backgroundColor: statusColors[status] }]}>
      <Text style={styles.text}>{statusText[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Sizes.base,
    paddingVertical: Sizes.base / 2,
    borderRadius: Sizes.radius,
  },
  text: {
    ...Fonts.caption,
    color: Colors.white,
    textTransform: 'capitalize',
  },
});

export default OrderStatusIndicator;