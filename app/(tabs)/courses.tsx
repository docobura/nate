import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
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
import CourseDetailsComponent from '../(tabs)/courseinfo'; 
// CHANGE 1: Fix the footer import
import BottomNavFooter from '../../components/footer'; // Adjust path as needed

interface CourseInstructor {
  avatar: string;
  id: number;
  name: string;
  description: string;
}

interface CourseCategory {
  term_id: number;
  name: string;
  slug: string;
  term_group: number;
  term_taxonomy_id: number;
  taxonomy: string;
  description: string;
  parent: number;
  count: number;
  filter: string;
  id: number;
}

interface Course {
  id: number;
  name: string;
  image: string;
  instructor: CourseInstructor;
  duration: string;
  categories: CourseCategory[];
  price: number;
  price_rendered: string;
  origin_price: string;
  origin_price_rendered: string;
  on_sale: boolean;
  sale_price: number;
  sale_price_rendered: string;
  rating: number;
  lessons_count?: number;
  students_count?: number;
  meta_data: {
    _lp_passing_condition: number;
  };
}

interface User {
  id: number;
  name: string;
  avatar_urls?: {
    full: string;
    thumb: string;
  };
}

const { width } = Dimensions.get('window');

const CoursesComponent: React.FC = () => {
  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  
  // CHANGE 2: Add footer state management
  const [activeTab, setActiveTab] = useState<string>('Resources');
  
  // Refs
  const listRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

  // CHANGE 3: Add footer navigation handler
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    
    // Add your navigation logic here
    switch (tabId) {
      case 'Home':
        // navigation.navigate('Home');
        console.log('Navigating to Home');
        break;
      case 'Community':
        // navigation.navigate('Community');
        console.log('Navigating to Community');
        break;
      case 'Impact':
        // navigation.navigate('Impact');
        console.log('Navigating to Impact');
        break;
      case 'Resources':
        // Already on resources/courses page
        console.log('Already on Resources');
        break;
      case 'More':
        // navigation.navigate('More');
        console.log('Navigating to More');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    console.log('🚀 CoursesComponent: Component mounted');
    initializeComponent();
  }, []);

  useEffect(() => {
    console.log('🔍 Search query changed:', searchQuery);
    filterCourses();
  }, [searchQuery, courses, selectedCategory]);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const initializeComponent = async () => {
    console.log('🔧 Initializing courses component');
    try {
      await fetchCurrentUser();
      await fetchCourses();
    } catch (error) {
      console.error('❌ Failed to initialize component:', error);
    }
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    console.log('🔐 Getting authentication headers');
    const token = await getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found');
      Alert.alert('Authentication Error', 'Please log in again to access courses.');
      return { 'Content-Type': 'application/json' };
    }
    console.log('✅ Token found, length:', token.length);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchCurrentUser = async () => {
    console.log('👤 Fetching current user data');
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/wp/v2/users/me`, { headers });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Current user fetched:', {
          id: userData.id,
          name: userData.name,
        });
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
    }
  };

  const fetchCourses = async (isRefresh = false) => {
    console.log('📚 Fetching courses', isRefresh ? '(refresh)' : '(initial)');
    try {
      if (!isRefresh) setLoading(true);
      
      const headers = await getAuthHeaders();
      
      // 🎯 THE KEY API CALL TO GET COURSES
      const response = await fetch(`${API_BASE}/learnpress/v1/courses?per_page=100`, { headers });
      
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const coursesData = await response.json();
        console.log('✅ Raw API Response:', coursesData);
        console.log('✅ Courses fetched successfully:', coursesData.length, 'courses');
        
        // Extract unique categories
        const allCategories: CourseCategory[] = [];
        coursesData.forEach((course: Course) => {
          course.categories.forEach(category => {
            if (!allCategories.find(cat => cat.id === category.id)) {
              allCategories.push(category);
            }
          });
        });
        
        setCategories(allCategories);
        setCourses(coursesData);
        setFilteredCourses(coursesData);
        
        coursesData.forEach((course: Course, index: number) => {
          console.log(`📖 Course ${index + 1}:`, {
            id: course.id,
            name: course.name,
            instructor: course.instructor.name,
            duration: course.duration,
            price: course.price_rendered,
            categories: course.categories.map(cat => cat.name).join(', '),
          });
        });
        
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch courses:', response.status, errorText);
        throw new Error(`Failed to fetch courses: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    fetchCourses(true);
  }, []);

  const filterCourses = () => {
    let filtered = courses;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(course =>
        course.categories.some(category => category.slug === selectedCategory)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      console.log('🔍 Filtering courses with query:', searchQuery);
      filtered = filtered.filter(course => {
        const instructorName = course.instructor.name.toLowerCase();
        const courseName = course.name.toLowerCase();
        const categoryNames = course.categories.map(cat => cat.name.toLowerCase()).join(' ');
        const searchTerm = searchQuery.toLowerCase();
        
        return (
          courseName.includes(searchTerm) ||
          instructorName.includes(searchTerm) ||
          categoryNames.includes(searchTerm)
        );
      });
    }
    
    console.log('🔍 Filter results:', filtered.length, 'out of', courses.length, 'courses');
    setFilteredCourses(filtered);
  };

  const handleCoursePress = (course: Course) => {
    console.log('🎯 Course pressed:', course.name);
    setSelectedCourseId(course.id); // Navigate to course details
  };

  // 🎯 BACK NAVIGATION HANDLER
  const handleBackToCourses = () => {
    console.log('🔙 Returning to courses list');
    setSelectedCourseId(null);
  };

  const getRatingStars = (rating: number): string => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    return '★'.repeat(fullStars) + 
           (halfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
  };

  const renderCourseItem = ({ item, index }: { item: Course; index: number }) => {
    const instructorAvatar = item.instructor.avatar.startsWith('//')
      ? `https:${item.instructor.avatar}`
      : item.instructor.avatar;
    
    const courseImage = item.image || 'https://via.placeholder.com/300x200/4c9c94/ffffff?text=Course';
    
    return (
      <Animated.View 
        style={[
          styles.courseItemContainer,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.courseItem}
          onPress={() => handleCoursePress(item)}
          activeOpacity={0.7}
        >
          {/* Course Image */}
          <View style={styles.courseImageContainer}>
            <Image
              source={{ uri: courseImage }}
              style={styles.courseImage}
              defaultSource={{ uri: 'https://via.placeholder.com/300x200/4c9c94/ffffff?text=Course' }}
            />
            
            {/* Price Badge */}
            <View style={[
              styles.priceBadge,
              { backgroundColor: item.price === 0 ? '#4c9c94' : '#e46c34' }
            ]}>
              <Text style={styles.priceBadgeText}>
                {item.price_rendered}
              </Text>
            </View>

            {/* Sale Badge */}
            {item.on_sale && (
              <View style={styles.saleBadge}>
                <Text style={styles.saleBadgeText}>SALE</Text>
              </View>
            )}
          </View>

          {/* Course Content */}
          <View style={styles.courseContent}>
            <View style={styles.courseHeader}>
              <Text style={styles.courseName} numberOfLines={2}>
                {item.name}
              </Text>
              
              {/* Rating */}
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingStars}>
                  {getRatingStars(item.rating)}
                </Text>
                <Text style={styles.ratingText}>
                  ({item.rating.toFixed(1)})
                </Text>
              </View>
            </View>

            {/* Instructor */}
            <View style={styles.instructorContainer}>
              <Image
                source={{ uri: instructorAvatar }}
                style={styles.instructorAvatar}
                defaultSource={{ uri: 'https://via.placeholder.com/30x30/4c9c94/ffffff?text=I' }}
              />
              <Text style={styles.instructorName} numberOfLines={1}>
                {item.instructor.name}
              </Text>
            </View>

            {/* Course Meta */}
            <View style={styles.courseMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <Text style={styles.metaText}>{item.duration}</Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📚</Text>
                <Text style={styles.metaText}>
                  {item.lessons_count || 'N/A'} lessons
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👥</Text>
                <Text style={styles.metaText}>
                  {item.students_count || 0} students
                </Text>
              </View>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
              {item.categories.slice(0, 2).map((category, idx) => (
                <View key={category.id} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{category.name}</Text>
                </View>
              ))}
              {item.categories.length > 2 && (
                <Text style={styles.moreCategoriesText}>
                  +{item.categories.length - 2} more
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryFilter = () => (
    <View style={styles.categoryFilterContainer}>
      <FlatList
        horizontal
        data={[{ id: 0, name: 'All', slug: 'all' }, ...categories]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryFilterItem,
              selectedCategory === item.slug && styles.categoryFilterItemActive
            ]}
            onPress={() => setSelectedCategory(item.slug)}
          >
            <Text style={[
              styles.categoryFilterText,
              selectedCategory === item.slug && styles.categoryFilterTextActive
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.slug}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterList}
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Courses</Text>
      <Text style={styles.headerSubtitle}>
        {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} available
      </Text>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {renderCategoryFilter()}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={styles.emptyTitle}>No Courses Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory !== 'all'
          ? `No courses match your search criteria`
          : "No courses are available at the moment.\nCheck back later for new courses!"
        }
      </Text>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  // CHANGE 4: Fix loading state with footer
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
        <BottomNavFooter 
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </SafeAreaView>
    );
  }

  // 🎯 SHOW COURSE DETAILS IF SELECTED (No footer here since it's a different view)
  if (selectedCourseId) {
    return (
      <CourseDetailsComponent 
        courseId={selectedCourseId} 
        onBack={handleBackToCourses}
      />
    );
  }

  // CHANGE 5: Fix main render with footer
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      
      {renderHeader()}
      
      <FlatList
        ref={listRef}
        data={filteredCourses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4c9c94"
            colors={["#4c9c94"]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          filteredCourses.length === 0 && styles.emptyListContainer
        ]}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={renderSeparator}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
      
      <BottomNavFooter 
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dbdde0',
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
  },
  header: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
    padding: 4,
  },
  categoryFilterContainer: {
    marginBottom: 8,
  },
  categoryFilterList: {
    paddingVertical: 8,
  },
  categoryFilterItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryFilterItemActive: {
    backgroundColor: '#fff',
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoryFilterTextActive: {
    color: '#4c9c94',
  },
  listContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  courseItemContainer: {
    marginBottom: 16,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  courseImageContainer: {
    position: 'relative',
    height: 200,
  },
  courseImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  saleBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  courseContent: {
    padding: 20,
  },
  courseHeader: {
    marginBottom: 12,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    lineHeight: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    fontSize: 16,
    color: '#ffd700',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  instructorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  instructorName: {
    fontSize: 14,
    color: '#4c9c94',
    fontWeight: '600',
    flex: 1,
  },
  courseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  moreCategoriesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CoursesComponent;