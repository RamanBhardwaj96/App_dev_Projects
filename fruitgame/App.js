import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Vibration,
  StatusBar,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── GAME CONFIG ─────────────────────────────────────────────
const BASKET_W       = 90;
const BASKET_H       = 60;
const FRUIT_SIZE     = 48;
const SPAWN_INTERVAL = 1000;
const FALL_BASE_MS   = 3200;
const GAME_DURATION  = 45;
const BASKET_BOTTOM  = 24;

const FRUITS = [
  { emoji: "🍎", label: "Apple",      points: 10,  isBad: false },
  { emoji: "🍌", label: "Banana",     points: 10,  isBad: false },
  { emoji: "🍇", label: "Grapes",     points: 15,  isBad: false },
  { emoji: "🍓", label: "Strawberry", points: 15,  isBad: false },
  { emoji: "🍊", label: "Orange",     points: 10,  isBad: false },
  { emoji: "🍉", label: "Watermelon", points: 20,  isBad: false },
  { emoji: "🫐", label: "Blueberry",  points: 20,  isBad: false },
  { emoji: "🥝", label: "Kiwi",       points: 15,  isBad: false },
  { emoji: "💣", label: "Bomb",       points: -20, isBad: true  },
];

let fruitIdCounter = 0;

function randomFruitWithBombs(level) {
  const bombChance = Math.min(0.05 + level * 0.04, 0.25);
  if (Math.random() < bombChance) return FRUITS.find(f => f.isBad);
  const pool = FRUITS.filter(f => !f.isBad);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════════════════════════════════════════════════════════
// SOUND ENGINE
// Generates PCM WAV as data:audio/wav;base64 — works with expo-av
// ═══════════════════════════════════════════════════════════════
const SR = 22050;

function buildWAV(samples) {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + dataLen, true);
  ws(8, "WAVE"); ws(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true);
  v.setUint16(32, 2, true);  v.setUint16(34, 16, true);
  ws(36, "data"); v.setUint32(40, dataLen, true);
  for (let i = 0; i < samples.length; i++)
    v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, samples[i] * 32767)), true);
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192)
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return "data:audio/wav;base64," + btoa(bin);
}

function sine(freq, dur, vol, attack = 0.005) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = i < SR * attack
      ? i / (SR * attack)
      : Math.exp(-3.5 * (i - SR * attack) / n);
    out[i] = Math.sin(2 * Math.PI * freq * i / SR) * vol * env;
  }
  return out;
}

function noiseWave(dur, vol) {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++)
    out[i] = (Math.random() * 2 - 1) * vol * Math.exp(-6 * i / n);
  return out;
}

function mix(...tracks) {
  const len = Math.max(...tracks.map(t => t.length));
  const out = new Float32Array(len);
  for (const t of tracks) for (let i = 0; i < t.length; i++) out[i] += t[i];
  const peak = Math.max(...out.map(Math.abs));
  if (peak > 0.92) for (let i = 0; i < out.length; i++) out[i] = out[i] / peak * 0.92;
  return out;
}

function cat(...tracks) {
  const len = tracks.reduce((s, t) => s + t.length, 0);
  const out = new Float32Array(len);
  let off = 0;
  for (const t of tracks) { out.set(t, off); off += t.length; }
  return out;
}

// 🍎 Collect — bright C-E-G ding
function makeCollect() {
  const g = new Float32Array(Math.floor(SR * 0.04));
  return buildWAV(mix(
    cat(mix(sine(523, 0.15, 0.55, 0.003), sine(1046, 0.15, 0.18, 0.003)), g, g),
    cat(g, mix(sine(659, 0.15, 0.52, 0.003), sine(1318, 0.15, 0.16, 0.003)), g),
    cat(g, g, mix(sine(784, 0.18, 0.58, 0.003), sine(1568, 0.18, 0.20, 0.003)))
  ));
}

// 💣 Bomb — sub thump sweep + crunch + noise burst
function makeBomb() {
  const thumpN = Math.floor(SR * 0.55);
  const thump = new Float32Array(thumpN);
  let ph = 0;
  for (let i = 0; i < thumpN; i++) {
    const t = i / thumpN;
    ph += (2 * Math.PI * (140 * Math.pow(35 / 140, t))) / SR;
    thump[i] = Math.sin(ph) * 0.88 * (t < 0.05 ? t / 0.05 : Math.exp(-4 * (t - 0.05)));
  }
  const crN = Math.floor(SR * 0.28);
  const crunch = new Float32Array(crN);
  for (let i = 0; i < crN; i++) {
    const t = i / crN;
    crunch[i] = Math.tanh(Math.sin(2 * Math.PI * 85 * i / SR) * 5) * 0.5 * Math.exp(-5 * t);
  }
  return buildWAV(mix(thump, crunch, noiseWave(0.18, 0.45), sine(50, 0.45, 0.38, 0.01)));
}

