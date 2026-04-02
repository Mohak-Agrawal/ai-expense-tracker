import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ExpenseTrackerScreen from './src/screens/ExpenseTrackerScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ExpenseTrackerScreen />
    </GestureHandlerRootView>
  );
}