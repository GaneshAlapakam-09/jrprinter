import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, 
         startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import api from '../api/axios';
import { Colors, Fonts, Sizes } from '../constants/theme';

type Order = {
  id: number;
  date: string;
  total_amount: number;
  payment_mode: string | null;
  items?: Array<{
    id: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
};

type FilterOption = 'all' | 'today' | 'week' | 'month' | 'sixMonths';

const ListOrderScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [revenueData, setRevenueData] = useState({
    total: 0,
    cash: 0,
    upi: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await api.get('/orders');
      setOrders(response.data);
      setFilteredOrders(response.data);
      calculateRevenue(response.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
      setFilteredOrders([]);
      setRevenueData({ total: 0, cash: 0, upi: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateRevenue = (ordersList: Order[]) => {
    let total = 0;
    let cash = 0;
    let upi = 0;

    ordersList.forEach(order => {
      total += order.total_amount;
      if (order.payment_mode?.toLowerCase().includes('cash')) {
        cash += order.total_amount;
      } else if (order.payment_mode?.toLowerCase().includes('upi')) {
        upi += order.total_amount;
      }
    });

    setRevenueData({
      total: parseFloat(total.toFixed(2)),
      cash: parseFloat(cash.toFixed(2)),
      upi: parseFloat(upi.toFixed(2)),
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilter(activeFilter);
  }, [orders, activeFilter]);

  const applyFilter = (filter: FilterOption) => {
    if (!orders.length) return;

    const now = new Date();
    let filtered: Order[] = [];

    switch (filter) {
      case 'today':
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        filtered = orders.filter(order => 
          isWithinInterval(new Date(order.date), { start: todayStart, end: todayEnd })
        );
        break;
      
      case 'week':
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        filtered = orders.filter(order => 
          isWithinInterval(new Date(order.date), { start: weekStart, end: weekEnd })
        );
        break;
      
      case 'month':
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        filtered = orders.filter(order => 
          isWithinInterval(new Date(order.date), { start: monthStart, end: monthEnd })
        );
        break;
      
      case 'sixMonths':
        const sixMonthsAgo = subDays(now, 180);
        filtered = orders.filter(order => 
          new Date(order.date) >= sixMonthsAgo
        );
        break;
      
      default:
        filtered = [...orders];
        break;
    }

    setFilteredOrders(filtered);
    calculateRevenue(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const itemCount = item.items?.length || 0;
    const paymentMode = item.payment_mode || 'Not specified';
    
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleOrderPress(item)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.orderNumber}>Order #{item.id}</Text>
          <Text style={styles.orderDate}>
            {format(new Date(item.date), 'dd MMM yyyy, hh:mm a')}
          </Text>
        </View>
        
        {item.items && item.items.length > 0 && (
          <View style={styles.itemsSummary}>
            <Text style={styles.itemsHeader}>Items ({itemCount}):</Text>
            {item.items.slice(0, 3).map((orderItem) => (
              <View key={orderItem.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {orderItem.product_name} (x{orderItem.quantity})
                </Text>
                <Text style={styles.itemPrice}>₹{orderItem.price.toFixed(2)}</Text>
              </View>
            ))}
            {item.items.length > 3 && (
              <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>
            )}
          </View>
        )}
        
        <View style={styles.itemFooter}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.totalAmount}>₹{item.total_amount.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={[
              styles.detailValue,
              paymentMode.toLowerCase().includes('cash') && styles.cashPayment,
              paymentMode.toLowerCase().includes('upi') && styles.upiPayment
            ]}>
              {paymentMode}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ label, value }: { label: string; value: FilterOption }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === value && styles.activeFilterButton
      ]}
      onPress={() => setActiveFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        activeFilter === value && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const RevenueCard = ({ title, amount, color }: { title: string; amount: number; color: string }) => (
    <View style={[styles.revenueCard, { borderLeftColor: color }]}>
      <Text style={styles.revenueTitle}>{title}</Text>
      <Text style={styles.revenueAmount}>₹{amount.toFixed(2)}</Text>
    </View>
  );

  const renderOrderDetailsModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <TouchableWithoutFeedback onPress={closeModal}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedOrder && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order #{selectedOrder.id}</Text>
                <Text style={styles.modalDate}>
                  {format(new Date(selectedOrder.date), 'dd MMM yyyy, hh:mm a')}
                </Text>
              </View>
              
              <ScrollView style={styles.modalItemsContainer}>
                {selectedOrder.items?.map((item) => (
                  <View key={item.id} style={styles.modalItemRow}>
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.product_name}</Text>
                      <Text style={styles.modalItemQuantity}>x{item.quantity}</Text>
                    </View>
                    <Text style={styles.modalItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                ))}
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <View style={styles.modalTotalRow}>
                  <Text style={styles.modalTotalLabel}>Total:</Text>
                  <Text style={styles.modalTotalAmount}>₹{selectedOrder.total_amount.toFixed(2)}</Text>
                </View>
                <View style={styles.modalPaymentRow}>
                  <Text style={styles.modalPaymentLabel}>Payment Method:</Text>
                  <Text style={[
                    styles.modalPaymentValue,
                    selectedOrder.payment_mode?.toLowerCase().includes('cash') && styles.cashPayment,
                    selectedOrder.payment_mode?.toLowerCase().includes('upi') && styles.upiPayment
                  ]}>
                    {selectedOrder.payment_mode || 'Not specified'}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={closeModal}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchOrders} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <FilterButton label="All" value="all" />
        <FilterButton label="Today" value="today" />
        <FilterButton label="This Week" value="week" />
        <FilterButton label="This Month" value="month" />
        <FilterButton label="Last 6 Months" value="sixMonths" />
      </ScrollView>

      <View style={styles.revenueContainer}>
        <RevenueCard title="Total Revenue" amount={revenueData.total} color={Colors.primary} />
        <RevenueCard title="Cash" amount={revenueData.cash} color={Colors.success} />
        <RevenueCard title="UPI" amount={revenueData.upi} color={Colors.secondary} />
      </View>
      
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          ListFooterComponent={<View style={styles.footer} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySubText}>
            {activeFilter === 'all' 
              ? "You haven't placed any orders yet" 
              : `No orders for this ${activeFilter === 'today' ? 'day' : 
                 activeFilter === 'week' ? 'week' : 
                 activeFilter === 'month' ? 'month' : 'period'}`}
          </Text>
        </View>
      )}
      
      {renderOrderDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Sizes.padding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Fonts.h2.fontSize,
    fontWeight: Fonts.h2.fontWeight,
    color: Colors.primaryText,
    marginVertical: Sizes.padding,
  },
  filterContainer: {
    paddingBottom: Sizes.base,
    marginBottom: Sizes.base,
    paddingTop: Sizes.padding,
    paddingRight: Sizes.padding,
  },
  filterButton: {
    paddingHorizontal: Sizes.padding,
    paddingVertical: Sizes.base,
    borderRadius: Sizes.radius,
    backgroundColor: Colors.lightGray,
    marginRight: Sizes.base,
    height: 40,
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: Fonts.body.fontSize,
    color: Colors.secondaryText,
  },
  activeFilterButtonText: {
    color: Colors.white,
  },
  revenueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Sizes.padding,
    marginBottom: Sizes.padding,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Sizes.radius,
    padding: Sizes.base,
    marginRight: Sizes.base,
    borderLeftWidth: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueTitle: {
    fontSize: Fonts.caption.fontSize,
    color: Colors.secondaryText,
    marginBottom: Sizes.base / 2,
  },
  revenueAmount: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.primaryText,
  },
  listContent: {
    paddingBottom: Sizes.padding * 2,
  },
  itemContainer: {
    backgroundColor: Colors.white,
    borderRadius: Sizes.radius,
    padding: Sizes.padding,
    marginBottom: Sizes.padding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Sizes.base,
  },
  orderNumber: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.primaryText,
  },
  orderDate: {
    fontSize: Fonts.caption.fontSize,
    fontWeight: Fonts.caption.fontWeight,
    color: Colors.secondaryText,
  },
  itemsSummary: {
    marginBottom: Sizes.base,
  },
  itemsHeader: {
    fontSize: Fonts.body.fontSize,
    fontWeight: Fonts.body.fontWeight,
    color: Colors.primaryText,
    marginBottom: Sizes.base / 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.base / 2,
  },
  itemName: {
    fontSize: Fonts.body.fontSize,
    color: Colors.secondaryText,
    flex: 2,
  },
  itemPrice: {
    fontSize: Fonts.body.fontSize,
    color: Colors.primaryText,
    flex: 1,
    textAlign: 'right',
  },
  moreItems: {
    fontSize: Fonts.caption.fontSize,
    color: Colors.secondaryText,
    fontStyle: 'italic',
  },
  itemFooter: {
    marginTop: Sizes.base,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: Sizes.base,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.base / 2,
  },
  detailLabel: {
    fontSize: Fonts.body.fontSize,
    color: Colors.secondaryText,
  },
  detailValue: {
    fontSize: Fonts.body.fontSize,
    color: Colors.primaryText,
  },
  cashPayment: {
    color: Colors.success,
  },
  upiPayment: {
    color: Colors.secondary,
  },
  totalAmount: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.primary,
  },
  footer: {
    height: Sizes.padding * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Sizes.padding * 4,
  },
  emptyText: {
    fontSize: Fonts.h3.fontSize,
    fontWeight: Fonts.h3.fontWeight,
    color: Colors.primaryText,
    marginBottom: Sizes.base / 2,
  },
  emptySubText: {
    fontSize: Fonts.body.fontSize,
    color: Colors.secondaryText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sizes.padding,
  },
  errorText: {
    fontSize: Fonts.body.fontSize,
    color: Colors.danger,
    marginBottom: Sizes.padding,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Sizes.padding * 2,
    paddingVertical: Sizes.base,
    borderRadius: Sizes.radius,
  },
  retryButtonText: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.white,
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
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Sizes.radius * 2,
    width: '90%',
    maxHeight: '80%',
    padding: Sizes.padding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: Sizes.base,
    marginBottom: Sizes.base,
  },
  modalTitle: {
    fontSize: Fonts.h3.fontSize,
    fontWeight: Fonts.h3.fontWeight,
    color: Colors.primaryText,
    textAlign: 'center',
  },
  modalDate: {
    fontSize: Fonts.caption.fontSize,
    color: Colors.secondaryText,
    textAlign: 'center',
    marginTop: Sizes.base / 2,
  },
  modalItemsContainer: {
    maxHeight: '60%',
    marginBottom: Sizes.base,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Sizes.base / 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  modalItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  modalItemName: {
    fontSize: Fonts.body.fontSize,
    color: Colors.primaryText,
  },
  modalItemQuantity: {
    fontSize: Fonts.caption.fontSize,
    color: Colors.secondaryText,
    marginLeft: Sizes.base,
  },
  modalItemPrice: {
    fontSize: Fonts.body.fontSize,
    color: Colors.primaryText,
    flex: 1,
    textAlign: 'right',
  },
  modalFooter: {
    marginTop: Sizes.base,
    paddingTop: Sizes.base,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Sizes.base / 2,
  },
  modalTotalLabel: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.primaryText,
  },
  modalTotalAmount: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.primary,
  },
  modalPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalPaymentLabel: {
    fontSize: Fonts.body.fontSize,
    color: Colors.secondaryText,
  },
  modalPaymentValue: {
    fontSize: Fonts.body.fontSize,
    color: Colors.primaryText,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Sizes.radius,
    padding: Sizes.base,
    marginTop: Sizes.padding,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: Fonts.bodyBold.fontSize,
    fontWeight: Fonts.bodyBold.fontWeight,
    color: Colors.white,
  },
});

export default ListOrderScreen;