// 💔 Miss — descending sad whomp
function makeMiss() {
  const n = Math.floor(SR * 0.28);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    out[i] = Math.sin(2 * Math.PI * (300 * Math.pow(150 / 300, t)) * i / SR)
      * 0.65 * (t < 0.015 ? t / 0.015 : Math.exp(-4 * (t - 0.015)));
  }
  return buildWAV(out);
}

// 🎮 Game over — sad descending notes
function makeGameOver() {
  return buildWAV(cat(...[392, 370, 349, 330, 311, 262].map((f, i) =>
    mix(
      sine(f,     i === 5 ? 0.40 : 0.15, 0.55, 0.012),
      sine(f * 2, i === 5 ? 0.40 : 0.15, 0.20, 0.010),
    )
  )));
}

// 🌿 Ambience — looping outdoor birds + wind
function makeAmbience() {
  const dur = 4.2, len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] += (Math.random() * 2 - 1) * 0.03;
  for (let i = 0; i < len; i++) out[i] += Math.sin(2 * Math.PI * 130 * i / SR) * 0.008;
  const chirp = (sec, f1, f2, d, v) => {
    const s = Math.floor(sec * SR), n = Math.floor(d * SR);
    for (let i = 0; i < n && s + i < len; i++) {
      const t = i / n;
      out[s + i] += Math.sin(2 * Math.PI * (f1 + (f2 - f1) * t) * i / SR) * v * Math.sin(Math.PI * t);
    }
  };
  chirp(0.4, 1800, 2500, 0.07, 0.10); chirp(0.55, 2500, 1800, 0.06, 0.09);
  chirp(1.3, 1600, 2200, 0.07, 0.10); chirp(2.1,  2000, 2700, 0.08, 0.11);
  chirp(2.3, 2700, 2000, 0.06, 0.09); chirp(3.0,  1700, 2300, 0.07, 0.10);
  chirp(3.6, 2100, 1700, 0.05, 0.08); chirp(0.9,  800,  920,  0.11, 0.06);
  chirp(2.7, 760,  870,  0.10, 0.06);
  const fade = Math.floor(SR * 0.12);
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[len - 1 - i] *= i / fade; }
  const peak = Math.max(...out.map(Math.abs));
  if (peak > 0) for (let i = 0; i < len; i++) out[i] = out[i] / peak * 0.85;
  return buildWAV(out);
}

// Pre-build all sound data URIs at module load (synchronous)
const SOUNDS = {
  collect:  makeCollect(),
  bomb:     makeBomb(),
  miss:     makeMiss(),
  gameover: makeGameOver(),
  ambience: makeAmbience(),
};

// ── Playback helpers ──────────────────────────────────────────
let _bgSound       = null;
let _soundEnabled  = true;  // module-level mute flag — toggled by UI

async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS:    true,
      staysActiveInBackground: false,
      shouldDuckAndroid:       false,
      allowsRecordingIOS:      false,
    });
  } catch (_) {}
}

