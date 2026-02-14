import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import InputScreen from "./src/screens/InputScreen";
import ResultScreen from "./src/screens/ResultScreen";
import CompareScreen from "./src/screens/compareScreen";
import HistoryScreen from "./src/screens/HistoryScreen";

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 36,
          fontWeight: "bold",
        }}
      >
        AffordIQ
      </Text>

      <TouchableOpacity
        style={{
          marginTop: 30,
          backgroundColor: "#14B8A6",
          padding: 15,
          borderRadius: 10,
        }}
        onPress={() => navigation.navigate("Input")}
      >
        <Text style={{ color: "white" }}>Start Analysis</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ marginTop: 15 }}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={{ color: "#14B8A6" }}>View History</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Input" component={InputScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Compare" component={CompareScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
