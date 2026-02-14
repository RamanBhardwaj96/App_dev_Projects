import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// function generateExplanation(emi, emiRatio, score) {
//   const ratio = parseFloat(emiRatio);

//   const positiveOpeners = [
//     "This looks financially comfortable.",
//     "You're in a stable position for this purchase.",
//     "This appears well within your affordability range.",
//   ];

//   const moderateOpeners = [
//     "This purchase stretches your finances slightly.",
//     "This is manageable but requires discipline.",
//     "You're entering a moderate risk zone.",
//   ];

//   const riskyOpeners = [
//     "This could strain your finances significantly.",
//     "This level of EMI may create financial pressure.",
//     "You're entering a financially aggressive zone.",
//   ];

//   const safeAdvice = [
//     "Your EMI burden is healthy relative to income.",
//     "You still maintain flexibility for savings and emergencies.",
//     "This leaves room for investments and lifestyle expenses.",
//   ];

//   const moderateAdvice = [
//     "Consider increasing down payment to improve stability.",
//     "Reducing tenure or loan amount could strengthen your position.",
//     "Ensure you maintain at least 6 months emergency savings.",
//   ];

//   const riskyAdvice = [
//     "Re-evaluate the purchase amount before committing.",
//     "High EMI ratios reduce flexibility during income shocks.",
//     "You may want to delay this purchase or increase income buffer.",
//   ];

//   function random(arr) {
//     return arr[Math.floor(Math.random() * arr.length)];
//   }

//   let opener = "";
//   let advice = "";

//   if (score >= 75) {
//     opener = random(positiveOpeners);
//     advice = random(safeAdvice);
//   } else if (score >= 40) {
//     opener = random(moderateOpeners);
//     advice = random(moderateAdvice);
//   } else {
//     opener = random(riskyOpeners);
//     advice = random(riskyAdvice);
//   }

//   return `
// Your estimated EMI is ₹${emi}, consuming approximately ${ratio}% of your monthly income.

// ${opener}

// ${advice}
//   `;
// }

function generateAIStyleAdvice(income, emi, emiRatio, score) {
  const ratio = parseFloat(emiRatio);
  const incomeNum = parseFloat(income);
  const emiNum = parseFloat(emi);

  const disposableIncome = incomeNum - emiNum;

  let riskProfile = "";
  let mindsetAdvice = "";
  let strategicAdvice = "";

  // Risk Classification
  if (score >= 75) {
    riskProfile =
      "Your financial position appears stable relative to this commitment.";
    mindsetAdvice =
      "This level of EMI suggests controlled leverage rather than aggressive borrowing.";
    strategicAdvice =
      "You may proceed, but continue maintaining liquidity for at least 6 months of expenses.";
  } else if (score >= 40) {
    riskProfile = "This purchase introduces moderate financial pressure.";
    mindsetAdvice =
      "While manageable, it reduces flexibility in uncertain income scenarios.";
    strategicAdvice =
      "Consider increasing down payment or reducing loan tenure to improve structural safety.";
  } else {
    riskProfile =
      "This commitment may significantly strain your financial stability.";
    mindsetAdvice =
      "High fixed obligations reduce adaptability during market or career disruptions.";
    strategicAdvice =
      "Re-evaluating the purchase amount or delaying the decision may improve long-term resilience.";
  }

  return `
AffordIQ Analysis:

Your projected EMI of ₹${emi} represents ${ratio}% of your monthly income.

After EMI, your estimated disposable income is ₹${disposableIncome.toFixed(0)} per month.

${riskProfile}

${mindsetAdvice}

Recommendation:
${strategicAdvice}
  `;
}