async function playSound(uri, volume = 1.0) {
  if (!_soundEnabled) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume, isLooping: false }
    );
    sound.setOnPlaybackStatusUpdate(s => {
      if (s.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch (_) {}
}

function setSoundEnabled(val) {
  _soundEnabled = val;
  if (!val) stopAmbience();
}

async function startAmbience() {
  if (!_soundEnabled) return;
  try {
    await stopAmbience();
    const { sound } = await Audio.Sound.createAsync(
      { uri: SOUNDS.ambience },
      { shouldPlay: true, isLooping: true, volume: 0.30 }
    );
    _bgSound = sound;
  } catch (_) {}
}

async function stopAmbience() {
  try {
    if (_bgSound) {
      await _bgSound.stopAsync().catch(() => {});
      await _bgSound.unloadAsync().catch(() => {});
      _bgSound = null;
    }
  } catch (_) {}
}

async function pauseAmbience() {
  try { if (_bgSound) await _bgSound.pauseAsync(); } catch (_) {}
}
async function resumeAmbience() {
  try { if (_bgSound) await _bgSound.playAsync(); } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// GAME LOGO — animated basket with fruits
// ═══════════════════════════════════════════════════════════════
function GameLogo({ size = 1 }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const spin   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0,   duration: 500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1,  duration: 1800, useNativeDriver: true }),
        Animated.timing(spin, { toValue: -1, duration: 1800, useNativeDriver: true }),
        Animated.timing(spin, { toValue: 0,  duration: 600,  useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-8deg", "0deg", "8deg"] });
  const B = 110 * size;

  return (
    <Animated.View style={{ alignItems: "center", transform: [{ translateY: bounce }] }}>
      {/* Floating fruit above basket */}
      <Animated.View style={{ flexDirection: "row", marginBottom: 6, transform: [{ rotate }] }}>
        {["🍎","🍌","🍓","🍊","🍇"].map((e, i) => (
          <Text key={i} style={{ fontSize: B * 0.28, marginHorizontal: 2 }}>{e}</Text>
        ))}
      </Animated.View>
      {/* Basket */}
      <View style={{
        width: B, height: B * 0.68,
        borderBottomLeftRadius: B * 0.34, borderBottomRightRadius: B * 0.34,
        borderTopLeftRadius: B * 0.08, borderTopRightRadius: B * 0.08,
        backgroundColor: "#D4900F", overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
      }}>
        {[0.22, 0.44, 0.66, 0.88].map((p, i) => (
          <View key={i} style={{
            position: "absolute", top: `${p * 100}%`,
            width: "100%", height: B * 0.055, backgroundColor: "rgba(0,0,0,0.13)",
          }} />
        ))}
        {[-B*0.4, -B*0.15, B*0.1, B*0.35, B*0.6, B*0.85].map((l, i) => (
          <View key={`s${i}`} style={{
            position: "absolute", left: l, width: B * 0.055, height: B * 1.5,
            backgroundColor: "rgba(0,0,0,0.10)", transform: [{ rotate: "18deg" }],
          }} />
        ))}
      </View>
      {/* Rim */}
      <View style={{
        position: "absolute", bottom: B * 0.68 - B * 0.08,
        width: B, height: B * 0.12,
        borderTopLeftRadius: 6, borderTopRightRadius: 6,
        backgroundColor: "#E8A820",
      }} />
      {/* Handle */}
      <View style={{
        position: "absolute", top: B * 0.08,
        width: B * 0.62, height: B * 0.38,
        borderTopLeftRadius: B * 0.31, borderTopRightRadius: B * 0.31,
        borderWidth: B * 0.065, borderColor: "#C8860A", borderBottomWidth: 0,
        backgroundColor: "transparent",
      }} />
    </Animated.View>
  );
}


// ═══════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════
function SplashScreen({ onDone }) {
  const scale   = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fruitY  = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Fruits rain down
      Animated.timing(fruitY, { toValue: 0, duration: 500, useNativeDriver: true }),
      // Hold
      Animated.delay(900),
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#FFF8E7",
      alignItems: "center", justifyContent: "center",
      opacity, zIndex: 100,
    }}>
      {/* Rainbow bar top */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, flexDirection: "row" }}>
        {["#FF595E","#FF924C","#FFCA3A","#6A994E","#4CC9F0","#7B2FBE"].map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>

      <Animated.View style={{ transform: [{ scale }], alignItems: "center" }}>
        <GameLogo size={1.1} />
        <Animated.View style={{ transform: [{ translateY: fruitY }], marginTop: 16 }}>
          <Text style={{
            fontSize: 48, fontWeight: "900", color: "#FF6B00",
            textAlign: "center", letterSpacing: 2,
            textShadowColor: "rgba(255,107,0,0.3)",
            textShadowOffset: { width: 2, height: 3 }, textShadowRadius: 0,
          }}>
            🍎 FRUIT{""}CATCHER!
          </Text>
          <Text style={{
            fontSize: 16, color: "#888", textAlign: "center",
            marginTop: 8, fontWeight: "700",
          }}>
            Catch fruits · Dodge bombs!
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Rainbow bar bottom */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 12, flexDirection: "row" }}>
        {["#7B2FBE","#4CC9F0","#6A994E","#FFCA3A","#FF924C","#FF595E"].map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// FALLING FRUIT
// ═══════════════════════════════════════════════════════════════
function FallingFruit({ fruit, onCatchRef, onMissRef, basketXRef, basketBottomY, paused }) {
  // Refs passed directly from GameInner — always current, zero timing issues
  const bbyRef = useRef(basketBottomY);
  useEffect(() => { bbyRef.current = basketBottomY; }, [basketBottomY]);
  const yAnim     = useRef(new Animated.Value(-FRUIT_SIZE)).current;
  const xAnim     = useRef(new Animated.Value(fruit.x)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacAnim  = useRef(new Animated.Value(1)).current;
  const caught    = useRef(false);
  const missed    = useRef(false);
  const animRef   = useRef(null);
  const pausedRef = useRef(false);
  const currentY  = useRef(-FRUIT_SIZE);
  const didInit   = useRef(false);

  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return; }
    pausedRef.current = paused;
    if (paused) {
      animRef.current && animRef.current.stop();
    } else {
      if (caught.current || missed.current) return;
      const rem = SCREEN_H - currentY.current;
      const dur = Math.max((rem / (SCREEN_H + FRUIT_SIZE)) * fruit.duration, 300);
      const anim = Animated.timing(yAnim, { toValue: SCREEN_H, duration: dur, useNativeDriver: true });
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (finished && !caught.current && !missed.current) { missed.current = true; onMissRef.current(fruit.id); }
      });
    }
  }, [paused]);

  useEffect(() => {
    const anim = Animated.timing(yAnim, { toValue: SCREEN_H, duration: fruit.duration, useNativeDriver: true });
    animRef.current = anim;
    const lid = yAnim.addListener(({ value }) => {
      currentY.current = value;
      if (caught.current || missed.current || pausedRef.current) return;
      const zoneTop    = bbyRef.current - BASKET_H - FRUIT_SIZE;
      const zoneBottom = bbyRef.current + 5;
      if (value >= zoneTop && value <= zoneBottom) {
        const cx = fruit.x + FRUIT_SIZE / 2;
        const bx = basketXRef.current;
        if (cx >= bx - 10 && cx <= bx + BASKET_W + 10) {
          caught.current = true;
          animRef.current && animRef.current.stop();
          // Fire score/sound immediately — don't wait for visual animation
          onCatchRef.current(fruit);
          if (fruit.isBad) { opacAnim.setValue(0); return; }
          // Visual pop-in animation (purely cosmetic, score already awarded)
          const destX = bx + BASKET_W / 2 - FRUIT_SIZE / 2;
          const destY = bbyRef.current - BASKET_H / 2;
          Animated.parallel([
            Animated.timing(xAnim,    { toValue: destX, duration: 140, useNativeDriver: true }),
            Animated.timing(yAnim,    { toValue: destY, duration: 140, useNativeDriver: true }),
            Animated.timing(opacAnim, { toValue: 0,     duration: 180, useNativeDriver: true }),
          ]).start();
        }
      }
    });
    anim.start(({ finished }) => {
      if (finished && !caught.current && !missed.current) { missed.current = true; onMissRef.current(fruit.id); }
    });
    return () => { yAnim.removeListener(lid); anim.stop(); };
  }, []);

  return (
    <Animated.View style={[styles.fruit, {
      left: 0,
      transform: [{ translateX: xAnim }, { translateY: yAnim }, { scale: scaleAnim }],
      opacity: opacAnim,
    }]}>
      <Text style={styles.fruitEmoji}>{fruit.emoji}</Text>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE POP
// ═══════════════════════════════════════════════════════════════
function ScorePop({ pop }) {
  const y    = useRef(new Animated.Value(0)).current;
  const sc   = useRef(new Animated.Value(0.5)).current;
  const opac = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc,   { toValue: 1.2, friction: 4, useNativeDriver: true }),
      Animated.timing(y,    { toValue: -80, duration: 900, useNativeDriver: true }),
      Animated.timing(opac, { toValue: 0,   duration: 900, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.Text style={[styles.scorePop, {
      left: pop.x, top: pop.y,
      color: pop.points > 0 ? "#00C853" : "#FF1744",
      transform: [{ translateY: y }, { scale: sc }],
      opacity: opac,
    }]}>
      {pop.points > 0 ? `+${pop.points}` : `${pop.points}`}
    </Animated.Text>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLASH OVERLAY
// ═══════════════════════════════════════════════════════════════
function FlashOverlay({ trigger }) {
  const opac = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (trigger === null) return;  // null = initial state; 0,1,2... all valid triggers
    opac.setValue(0.55);
    Animated.timing(opac, { toValue: 0, duration: 600, useNativeDriver: true }).start();
  }, [trigger]);
  return (
    <Animated.View pointerEvents="none" style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#FF1744", opacity: opac, zIndex: 25,
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════
// STAR ROW (decorative)
// ═══════════════════════════════════════════════════════════════
function StarRow({ count, total = 3 }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Text key={i} style={{ fontSize: 44 }}>{i < count ? "⭐" : "🌑"}</Text>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAME
// ═══════════════════════════════════════════════════════════════
function GameInner() {
  const insets = useSafeAreaInsets();

  const [gameState,    setGameState]    = useState("splash");
  const [score,        setScore]        = useState(0);
  const [lives,        setLives]        = useState(3);
  const [timeLeft,     setTimeLeft]     = useState(GAME_DURATION);
  const [level,        setLevel]        = useState(1);
  const [fruits,       setFruits]       = useState([]);
  const [pops,         setPops]         = useState([]);
  const [highScore,    setHighScore]    = useState(0);

  // Load persisted high score on mount
  useEffect(() => {
    AsyncStorage.getItem("fruitcatcher_highscore")
      .then(val => { if (val !== null) setHighScore(parseInt(val, 10)); })
      .catch(() => {});
  }, []);
  const [paused,       setPaused]       = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(null);  // null = never triggered; 0 would be falsy
  const [soundOn,      setSoundOn]      = useState(_soundEnabled);  // sync with module var on mount

  const toggleSound = useCallback(() => {
    setSoundOn(prev => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  const basketBottomY = SCREEN_H - BASKET_BOTTOM - insets.bottom;

  const basketX          = useRef((SCREEN_W - BASKET_W) / 2);
  const basketBottomYRef = useRef(basketBottomY);
  useEffect(() => { basketBottomYRef.current = basketBottomY; }, [basketBottomY]);
  const basketAnim = useRef(new Animated.Value((SCREEN_W - BASKET_W) / 2)).current;

  const spawnTimerRef     = useRef(null);
  const countdownTimerRef = useRef(null);
  const scoreRef          = useRef(0);
  const livesRef          = useRef(3);
  const levelRef          = useRef(1);
  const pausedRef         = useRef(false);
  const endGameRef        = useRef(null);
  const highScoreRef      = useRef(0);
  const gameStateRef      = useRef("splash");  // tracks real state for race-condition guards
  // Stable handler refs passed directly to FallingFruit — avoids ALL prop→effect→ref timing issues
  const handleCatchRef    = useRef(null);
  const handleMissRef     = useRef(null);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderMove: (_, { moveX }) => {
      const x = Math.max(0, Math.min(SCREEN_W - BASKET_W, moveX - BASKET_W / 2));
      basketX.current = x;
      basketAnim.setValue(x);
    },
  })).current;

  const spawnFruit = useCallback(() => {
    if (pausedRef.current) return;
    const type  = randomFruitWithBombs(levelRef.current);
    const x     = Math.random() * (SCREEN_W - FRUIT_SIZE);
    const speed = 1 + (levelRef.current - 1) * 0.18;
    setFruits(prev => [...prev, { id: ++fruitIdCounter, x, duration: FALL_BASE_MS / speed, ...type }]);
  }, []);

  const endGame = useCallback(() => {
    clearInterval(spawnTimerRef.current);
    clearInterval(countdownTimerRef.current);
    stopAmbience();
    playSound(SOUNDS.gameover, 0.9);
    gameStateRef.current = "gameover";
    setGameState("gameover");
    const newHS = Math.max(highScoreRef.current, scoreRef.current);
    setHighScore(newHS);
    AsyncStorage.setItem("fruitcatcher_highscore", String(newHS)).catch(() => {});
    setFruits([]);
    setPaused(false);
    pausedRef.current = false;
  }, []);

  useEffect(() => { endGameRef.current = endGame; }, [endGame]);
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

  const pauseGame = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
    clearInterval(spawnTimerRef.current);
    clearInterval(countdownTimerRef.current);
    pauseAmbience();
  }, []);

  const resumeGame = useCallback((spawnFn) => {
    pausedRef.current = false;
    setPaused(false);
    resumeAmbience();
    countdownTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { endGameRef.current?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    spawnTimerRef.current = setInterval(spawnFn, SPAWN_INTERVAL);
  }, []);

  const handleCatch = useCallback((fruit) => {
    if (gameStateRef.current !== "playing") return;  // guard: ignore if game already ended
    if (fruit.isBad) {
      playSound(SOUNDS.bomb, 1.0);
      Vibration.vibrate([0, 90, 45, 110, 45, 90]);
      setFlashTrigger(t => t + 1);

      const bx  = basketX.current;
      const pid = Date.now();
      setPops(p => [...p, {
        id: pid, points: fruit.points,
        x: bx + BASKET_W / 2 - 22, y: basketBottomYRef.current - BASKET_H - 52,
      }]);
      setTimeout(() => setPops(p => p.filter(x => x.id !== pid)), 1200);

      scoreRef.current = Math.max(0, scoreRef.current + fruit.points);
      setScore(scoreRef.current);

      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);   // update display immediately
      pauseGame();
      setTimeout(() => {
        if (newLives <= 0 || gameStateRef.current !== "playing") {
          if (newLives <= 0) endGameRef.current?.();
        } else {
          resumeGame(spawnFruit);
        }
      }, 800);
      setFruits(prev => prev.filter(f => f.id !== fruit.id));
      return;
    }

    // Simple scoring — just fruit's base points, no streaks
    const pts = fruit.points;
    scoreRef.current = scoreRef.current + pts;
    setScore(scoreRef.current);

    const nl = Math.floor(scoreRef.current / 100) + 1;
    if (nl !== levelRef.current) { levelRef.current = nl; setLevel(nl); }

    const bx  = basketX.current;
    const pid = Date.now();
    setPops(p => [...p, {
      id: pid, points: pts,
      x: bx + BASKET_W / 2 - 18, y: basketBottomYRef.current - BASKET_H - 50,
    }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== pid)), 1200);

    playSound(SOUNDS.collect, 0.85);
    Vibration.vibrate(30);
    // Delay removal so the pop animation has time to play (score already awarded above)
    setTimeout(() => setFruits(prev => prev.filter(f => f.id !== fruit.id)), 300);
  }, [pauseGame, resumeGame, spawnFruit]);

  const handleMiss = useCallback((fruitId) => {
    if (gameStateRef.current !== "playing") return;
    // Missed fruit (good or bad) = silent remove, no penalty, no sound
    setFruits(prev => prev.filter(f => f.id !== fruitId));
  }, []);

  // Keep handler refs always pointing to latest functions
  handleCatchRef.current = handleCatch;
  handleMissRef.current  = handleMiss;

  const startGame = useCallback(() => {
    initAudio().then(startAmbience);
    scoreRef.current = 0; livesRef.current = 3;
    levelRef.current = 1;
    pausedRef.current = false; fruitIdCounter = 0;
    setScore(0); setLives(3); setLevel(1);
    setTimeLeft(GAME_DURATION); setFruits([]); setPops([]);
    gameStateRef.current = "playing";
    setPaused(false); setGameState("playing");
    countdownTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { endGameRef.current?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    spawnTimerRef.current = setInterval(spawnFruit, SPAWN_INTERVAL);
  }, [spawnFruit]);

  useEffect(() => () => {
    clearInterval(spawnTimerRef.current);
    clearInterval(countdownTimerRef.current);
    stopAmbience();
  }, []);

  // ── SPLASH ──────────────────────────────────────────────────
  if (gameState === "splash") {
    return (
      <View style={{ flex: 1 }}>
        <SplashScreen onDone={() => {
          gameStateRef.current = "idle";
          setGameState("idle");
        }} />
      </View>
    );
  }

  // ── IDLE ────────────────────────────────────────────────────
  if (gameState === "idle") {
    return (
      <View style={[styles.screenIdle, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <StatusBar barStyle="dark-content" />
        {/* Rainbow stripe top */}
        <View style={styles.rainbowBar}>
          {["#FF595E","#FF924C","#FFCA3A","#6A994E","#4CC9F0","#7B2FBE"].map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>

        <View style={styles.idleContent}>
          <GameLogo size={0.95} />
          <View style={styles.titleBox}>
            <Text style={styles.titleMain}>🍎 FRUIT{"\n"}CATCHER! 🧺</Text>
            <Text style={styles.titleSub}>Catch fruits, dodge bombs!</Text>
          </View>

          <View style={styles.rulesCard}>
            {[
              ["👆","Drag the basket to catch"],
              ["🍎","Fruits = points!"],
              ["💣","Bombs = lose a life!"],
              ["🔥","Combos = bonus points!"],
            ].map(([icon, text], i) => (
              <View key={i} style={styles.ruleRow}>
                <Text style={styles.ruleIcon}>{icon}</Text>
                <Text style={styles.ruleText}>{text}</Text>
              </View>
            ))}
          </View>

          {highScore > 0 && (
            <View style={styles.highScoreBadge}>
              <Text style={styles.highScoreText}>🏆 BEST: {highScore}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.bigPlayBtn} onPress={startGame} activeOpacity={0.8}>
            <Text style={styles.bigPlayText}>▶  PLAY NOW!</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom rainbow stripe */}
        <View style={[styles.rainbowBar, { transform: [{ scaleX: -1 }] }]}>
          {["#7B2FBE","#4CC9F0","#6A994E","#FFCA3A","#FF924C","#FF595E"].map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
      </View>
    );
  }

  // ── GAME OVER ──────────────────────────────────────────────
  if (gameState === "gameover") {
    const stars = score >= 400 ? 3 : score >= 200 ? 2 : score >= 80 ? 1 : 0;
    return (
      <View style={[styles.screenGameover, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.gameoverContent}>
          <Text style={styles.gameoverBanner}>
            {score >= 200 ? "🎉 AMAZING!" : score >= 80 ? "👏 GOOD JOB!" : "💪 TRY AGAIN!"}
          </Text>
          <StarRow count={stars} />
          <View style={styles.scoreBubble}>
            <Text style={styles.scoreBubbleNum}>{score}</Text>
            <Text style={styles.scoreBubbleLbl}>POINTS</Text>
          </View>
          {score > 0 && score >= highScore && (
            <View style={styles.newRecordBadge}>
              <Text style={styles.newRecordText}>🏆 NEW HIGH SCORE!</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={[styles.statBubble, { backgroundColor: "#FFE066" }]}>
              <Text style={styles.statNum}>{level}</Text>
              <Text style={styles.statLbl}>LEVEL</Text>
            </View>
            <View style={[styles.statBubble, { backgroundColor: "#A8E6CF" }]}>
              <Text style={styles.statNum}>{highScore}</Text>
              <Text style={styles.statLbl}>BEST</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.bigPlayBtn, { backgroundColor: "#4CC9F0" }]} onPress={startGame} activeOpacity={0.8}>
            <Text style={styles.bigPlayText}>🔄  PLAY AGAIN!</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={() => { gameStateRef.current = "idle"; setGameState("idle"); }} activeOpacity={0.8}>
            <Text style={styles.homeBtnText}>🏠  HOME</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── GAMEPLAY ──────────────────────────────────────────────
  return (
    <View style={styles.gameArea}>
      <StatusBar hidden />

      {/* Sky layers */}
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 0.55, backgroundColor: "#4EC5F1" }} />
        <View style={{ flex: 0.25, backgroundColor: "#A8DFF7" }} />
        <View style={{ flex: 0.20, backgroundColor: "#7DD87A" }} />
      </View>

      {/* Puffy clouds */}
      <View style={[styles.clouds, { top: 50 + insets.top }]}>
        <Text style={[styles.cloud, { fontSize: 52, left: "5%",  top: 0  }]}>☁️</Text>
        <Text style={[styles.cloud, { fontSize: 36, left: "48%", top: 22 }]}>☁️</Text>
        <Text style={[styles.cloud, { fontSize: 28, left: "75%", top: 5  }]}>☁️</Text>
      </View>

      {/* Decorative trees at ground level */}
      <View style={[styles.trees, { bottom: BASKET_BOTTOM + insets.bottom + 22 }]}>
        <Text style={styles.tree}>🌳</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.tree}>🌲</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.tree}>🌳</Text>
      </View>

      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top }]}>
        <View style={styles.hudRow}>
          <TouchableOpacity onPress={toggleSound} style={[styles.soundBtn]} activeOpacity={0.7}>
            <Text style={styles.soundBtnText}>{soundOn ? "🔊" : "🔇"}</Text>
          </TouchableOpacity>
          {/* Lives */}
          <View style={[styles.hudPill, { backgroundColor: "#FF6B8A" }]}>
            <Text style={styles.hudPillText}>
              {Array.from({ length: Math.max(0, lives) }).map(() => "❤️").join("") || "💀"}
            </Text>
          </View>
          {/* Score */}
          <View style={[styles.hudPill, { backgroundColor: "#FFE066", flex: 1, marginHorizontal: 8 }]}>
            <Text style={styles.hudScore}>{score}</Text>
          </View>
          {/* Timer + Level */}
          <View style={[styles.hudPill, { backgroundColor: timeLeft <= 10 ? "#FF4D4D" : "#A8E6CF" }]}>
            <Text style={[styles.hudTimer, timeLeft <= 10 && { color: "#fff" }]}>{timeLeft}s</Text>
            <Text style={styles.hudLvl}>LV{level}</Text>
          </View>
        </View>
      </View>

      {/* Fruits */}
      {fruits.map(fruit => (
        <FallingFruit
          key={fruit.id} fruit={fruit}
          onCatchRef={handleCatchRef} onMissRef={handleMissRef}
          basketXRef={basketX} basketBottomY={basketBottomY}
          paused={paused}
        />
      ))}

      {/* Score pops */}
      {pops.map(pop => <ScorePop key={pop.id} pop={pop} />)}

      {/* Flash */}
      <FlashOverlay trigger={flashTrigger} />

      {/* Ground grass */}
      <View style={[styles.groundGrass, { bottom: BASKET_BOTTOM + insets.bottom }]} />

      {/* Basket */}
      <Animated.View
        style={[styles.basketWrapper, {
          bottom: BASKET_BOTTOM + insets.bottom,
          transform: [{ translateX: basketAnim }],
        }]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.basketEmoji}>🧺</Text>
        <View style={styles.basketShadow} />
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES — bright, chunky, kids-first design
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ── Idle screen ──────────────────────────────────────────────
  screenIdle: {
    flex: 1, backgroundColor: "#FFF8E7",
  },
  rainbowBar: {
    flexDirection: "row", height: 10,
  },
  idleContent: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 24, paddingVertical: 8,
  },
  titleBox: {
    alignItems: "center", marginTop: 12, marginBottom: 16,
  },
  titleMain: {
    fontSize: 42, fontWeight: "900", textAlign: "center",
    color: "#FF6B00", lineHeight: 48,
    textShadowColor: "rgba(255,107,0,0.25)",
    textShadowOffset: { width: 2, height: 3 }, textShadowRadius: 0,
  },
  titleSub: {
    fontSize: 16, color: "#666", marginTop: 4, fontWeight: "600",
  },
  rulesCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 16,
    width: "100%", marginBottom: 16,
    borderWidth: 3, borderColor: "#FFD54F",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 5,
  },
  ruleRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 8,
  },
  ruleIcon: { fontSize: 24, marginRight: 10, width: 32, textAlign: "center" },
  ruleText: { fontSize: 15, color: "#333", fontWeight: "600", flex: 1 },
  highScoreBadge: {
    backgroundColor: "#FFD54F", borderRadius: 50,
    paddingHorizontal: 22, paddingVertical: 8, marginBottom: 14,
    borderWidth: 2, borderColor: "#FFA000",
  },
  highScoreText: { fontSize: 16, fontWeight: "900", color: "#E65100" },
  bigPlayBtn: {
    backgroundColor: "#FF6B00", paddingVertical: 18, paddingHorizontal: 52,
    borderRadius: 50, borderWidth: 4, borderColor: "#fff",
    shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  bigPlayText: {
    fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: 1,
  },

  // ── Game over screen ──────────────────────────────────────────
  screenGameover: {
    flex: 1, backgroundColor: "#E8F8FF",
  },
  gameoverContent: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28,
  },
  gameoverBanner: {
    fontSize: 34, fontWeight: "900", color: "#FF6B00",
    marginBottom: 14, textAlign: "center",
  },
  scoreBubble: {
    backgroundColor: "#FF6B00", borderRadius: 999,
    width: 150, height: 150, alignItems: "center", justifyContent: "center",
    marginBottom: 16, borderWidth: 5, borderColor: "#fff",
    shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  scoreBubbleNum: { fontSize: 52, fontWeight: "900", color: "#fff", lineHeight: 58 },
  scoreBubbleLbl: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.85)", letterSpacing: 2 },
  newRecordBadge: {
    backgroundColor: "#FFD54F", borderRadius: 50,
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 14,
    borderWidth: 2, borderColor: "#FFA000",
  },
  newRecordText: { fontSize: 15, fontWeight: "900", color: "#E65100" },
  statsRow: { flexDirection: "row", gap: 14, marginBottom: 22 },
  statBubble: {
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 28,
    alignItems: "center", borderWidth: 3, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  statNum: { fontSize: 28, fontWeight: "900", color: "#333" },
  statLbl: { fontSize: 11, fontWeight: "700", color: "#555", letterSpacing: 1.5, textTransform: "uppercase" },
  homeBtn: {
    marginTop: 12, paddingVertical: 12, paddingHorizontal: 36,
    borderRadius: 50, borderWidth: 3, borderColor: "#FF6B00",
  },
  homeBtnText: { fontSize: 15, fontWeight: "800", color: "#FF6B00" },

  // ── Gameplay ─────────────────────────────────────────────────
  gameArea: { flex: 1, width: SCREEN_W, height: SCREEN_H, overflow: "hidden" },
  clouds: { position: "absolute", width: SCREEN_W, height: 80 },
  cloud: { position: "absolute", opacity: 0.9 },
  trees: {
    position: "absolute", flexDirection: "row",
    width: SCREEN_W, paddingHorizontal: 10, alignItems: "flex-end",
  },
  tree: { fontSize: 38, opacity: 0.85 },

  hud: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  hudRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: 4, borderBottomColor: "#FFD54F",
  },
  hudPill: {
    borderRadius: 30, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
  },
  hudPillText: { fontSize: 16, letterSpacing: 2 },
  hudScore:    { fontSize: 28, fontWeight: "900", color: "#333" },
  hudTimer:    { fontSize: 20, fontWeight: "900", color: "#1A7F4B" },
  hudLvl:      { fontSize: 10, fontWeight: "700", color: "#555", letterSpacing: 1 },

  fruit: {
    position: "absolute", width: FRUIT_SIZE, height: FRUIT_SIZE,
    alignItems: "center", justifyContent: "center",
  },
  fruitEmoji: { fontSize: 42 },
  scorePop: {
    position: "absolute", fontSize: 26, fontWeight: "900",
    zIndex: 20,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },

  groundGrass: {
    position: "absolute", width: SCREEN_W, height: 34,
    backgroundColor: "#5BBF3E", opacity: 0.75,
  },
  basketWrapper: {
    position: "absolute", width: BASKET_W, height: BASKET_H, alignItems: "center",
  },
  basketEmoji:  { fontSize: 60 },
  soundBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,200,0,0.6)",
    marginRight: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  soundBtnText: { fontSize: 20 },
  basketShadow: {
    position: "absolute", bottom: -5, width: BASKET_W * 0.65, height: 8,
    backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 4,
  },
});

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  return (
    <SafeAreaProvider>
      <GameInner />
    </SafeAreaProvider>
  );
}
