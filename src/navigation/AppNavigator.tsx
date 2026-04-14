// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './types';

import LoginScreen from '../screens/Auth/LoginScreen';
import DrawerNavigator from './DrawerNavigator';
import CustomerSelectionScreen from '../screens/Billing/CustomerSelectionScreen';
import PaymentScreen from '../screens/Billing/PaymentScreen';
import ReceiptPreviewScreen from '../screens/Billing/ReceiptPreviewScreen';
import BillingSuccessScreen from '../screens/Billing/BillingSuccessScreen';

// Purchases
import AddPurchaseScreen from '../screens/Purchase/AddPurchaseScreen';
import PurchaseDetailsScreen from '../screens/Purchase/PurchaseDetailsScreen';
import PurchaseListScreen from '../screens/Purchase/PurchaseListScreen';

// Suppliers
import AddSupplierScreen from '../screens/Suppliers/AddSupplierScreen';
import SupplierDetailsScreen from '../screens/Suppliers/SupplierDetailsScreen';
import SupplierListScreen from '../screens/Suppliers/SupplierListScreen';

// Customers
import AddCustomerScreen from '../screens/Customers/AddCustomerScreen';
import CustomerDetailsScreen from '../screens/Customers/CustomerDetailsScreen';
import CustomerListScreen from '../screens/Customers/CustomerListScreen';

// Reports
import SalesReportScreen from '../screens/Reports/SalesReportScreen';
import ProductSalesReportScreen from '../screens/Reports/ProductSalesReportScreen';
import PurchaseReportScreen from '../screens/Reports/PurchaseReportScreen';
import StockReportScreen from '../screens/Reports/StockReportScreen';
import ProfitLossScreen from '../screens/Reports/ProfitLossScreen';
import PaymentReportScreen from '../screens/Reports/PaymentReportScreen';

// Phase 11
import StockLedgerScreen from '../screens/StockLedger/StockLedgerScreen';
import StockAdjustmentScreen from '../screens/StockLedger/StockAdjustmentScreen';

// Phase 12
import StoreSettingsScreen from '../screens/Settings/StoreSettingsScreen';
import TaxSettingsScreen from '../screens/Settings/TaxSettingsScreen';
import BackupSyncScreen from '../screens/Settings/BackupSyncScreen';

// Phase 13
import EmployeeListScreen from '../screens/Employees/EmployeeListScreen';
import AddEmployeeScreen from '../screens/Employees/AddEmployeeScreen';
import RolePermissionsScreen from '../screens/Employees/RolePermissionsScreen';

// Phase 14
import SyncStatusScreen from '../screens/Sync/SyncStatusScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator as any} />
        <Stack.Screen name="CustomerSelection" component={CustomerSelectionScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="ReceiptPreview" component={ReceiptPreviewScreen} />
        <Stack.Screen name="BillingSuccess" component={BillingSuccessScreen} />
        
        {/* Module Screens */}
        <Stack.Screen name="AddPurchase" component={AddPurchaseScreen as any} />
        <Stack.Screen name="PurchaseDetails" component={PurchaseDetailsScreen as any} />
        <Stack.Screen name="PurchaseList" component={PurchaseListScreen as any} />

        <Stack.Screen name="AddSupplier" component={AddSupplierScreen as any} />
        <Stack.Screen name="SupplierDetails" component={SupplierDetailsScreen as any} />
        <Stack.Screen name="SupplierList" component={SupplierListScreen as any} />

        <Stack.Screen name="AddCustomer" component={AddCustomerScreen as any} />
        <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen as any} />
        <Stack.Screen name="CustomerList" component={CustomerListScreen as any} />

        {/* Reports Screens */}
        <Stack.Screen name="SalesReport" component={SalesReportScreen as any} />
        <Stack.Screen name="ProductSalesReport" component={ProductSalesReportScreen as any} />
        <Stack.Screen name="PurchaseReport" component={PurchaseReportScreen as any} />
        <Stack.Screen name="StockReport" component={StockReportScreen as any} />
        <Stack.Screen name="ProfitLoss" component={ProfitLossScreen as any} />
        <Stack.Screen name="PaymentReport" component={PaymentReportScreen as any} />

        {/* Phase 11 & 12 */}
        <Stack.Screen name="StockLedger" component={StockLedgerScreen as any} />
        <Stack.Screen name="StockAdjustment" component={StockAdjustmentScreen as any} />
        <Stack.Screen name="StoreSettings" component={StoreSettingsScreen as any} />
        <Stack.Screen name="TaxSettings" component={TaxSettingsScreen as any} />
        <Stack.Screen name="BackupSync" component={BackupSyncScreen as any} />

        {/* Phase 13 & 14 */}
        <Stack.Screen name="EmployeeList" component={EmployeeListScreen as any} />
        <Stack.Screen name="AddEmployee" component={AddEmployeeScreen as any} />
        <Stack.Screen name="RolePermissions" component={RolePermissionsScreen as any} />
        <Stack.Screen name="SyncStatus" component={SyncStatusScreen as any} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
