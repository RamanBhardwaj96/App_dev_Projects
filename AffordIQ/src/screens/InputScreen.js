import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* -------------------- INDIAN NUMBER TO WORDS -------------------- */

function numberToIndianWords(num) {
  if (!num) return "";

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ",
    "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ",
    "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen "
  ];

  const b = [
    "", "", "Twenty ", "Thirty ", "Forty ",
    "Fifty ", "Sixty ", "Seventy ", "Eighty ", "Ninety "
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
  const num = x.toString().replace(/,/g, '');
  const lastThree = num.substring(num.length - 3);
  const otherNumbers = num.substring(0, num.length - 3);
  if (otherNumbers !== '') {
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

  const [income, setIncome] = useState('');
  const [price, setPrice] = useState('');
  const [interest, setInterest] = useState('');
  const [years, setYears] = useState('');

  const calculateEMI = () => {
    const P = parseFloat(price);
    const r = parseFloat(interest) / 12 / 100;
    const n = parseFloat(years) * 12;
    const incomeValue = parseFloat(income);

    if (!P || !r || !n || !incomeValue) {
      Alert.alert("Please fill all fields correctly");
      return;
    }

    const emi =
      (P * r * Math.pow(1 + r, n)) /
      (Math.pow(1 + r, n) - 1);

    const emiRatio = (emi / incomeValue) * 100;
    const score = calculateAffordabilityScore(emiRatio);

    const resultData = {
      emi: emi.toFixed(0),
      emiRatio: emiRatio.toFixed(1),
      score
    };

    if (compareMode && previousData) {
      navigation.navigate("Compare", {
        option1: previousData,
        option2: resultData
      });
    } else {
      navigation.navigate("Result", resultData);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView contentContainerStyle={styles.container}>

        <Text style={styles.title}>Enter Details</Text>

        {/* INCOME */}
        <TextInput
          placeholder="Monthly Income"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          keyboardType="numeric"
          value={formatIndianNumber(income)}
          onChangeText={(text) => {
            const cleaned = text.replace(/,/g, '');
            if (!isNaN(cleaned)) setIncome(cleaned);
          }}
        />

        {income !== '' && !isNaN(income) && (
          <Text style={styles.wordText}>
            {numberToIndianWords(parseInt(income))} Rupees
          </Text>
        )}

        {/* PRICE */}
        <TextInput
          placeholder="Purchase Price"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          keyboardType="numeric"
          value={formatIndianNumber(price)}
          onChangeText={(text) => {
            const cleaned = text.replace(/,/g, '');
            if (!isNaN(cleaned)) setPrice(cleaned);
          }}
        />

        {price !== '' && !isNaN(price) && (
          <Text style={styles.wordText}>
            {numberToIndianWords(parseInt(price))} Rupees
          </Text>
        )}

        {/* INTEREST */}
        <TextInput
          placeholder="Interest Rate (%)"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          keyboardType="numeric"
          value={interest}
          onChangeText={setInterest}
        />

        {/* TENURE */}
        <TextInput
          placeholder="Loan Tenure (Years)"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          keyboardType="numeric"
          value={years}
          onChangeText={setYears}
        />

        <TouchableOpacity style={styles.button} onPress={calculateEMI}>
          <Text style={styles.buttonText}>Calculate</Text>
        </TouchableOpacity>

      </ScrollView>
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
    color: '#FFFFFF',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  wordText: {
    color: '#94A3B8',
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#14B8A6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});