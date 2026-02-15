import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";

/* -------------------- INDIAN NUMBER TO WORDS -------------------- */

function numberToIndianWords(num) {
  if (!num) return "";

  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];

  const b = [
    "",
    "",
    "Twenty ",
    "Thirty ",
    "Forty ",
    "Fifty ",
    "Sixty ",
    "Seventy ",
    "Eighty ",
    "Ninety ",
  ];

  const formatNumber = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + a[n % 10];
    return a[Math.floor(n / 100)] + "Hundred " + formatNumber(n % 100);
  };

  let result = "";
  let crore = Math.floor(num / 10000000);
  num %= 10000000;

  let lakh = Math.floor(num / 100000);
  num %= 100000;

  let thousand = Math.floor(num / 1000);
  num %= 1000;

  let hundred = num;

  if (crore) result += formatNumber(crore) + "Crore ";
  if (lakh) result += formatNumber(lakh) + "Lakh ";
  if (thousand) result += formatNumber(thousand) + "Thousand ";
  if (hundred) result += formatNumber(hundred);

  return result.trim();
}

/* -------------------- INDIAN FORMAT -------------------- */

function formatIndianNumber(x) {
  if (!x) return "";
  const num = x.toString().replace(/,/g, "");
  const lastThree = num.substring(num.length - 3);
  const otherNumbers = num.substring(0, num.length - 3);
  if (otherNumbers !== "") {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  }
  return lastThree;
}

/* -------------------- SCORE ENGINE -------------------- */

function calculateAffordabilityScore(emiRatio) {
  if (emiRatio <= 25) return 90;
  if (emiRatio <= 35) return 75;
  if (emiRatio <= 45) return 55;
  if (emiRatio <= 55) return 35;
  return 15;
}

/* -------------------- COMPONENT -------------------- */

