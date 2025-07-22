import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable
} from 'react-native';
import {
  LineChart
} from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DataTable } from 'react-native-paper';

type SalesData = {
  labels: string[];
  datasets: {
    data: number[];
  }[];
};

type ItemSales = {
  item: string;
  total_sales: number;
  amount: number;
};

type ItemHourlySales = {
  labels: string[];
  datasets: {
    data: number[];
  }[];
};

const DashboardScreen = () => {
  const [todayData, setTodayData] = useState<SalesData | null>(null);
  const [monthData, setMonthData] = useState<SalesData | null>(null);
  const [yearData, setYearData] = useState<SalesData | null>(null);
  const [itemSales, setItemSales] = useState<ItemSales[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [itemHourlyData, setItemHourlyData] = useState<ItemHourlySales | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [todayScrollPosition, setTodayScrollPosition] = useState(0);
  const [monthScrollPosition, setMonthScrollPosition] = useState(0);
  const [yearScrollPosition, setYearScrollPosition] = useState(0);
  const todayScrollViewRef = React.useRef<ScrollView>(null);
  const monthScrollViewRef = React.useRef<ScrollView>(null);
  const yearScrollViewRef = React.useRef<ScrollView>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [todayRes, monthRes, yearRes, itemSalesRes] = await Promise.all([
        fetch('http://66.103.210.129:8777/api/sales/today/'),
        fetch('http://66.103.210.129:8777/api/sales/this-month/'),
        fetch('http://66.103.210.129:8777/api/sales/this-year/'),
        fetch('http://66.103.210.129:8777/api/yesterday-sales/')
      ]);

      if (!todayRes.ok || !monthRes.ok || !yearRes.ok || !itemSalesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const todayJson = await todayRes.json();
      const monthJson = await monthRes.json();
      const yearJson = await yearRes.json();
      const itemSalesJson = await itemSalesRes.json();

      // Process today's data to format time ranges as 4-5, 5-6, etc.
      if (todayJson.labels && todayJson.labels.length > 0) {
        const processedTodayData = processTodayData(todayJson);
        setTodayData(processedTodayData);
      } else {
        setTodayData(todayJson);
      }

      // Process month names to short format (Jan, Feb, etc.)
      if (yearJson.labels && yearJson.labels.length > 0) {
        const processedYearData = processYearData(yearJson);
        setYearData(processedYearData);
      } else {
        setYearData(yearJson);
      }

      // Set month data directly
      setMonthData(monthJson);
      
      // Set item sales data
      setItemSales(itemSalesJson);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchItemHourlyData = async (itemName: string) => {
    try {
      setItemLoading(true);
      const response = await fetch(
        `http://66.103.210.129:8777/api/sales/item-hourly/${encodeURIComponent(itemName)}/`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch item data');
      }
      
      const data = await response.json();
      
      // Process the hourly data
      if (data.labels && data.labels.length > 0) {
        const processedData = {
          labels: data.labels,
          datasets: [{
            data: data.datasets[1].data // Using amount data (₹)
          }]
        };
        setItemHourlyData(processedData);
      } else {
        setItemHourlyData(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load item data');
      setItemHourlyData(null);
    } finally {
      setItemLoading(false);
    }
  };

  // Format hourly data as 4-5, 5-6, etc.
  const processTodayData = (data: SalesData): SalesData => {
    const newLabels = [];
    for (let i = 0; i < data.labels.length; i++) {
      if (i < data.labels.length - 1) {
        newLabels.push(`${data.labels[i]}-${data.labels[i + 1]}`);
      } else {
        newLabels.push(data.labels[i]);
      }
    }

    return {
      labels: newLabels,
      datasets: data.datasets
    };
  };

  // Format month names to short format (Jan, Feb, etc.)
  const processYearData = (data: SalesData): SalesData => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const newLabels = data.labels.map(label => {
      const monthIndex = parseInt(label) - 1;
      return monthNames[monthIndex] || label;
    });

    return {
      labels: newLabels,
      datasets: data.datasets
    };
  };

  const handleItemPress = (item: string) => {
    setSelectedItem(item);
    setModalVisible(true);
    fetchItemHourlyData(item);
  };

  const getPeakHour = () => {
    if (!itemHourlyData || !itemHourlyData.datasets[0].data.length) return 'N/A';
    
    const maxValue = Math.max(...itemHourlyData.datasets[0].data);
    const peakIndex = itemHourlyData.datasets[0].data.indexOf(maxValue);
    return itemHourlyData.labels[peakIndex] || 'N/A';
  };

  const getTotalRevenue = () => {
    if (!itemHourlyData || !itemHourlyData.datasets[0].data.length) return 0;
    return itemHourlyData.datasets[0].data.reduce((sum, val) => sum + val, 0);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (todayData && todayData.labels && todayData.labels.length > 0) {
      // Calculate scroll position to show the end of the data (most recent)
      const scrollWidth = todayData.labels.length * 50;
      setTimeout(() => {
        todayScrollViewRef.current?.scrollTo({x: scrollWidth, animated: false});
      }, 100);
    }
  }, [todayData]);

  useEffect(() => {
    if (monthData && monthData.labels && monthData.labels.length > 0) {
      // Calculate scroll position to show the end of the data (most recent)
      const scrollWidth = monthData.labels.length * 40;
      setTimeout(() => {
        monthScrollViewRef.current?.scrollTo({x: scrollWidth, animated: false});
      }, 100);
    }
  }, [monthData]);

  useEffect(() => {
    if (yearData && yearData.labels && yearData.labels.length > 0) {
      // Calculate scroll position to show the end of the data (most recent)
      const scrollWidth = yearData.labels.length * 60;
      setTimeout(() => {
        yearScrollViewRef.current?.scrollTo({x: scrollWidth, animated: false});
      }, 100);
    }
  }, [yearData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isEmpty = (data: SalesData | null) => {
    return !data || !data.labels?.length || !data.datasets?.[0]?.data?.length;
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:project.jrtechnologies@gmail.com');
  };

  const handleWebPress = () => {
    Linking.openURL('http://www.jrtechnologiesindia.com/');
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+919600332679');
  };

  // Common chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(106, 99, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#6C63FF'
    },
    propsForLabels: {
      fontSize: 10,
    },
    fillShadowGradient: '#6C63FF',
    fillShadowGradientOpacity: 0.2,
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading Cafe Dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>Oops! Something went wrong</Text>
        <Text style={styles.errorSubText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Icon name="refresh" size={20} color="#FFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6C63FF']}
          tintColor="#6C63FF"
        />
      }
    >
      {/* Today's Sales - Hourly */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Icon name="schedule" size={20} color="#6C63FF" />
          <Text style={styles.chartTitle}>Today's Hourly Sales</Text>
        </View>
        {!isEmpty(todayData) ? (
          <ScrollView
            ref={todayScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollView}
            onScroll={(event) => setTodayScrollPosition(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
          >
            <LineChart
              data={todayData!}
              width={Math.max(Dimensions.get('window').width - 32, todayData!.labels.length * 50)}
              height={250}
              yAxisLabel="₹"
              yAxisSuffix=""
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
              verticalLabelRotation={0}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={5}
              fromZero
            />
          </ScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="hourglass-empty" size={40} color="#999" />
            <Text style={styles.noDataText}>No sales data for today yet</Text>
          </View>
        )}
      </View>

      {/* Item-wise Sales Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Icon name="list-alt" size={20} color="#6C63FF" />
          <Text style={styles.tableTitle}>Yesterday's Item Sales</Text>
        </View>
        
        {itemSales.length > 0 ? (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={styles.tableCell}>Item</DataTable.Title>
              <DataTable.Title numeric style={styles.tableCell}>Count</DataTable.Title>
              <DataTable.Title numeric style={styles.tableCell}>Amount (₹)</DataTable.Title>
            </DataTable.Header>

            {itemSales.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => handleItemPress(item.item)}
                activeOpacity={0.7}
              >
                <DataTable.Row>
                  <DataTable.Cell style={styles.tableCell}>
                    <Text style={styles.itemName}>{item.item}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.tableCell}>
                    {item.total_sales}
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.tableCell}>
                    ₹{item.amount.toFixed(2)}
                  </DataTable.Cell>
                </DataTable.Row>
              </TouchableOpacity>
            ))}
          </DataTable>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="list" size={40} color="#999" />
            <Text style={styles.noDataText}>No item sales data for yesterday</Text>
          </View>
        )}
      </View>

      {/* Monthly Sales - Daily */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Icon name="calendar-today" size={20} color="#6C63FF" />
          <Text style={styles.chartTitle}>Monthly Daily Sales</Text>
        </View>
        {!isEmpty(monthData) ? (
          <ScrollView
            ref={monthScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollView}
            onScroll={(event) => setMonthScrollPosition(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
          >
            <LineChart
              data={monthData!}
              width={Math.max(Dimensions.get('window').width - 32, monthData!.labels.length * 40)}
              height={250}
              yAxisLabel="₹"
              yAxisSuffix=""
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
              verticalLabelRotation={0}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={5}
              fromZero
            />
          </ScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="event-busy" size={40} color="#999" />
            <Text style={styles.noDataText}>No monthly sales data available</Text>
          </View>
        )}
      </View>

      {/* Yearly Sales - Monthly */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Icon name="date-range" size={20} color="#6C63FF" />
          <Text style={styles.chartTitle}>Yearly Monthly Sales</Text>
        </View>
        {!isEmpty(yearData) ? (
          <ScrollView
            ref={yearScrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollView}
            onScroll={(event) => setYearScrollPosition(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
          >
            <LineChart
              data={yearData!}
              width={Math.max(Dimensions.get('window').width - 32, yearData!.labels.length * 60)}
              height={250}
              yAxisLabel="₹"
              yAxisSuffix=""
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
              verticalLabelRotation={0}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={5}
              fromZero
            />
          </ScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="insert-chart-outlined" size={40} color="#999" />
            <Text style={styles.noDataText}>No yearly sales data available</Text>
          </View>
        )}
      </View>

      {/* Contact Information */}
      <View style={styles.contactContainer}>
        <Text style={styles.contactTitle}>Contact Support</Text>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handleEmailPress}
        >
          <Icon name="email" size={20} color="#6C63FF" />
          <Text style={styles.contactText}>project.jrtechnologies@gmail.com</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactItem}
          onPress={handlePhonePress}
        >
          <Icon name="phone" size={20} color="#6C63FF" />
          <Text style={styles.contactText}>+91 96003 32679</Text>
        </TouchableOpacity>
      </View>

      {/* Last Updated */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleString()}
        </Text>
        <TouchableOpacity onPress={handleWebPress}>
          <Text style={styles.developerText}>
            Developed by JR Technologies
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal for Item Hourly Sales */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedItem} - Yesterday's Hourly Sales
              </Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={24} color="#6C63FF" />
              </Pressable>
            </View>
            
            {itemLoading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color="#6C63FF" />
              </View>
            ) : itemHourlyData ? (
              <>
                <ScrollView 
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modalChartContainer}
                >
                  <LineChart
                    data={itemHourlyData}
                    width={Math.max(Dimensions.get('window').width - 64, itemHourlyData.labels.length * 60)}
                    height={250}
                    yAxisLabel="₹"
                    yAxisSuffix=""
                    chartConfig={{
                      ...chartConfig,
                      formatYLabel: (value) => parseInt(value).toLocaleString('en-IN'),
                      propsForLabels: {
                        fontSize: 10,
                      },
                    }}
                    bezier
                    style={styles.modalChart}
                    verticalLabelRotation={0}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    segments={5}
                    fromZero
                  />
                </ScrollView>
                <View style={styles.modalStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Peak Hour</Text>
                    <Text style={styles.statValue}>{getPeakHour()}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Revenue</Text>
                    <Text style={styles.statValue}>
                      ₹{getTotalRevenue().toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Icon name="hourglass-empty" size={40} color="#999" />
                <Text style={styles.noDataText}>No hourly data available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
    paddingBottom: 30
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6C63FF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF6B6B',
    marginTop: 15,
    textAlign: 'center'
  },
  errorSubText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    marginHorizontal: 30,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalChartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  tableCell: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontWeight: '500',
    color: '#333',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  chartScrollView: {
    paddingRight: 16,
  },
  chartStyle: {
    borderRadius: 12,
    marginLeft: -10,
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 10,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  developerText: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    marginLeft: 10,
  },
  modalLoader: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalChart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
});

export default DashboardScreen;