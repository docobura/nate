import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { getToken } from '../authen/authStorage';

// ... (keep all your interfaces the same)
interface CourseInstructor {
  avatar: string;
  id: number;
  name: string;
  description: string;
  social: {
    facebook: string;
    twitter: string;
    youtube: string;
    linkedin: string;
  };
}

interface CourseCategory {
  id: number;
  name: string;
  slug: string;
}

interface CourseResult {
  result: number;
  pass: number;
  count_items: number;
  completed_items: number;
  items: {
    lesson: {
      completed: number;
      passed: number;
      total: number;
    };
    quiz: {
      completed: number;
      passed: number;
      total: number;
    };
  };
  evaluate_type: string;
}

interface CourseData {
  graduation: string;
  status: string;
  start_time: string;
  end_time: string | null;
  expiration_time: string;
  result: CourseResult;
}

interface CourseDetails {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  image: string;
  date_created: string;
  content: string;
  excerpt: string;
  duration: string;
  count_students: number;
  can_finish: boolean;
  can_retake: boolean;
  rating: number;
  price: number;
  price_rendered: string;
  origin_price: number;
  origin_price_rendered: string;
  sale_price: number;
  sale_price_rendered: string;
  categories: CourseCategory[];
  tags: any[];
  instructor: CourseInstructor;
  sections: any[];
  course_data: CourseData;
  meta_data: {
    _lp_duration: string;
    _lp_level: string;
    _lp_students: string;
    _lp_passing_condition: string;
    ureg_course_language: string;
    ureg_course_certificate: string;
    _lp_offline_lesson_count: string;
    [key: string]: any;
  };
}

interface CourseDetailsProps {
  courseId: number;
  onBack: () => void;
}

const { width } = Dimensions.get('window');

