// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecordScreen from './screens/RecordScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Inicio">
        <Drawer.Screen name="Inicio" component={HomeScreen} />
        <Drawer.Screen name="Ajustes" component={SettingsScreen} />
        <Drawer.Screen name="Grabar" component={RecordScreen}/>
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
