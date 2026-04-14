// src/navigation/TabsBasedOnRole.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons'; // ✅ import vector icons

import { RootStackParamList } from '../navigation/types';
import { RootTabParamList } from '../types/RootTabParamList';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import AddProductScreen from '../screens/Inventory/AddProductScreen';
import ListProductScreen from '../screens/Inventory/ListProductScreen';
import OrderScreen from '../screens/Billing/OrderScreen';
import ListOrderScreen from '../screens/Billing/ListOrderScreen';
import BluetoothScreen from '../screens/Settings/BluetoothScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const TabsBasedOnRole: React.FC<Props> = ({ route }) => {
  const { role } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Add Product':
              iconName = 'add-box';
              break;
            case 'List Products':
              iconName = 'list';
              break;
            case 'Order':
              iconName = 'shopping-cart';
              break;
            case 'Bluetooth':
              iconName = 'bluetooth';
              break;
            case 'Orders List':
              iconName = 'receipt-long';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      {role === 'admin' && (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Add Product" component={AddProductScreen} />
          <Tab.Screen name="List Products" component={ListProductScreen} />
        </>
      )}
      <Tab.Screen
        name="Order"
        component={OrderScreen}
      />
      <Tab.Screen name="Bluetooth" component={BluetoothScreen} />
      <Tab.Screen name="Orders List" component={ListOrderScreen} />
    </Tab.Navigator>
  );
};

export default TabsBasedOnRole;
