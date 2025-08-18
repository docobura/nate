import { useRouter } from 'expo-router';
import React, { useState, useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { storeToken } from '../authen/authStorage'; // adjust path if needed


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
  GestureResponderEvent,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 360;

interface LoginData {
  email: string;
  password: string;
}

interface LoginErrors {
  email?: string;
  password?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  token?: string;
}

const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
    
    // Optional: Show tab bar again when leaving this screen
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    };
  }, [navigation]);

  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const handleInputChange = (field: keyof LoginData, value: string): void => {
    setLoginData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    if (!loginData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!loginData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const postLoginToAPI = async (userData: LoginData): Promise<ApiResponse> => {
  try {
    const response = await fetch('https://nexus.inhiveglobal.org/wp-json/jwt-auth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userData.email,  // WordPress uses 'username', but it's usually the email
        password: userData.password,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.token) {
      return {
        success: true,
        message: 'Login successful',
        data,
        token: data.token,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Login failed',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
    };
  }
};

const router = useRouter();

const handleLogin = async (): Promise<void> => {
  console.log('Login button pressed');
  debugger; // Check if function is being called

  // Validate form
  if (!validateForm()) {
    console.warn('Form validation failed');
    debugger; // Inspect validation errors
    return;
  }

  setIsLoading(true);
  console.log('Loading state set to true');

  try {
    // Trim input data
    const trimmedData = {
      email: loginData.email.trim(),
      password: loginData.password.trim(),
    };
    console.log('Trimmed data:', trimmedData);
    debugger; // Verify trimmed data

    // API call
    console.log('Making API call...');
    const result = await postLoginToAPI(trimmedData);
    console.log('API response:', result);
    debugger; // Inspect API response

if (result.success && result.token) {
  await storeToken(result.token); // ✅ Store it before navigating
  console.log('Token stored, navigating to dashboard');

  Alert.alert('Login Successful', result.message, [
    {
      text: 'OK',
      onPress: () => {
        router.push('/dashboard');
      },
    },
  ]);
    } else {
      console.warn('Login failed:', result.message);
      Alert.alert('Login Failed', result.message, [{ text: 'OK' }]);
    }
  } catch (error) {
    console.error('Login error:', error);
    debugger; // Inspect caught error
    Alert.alert(
      'Error',
      error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    console.log('Cleaning up, setting loading to false');
    setIsLoading(false);
  }
};

    function handleSignUp(event: GestureResponderEvent): void {
        router.push('/signup'); // Navigate to signup instead of throwing error
    }

    function handleForgotPassword(event: GestureResponderEvent): void {
        // You can implement forgot password navigation here
        Alert.alert('Forgot Password', 'Forgot password functionality coming soon!');
    }

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
            <Text style={styles.title}>Login to Your Account</Text>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.signUpLink} onPress={handleSignUp}>
              <Text style={styles.signUpText}>SIGN UP</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.loginButton}>
              <Text style={styles.loginText}>LOGIN</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>HOME → LOGIN</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.description}>
            Welcome back! Please enter your credentials to access your account.
          </Text>

          {/* Login Form Island */}
          <View style={styles.formIsland}>
            <View style={styles.formContent}>
              <Text style={styles.sectionTitle}>Account Login</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={loginData.email}
                  onChangeText={(value: string) => handleInputChange('email', value)}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={loginData.password}
                  onChangeText={(value: string) => handleInputChange('password', value)}
                  placeholder="Enter your password"
                  secureTextEntry
                  editable={!isLoading}
                />
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Remember Me and Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity 
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.submitButtonText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>LOGIN</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              {/* Social Login Options */}
              <View style={styles.socialLoginContainer}>
                <TouchableOpacity style={styles.socialButton}>
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.socialButton}>
                  <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up Link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpPromptText}>Dont have an account? </Text>
                <TouchableOpacity onPress={handleSignUp}>
                  <Text style={styles.signUpLinkText}>Create one here</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: isSmallScreen ? 40 : isTablet ? 60 : 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 16 : 20,
    marginTop: isSmallScreen ? 12 : 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
    backgroundColor: '#e67e22',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 8 : 12,
  },
  logoText: {
    color: '#ffffff',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20,
    fontWeight: '600',
    color: '#4a5568',
    flexShrink: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  signUpLink: {
    marginRight: isSmallScreen ? 8 : 16,
  },
  signUpText: {
    color: '#e67e22',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#e67e22',
    paddingHorizontal: isSmallScreen ? 12 : 20,
    paddingVertical: isSmallScreen ? 8 : 10,
    borderRadius: 4,
  },
  loginText: {
    color: '#ffffff',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
  },
  breadcrumb: {
    alignSelf: 'flex-end',
  },
  breadcrumbText: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#718096',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    paddingTop: isSmallScreen ? 20 : isTablet ? 40 : 30,
  },
  content: {
    padding: isSmallScreen ? 12 : isTablet ? 24 : 16,
    maxWidth: isTablet ? 600 : 500,
    alignSelf: 'center',
    width: '100%',
    marginTop: isSmallScreen ? 16 : isTablet ? 32 : 24,
  },
  description: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#718096',
    lineHeight: isSmallScreen ? 20 : 24,
    marginBottom: isTablet ? 32 : 24,
    textAlign: 'center',
    paddingHorizontal: isSmallScreen ? 8 : 0,
  },
  formIsland: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: isSmallScreen ? 20 : isTablet ? 40 : 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: isSmallScreen ? 4 : 8,
  },
  formContent: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 20 : isTablet ? 24 : 22,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: isSmallScreen ? 20 : 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: isSmallScreen ? 18 : 24,
  },
  label: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 12 : 14,
    fontSize: isSmallScreen ? 14 : 16,
    backgroundColor: '#ffffff',
    minHeight: isSmallScreen ? 44 : 48,
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: isSmallScreen ? 11 : 12,
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 24 : 32,
    flexWrap: 'wrap',
    gap: isSmallScreen ? 12 : 0,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: isSmallScreen ? 16 : 18,
    height: isSmallScreen ? 16 : 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e67e22',
    borderColor: '#e67e22',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#4a5568',
  },
  forgotPasswordText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#e67e22',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#e67e22',
    paddingVertical: isSmallScreen ? 14 : 16,
    paddingHorizontal: isSmallScreen ? 24 : 32,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : 24,
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 20 : 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    fontSize: isSmallScreen ? 13 : 14,
    color: '#718096',
    fontWeight: '500',
  },
  socialLoginContainer: {
    marginBottom: isSmallScreen ? 20 : 24,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: isSmallScreen ? 12 : 14,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 10 : 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  socialButtonText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: isSmallScreen ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexWrap: 'wrap',
  },
  signUpPromptText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#718096',
  },
  signUpLinkText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#e67e22',
    fontWeight: '600',
  },
});

export default LoginScreen;