import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList } from '../navigation/types';
import TabsBasedOnRole from './TabsBasedOnRole';
import SetLabelScreen from '../screens/Labels/SetLabelScreen';
import AddLabelProductScreen from '../screens/Labels/AddLabelProductScreen';
import ListLabelProductScreen from '../screens/Labels/ListLabelProductScreen';
import StockInwardScreen from '../screens/Inventory/StockInwardScreen';

import PurchaseListScreen from '../screens/Purchase/PurchaseListScreen';
import SupplierListScreen from '../screens/Suppliers/SupplierListScreen';
import CustomerListScreen from '../screens/Customers/CustomerListScreen';
import SalesReportScreen from '../screens/Reports/SalesReportScreen';
import ProductSalesReportScreen from '../screens/Reports/ProductSalesReportScreen';
import StockReportScreen from '../screens/Reports/StockReportScreen';
import ProfitLossScreen from '../screens/Reports/ProfitLossScreen';
import PaymentReportScreen from '../screens/Reports/PaymentReportScreen';

import StockLedgerScreen from '../screens/StockLedger/StockLedgerScreen';
import StoreSettingsScreen from '../screens/Settings/StoreSettingsScreen';
import TaxSettingsScreen from '../screens/Settings/TaxSettingsScreen';
import BackupSyncScreen from '../screens/Settings/BackupSyncScreen';

import EmployeeListScreen from '../screens/Employees/EmployeeListScreen';
import SyncStatusScreen from '../screens/Sync/SyncStatusScreen';

export type RootDrawerParamList = {
    HomeTabs: { role: string };
    SetLabel: { userId?: number };
    AddLabelProduct: undefined;
    ListLabelProduct: undefined;
    StockInward: undefined;
    PurchaseList: undefined;
    SupplierList: undefined;
    CustomerList: undefined;
    SalesReport: undefined;
    ProductSalesReport: undefined;
    StockReport: undefined;
    ProfitLoss: undefined;
    PaymentReport: undefined;
    StockLedger: undefined;
    StoreSettings: undefined;
    TaxSettings: undefined;
    BackupSync: undefined;
    EmployeeList: undefined;
    SyncStatus: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const DrawerNavigator: React.FC<Props> = ({ route }) => {
    const { role } = route.params;

    return (
        <Drawer.Navigator
            screenOptions={{
                headerShown: true, // We will show header here containing the hamburger menu
            }}
        >
            <Drawer.Screen
                name="HomeTabs"
                component={TabsBasedOnRole as any}
                initialParams={{ role }}
                options={{
                    title: 'Home',
                    drawerIcon: ({ color, size }) => (
                        <Icon name="home" size={size} color={color} />
                    ),
                    headerShown: false, // Tabs usually have their own headers, but we might need to adjust based on structure
                }}
            />
            <Drawer.Screen
                name="SetLabel"
                component={SetLabelScreen as any}
                initialParams={{ userId: 1 }}
                options={{
                    title: 'Set Label',
                    drawerIcon: ({ color, size }) => (
                        <Icon name="print" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="AddLabelProduct"
                component={AddLabelProductScreen}
                options={{
                    title: 'Add Label Product',
                    drawerIcon: ({ color, size }) => (
                        <Icon name="add-box" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="ListLabelProduct"
                component={ListLabelProductScreen}
                options={{
                    title: 'Product List',
                    drawerIcon: ({ color, size }) => (
                        <Icon name="library-books" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="StockInward"
                component={StockInwardScreen}
                options={{
                    title: 'Stock Inward',
                    drawerIcon: ({ color, size }) => <Icon name="archive" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="PurchaseList"
                component={PurchaseListScreen as any}
                options={{
                    title: 'Purchases',
                    drawerIcon: ({ color, size }) => <Icon name="shopping-cart" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="SupplierList"
                component={SupplierListScreen as any}
                options={{
                    title: 'Suppliers',
                    drawerIcon: ({ color, size }) => <Icon name="local-shipping" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="CustomerList"
                component={CustomerListScreen as any}
                options={{
                    title: 'Customers',
                    drawerIcon: ({ color, size }) => <Icon name="people" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="SalesReport"
                component={SalesReportScreen as any}
                options={{
                    title: 'Sales Report',
                    drawerIcon: ({ color, size }) => <Icon name="bar-chart" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="ProductSalesReport"
                component={ProductSalesReportScreen as any}
                options={{
                    title: 'Top Products',
                    drawerIcon: ({ color, size }) => <Icon name="star" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="StockReport"
                component={StockReportScreen as any}
                options={{
                    title: 'Stock Health',
                    drawerIcon: ({ color, size }) => <Icon name="inventory" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="ProfitLoss"
                component={ProfitLossScreen as any}
                options={{
                    title: 'Profit & Loss',
                    drawerIcon: ({ color, size }) => <Icon name="account-balance" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="PaymentReport"
                component={PaymentReportScreen as any}
                options={{
                    title: 'Collections',
                    drawerIcon: ({ color, size }) => <Icon name="payments" size={size} color={color} />,
                }}
            />
            {/* Phase 11 & 12 */}
            <Drawer.Screen
                name="StockLedger"
                component={StockLedgerScreen as any}
                options={{
                    title: 'Stock Ledger',
                    drawerIcon: ({ color, size }) => <Icon name="format-list-numbered" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="StoreSettings"
                component={StoreSettingsScreen as any}
                options={{
                    title: 'Store Settings',
                    drawerIcon: ({ color, size }) => <Icon name="storefront" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="TaxSettings"
                component={TaxSettingsScreen as any}
                options={{
                    title: 'Tax Settings',
                    drawerIcon: ({ color, size }) => <Icon name="receipt" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="BackupSync"
                component={BackupSyncScreen as any}
                options={{
                    title: 'Backup settings',
                    drawerIcon: ({ color, size }) => <Icon name="backup" size={size} color={color} />,
                }}
            />
            {/* Phase 13 & 14 */}
            <Drawer.Screen
                name="EmployeeList"
                component={EmployeeListScreen as any}
                options={{
                    title: 'Staff Directory',
                    drawerIcon: ({ color, size }) => <Icon name="badge" size={size} color={color} />,
                }}
            />
            <Drawer.Screen
                name="SyncStatus"
                component={SyncStatusScreen as any}
                options={{
                    title: 'Sync Engine',
                    drawerIcon: ({ color, size }) => <Icon name="cloud-sync" size={size} color={color} />,
                }}
            />
        </Drawer.Navigator>
    );
};

export default DrawerNavigator;
