import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as Progress from "react-native-progress";

/* -------------------- FORMATTER -------------------- */

function formatIndianNumber(x) {
  if (!x && x !== 0) return "";
  const num = x.toString().replace(/,/g, "");
  const lastThree = num.substring(num.length - 3);
  const otherNumbers = num.substring(0, num.length - 3);
  if (otherNumbers !== "") {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return lastThree;
}

/* -------------------- AI ADVISORY -------------------- */

function generateAIStyleAdvice(income, emi, emiRatio, score) {
  const ratio = parseFloat(emiRatio);
  const disposableIncome = parseFloat(income) - parseFloat(emi);

  let insight = "";

  if (score >= 75) {
    insight =
      "This loan structure appears financially stable. Your borrowing level remains controlled and manageable.";
  } else if (score >= 40) {
    insight =
      "This commitment introduces moderate financial pressure. Improving structure can increase safety.";
  } else {
    insight =
      "This obligation may significantly strain your finances and reduce adaptability in uncertain scenarios.";
  }

  return `
Your EMI of ₹${emi} consumes ${ratio}% of your monthly income.

After EMI, your estimated disposable income is ₹${disposableIncome.toFixed(0)} per month.

${insight}
`;
}

/* -------------------- COMPONENT -------------------- */

export default function ResultScreen({ route, navigation }) {
  const {
    itemName,
    income,
    totalCost,
    downPayment,
    interest,
    years,
    loanAmount,
    emi,
    emiRatio,
    score,
    tenureMonths,
  } = route.params;

  /* -------- FINANCIAL CALCULATIONS -------- */

  const totalPayment = parseFloat(emi) * tenureMonths;
  const totalInterest = totalPayment - loanAmount;

  /* -------- 10% INCOME DROP SIMULATION -------- */

  const stressedRatio = (parseFloat(emiRatio) / 0.9).toFixed(1);

  const stressColor =
    stressedRatio <= 35
      ? "#22C55E"
      : stressedRatio <= 50
        ? "#FACC15"
        : "#EF4444";

  /* -------- STABILITY CHECK -------- */

  const disposableIncome = parseFloat(income) - parseFloat(emi);

  const emergencyMonths =
    disposableIncome > 0
      ? ((disposableIncome * 6) / parseFloat(income)).toFixed(1)
      : 0;

  const emergencyColor =
    emergencyMonths >= 6
      ? "#22C55E"
      : emergencyMonths >= 3
        ? "#FACC15"
        : "#EF4444";

  const aiAdvice = generateAIStyleAdvice(income, emi, emiRatio, score);

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Text style={styles.headerTitle}>{itemName || "Loan Analysis"}</Text>

        {/* <Text style={styles.headerSub}>Smart Loan Decisions. Instantly.</Text> */}

        {/* SCORE RING */}
        <View style={{ alignItems: "center", marginVertical: 15 }}>
          <Progress.Circle
            size={140}
            progress={score / 100}
            showsText={true}
            formatText={() => `${score}`}
            thickness={12}
            color={
              score >= 75 ? "#22C55E" : score >= 40 ? "#FACC15" : "#EF4444"
            }
            unfilledColor="#1E293B"
            borderWidth={0}
            textStyle={{
              color: "#FFFFFF",
              fontSize: 28,
              fontWeight: "bold",
            }}
          />
        </View>

        {/* LOAN SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LOAN SUMMARY</Text>

          <Text style={styles.valueLarge}>EMI: ₹{formatIndianNumber(emi)}</Text>

          <Text style={styles.valueSmall}>
            Loan Amount: ₹{formatIndianNumber(loanAmount.toFixed(0))}
          </Text>

          <Text style={styles.valueSmall}>
            Down Payment: ₹{formatIndianNumber(downPayment)}
          </Text>

          <Text style={styles.valueSmall}>
            Total Interest: ₹{formatIndianNumber(totalInterest.toFixed(0))}
          </Text>

          <Text style={styles.valueSmall}>
            Total Payable: ₹{formatIndianNumber(totalPayment.toFixed(0))}
          </Text>
        </View>

        {/* RISK ANALYSIS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RISK ANALYSIS</Text>

          <Text style={styles.scoreLabel}>Affordability Score</Text>

          <Text
            style={[
              styles.scoreValue,
              {
                color:
                  score >= 75 ? "#22C55E" : score >= 40 ? "#FACC15" : "#EF4444",
              },
            ]}
          >
            {score}/100
          </Text>

          <Text style={styles.valueSmall}>EMI Ratio: {emiRatio}%</Text>

          <Text style={[styles.valueSmall, { marginTop: 10 }]}>
            10% Income Drop Ratio:
          </Text>

          <Text style={{ color: stressColor, fontWeight: "600" }}>
            {stressedRatio}%
          </Text>
        </View>

        {/* STABILITY CHECK */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>STABILITY CHECK</Text>

          <Text style={styles.valueSmall}>Estimated Stability Buffer</Text>

          <Text style={{ color: emergencyColor, fontSize: 18, marginTop: 5 }}>
            {emergencyMonths} Months Equivalent
          </Text>
        </View>

        {/* AI ADVISORY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI ADVISORY</Text>

          <Text style={styles.advisoryText}>{aiAdvice}</Text>
        </View>

        {/* COMPARE BUTTON */}
        <TouchableOpacity
          style={styles.compareButton}
          onPress={() =>
            navigation.navigate("Input", {
              compareMode: true,
              previousData: route.params,
              prefill: {
                itemName,
                income,
                totalCost,
                downPayment,
                interest,
                years,
              },
            })
          }
        >
          <Text style={styles.primaryButtonText}>Compare Another Option</Text>
        </TouchableOpacity>

        {/* RESET BUTTON */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => navigation.navigate("Input")}
        >
          <Text style={styles.primaryButtonText}>Start New Analysis</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },

  headerSub: {
    color: "#64748B",
    textAlign: "center",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },

  sectionTitle: {
    color: "#94A3B8",
    fontSize: 14,
    letterSpacing: 1,
    marginBottom: 8,
  },

  valueLarge: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
  },

  valueSmall: {
    color: "#CBD5E1",
    marginTop: 6,
  },

  scoreLabel: {
    color: "#94A3B8",
  },

  scoreValue: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },

  advisoryText: {
    color: "#CBD5E1",
    lineHeight: 22,
    marginTop: 8,
  },

  compareButton: {
    marginTop: 30,
    backgroundColor: "#14B8A6",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  resetButton: {
    marginTop: 15,
    backgroundColor: "#334155",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
