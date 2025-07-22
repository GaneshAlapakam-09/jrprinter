import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Button,
  SafeAreaView,
  RefreshControl,
} from "react-native";

interface Customer {
  Customer_Id: string;
  Name: string;
  Phone: string;
}

const PAGE_SIZES = [5, 10, 20, 50];

const CustomerListScreen = () => {
  const [data, setData] = useState<Customer[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    const loadingState = refreshing ? setRefreshing : setLoading;
    loadingState(true);
    try {
      const response = await fetch("http://juice.jrbilling.in/api/customerlist");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      loadingState(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(data.length / pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const openModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity style={styles.row} onPress={() => openModal(item)}>
      <Text style={styles.cell}>{item.Customer_Id}</Text>
      <Text style={styles.cell}>{item.Name}</Text>
      <Text style={styles.cell}>{item.Phone}</Text>
      <Text style={[styles.cell, styles.viewBtn]}>View</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Customer List</Text>

      <View style={styles.controls}>
        <Text>Show </Text>
        {PAGE_SIZES.map((size) => (
          <TouchableOpacity 
            key={size} 
            onPress={() => handlePageSizeChange(size)}
            style={styles.pageSizeBtn}
          >
            <Text style={[styles.pageSizeText, size === pageSize && styles.activeSize]}>
              {size}
            </Text>
          </TouchableOpacity>
        ))}
        <Text> entries</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.headerCell]}>Customer ID</Text>
        <Text style={[styles.cell, styles.headerCell]}>Name</Text>
        <Text style={[styles.cell, styles.headerCell]}>Phone</Text>
        <Text style={[styles.cell, styles.headerCell]}>Action</Text>
      </View>

      <FlatList
        data={paginatedData}
        renderItem={renderItem}
        keyExtractor={(item) => item.Customer_Id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No customers found</Text>
        }
      />

      <View style={styles.pagination}>
        <TouchableOpacity 
          disabled={currentPage === 1} 
          onPress={() => setCurrentPage((p) => p - 1)}
          style={currentPage === 1 && styles.disabledNav}
        >
          <Text style={styles.navBtn}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          disabled={currentPage === totalPages}
          onPress={() => setCurrentPage((p) => p + 1)}
          style={currentPage === totalPages && styles.disabledNav}
        >
          <Text style={styles.navBtn}>Next</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Customer Details</Text>
            {selectedCustomer && (
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>ID: {selectedCustomer.Customer_Id}</Text>
                <Text style={styles.modalText}>Name: {selectedCustomer.Name}</Text>
                <Text style={styles.modalText}>Phone: {selectedCustomer.Phone}</Text>
              </View>
            )}
            <View style={styles.modalButton}>
              <Button title="Close" onPress={closeModal} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    paddingVertical: 8,
  },
  pageSizeBtn: {
    marginHorizontal: 4,
  },
  pageSizeText: {
    padding: 5,
    borderWidth: 1,
    borderRadius: 4,
    borderColor: "#ccc",
    minWidth: 30,
    textAlign: "center",
  },
  activeSize: {
    backgroundColor: "#007bff",
    color: "#fff",
    borderColor: "#007bff",
  },
  refreshBtn: {
    marginLeft: "auto",
    padding: 5,
  },
  refreshText: {
    color: "#007bff",
    fontWeight: "600",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#ddd",
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 12,
    alignItems: "center",
  },
  cell: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  headerCell: {
    fontWeight: "bold",
    color: "#333",
  },
  viewBtn: {
    color: "#007bff",
    textDecorationLine: "underline",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  pageInfo: {
    color: "#666",
  },
  navBtn: {
    color: "#007bff",
    paddingHorizontal: 10,
  },
  disabledNav: {
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
  modalHeading: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  modalContent: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#444",
  },
  modalButton: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
});

export default CustomerListScreen;