import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, gradients, spacing, radii } from "../theme";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

type AuthMode = "login" | "register";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function submit() {
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        });
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : mode === "login"
            ? "Could not sign in. Check your details and backend connection."
            : "Could not create the account. Check your details and backend connection.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={gradients.oceanHeader} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require("../../assets/sx_logo_transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Scuba diving & x-treme sport adventures
            </Text>

            <View style={styles.card}>
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => changeMode("login")}
                  style={[styles.modeButton, mode === "login" && styles.modeButtonActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === "login" }}
                >
                  <Text
                    style={[
                      styles.modeText,
                      mode === "login" && styles.modeTextActive,
                    ]}
                  >
                    Log in
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => changeMode("register")}
                  style={[
                    styles.modeButton,
                    mode === "register" && styles.modeButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === "register" }}
                >
                  <Text
                    style={[
                      styles.modeText,
                      mode === "register" && styles.modeTextActive,
                    ]}
                  >
                    Create account
                  </Text>
                </Pressable>
              </View>

              {mode === "register" ? (
                <>
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    textContentType="givenName"
                    placeholder="First name"
                    placeholderTextColor={colors.slate400}
                  />

                  <Text style={styles.label}>Last name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    textContentType="familyName"
                    placeholder="Last name"
                    placeholderTextColor={colors.slate400}
                  />

                  <Text style={styles.label}>Phone (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    placeholder="+27 ..."
                    placeholderTextColor={colors.slate400}
                  />
                </>
              ) : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor={colors.slate400}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType={mode === "register" ? "newPassword" : "password"}
                placeholder={mode === "register" ? "At least 8 characters" : "Password"}
                placeholderTextColor={colors.slate400}
              />

              {mode === "register" ? (
                <>
                  <Text style={styles.label}>Confirm password</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    textContentType="newPassword"
                    placeholder="Repeat password"
                    placeholderTextColor={colors.slate400}
                  />
                </>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={mode === "login" ? "Log in" : "Create account"}
                onPress={() => void submit()}
                loading={loading}
                disabled={
                  !email.trim() ||
                  !password ||
                  (mode === "register" &&
                    (!firstName.trim() || !lastName.trim() || !confirmPassword))
                }
                style={styles.submitButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  logo: {
    width: 140,
    height: 140,
  },
  tagline: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  modeRow: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.sand50,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.white,
  },
  modeText: {
    color: colors.slate600,
    fontSize: 13,
    fontWeight: "700",
  },
  modeTextActive: {
    color: colors.ocean600,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.slate600,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink900,
  },
  error: {
    color: colors.danger600,
    fontSize: 13,
    marginTop: spacing.md,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});
