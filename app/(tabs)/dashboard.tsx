import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  StatusBar,
  ScrollView,
  Image,
  Animated,
  TextInput,
} from "react-native";
import { Link } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { getToken } from '../authen/authStorage'; 
import BottomNavFooter from '../../components/footer';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";


const { width, height } = Dimensions.get("window");

export default function LandingPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchFocused, setSearchFocused] = useState(false);
  const [userName, setUserName] = useState<string>('User'); 
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const menuItems = [
  { title: "Groups", icon: <Ionicons name="people-outline" size={22} color="#333" />, route: "/groups", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
  { title: "Members", icon: <Ionicons name="person-outline" size={22} color="#333" />, route: "/members", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
  { title: "Events", icon: <Ionicons name="calendar-outline" size={22} color="#333" />, route: "/events", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
  { title: "Friends", icon: <Ionicons name="hand-left-outline" size={22} color="#333" />, route: "/friends", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
  { title: "Forums", icon: <MaterialIcons name="forum" size={22} color="#333" />, route: "/forums", gradient: ["#dbdde0", "#3a7a73"], color: "#dbdde0" },
  { title: "Courses", icon: <Feather name="book-open" size={22} color="#333" />, route: "/courses", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
  { title: "Messages", icon: <Ionicons name="mail-outline" size={22} color="#333" />, route: "/messages", gradient: ["#dbdde0", "#3a7a73"], color: "#dbdde0" },
  { title: "Podcasts", icon: <Ionicons name="headset-outline" size={22} color="#333" />, route: "/podcasts", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
  { title: "My Groups", icon: <FontAwesome5 name="layer-group" size={22} color="#333" />, route: "/mymessages", gradient: ["#dbdde0", "#3a7a73"], color: "#dbdde0" },
//   { title: "Gallery", icon: <Ionicons name="images-outline" size={22} color="#333" />, route: "/gallery", gradient: ["#dbdde0", "#d45929"], color: "#dbdde0" },
];
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Function to fetch current user data
  const fetchUserData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.log('No token found, using default name');
        return;
      }
      

      const response = await fetch('https://nexus.inhiveglobal.org/wp-json/wp/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('User data fetched:', userData.name);
        setUserName(userData.name || 'User');
      } else {
        console.log('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Fetch user data on component mount
    fetchUserData();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearInterval(timer);
  }, []);

  const AnimatedMenuGrid = () => {
    return (
      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <Animated.View
            key={index}
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50],
                    }),
                  },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <Link href={item.route as any} asChild>
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: item.color }]}
                activeOpacity={0.8}
              >
                <View style={styles.menuItemContent}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.menuIcon}>{item.icon}</Text>
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <View style={[styles.menuItemGlow, { backgroundColor: item.color }]} />
                </View>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      
      <SafeAreaView style={styles.container}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerGradient} />
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.menuButtonInner}>
              <Text style={styles.menuIcon}>☰</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nexus Platform</Text>
            <Text style={styles.headerSubtitle}>Connect • Learn • Grow</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <View style={styles.profileBadge}>
                <Text style={styles.headerIconText}>👤</Text>
                <View style={styles.onlineIndicator} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Enhanced Welcome Banner */}
          <Animated.View 
            style={[
              styles.bannerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.banner}>
              <Image
                source={require("../../assets/images/landing.png")}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              <View style={styles.bannerOverlay}>
                <View style={styles.bannerContent}>
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>{getGreeting()} {userName}</Text>
                    <Text style={styles.bannerSubtitle}>Welcome to your network</Text>
                    <Text style={styles.bannerTime}>
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.bannerButton}>
                    <Text style={styles.bannerButtonText}>📱</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.bannerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>24</Text>
                    <Text style={styles.statLabel}>Online</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>3</Text>
                    <Text style={styles.statLabel}>New</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Enhanced Dots indicator */}
            {/* <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View> */}
          </Animated.View>

          {/* Enhanced Search Bar */}
          <Animated.View 
            style={[
              styles.searchContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={[
              styles.searchBar,
              searchFocused && styles.searchBarFocused
            ]}>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Nexus..."
                  placeholderTextColor="#999"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>
              <View style={styles.searchTags}>
                <Text style={styles.searchTag}>NEXUS</Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Stats Bar */}
          <Animated.View 
            style={[
              styles.quickStatsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatNumber}>2</Text>
                <Text style={styles.quickStatLabel}>Friends</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatNumber}>4</Text>
                <Text style={styles.quickStatLabel}>Groups</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatNumber}>3</Text>
                <Text style={styles.quickStatLabel}>Messages</Text>
              </View>
            </View>
          </Animated.View>

        {/* Enhanced Menu Grid */}
        <AnimatedMenuGrid />
      </ScrollView>

      {/* Enhanced Bottom Navigation */}

    </SafeAreaView>
    <BottomNavFooter />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbdde0",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: "#4c9c94",
    paddingTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: "relative",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "linear-gradient(135deg, #4c9c94 0%, #3a7a73 100%)",
  },
  menuButton: {
    padding: 8,
  },
  menuButtonInner: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    padding: 8,
  },
  menuIcon: {
    fontSize: 18,
    color: "white",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  headerIcon: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
  },
  headerIconText: {
    fontSize: 16,
    color: "white",
  },
  profileBadge: {
    position: "relative",
  },
  onlineIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    backgroundColor: "#4ade80",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  banner: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#e46c34",
    position: "relative",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Changed from orange to semi-transparent black
    padding: 24,
    justifyContent: "space-between",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.95)",
    fontWeight: "500",
  },
  bannerTime: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    fontWeight: "600",
  },
  bannerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  bannerButtonText: {
    fontSize: 20,
  },
  bannerStats: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
    fontWeight: "600",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(228, 108, 52, 0.3)",
  },
  activeDot: {
    backgroundColor: "#e46c34",
    width: 24,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  searchBar: {
    width: '100%',
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(228, 108, 52, 0.1)",
  },
  searchBarFocused: {
    borderColor: "#e46c34",
    elevation: 6,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: "#666",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  searchTags: {
    flexDirection: "row",
  },
  searchTag: {
    fontSize: 10,
    color: "#e46c34",
    fontWeight: "700",
    backgroundColor: "rgba(228, 108, 52, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickStatsContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  quickStats: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickStatItem: {
    alignItems: "center",
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#e46c34",
  },
  quickStatLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    fontWeight: "600",
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(228, 108, 52, 0.2)",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 10,
  },
  menuItem: {
    width: (width - 64) / 3,
    height: 110,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  menuItemContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconContainer: {
    backgroundColor: "transparent", // Changed from semi-transparent white to transparent
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  // },
  // menuIcon: {
  //   fontSize: 24,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333", // Changed from white to dark color
    textAlign: "center",
    letterSpacing: 0.3,
    // Removed text shadow properties
  },
  menuItemGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    borderRadius: 16,
  },
  bottomNav: {
    backgroundColor: "#4c9c94",
    flexDirection: "row",
    paddingVertical: 12,
    paddingBottom: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: "relative",
  },
  bottomNavGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "linear-gradient(135deg, #4c9c94 0%, #3a7a73 100%)",
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  activeBottomNavItem: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginHorizontal: 4,
  },
  bottomNavIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  bottomNavIcon: {
    fontSize: 18,
    color: "white",
  },
  bottomNavText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  activeBottomNavText: {
    color: "white",
    fontWeight: "700",
  },
});