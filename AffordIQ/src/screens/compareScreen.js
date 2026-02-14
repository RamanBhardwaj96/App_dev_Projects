import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CompareScreen({ route }) {
  const option1 = route.params?.option1 || {};
  const option2 = route.params?.option2 || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comparison</Text>

      <Text style={styles.label}>Monthly EMI</Text>
      <Text style={styles.row}>
        ₹{option1.emi} vs ₹{option2.emi}
      </Text>

      <Text style={styles.label}>EMI Ratio</Text>
      <Text style={styles.row}>
        {option1.emiRatio}% vs {option2.emiRatio}%
      </Text>

      <Text style={styles.label}>Affordability Score</Text>
      <Text style={styles.row}>
        ₹{option1.emi || 0} vs ₹{option2.emi || 0}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 30,
    textAlign: "center",
  },
  label: {
    color: "#94A3B8",
    marginTop: 20,
  },
  row: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
  },
});
