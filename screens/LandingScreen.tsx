// import React from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { RootStackParamList } from '../App'; // adjust if you export types from another file

// type LandingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LandingScreen'>;

// const LandingScreen: React.FC = () => {
//   const navigation = useNavigation<LandingScreenNavigationProp>();

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Welcome to JrPrinter</Text>
//       <Text style={styles.subtitle}>Choose an option to continue</Text>

//       {/* <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigation.navigate('AddCustomer')}
//       >
//         <Text style={styles.buttonText}>Add Customer</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigation.navigate('ListCustomer')}
//       >
//         <Text style={styles.buttonText}>List Customer</Text>
//       </TouchableOpacity> */}
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigation.navigate('Bluetooth')}
//       >
//         <Text style={styles.buttonText}>Bluetooth Printer</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => navigation.navigate('Order', { device : 11 })}
//       >
//         <Text style={styles.buttonText}>Order Screen</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default LandingScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     paddingHorizontal: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 18,
//     color: '#666',
//     marginBottom: 30,
//   },
//   button: {
//     backgroundColor: '#007bff',
//     paddingVertical: 14,
//     paddingHorizontal: 32,
//     borderRadius: 8,
//     marginBottom: 20,
//     width: '80%',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 18,
//     textAlign: 'center',
//   },
// });
