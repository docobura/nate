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
import GroupDetailsComponent from '../(tabs)/groupdetail'; // Updated import path

interface GroupAvatar {
  full: string;
  thumb: string;
}

interface Group {
  id: number;
  name: string;
  description: {
    rendered: string;
    raw: string;
  };
  slug: string;
  status: 'public' | 'private' | 'hidden';
  date_created: string;
  date_created_gmt: string;
  creator_id: number;
  parent_id: number;
  total_member_count: number;
  last_activity: string;
  last_activity_gmt: string;
  avatar_urls?: GroupAvatar;
  cover_image_url?: string;
  types: string[];
  admins?: any[];
  mods?: any[];
  enable_forum: boolean;
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

const GroupsComponent: React.FC = () => {
  // State
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null); // Navigation state
  
  // Refs
  const listRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

  useEffect(() => {
    console.log('🚀 GroupsComponent: Component mounted');
    initializeComponent();
  }, []);

  useEffect(() => {
    console.log('🔍 Search query changed:', searchQuery);
    filterGroups();
  }, [searchQuery, groups]);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const initializeComponent = async () => {
    console.log('🔧 Initializing groups component');
    try {
      await fetchCurrentUser();
      await fetchGroups();
    } catch (error) {
      console.error('❌ Failed to initialize component:', error);
    }
  };

  const getAuthHeaders = async () => {
    console.log('🔐 Getting authentication headers');
    const token = await getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found');
      Alert.alert('Authentication Error', 'Please log in again to access groups.');
      return {};
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
      } else {
        console.error('❌ Failed to fetch current user:', response.status);
        // Try alternative user endpoint if available
        try {
          const altResponse = await fetch(`${API_BASE}/buddypress/v1/members/me`, { headers });
          if (altResponse.ok) {
            const altUserData = await altResponse.json();
            console.log('✅ Current user fetched from alternative endpoint:', altUserData);
            setCurrentUser(altUserData);
          }
        } catch (altError) {
          console.log('❌ Alternative user endpoint also failed');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
    }
  };

