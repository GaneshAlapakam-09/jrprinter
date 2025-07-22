// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import TabsBasedOnRole from './TabsBasedOnRole';

export type RootStackParamList = {
  Login: undefined;
  Main: { role: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={TabsBasedOnRole} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
