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
      <View style={{ alignItems: "center", marginTop: 60 }}>
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
      </View>

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

      <Text
        style={{
          position: "absolute",
          bottom: 20,
          alignSelf: "center",
          color: "#334155",
          fontSize: 12,
        }}
      >
        Version 2.0.0
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0F172A" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: {
            fontWeight: "600",
          },
          headerBackTitleVisible: false, // hides long back text
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
          options={{ title: "AffordIQ" }}
        />

        <Stack.Screen
          name="Compare"
          component={CompareScreen}
          options={{ title: "AffordIQ" }}
        />

        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "AffordIQ" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