  const fetchGroups = async (isRefresh = false) => {
    console.log('📥 Fetching user groups', isRefresh ? '(refresh)' : '(initial)');
    try {
      if (!isRefresh) setLoading(true);
      
      const headers = await getAuthHeaders();
      
      if (!headers.Authorization) {
        console.error('❌ No authorization header available');
        throw new Error('Authentication required');
      }
      
      // API call to get user's groups
      const response = await fetch(`${API_BASE}/buddypress/v1/groups/me?per_page=100`, { headers });
      
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const groupsData = await response.json();
        console.log('✅ Raw API Response:', groupsData);
        console.log('✅ Groups fetched successfully:', groupsData.length, 'groups');
        
        // Sort groups by last activity (most recent first)
        const sortedGroups = groupsData.sort((a: Group, b: Group) => 
          new Date(b.last_activity || b.date_created).getTime() - 
          new Date(a.last_activity || a.date_created).getTime()
        );
        
        sortedGroups.forEach((group: Group, index: number) => {
          console.log(`👥 Group ${index + 1}:`, {
            id: group.id,
            name: group.name,
            status: group.status,
            memberCount: group.total_member_count,
            lastActivity: group.last_activity,
          });
        });
        
        setGroups(sortedGroups);
        setFilteredGroups(sortedGroups);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch groups:', response.status, errorText);
        throw new Error(`Failed to fetch groups: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      Alert.alert('Error', 'Failed to load groups. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    fetchGroups(true);
  }, []);

  const filterGroups = () => {
    if (!searchQuery.trim()) {
      console.log('🔍 Clearing search filter');
      setFilteredGroups(groups);
      return;
    }

    console.log('🔍 Filtering groups with query:', searchQuery);
    const filtered = groups.filter(group => {
      const groupDescription = cleanHtmlContent(group.description.rendered);
      
      const matches = (
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        groupDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return matches;
    });
    
    console.log('🔍 Filter results:', filtered.length, 'out of', groups.length, 'groups');
    setFilteredGroups(filtered);
  };

  const cleanHtmlContent = (htmlContent: string): string => {
    return htmlContent.replace(/<[^>]*>/g, '').trim();
  };

  const formatLastActivity = (dateString: string): string => {
    const activityDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - activityDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes < 1 ? 'Active now' : `${diffInMinutes}m ago`;
    }
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    
    return activityDate.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'public':
        return '#4c9c94';
      case 'private':
        return '#e46c34';
      case 'hidden':
        return '#999';
      default:
        return '#4c9c94';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'public':
        return '🌐';
      case 'private':
        return '🔒';
      case 'hidden':
        return '👁️‍🗨️';
      default:
        return '👥';
    }
  };

  // Navigate to group details
  const handleGroupPress = (group: Group) => {
    console.log('🎯 Group pressed:', group.name);
    setSelectedGroup(group); // Navigate to group details
  };

  // Back navigation handler
  const handleBackToGroups = () => {
    console.log('🔙 Returning to groups list');
    setSelectedGroup(null);
  };

  const renderGroupItem = ({ item, index }: { item: Group; index: number }) => {
    const groupDescription = cleanHtmlContent(item.description.rendered);
    const avatarUrl = item.avatar_urls?.thumb || 
                     'https://via.placeholder.com/60x60/4c9c94/ffffff?text=' + item.name.charAt(0);
    
    return (
      <Animated.View 
        style={[
          styles.groupItemContainer,
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
          style={styles.groupItem}
          onPress={() => handleGroupPress(item)}
          activeOpacity={0.7}
        >
          {/* Group Avatar and Cover */}
          <View style={styles.groupImageContainer}>
            {item.cover_image_url ? (
              <Image
                source={{ uri: item.cover_image_url }}
                style={styles.coverImage}
              />
            ) : (
              <View style={[styles.coverImage, styles.defaultCover]} />
            )}
            
            <View style={styles.avatarContainer}>
              <Image
                source={{ 
                  uri: avatarUrl.startsWith('//') 
                    ? `https:${avatarUrl}` 
                    : avatarUrl 
                }}
                style={styles.groupAvatar}
                defaultSource={{ uri: 'https://via.placeholder.com/60x60/4c9c94/ffffff?text=G' }}
              />
            </View>
          </View>

          {/* Group Content */}
          <View style={styles.groupContent}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName} numberOfLines={1}>
                {item.name}
              </Text>
              
              <View style={styles.statusContainer}>
                <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.groupDescription} numberOfLines={2}>
              {groupDescription || 'No description available'}
            </Text>

            <View style={styles.groupFooter}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberIcon}>👥</Text>
                <Text style={styles.memberCount}>
                  {item.total_member_count} {item.total_member_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
              
              <Text style={styles.lastActivity}>
                {formatLastActivity(item.last_activity || item.date_created)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Groups</Text>
      <Text style={styles.headerSubtitle}>
        {groups.length} {groups.length === 1 ? 'group' : 'groups'}
      </Text>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
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
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>No Groups Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No groups match "${searchQuery}"`
          : "You haven't joined any groups yet.\nExplore and join groups to connect with others!"
        }
      </Text>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Loading your groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Conditional rendering - Show group details if selected
  if (selectedGroup) {
    return (
      <GroupDetailsComponent 
        group={selectedGroup} 
        onBack={handleBackToGroups}
      />
    );
  }

  // Default render - Show groups list
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      
      {renderHeader()}
      
      <FlatList
        ref={listRef}
        data={filteredGroups}
        renderItem={renderGroupItem}
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
          filteredGroups.length === 0 && styles.emptyListContainer
        ]}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={renderSeparator}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
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
    marginBottom: 8,
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
  listContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  groupItemContainer: {
    marginBottom: 12,
  },
  groupItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  groupImageContainer: {
    position: 'relative',
    height: 100,
  },
  coverImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#f0f0f0',
  },
  defaultCover: {
    backgroundColor: '#4c9c94',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -20,
    left: 20,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4c9c94',
  },
  groupContent: {
    padding: 20,
    paddingTop: 28,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  memberCount: {
    fontSize: 14,
    color: '#4c9c94',
    fontWeight: '600',
  },
  lastActivity: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
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

export default GroupsComponent;