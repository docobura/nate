import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Animated,
  Image,
} from "react-native";
import { Link } from "expo-router";
import { useEffect, useRef } from "react";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ImageBackground
        source={require("../../assets/images/networking.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.darkOverlay} />

        <SafeAreaView style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>

        <Animated.View
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>
            <Text style={styles.tealText}>A global platform </Text>
            for <Text style={styles.orangeText}>social change</Text>,{" "}
            <Text style={styles.orangeText}>social impact</Text>, and{"\n"}
            <Text style={styles.orangeText}>
              social-justice oriented{"\n"}networks
            </Text>
          </Text>

          <Text style={styles.subtitle}>
            Where network leaders and coordinators come together, share, and grow.
          </Text>

          <View style={styles.buttonContainer}>
            <Link href="/signup" asChild>
              <TouchableOpacity style={styles.signupBtn} activeOpacity={0.8}>
                <Text style={styles.signupText}>SIGN UP</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/login" asChild>
              <TouchableOpacity style={styles.loginBtn} activeOpacity={0.8}>
                <Text style={styles.loginText}>LOGIN</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
    zIndex: 10,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 60,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: width > 400 ? 32 : 28,
    fontWeight: "700",
    color: "white",
    lineHeight: width > 400 ? 44 : 38,
    marginBottom: 24,
    textAlign: "center",
  },
  tealText: {
    color: "#4dd0e1",
  },
  orangeText: {
    color: "#ff6f00",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 18,
    lineHeight: 26,
    marginBottom: 40,
    fontWeight: "300",
    textAlign: "center",
    maxWidth: "90%",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  signupBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 3,
  },
  signupText: {
    color: "#ff6f00",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loginBtn: {
    backgroundColor: "#ff6f00",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    elevation: 4,
  },
  loginText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});