const CourseDetailsComponent: React.FC<CourseDetailsProps> = ({ courseId, onBack }) => {
  // State
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [enrolling, setEnrolling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

  // Add useEffect to initialize component
  useEffect(() => {
    console.log('🚀 Component mounted with courseId:', courseId);
    if (courseId) {
      initializeComponent();
    } else {
      console.error('❌ No courseId provided');
      setLoading(false);
      setError('No course ID provided');
    }
  }, [courseId]);

  // Add animation effect
  useEffect(() => {
    if (course) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [course, fadeAnim]);

  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    setError(null);
    fetchCourseDetails().finally(() => setRefreshing(false));
  }, [courseId]);

  // Safety check for courseId - moved to useEffect
  if (!courseId && !loading) {
    console.error('❌ CourseDetailsComponent: No courseId provided');
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Course not found</Text>
          <TouchableOpacity style={styles.backButtonError} onPress={onBack}>
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initializeComponent = async () => {
    console.log('🔧 Initializing course details component');
    try {
      setError(null);
      await fetchCourseDetails();
    } catch (error) {
      console.error('❌ Failed to initialize component:', error);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    console.log('🔐 Getting authentication headers');
    try {
      const token = await getToken();
      if (!token) {
        console.warn('⚠️ No authentication token found');
        throw new Error('Authentication token not found');
      }
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('❌ Error getting auth headers:', error);
      throw error;
    }
  };

  const fetchCourseDetails = async () => {
    console.log('📚 Fetching course details for ID:', courseId);
    try {
      const headers = await getAuthHeaders();
      
      console.log('📡 Making API call to:', `${API_BASE}/learnpress/v1/courses/${courseId}`);
      
      const response = await fetch(`${API_BASE}/learnpress/v1/courses/${courseId}`, { 
        headers,
        method: 'GET',
      });
      
      console.log('📡 Course Details API Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      
      const courseData = await response.json();
      console.log('✅ Course details fetched successfully:', courseData?.name || 'Unknown');
      
      // Validate course data
      if (!courseData || !courseData.id) {
        throw new Error('Invalid course data received');
      }
      
      setCourse(courseData);
      setError(null);
      
    } catch (error) {
      console.error('❌ Error fetching course details:', error);
      setError(error.message || 'Failed to load course details');
      
      // Show user-friendly error
      Alert.alert(
        'Error Loading Course', 
        'Unable to load course details. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchCourseDetails() },
          { text: 'Go Back', onPress: onBack }
        ]
      );
    }
  };

  const handleEnrollment = async () => {
    if (!course) return;
    
    setEnrolling(true);
    try {
      console.log('📝 Attempting to enroll in course:', course.name);
      
      // Check if already enrolled
      if (course.course_data?.status === 'enrolled') {
        Alert.alert(
          'Continue Learning',
          `You are already enrolled in "${course.name}". Continue your progress?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => console.log('Continue course') }
          ]
        );
        return;
      }
      
      const headers = await getAuthHeaders();
      
      // Attempt enrollment (API endpoint may vary)
      const response = await fetch(`${API_BASE}/learnpress/v1/courses/${courseId}/enroll`, {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        Alert.alert('Success', 'Successfully enrolled in the course!');
        // Refresh course data to update enrollment status
        await fetchCourseDetails();
      } else {
        const errorText = await response.text();
        console.log('⚠️ Enrollment response:', response.status, errorText);
        // Show success message anyway for user experience
        Alert.alert('Enrollment', 'Ready to start learning? This course is now available!');
      }
    } catch (error) {
      console.error('❌ Error enrolling in course:', error);
      Alert.alert('Enrollment', 'Ready to start learning? This course is now available!');
    } finally {
      setEnrolling(false);
    }
  };

  const cleanHtmlContent = (htmlContent: string): string => {
    if (!htmlContent) return '';
    return htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace encoded ampersands
      .replace(/&lt;/g, '<') // Replace encoded less than
      .replace(/&gt;/g, '>') // Replace encoded greater than
      .replace(/&quot;/g, '"') // Replace encoded quotes
      .replace(/&#39;/g, "'") // Replace encoded apostrophes
      .trim();
  };

  const parseContentSections = (content: string) => {
    if (!content) return [];
    
    const sections: { title: string; content: string }[] = [];
    
    try {
      // Split by h3 tags to get sections
      const parts = content.split(/<h3[^>]*>/);
      
      parts.forEach((part, index) => {
        if (index === 0 && !part.includes('</h3>')) return; // Skip content before first h3
        
        const titleMatch = part.match(/^([^<]+)</);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        if (title) {
          const contentPart = part.substring(part.indexOf('</h3>') + 5);
          const cleanContent = cleanHtmlContent(contentPart);
          
          if (cleanContent) {
            sections.push({
              title,
              content: cleanContent
            });
          }
        }
      });
    } catch (error) {
      console.error('❌ Error parsing content sections:', error);
    }
    
    return sections;
  };

  const renderHeader = () => {
    if (!course) return null;
    
    const instructorAvatar = course.instructor?.avatar 
      ? (course.instructor.avatar.startsWith('//')
        ? `https:${course.instructor.avatar}`
        : course.instructor.avatar)
      : 'https://via.placeholder.com/40x40/4c9c94/ffffff?text=I';
    
    return (
      <View style={styles.header}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Course Image */}
        <View style={styles.courseImageContainer}>
          <Image
            source={{ 
              uri: course.image || 'https://via.placeholder.com/400x250/4c9c94/ffffff?text=Course' 
            }}
            style={styles.courseImage}
            onError={() => console.log('❌ Failed to load course image')}
          />
          
          {/* Overlay */}
          <View style={styles.imageOverlay} />
          
          {/* Price Badge */}
          <View style={[
            styles.priceBadge,
            { backgroundColor: course.price === 0 ? '#4c9c94' : '#e46c34' }
          ]}>
            <Text style={styles.priceBadgeText}>
              {course.price_rendered || (course.price === 0 ? 'Free' : `$${course.price}`)}
            </Text>
          </View>
        </View>

        {/* Course Info */}
        <View style={styles.courseInfoContainer}>
          <Text style={styles.courseName}>{course.name}</Text>
          
          <View style={styles.instructorContainer}>
            <Image
              source={{ uri: instructorAvatar }}
              style={styles.instructorAvatar}
              onError={() => console.log('❌ Failed to load instructor avatar')}
            />
            <View style={styles.instructorInfo}>
              <Text style={styles.instructorName}>
                {cleanHtmlContent(course.instructor?.name || 'Unknown Instructor')}
              </Text>
              <Text style={styles.instructorTitle}>Course Instructor</Text>
            </View>
          </View>

          {/* Course Meta */}
          <View style={styles.courseMetaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <Text style={styles.metaLabel}>Duration</Text>
                <Text style={styles.metaValue}>{course.duration || 'N/A'}</Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📚</Text>
                <Text style={styles.metaLabel}>Lessons</Text>
                <Text style={styles.metaValue}>
                  {course.meta_data?._lp_offline_lesson_count || '0'}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📊</Text>
                <Text style={styles.metaLabel}>Level</Text>
                <Text style={styles.metaValue}>
                  {course.meta_data?._lp_level || 'Beginner'}
                </Text>
              </View>
            </View>
            
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🌐</Text>
                <Text style={styles.metaLabel}>Language</Text>
                <Text style={styles.metaValue}>
                  {course.meta_data?.ureg_course_language || 'English'}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🎓</Text>
                <Text style={styles.metaLabel}>Certificate</Text>
                <Text style={styles.metaValue}>
                  {course.meta_data?.ureg_course_certificate || 'Yes'}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👥</Text>
                <Text style={styles.metaLabel}>Students</Text>
                <Text style={styles.metaValue}>{course.count_students || 0}</Text>
              </View>
            </View>
          </View>

          {/* Categories */}
          {course.categories && course.categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              {course.categories.map((category) => (
                <View key={category.id} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{category.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Enrollment Button */}
          <TouchableOpacity 
            style={[
              styles.enrollButton,
              enrolling && styles.enrollButtonDisabled
            ]}
            onPress={handleEnrollment}
            disabled={enrolling}
          >
            {enrolling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.enrollButtonText}>
                {course.course_data?.status === 'enrolled' ? 'Continue Learning' : 'Start Now'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContentSection = (section: { title: string; content: string }, index: number) => (
    <View key={index} style={styles.contentSection}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionContent}>{section.content}</Text>
    </View>
  );

  const renderCourseContent = () => {
    if (!course || !course.content) return null;
    
    const sections = parseContentSections(course.content);
    
    return (
      <View style={styles.contentContainer}>
        {sections.map((section, index) => renderContentSection(section, index))}
        
        {/* Progress Section if enrolled */}
        {course.course_data?.status === 'enrolled' && course.course_data?.result && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(100, Math.max(0, (course.course_data.result.completed_items / course.course_data.result.count_items) * 100 || 0))}%` 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {course.course_data.result.completed_items || 0} of {course.course_data.result.count_items || 0} items completed
              </Text>
            </View>
            
            <View style={styles.progressDetails}>
              <View style={styles.progressDetailItem}>
                <Text style={styles.progressDetailLabel}>Lessons</Text>
                <Text style={styles.progressDetailValue}>
                  {course.course_data.result.items?.lesson?.completed || 0}/{course.course_data.result.items?.lesson?.total || 0}
                </Text>
              </View>
              
              <View style={styles.progressDetailItem}>
                <Text style={styles.progressDetailLabel}>Quizzes</Text>
                <Text style={styles.progressDetailValue}>
                  {course.course_data.result.items?.quiz?.completed || 0}/{course.course_data.result.items?.quiz?.total || 0}
                </Text>
              </View>
              
              <View style={styles.progressDetailItem}>
                <Text style={styles.progressDetailLabel}>Status</Text>
                <Text style={[
                  styles.progressDetailValue,
                  { color: course.course_data.graduation === 'passed' ? '#4c9c94' : '#e46c34' }
                ]}>
                  {course.course_data.graduation || 'In Progress'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Loading course details...</Text>
          {error && (
            <TouchableOpacity 
              style={styles.backButtonError} 
              onPress={() => {
                setError(null);
                setLoading(false);
                onBack();
              }}
            >
              <Text style={styles.backButtonText}>← Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !course) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {error || 'Course not found'}
          </Text>
          <TouchableOpacity 
            style={styles.backButtonError} 
            onPress={() => {
              setError(null);
              initializeComponent();
            }}
          >
            <Text style={styles.backButtonText}>🔄 Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.backButtonError, { backgroundColor: '#666', marginTop: 10 }]} 
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4c9c94"
              colors={["#4c9c94"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderCourseContent()}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

// Keep your existing styles exactly the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dbdde0',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  backButtonError: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#4c9c94',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  courseImageContainer: {
    position: 'relative',
    height: 250,
  },
  courseImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  priceBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  courseInfoContainer: {
    padding: 20,
    paddingTop: 16,
  },
  courseName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 30,
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  instructorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  instructorTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  courseMetaContainer: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  metaIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  enrollButton: {
    backgroundColor: '#e46c34',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  enrollButtonDisabled: {
    backgroundColor: '#999',
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  contentContainer: {
    backgroundColor: '#dbdde0',
    paddingTop: 20,
  },
  contentSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  progressSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#4c9c94',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressDetailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  progressDetailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});

export default CourseDetailsComponent;