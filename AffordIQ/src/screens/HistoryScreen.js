import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem("affordiq_history");
      if (data) {
        setHistory(JSON.parse(data));
      }
    } catch (error) {
      console.log("Load Error:", error);
    }
  };

  const clearHistory = async () => {
    await AsyncStorage.removeItem("affordiq_history");
    setHistory([]);
  };

  if (!history || history.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: "#FFFFFF",
            fontWeight: "600",
          }}
        >
          No History Yet
        </Text>

        <Text
          style={{
            marginTop: 8,
            color: "#64748B",
            textAlign: "center",
          }}
        >
          Your previous loan analyses will appear here.
        </Text>

        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: "#14B8A6",
            paddingVertical: 12,
            paddingHorizontal: 25,
            borderRadius: 8,
          }}
          onPress={() => navigation.navigate("Input")}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Start Analysis
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      <FlatList
        data={history}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const timestamp = item.timestamp ? new Date(item.timestamp) : null;
          const formattedTime =
            timestamp && !isNaN(timestamp.getTime())
              ? timestamp.toLocaleString()
              : "Unknown date";

          return (
            <View style={styles.card}>
              <Text style={styles.emi}>₹{item.emi}</Text>
              <Text style={styles.sub}>EMI Ratio: {item.emiRatio}%</Text>
              <Text style={styles.score}>Score: {item.score}</Text>
              <Text style={styles.time}>{formattedTime}</Text>
            </View>
          );
        }}
      />

      {history.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
          <Text style={{ color: "#EF4444" }}>Clear History</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  emi: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  sub: {
    color: "#94A3B8",
  },
  score: {
    color: "#14B8A6",
    marginTop: 5,
  },
  time: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
  },
  clearBtn: {
    alignItems: "center",
    marginTop: 20,
  },
});
