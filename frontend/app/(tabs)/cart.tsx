import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Alert,
  Animated,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PharmacyColors, CommonStyles } from '../../constants/Colors';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.43.240:8000';

interface Order {
  order_id: string;
  medication_name: string | null;
  prescription_image: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  quantity: number;
  created_at: string;
  updated_at: string;
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fadeAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Required',
          text2: 'Please log in to view your orders',
          position: 'top',
        });
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/orders/my-orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        // Add quantity field to orders (default 1)
        const ordersWithQuantity = data.orders.map((order: any) => ({
          ...order,
          quantity: order.quantity || 1,
        }));
        setOrders(ordersWithQuantity);
        
        // Initialize animations for each order
        ordersWithQuantity.forEach((order: Order) => {
          if (!fadeAnims[order.order_id]) {
            fadeAnims[order.order_id] = new Animated.Value(0);
            scaleAnims[order.order_id] = new Animated.Value(0.8);
          }
        });
        
        // Animate cards
        animateCards(ordersWithQuantity);
      } else {
        throw new Error(data.detail || 'Failed to fetch orders');
      }
    } catch (error: any) {
      console.error('Fetch orders error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to load orders',
        position: 'top',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const animateCards = (ordersList: Order[]) => {
    const animations = ordersList.map((order, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnims[order.order_id], {
          toValue: 1,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[order.order_id], {
          toValue: 1,
          delay: index * 100,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(50, animations).start();
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const updateQuantity = async (orderId: string, change: number) => {
  const order = orders.find(o => o.order_id === orderId);
  if (!order) return;

  const newQuantity = Math.max(1, Math.min(99, order.quantity + change));

  try {
    const token = await AsyncStorage.getItem('userToken');
    
    const response = await fetch(
      `${API_URL}/api/v1/orders/update-quantity/${orderId}?quantity=${newQuantity}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o => {
          if (o.order_id === orderId) {
            // Animate the change
            Animated.sequence([
              Animated.spring(scaleAnims[orderId], {
                toValue: 1.05,
                tension: 100,
                friction: 3,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnims[orderId], {
                toValue: 1,
                tension: 100,
                friction: 3,
                useNativeDriver: true,
              }),
            ]).start();

            return { ...o, quantity: newQuantity };
          }
          return o;
        })
      );

      Toast.show({
        type: 'success',
        text1: 'Quantity Updated',
        text2: `Changed from ${data.old_quantity} to ${data.new_quantity}`,
        position: 'top',
        visibilityTime: 1500,
      });
    } else {
      throw new Error(data.detail || 'Failed to update quantity');
    }
  } catch (error: any) {
    console.error('Update quantity error:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: error.message || 'Failed to update quantity',
      position: 'top',
    });
  }
};

const deleteOrder = async (orderId: string) => {
  const orderToDelete = orders.find(order => order.order_id === orderId);
  if (!orderToDelete) return;

  Alert.alert(
    'Delete Order',
    `Are you sure you want to delete order ${orderId}?`,
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Animate out
            Animated.parallel([
              Animated.timing(fadeAnims[orderId], {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnims[orderId], {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();

            const token = await AsyncStorage.getItem('userToken');
            
            const response = await fetch(
              `${API_URL}/api/v1/orders/delete/${orderId}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              }
            );

            const data = await response.json();

            if (response.ok) {
              setTimeout(() => {
                setOrders(prevOrders => 
                  prevOrders.filter(order => order.order_id !== orderId)
                );
                
                Toast.show({
                  type: 'success',
                  text1: 'Order Deleted',
                  text2: data.message,
                  position: 'top',
                  visibilityTime: 2000,
                });
              }, 300);
            } else {
              throw new Error(data.detail || 'Failed to delete order');
            }
          } catch (error: any) {
            console.error('Delete order error:', error);
            
            // Restore animation
            Animated.parallel([
              Animated.timing(fadeAnims[orderId], {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnims[orderId], {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();

            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: error.message || 'Failed to delete order',
              position: 'top',
            });
          }
        }
      }
    ]
  );
};

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return PharmacyColors.warning || '#FFA500';
      case 'processing':
        return PharmacyColors.info || '#2196F3';
      case 'completed':
        return PharmacyColors.success;
      case 'cancelled':
        return PharmacyColors.error;
      default:
        return PharmacyColors.gray;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'time-outline';
      case 'processing':
        return 'hourglass-outline';
      case 'completed':
        return 'checkmark-circle-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />
        <LinearGradient colors={PharmacyColors.gradientPrimary} style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PharmacyColors.accent} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PharmacyColors.primary} />
    

      {orders.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={PharmacyColors.accent} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Your orders will appear here</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[PharmacyColors.accent]}
              tintColor={PharmacyColors.accent}
            />
          }
        >
          <View style={styles.ordersContainer}>
            {orders.map((order) => {
              const fadeAnim = fadeAnims[order.order_id] || new Animated.Value(1);
              const scaleAnim = scaleAnims[order.order_id] || new Animated.Value(1);

              return (
                <Animated.View
                  key={order.order_id}
                  style={[
                    styles.orderCard,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  {/* Header Row */}
                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderLeft}>
                      <Ionicons name="receipt" size={20} color={PharmacyColors.accent} />
                      <Text style={styles.orderId} numberOfLines={1}>
                        {order.order_id}
                      </Text>
                    </View>
                    
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { borderColor: getStatusColor(order.status) }]}>
                      <Ionicons 
                        name={getStatusIcon(order.status) as any} 
                        size={14} 
                        color={getStatusColor(order.status)} 
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Medicine Info */}
                  <View style={styles.medicineInfo}>
                    <View style={styles.medicineIcon}>
                      <LinearGradient
                        colors={PharmacyColors.gradientAccent}
                        style={styles.iconGradient}
                      >
                        <Ionicons 
                          name={order.prescription_image ? "camera" : "medical"} 
                          size={24} 
                          color={PharmacyColors.white} 
                        />
                      </LinearGradient>
                    </View>
                    
                    <View style={styles.medicineDetails}>
                      <Text style={styles.medicineName}>
                        {order.medication_name || 'Prescription Order'}
                      </Text>
                      {order.prescription_image && (
                        <View style={styles.prescriptionTag}>
                          <Ionicons name="document-text" size={12} color={PharmacyColors.accent} />
                          <Text style={styles.prescriptionText}>Prescription attached</Text>
                        </View>
                      )}
                      <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    </View>
                  </View>

                  {/* Quantity Controls & Actions */}
                  <View style={styles.orderFooter}>
                    {/* Quantity Controls */}
                    <View style={styles.quantityContainer}>
                      <Text style={styles.quantityLabel}>Qty:</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(order.order_id, -1)}
                        disabled={order.quantity <= 1}
                      >
                        <Ionicons 
                          name="remove" 
                          size={18} 
                          color={order.quantity <= 1 ? PharmacyColors.gray : PharmacyColors.accent} 
                        />
                      </TouchableOpacity>
                      
                      <View style={styles.quantityDisplay}>
                        <Text style={styles.quantityText}>{order.quantity}</Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(order.order_id, 1)}
                        disabled={order.quantity >= 99}
                      >
                        <Ionicons 
                          name="add" 
                          size={18} 
                          color={order.quantity >= 99 ? PharmacyColors.gray : PharmacyColors.accent} 
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteOrder(order.order_id)}
                    >
                      <Ionicons name="trash-outline" size={22} color={PharmacyColors.error} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PharmacyColors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PharmacyColors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: PharmacyColors.white,
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: PharmacyColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PharmacyColors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: PharmacyColors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: PharmacyColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...CommonStyles.shadow,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PharmacyColors.borderGray,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: PharmacyColors.white,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  medicineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicineIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginRight: 12,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineDetails: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: PharmacyColors.textPrimary,
    marginBottom: 4,
  },
  prescriptionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prescriptionText: {
    fontSize: 12,
    color: PharmacyColors.accent,
    marginLeft: 4,
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 13,
    color: PharmacyColors.textSecondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: PharmacyColors.textSecondary,
    marginRight: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PharmacyColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    minWidth: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: PharmacyColors.textPrimary,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PharmacyColors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});