import React, { useState, useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 360;

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  age: string;
  role: string;
  location?: string;
  interestGroup?: string;
  gender?: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  age?: string;
  role?: string;
  location?: string;
  interestGroup?: string;
  gender?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

type SignupPayload = {
  user_login: string;
  user_email: string;
  password: string;
  signup_field_data: {
    field_id: number;
    value: string;
  }[];
};

const CreateAccountScreen: React.FC = () => {
  console.log("🚀 CreateAccountScreen component mounted");

  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    age: "",
    role: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Log initial state
  useEffect(() => {
    console.log("📋 Initial form state:", {
      fieldsCount: Object.keys(formData).length,
      screenType: isTablet ? 'tablet' : isSmallScreen ? 'small' : 'normal',
      screenDimensions: { width: screenWidth, height: screenHeight }
    });
  }, []);

  const handleInputChange = (field: keyof FormData, value: string): void => {
    console.log(`✏️ Input changed - ${field}: "${value}"`);
    
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };
      console.log("📝 Updated form data:", newData);
      return newData;
    });

    // Clear errors when user starts typing
    if (errors[field]) {
      console.log(`✅ Clearing error for field: ${field}`);
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    console.log("🔍 Starting form validation...");
    console.log("📊 Current form data:", formData);
    
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      console.log("❌ Username validation failed: empty");
    } else {
      console.log("✅ Username validation passed");
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
      console.log("❌ Email validation failed: empty");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      console.log("❌ Email validation failed: invalid format");
    } else {
      console.log("✅ Email validation passed");
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
      console.log("❌ Password validation failed: empty");
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      console.log(`❌ Password validation failed: too short (${formData.password.length} chars)`);
    } else {
      console.log("✅ Password validation passed");
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
      console.log("❌ Confirm password validation failed: empty");
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      console.log("❌ Confirm password validation failed: passwords don't match");
    } else {
      console.log("✅ Confirm password validation passed");
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
      console.log("❌ Name validation failed: empty");
    } else {
      console.log("✅ Name validation passed");
    }

    const isValid = Object.keys(newErrors).length === 0;
    console.log(`📊 Form validation result: ${isValid ? 'VALID' : 'INVALID'}`);
    
    if (!isValid) {
      console.log("❌ Validation errors:", newErrors);
    }

    setErrors(newErrors);
    return isValid;
  };

  const postDataToAPI = async (userData: SignupPayload): Promise<ApiResponse> => {
    const API_URL = "https://nexus.inhiveglobal.org/wp-json/buddypress/v1/signup";
    
    console.log("🌐 Starting API call to:", API_URL);
    console.log("📦 Request payload:", JSON.stringify(userData, null, 2));
    
    try {
      console.log("📡 Sending HTTP POST request...");
      const startTime = Date.now();
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(userData),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ API call completed in ${duration}ms`);
      console.log("📈 Response status:", response.status);
      console.log("📈 Response ok:", response.ok);

      const responseData = await response.json();
      console.log("📨 Response data:", JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        console.log("❌ API call failed with error:", responseData);
        throw new Error(
          responseData.message || `HTTP error! status: ${response.status}`
        );
      }

      console.log("✅ API call successful");
      return {
        success: true,
        message: responseData.message || "Account created successfully",
        data: responseData.data,
      };
    } catch (error) {
      console.error("💥 API Error:", error);
      console.error("🔍 Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
    }
  };

  const handleSignUp = async (): Promise<void> => {
    console.log("🎯 Sign up button pressed");
    console.log("👤 User attempting signup with email:", formData.email);

    // Validate form first
    if (!validateForm()) {
      console.log("⛔ Signup aborted: form validation failed");
      return;
    }

    console.log("✅ Form validation passed, proceeding with signup");
    setIsLoading(true);
    console.log("⏳ Loading state set to true");

    try {
      const {
        username,
        email,
        password,
        name,
        age,
        role,
        location,
        gender,
        interestGroup,
      } = formData;

      console.log("🏗️ Building signup payload...");
      
      const signup_field_data = [
        { field_id: 1, value: name },
        { field_id: 9, value: age },
        { field_id: 14, value: location || "" },
        { field_id: 36, value: interestGroup || "" },
        { field_id: 45, value: gender || "" },
      ];

      console.log("📋 Signup field data:", signup_field_data);

      const apiData: SignupPayload = {
        user_login: username,
        user_email: email,
        password,
        signup_field_data,
      };

      console.log("📦 Final API payload constructed:", JSON.stringify(apiData, null, 2));

      // Call API
      const result = await postDataToAPI(apiData);
      console.log("📊 API result:", result);

      if (result.success) {
        console.log("🎉 Signup successful!");
        console.log("📧 Success message:", result.message);
        
        Alert.alert("Success!", result.message, [
          {
            text: "OK",
            onPress: () => {
              console.log("🧹 Clearing form data after successful signup");
              setFormData({
                username: "",
                email: "",
                password: "",
                confirmPassword: "",
                name: "",
                age: "",
                role: "",
                location: "",
                gender: "",
                interestGroup: "",
              });
            },
          },
        ]);
      } else {
        console.log("❌ Signup failed:", result.message);
        Alert.alert("Signup Failed", result.message || "Unknown error");
      }
    } catch (error: any) {
      console.error("💥 Unexpected error during signup:", error);
      Alert.alert("API Error", error.message || "Something went wrong");
    } finally {
      console.log("🏁 Signup process completed, clearing loading state");
      setIsLoading(false);
    }
  };

  const handleLogin = (): void => {
    console.log("🔗 Login button pressed - should navigate to login screen");
    Alert.alert("Login", "Navigate to login screen");
  };

  // Log render
  console.log("🎨 Rendering CreateAccountScreen", {
    hasErrors: Object.keys(errors).length > 0,
    isLoading,
    formDataComplete: Object.values(formData).every(val => val !== "")
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>⋮</Text>
            </View>
            <Text style={styles.title}>Create an Account</Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.signUpLink}>
              <Text style={styles.signUpText}>SIGN UP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginText}>LOGIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>HOME → CREATE AN ACCOUNT</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            Registering for this site is easy. Just fill in the fields below,
            and we will get a new account set up for you in no time.
          </Text>

          {/* Form Island */}
          <View style={styles.formIsland}>
            <View style={styles.formColumns}>
              {/* Left Column - Account Details */}
              <View style={styles.leftColumn}>
                <Text style={styles.sectionTitle}>Account Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username (required)</Text>
                  <TextInput
                    style={[styles.input, errors.username && styles.inputError]}
                    value={formData.username}
                    onChangeText={(value: string) =>
                      handleInputChange("username", value)
                    }
                    placeholder="Enter username"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  {errors.username && (
                    <Text style={styles.errorText}>{errors.username}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address (required)</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    value={formData.email}
                    onChangeText={(value: string) =>
                      handleInputChange("email", value)
                    }
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Choose a Password (required)</Text>
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    value={formData.password}
                    onChangeText={(value: string) =>
                      handleInputChange("password", value)
                    }
                    placeholder="Enter password"
                    secureTextEntry
                    editable={!isLoading}
                  />
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password (required)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.confirmPassword && styles.inputError,
                    ]}
                    value={formData.confirmPassword}
                    onChangeText={(value: string) =>
                      handleInputChange("confirmPassword", value)
                    }
                    placeholder="Confirm password"
                    secureTextEntry
                    editable={!isLoading}
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>
                      {errors.confirmPassword}
                    </Text>
                  )}
                </View>
              </View>

              {/* Right Column - Profile Details */}
              <View style={styles.rightColumn}>
                <Text style={styles.sectionTitle}>Profile Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name (required)</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={formData.name}
                    onChangeText={(value: string) =>
                      handleInputChange("name", value)
                    }
                    placeholder="Enter your name"
                    editable={!isLoading}
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                  <Text style={styles.helperText}>
                    This field can be seen by: Everyone
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Age Range (required)</Text>
                  <View
                    style={[
                      styles.pickerWrapper,
                      errors.age && styles.inputError,
                    ]}
                  >
                    <Picker
                      selectedValue={formData.age}
                      onValueChange={(itemValue: string) => {
                        console.log("📅 Age range selected:", itemValue);
                        handleInputChange("age", itemValue);
                      }}
                      enabled={!isLoading}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select an age range..." value="" />
                      <Picker.Item label="15 - 22" value="15-22" />
                      <Picker.Item label="23 - 35" value="23-35" />
                      <Picker.Item label="36 - 50" value="36-50" />
                      <Picker.Item label="Above 50" value="50+" />
                    </Picker>
                  </View>
                  {errors.age && (
                    <Text style={styles.errorText}>{errors.age}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Geographical Location (required)
                  </Text>
                  <View
                    style={[
                      styles.pickerWrapper,
                      errors.location && styles.inputError,
                    ]}
                  >
                    <Picker
                      selectedValue={formData.location}
                      onValueChange={(itemValue: string) => {
                        console.log("🌍 Location selected:", itemValue);
                        handleInputChange("location", itemValue);
                      }}
                      enabled={!isLoading}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select a location..." value="" />
                      <Picker.Item label="Asia" value="Asia" />
                      <Picker.Item label="Africa" value="Africa" />
                      <Picker.Item label="America" value="America" />
                      <Picker.Item label="Europe" value="Europe" />
                      <Picker.Item label="Australia" value="Australia" />
                    </Picker>
                  </View>
                  {errors.location && (
                    <Text style={styles.errorText}>{errors.location}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Interest Groups (required)</Text>
                  <View
                    style={[
                      styles.pickerWrapper,
                      errors.interestGroup && styles.inputError,
                    ]}
                  >
                    <Picker
                      selectedValue={formData.interestGroup}
                      onValueChange={(itemValue: string) => {
                        console.log("🎯 Interest group selected:", itemValue);
                        handleInputChange("interestGroup", itemValue);
                      }}
                      enabled={!isLoading}
                      style={styles.picker}
                    >
                      <Picker.Item
                        label="Select an interest group..."
                        value=""
                      />
                      <Picker.Item
                        label="Education Based Alumni Networks (Africa & Asia)"
                        value="Education Based Alumni Networks (Africa & Asia)"
                      />
                      <Picker.Item
                        label="Youth Networks for Social Impact"
                        value="Youth Networks for Social Impact"
                      />
                      <Picker.Item
                        label="Education based Networks (Europe & US)"
                        value="Education based Networks (Europe & US)"
                      />
                      <Picker.Item
                        label="Public Sector leadership networks"
                        value="Public Sector leadership networks"
                      />
                      <Picker.Item
                        label="(SDG 5) - Gender Equality"
                        value="(SDG 5) - Gender Equality"
                      />
                      <Picker.Item
                        label="(SDG 8) - Decent Work and Economic Growth"
                        value="(SDG 8) - Decent Work and Economic Growth"
                      />
                      <Picker.Item
                        label="Education Scholarship Networks"
                        value="Education Scholarship Networks"
                      />
                      <Picker.Item
                        label="Education Based Alumni Networks (Pacific)"
                        value="Education Based Alumni Networks (Pacific)"
                      />
                      <Picker.Item
                        label="(SDG 10) - Reduced Inequalities"
                        value="(SDG 10) - Reduced Inequalities"
                      />
                      <Picker.Item
                        label="(SDG 13) - Climate Action"
                        value="(SDG 13) - Climate Action"
                      />
                      <Picker.Item
                        label="(SDG 16) - Peace, Justice and Strong Institutions"
                        value="(SDG 16) - Peace, Justice and Strong Institutions"
                      />
                      <Picker.Item
                        label="BACIN - Building Alumni Community Impact Networks"
                        value="BACIN - Building Alumni Community Impact Networks"
                      />
                      <Picker.Item
                        label="Disability Rights"
                        value="Disability Rights"
                      />
                      <Picker.Item
                        label="Refugee Rights"
                        value="Refugee Rights"
                      />
                      <Picker.Item
                        label="Diversity, Equity & Inclusion"
                        value="Diversity, Equity & Inclusion"
                      />
                    </Picker>
                  </View>
                  {errors.interestGroup && (
                    <Text style={styles.errorText}>{errors.interestGroup}</Text>
                  )}
                  <Text style={styles.helperText}>
                    This field can be seen by: Everyone
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Gender (required)</Text>
                  <View
                    style={[
                      styles.pickerWrapper,
                      errors.gender && styles.inputError,
                    ]}
                  >
                    <Picker
                      selectedValue={formData.gender}
                      onValueChange={(itemValue: string) => {
                        console.log("🚻 Gender selected:", itemValue);
                        handleInputChange("gender", itemValue);
                      }}
                      enabled={!isLoading}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select gender..." value="" />
                      <Picker.Item label="Male" value="Male" />
                      <Picker.Item label="Female" value="Female" />
                      <Picker.Item
                        label="I'd Rather Not Say"
                        value="I'd Rather Not Say"
                      />
                    </Picker>
                  </View>
                  {errors.gender && (
                    <Text style={styles.errorText}>{errors.gender}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <View style={styles.submitContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isLoading && styles.submitButtonDisabled,
                ]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.submitButtonText}>
                      Creating Account...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>COMPLETE SIGN UP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: isSmallScreen ? 40 : isTablet ? 60 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallScreen ? 12 : 16,
    marginTop: isSmallScreen ? 8 : 12,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logo: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    backgroundColor: "#e67e22",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: isSmallScreen ? 8 : 12,
  },
  logoText: {
    color: "#ffffff",
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "bold",
  },
  title: {
    fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20,
    fontWeight: "600",
    color: "#4a5568",
    flexShrink: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  signUpLink: {
    marginRight: isSmallScreen ? 8 : 16,
  },
  signUpText: {
    color: "#e67e22",
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#e67e22",
    paddingHorizontal: isSmallScreen ? 12 : 20,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 4,
  },
  loginText: {
    color: "#ffffff",
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: "600",
  },
  breadcrumb: {
    alignSelf: "flex-end",
  },
  breadcrumbText: {
    fontSize: isSmallScreen ? 10 : 12,
    color: "#718096",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    padding: isSmallScreen ? 12 : isTablet ? 24 : 16,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  description: {
    fontSize: isSmallScreen ? 14 : 16,
    color: "#718096",
    lineHeight: isSmallScreen ? 20 : 24,
    marginBottom: isTablet ? 32 : 20,
    textAlign: "center",
    paddingHorizontal: isSmallScreen ? 8 : 0,
  },
  formIsland: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: isSmallScreen ? 16 : isTablet ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: isSmallScreen ? 4 : 8,
  },
  formColumns: {
    flexDirection: isTablet ? "row" : "column",
    gap: isTablet ? 40 : 0,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
    marginTop: isTablet ? 0 : 24,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: isSmallScreen ? 16 : 20,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  inputGroup: {
    marginBottom: isSmallScreen ? 16 : 20,
  },
  label: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "500",
    color: "#4a5568",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 10 : 14,
    fontSize: isSmallScreen ? 14 : 16,
    backgroundColor: "#ffffff",
    minHeight: isSmallScreen ? 42 : 48,
  },
  inputError: {
    borderColor: "#e53e3e",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: isSmallScreen ? 11 : 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: isSmallScreen ? 11 : 12,
    color: "#718096",
    marginTop: 4,
    fontStyle: "italic",
  },
  submitContainer: {
    marginTop: isSmallScreen ? 24 : 32,
    paddingTop: isSmallScreen ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#e67e22",
    paddingVertical: isSmallScreen ? 12 : 16,
    paddingHorizontal: isSmallScreen ? 24 : 32,
    borderRadius: 6,
    minWidth: isSmallScreen ? 180 : 200,
    alignItems: "center",
    width: isSmallScreen ? "100%" : "auto",
    maxWidth: 300,
  },
  submitButtonDisabled: {
    backgroundColor: "#a0a0a0",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    backgroundColor: "#ffffff",
    minHeight: isSmallScreen ? 42 : 48,
    justifyContent: "center",
  },
  picker: {
    height: isSmallScreen ? 42 : 48,
    width: "100%",
  },
});

export default CreateAccountScreen;