export default function ResultScreen({ route, navigation }) {
  const { emi, emiRatio, score, income } = route.params;
  const originalsalryratio = parseFloat(emiRatio);
  const stressedRatio = originalsalryratio / 0.9; // simulate 10% income drop
  const incomeValue = parseFloat(emi) / (parseFloat(emiRatio) / 100);
  const remainingIncome = incomeValue - parseFloat(emi);

  const emergencyMonths =
    remainingIncome > 0 ? (remainingIncome * 6) / incomeValue : 0;

  let riskLevel = "Low Risk";
  let riskColor = "#22C55E";

  if (score < 70) {
    riskLevel = "Moderate Risk";
    riskColor = "#FACC15";
  }

  if (score < 40) {
    riskLevel = "High Risk";
    riskColor = "#EF4444";
  }

  let stressRisk = "Safe";
  let stressColor = "#22C55E";

  if (stressedRatio > 35) {
    stressRisk = "Warning Zone";
    stressColor = "#FACC15";
  }

  if (stressedRatio > 45) {
    stressRisk = "High Stress Risk";
    stressColor = "#EF4444";
  }

  let emergencyStatus = "Healthy";
  let emergencyColor = "#22C55E";

  if (emergencyMonths < 3) {
    emergencyStatus = "Weak Emergency Buffer";
    emergencyColor = "#EF4444";
  } else if (emergencyMonths < 6) {
    emergencyStatus = "Moderate Buffer";
    emergencyColor = "#FACC15";
  }
  // const explanations = generateExplanation(emi, emiRatio, score);
  const aiAdvice = generateAIStyleAdvice(income, emi, emiRatio, score);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>AffordIQ Result</Text>

        <Text style={styles.value}>Monthly EMI</Text>
        <Text style={styles.big}>₹{emi}</Text>

        <Text style={styles.value}>
          EMI Ratio (Income Percentage to pay EMI)
        </Text>
        <Text style={styles.big}>{emiRatio}%</Text>

        <Text style={styles.value}>Affordability Score</Text>
        <Text style={styles.score}>{score}/100</Text>

        <Text style={[styles.risk, { color: riskColor }]}>{riskLevel}</Text>

        <View
          style={{
            padding: 15,
            borderRadius: 12,
            marginTop: 20,
            borderBottomColor: "#1E293B",
          }}
        >
          <Text style={styles.explanation}>{aiAdvice}</Text>
        </View>

        <Text style={{ marginTop: 30, color: "#94A3B8", fontSize: 16 }}>
          10% Income Drop Scenario
        </Text>

        <Text style={{ fontSize: 22, color: "#FFFFFF", fontWeight: "bold" }}>
          New EMI Ratio: {stressedRatio.toFixed(1)}%
        </Text>

        <Text style={{ color: stressColor, fontSize: 16, marginTop: 5 }}>
          {stressRisk}
        </Text>

        <Text style={{ marginTop: 30, color: "#94A3B8", fontSize: 16 }}>
          Emergency Stability Check
        </Text>

        <Text style={{ fontSize: 22, color: "#FFFFFF", fontWeight: "bold" }}>
          Estimated Buffer: {emergencyMonths.toFixed(1)} Months
        </Text>

        <Text style={{ color: emergencyColor, fontSize: 16, marginTop: 5 }}>
          {emergencyStatus}
        </Text>

        <TouchableOpacity
          style={{
            marginTop: 40,
            backgroundColor: "#1E293B",
            padding: 15,
            borderRadius: 10,
            alignItems: "center",
          }}
          onPress={() =>
            navigation.navigate("Input", {
              compareMode: true,
              previousData: route.params,
            })
          }
        >
          <Text style={{ color: "#14B8A6", fontWeight: "600" }}>
            Compare Another Option
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 30,
    textAlign: "center",
  },
  value: {
    color: "#94A3B8",
    fontSize: 16,
    marginTop: 10,
  },
  big: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  score: {
    color: "#14B8A6",
    fontSize: 36,
    fontWeight: "bold",
  },
  risk: {
    marginTop: 20,
    fontSize: 18,
    color: "#F87171",
    fontWeight: "600",
  },
  explanation: {
    marginTop: 20,
    fontSize: 15,
    color: "#CBD5E1",
    lineHeight: 22,
  },
});