export default function InputScreen({ navigation, route }) {
  const compareMode = route?.params?.compareMode === true;
  const previousData = route?.params?.previousData || null;

  const [income, setIncome] = useState("");
  const [itemName, setItemName] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const calculatedLoan =
    totalCost && downPayment
      ? parseFloat(totalCost) - parseFloat(downPayment)
      : "";

  useEffect(() => {
    if (calculatedLoan > 0) {
      setLoanAmount(calculatedLoan.toString());
    }
  }, [totalCost, downPayment]);

  const [loanAmount, setLoanAmount] = useState("");
  const [interest, setInterest] = useState(9);
  const [years, setYears] = useState(5);

  const calculateLiveEMI = () => {
    const P = parseFloat(loanAmount);
    const r = parseFloat(interest) / 12 / 100;
    const n = parseFloat(years) * 12;
    const incomeValue = parseFloat(income);

    if (!P || !r || !n || !incomeValue) return null;

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const emiRatio = (emi / incomeValue) * 100;

    return {
      emi: emi.toFixed(0),
      emiRatio: emiRatio.toFixed(1),
    };
  };

  const liveData = calculateLiveEMI();

  const calculateEMI = async () => {
    const P = parseFloat(loanAmount);
    const r = parseFloat(interest) / 12 / 100;
    const n = parseFloat(years) * 12;
    const incomeValue = parseFloat(income);

    if (!P || !r || !n || !incomeValue) {
      Alert.alert("Please fill all fields correctly");
      return;
    }

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    const emiRatio = (emi / incomeValue) * 100;
    const score = calculateAffordabilityScore(emiRatio);

    const resultData = {
      itemName,
      emi: emi.toFixed(0),
      emiRatio: emiRatio.toFixed(1),
      score,
      timestamp: new Date().toISOString(),
      income: incomeValue,
      loanAmount: P,
      tenureMonths: n,
    };

    // 🔥 Save to AsyncStorage
    try {
      const existingData = await AsyncStorage.getItem("affordiq_history");
      const history = existingData ? JSON.parse(existingData) : [];
      history.unshift(resultData); // newest first
      await AsyncStorage.setItem("affordiq_history", JSON.stringify(history));
    } catch (error) {
      console.log("Storage Error:", error);
    }

    // 🔥 Navigate
    if (compareMode && previousData) {
      navigation.navigate("Compare", {
        option1: previousData,
        option2: resultData,
      });
    } else {
      navigation.navigate("Result", resultData);
    }
  };
  useEffect(() => {
    const total = parseFloat(totalCost);
    const down = parseFloat(downPayment);

    if (!isNaN(total) && !isNaN(down) && total > down) {
      const calculated = total - down;
      setLoanAmount(calculated.toString());
    } else {
      setLoanAmount("");
    }
  }, [totalCost, downPayment]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter Details</Text>

          {/* INCOME */}
          <TextInput
            placeholder="Monthly Income"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            keyboardType="numeric"
            value={formatIndianNumber(income)}
            onChangeText={(text) => {
              const cleaned = text.replace(/,/g, "");
              if (!isNaN(cleaned)) setIncome(cleaned);
            }}
          />

          {income !== "" && !isNaN(income) && (
            <Text style={styles.wordText}>
              {numberToIndianWords(parseInt(income))} Rupees
            </Text>
          )}

          <TextInput
            placeholder="Item Name (e.g. House, Car)"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            value={itemName}
            onChangeText={setItemName}
          />

          {/* PRICE */}
          <TextInput
            placeholder="Total Item Cost"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            keyboardType="numeric"
            value={formatIndianNumber(totalCost)}
            onChangeText={(text) => {
              const cleaned = text.replace(/,/g, "");
              if (!isNaN(cleaned)) setTotalCost(cleaned);
            }}
          />

          {totalCost !== "" && !isNaN(totalCost) && (
            <Text style={styles.wordText}>
              {numberToIndianWords(parseInt(totalCost))} Rupees
            </Text>
          )}

          <TextInput
            placeholder="Down Payment"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            keyboardType="numeric"
            value={formatIndianNumber(downPayment)}
            onChangeText={(text) => {
              const cleaned = text.replace(/,/g, "");
              if (!isNaN(cleaned)) setDownPayment(cleaned);
            }}
          />

          {downPayment !== "" && !isNaN(downPayment) && (
            <Text style={styles.wordText}>
              {numberToIndianWords(parseInt(downPayment))} Rupees
            </Text>
          )}

          <TextInput
            placeholder="Loan Amount"
            placeholderTextColor="#94A3B8"
            style={[styles.input, { backgroundColor: "#334155" }]}
            value={formatIndianNumber(loanAmount)}
            editable={false}
          />

          {loanAmount !== "" && !isNaN(loanAmount) && (
            <Text style={styles.wordText}>
              {numberToIndianWords(parseInt(loanAmount))} Rupees
            </Text>
          )}

          {/* INTEREST */}
          <Text style={{ color: "#94A3B8", marginTop: 10 }}>
            Interest Rate: {interest || 0}%
          </Text>

          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={5}
            maximumValue={20}
            step={0.1}
            value={interest}
            minimumTrackTintColor="#14B8A6"
            maximumTrackTintColor="#334155"
            thumbTintColor="#14B8A6"
            onValueChange={(value) => setInterest(parseFloat(value.toFixed(1)))}
          />

          <Text style={styles.wordText1}>
            Adjust to simulate different scenarios
          </Text>

          {/* TENURE */}
          <Text style={{ color: "#94A3B8", marginTop: 15 }}>
            Loan Tenure: {years || 1} Years
          </Text>

          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={1}
            maximumValue={40}
            step={1}
            value={years}
            minimumTrackTintColor="#14B8A6"
            maximumTrackTintColor="#334155"
            thumbTintColor="#14B8A6"
            onValueChange={(value) => setYears(value)}
          />

          <Text style={styles.wordText1}>
            Adjust to simulate different scenarios
          </Text>

          {liveData && (
            <View
              style={{
                backgroundColor: "#1E293B",
                padding: 15,
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: "#94A3B8" }}>Live Preview</Text>

              <Text style={{ color: "#FFFFFF", fontSize: 18, marginTop: 5 }}>
                Estimated EMI: ₹{formatIndianNumber(liveData.emi)}
              </Text>

              <Text
                style={{
                  marginTop: 5,
                  color:
                    liveData.emiRatio <= 35
                      ? "#22C55E"
                      : liveData.emiRatio <= 50
                        ? "#FACC15"
                        : "#EF4444",
                }}
              >
                EMI Ratio: {liveData.emiRatio}%
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={calculateEMI}>
            <Text style={styles.buttonText}>Calculate</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  wordText: {
    color: "#94A3B8",
    marginBottom: 15,
    fontSize: 14,
  },
  wordText1: {
    color: "#94A3B8",
    marginBottom: 15,
    fontSize: 8,
  },
  button: {
    backgroundColor: "#14B8A6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
