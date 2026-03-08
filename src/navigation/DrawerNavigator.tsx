import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList } from '../navigation/types';
import TabsBasedOnRole from './TabsBasedOnRole';
import SetLabelScreen from '../screens/SetLabelScreen';
import AddLabelProductScreen from '../screens/AddLabelProductScreen';

export type RootDrawerParamList = {
    HomeTabs: { role: string };
    SetLabel: { userId?: number };
    AddLabelProduct: undefined;
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
        </Drawer.Navigator>
    );
};

export default DrawerNavigator;
