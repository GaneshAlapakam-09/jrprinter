// src/navigation/types.ts
import { BluetoothDevice } from 'react-native-bluetooth-classic';

export type RootStackParamList = {
  Login: undefined;
  Main: { role: string };
  Bluetooth: undefined;
  Order: { deviceId?: string };
  Dashboard: undefined;
  'Add Product': undefined;
  'List Products': undefined;
  'Orders List': undefined;
  'Set Label': undefined;
  'Add Label Product': undefined;
  'Product List': undefined;
  'Stock Inward': undefined;
  
  CustomerSelection: { orderItems: any[], total: number };
  Payment: { orderItems: any[], total: number, customerId?: string | number, customerName?: string, customerPhone?: string };
  ReceiptPreview: { orderItems: any[], total: number, customerId?: string | number, customerName?: string, customerPhone?: string, paymentMode: string, amountPaid: number, partialPayments?: any[] };
  BillingSuccess: { billId?: number, offlineUuid?: string, customerPhone?: string, total?: number };
  
  // Purchases
  AddPurchase: { purchaseId?: number };
  PurchaseDetails: { purchaseId: number };
  PurchaseList: undefined;

  // Suppliers
  AddSupplier: { supplierId?: number };
  SupplierDetails: { supplierId: number };
  SupplierList: undefined;

  // Customers
  AddCustomer: { customerId?: number };
  CustomerDetails: { customerId: number };
  CustomerList: undefined;

  // Reports
  SalesReport: undefined;
  ProductSalesReport: undefined;
  PurchaseReport: undefined;
  StockReport: undefined;
  ProfitLoss: undefined;
  PaymentReport: undefined;

  // Phase 11
  StockLedger: undefined;
  StockAdjustment: undefined;

  // Phase 12
  StoreSettings: undefined;
  TaxSettings: undefined;
  BackupSync: undefined;

  // Phase 13
  EmployeeList: undefined;
  AddEmployee: undefined;
  RolePermissions: undefined;

  // Phase 14
  SyncStatus: undefined;
};
