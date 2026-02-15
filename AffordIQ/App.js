import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
          fontSize: 34,
          fontWeight: "700",
          color: "#FFFFFF",
        }}
      >
        AffordIQ
      </Text>

      <Text
        style={{
          marginTop: 8,
          fontSize: 14,
          color: "#64748B",
          textAlign: "center",
        }}
      >
        Smart Loan Decisions. Instantly.
      </Text>

      <TouchableOpacity
        style={{
          marginTop: 30,
          backgroundColor: "#14B8A6",
          paddingVertical: 15,
          paddingHorizontal: 30,
          borderRadius: 10,
        }}
        onPress={() => navigation.navigate("Input")}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>
          Start Analysis
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ marginTop: 15 }}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={{ color: "#14B8A6", fontWeight: "600" }}>
          View History
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          position: "absolute",
          bottom: 20,
          alignSelf: "center",
          color: "#334155",
          fontSize: 12,
        }}
      >
        Version 1.0.0
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#0F172A" },
            headerTintColor: "#FFFFFF",
            contentStyle: { backgroundColor: "#0F172A" },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Input"
            component={InputScreen}
            options={{ title: "AffordIQ" }}
          />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{ title: "Analysis Result" }}
          />
          <Stack.Screen
            name="Compare"
            component={CompareScreen}
            options={{ title: "Comparison" }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: "History" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
