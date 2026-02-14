import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';

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

/* -------------------- INDIAN NUMBER FORMAT -------------------- */

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

/* -------------------- COMPONENT -------------------- */

export default function InputScreen() {
  const [salary, setSalary] = useState('');
  const [price, setPrice] = useState('');
  const [interest, setInterest] = useState('');
  const [years, setYears] = useState('');

  const calculateEMI = () => {
    const P = parseFloat(price);
    const r = parseFloat(interest) / 12 / 100;
    const n = parseFloat(years) * 12;

    if (!P || !r || !n || !salary) {
      Alert.alert("Please fill all fields correctly");
      return;
    }

    const emi =
      (P * r * Math.pow(1 + r, n)) /
      (Math.pow(1 + r, n) - 1);

    const emiRatio = (emi / parseFloat(salary)) * 100;

    Alert.alert(
      "AffordIQ Result",
      `Monthly EMI: ₹${formatIndianNumber(emi.toFixed(0))}
EMI Ratio: ${emiRatio.toFixed(1)}%`
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Enter Details</Text>

      {/* SALARY */}
      <TextInput
        placeholder="Monthly In-hand Salary"
        placeholderTextColor="#94A3B8"
        style={styles.input}
        keyboardType="numeric"
        value={formatIndianNumber(salary)}
        onChangeText={(text) => {
          const cleaned = text.replace(/,/g, '');
          if (!isNaN(cleaned)) setSalary(cleaned);
        }}
      />

      {salary !== '' && !isNaN(salary) && (
        <Text style={styles.wordText}>
          {numberToIndianWords(parseInt(salary))} Rupees
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

      {interest !== '' && !isNaN(interest) && (
        <Text style={styles.wordText}>
          {interest}% Annual Interest
        </Text>
      )}

      {/* TENURE */}
      <TextInput
        placeholder="Loan Tenure (Years)"
        placeholderTextColor="#94A3B8"
        style={styles.input}
        keyboardType="numeric"
        value={years}
        onChangeText={setYears}
      />

      {years !== '' && !isNaN(years) && (
        <Text style={styles.wordText}>
          {years} Years Loan Tenure
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={calculateEMI}>
        <Text style={styles.buttonText}>Calculate</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
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