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
  ScrollView,
  Dimensions,
} from 'react-native';
import { getToken } from '../authen/authStorage';

interface GroupMember {
  id: number;
  name: string;
  mention_name: string;
  link: string;
  user_login: string;
  avatar_urls: {
    full: string;
    thumb: string;
  };
  is_confirmed: boolean;
  is_banned: boolean;
  is_admin: boolean;
  is_mod: boolean;
  date_modified: string;
}

interface GroupActivity {
  id: number;
  user_id: number;
  content: {
    rendered: string;
  };
  date: string;
  user_avatar: string;
  user_display_name: string;
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
  creator_id: number;
  total_member_count: number;
  last_activity: string;
  avatar_urls?: {
    full: string;
    thumb: string;
  };
  cover_image_url?: string;
  types: string[];
  admins?: GroupMember[];
  mods?: GroupMember[];
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

interface GroupDetailsProps {
  group: Group;
  onBack: () => void;
}

const GroupDetailsComponent: React.FC<GroupDetailsProps> = ({ group, onBack }) => {
  // State
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'members' | 'activity'>('about');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [newPost, setNewPost] = useState<string>('');
  const [posting, setPosting] = useState<boolean>(false);
  
  // Animation
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

  useEffect(() => {
    console.log('🚀 GroupDetailsComponent: Component mounted for group:', group.name);
    initializeComponent();
    
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initializeComponent = async () => {
    console.log('🔧 Initializing group details component');
    try {
      await Promise.all([
        fetchCurrentUser(),
        fetchGroupMembers(),
        fetchGroupActivity(),
      ]);
    } catch (error) {
      console.error('❌ Failed to initialize component:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = async () => {
    console.log('🔐 Getting authentication headers');
    const token = await getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found');
      Alert.alert('Authentication Error', 'Please log in again to access group details.');
      return {};
    }
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
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
    }
  };

  const fetchGroupMembers = async () => {
    console.log('👥 Fetching group members for group ID:', group.id);
    try {
      const headers = await getAuthHeaders();
      
      if (!headers.Authorization) {
        throw new Error('Authentication required');
      }
      
      // 🎯 THE KEY API CALL TO GET GROUP MEMBERS
      const response = await fetch(`${API_BASE}/buddypress/v1/groups/${group.id}/members?per_page=100`, { headers });
      
      console.log('📡 Members API Response status:', response.status);
      
      if (response.ok) {
        const membersData = await response.json();
        console.log('✅ Members fetched successfully:', membersData.length, 'members');
        
        // Sort members: admins first, then mods, then regular members
        const sortedMembers = membersData.sort((a: GroupMember, b: GroupMember) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          if (a.is_mod && !b.is_mod) return -1;
          if (!a.is_mod && b.is_mod) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setMembers(sortedMembers);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch members:', response.status, errorText);
        throw new Error(`Failed to fetch members: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching group members:', error);
      Alert.alert('Error', 'Failed to load group members.');
    }
  };

  const fetchGroupActivity = async () => {
    console.log('📰 Fetching group activity for group ID:', group.id);
    try {
      const headers = await getAuthHeaders();
      
      if (!headers.Authorization) {
        throw new Error('Authentication required');
      }
      
      // Try to get group activities/posts
      const response = await fetch(`${API_BASE}/buddypress/v1/activity?component=groups&primary_id=${group.id}&per_page=50`, { headers });
      
      if (response.ok) {
        const activitiesData = await response.json();
        console.log('✅ Activities fetched successfully:', activitiesData.length, 'activities');
        setActivities(activitiesData);
      } else {
        console.log('❌ Failed to fetch activities, using mock data');
        // Mock activity for demo
        setActivities([]);
      }
    } catch (error) {
      console.error('❌ Error fetching group activity:', error);
      setActivities([]);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    Promise.all([
      fetchGroupMembers(),
      fetchGroupActivity(),
    ]).finally(() => setRefreshing(false));
  }, [group.id]);

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => {
            console.log('🚪 Leaving group:', group.name);
            // Implement leave group logic here
            Alert.alert('Success', 'You have left the group.', [
              { text: 'OK', onPress: onBack }
            ]);
          }
        }
      ]
    );
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    
    setPosting(true);
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/buddypress/v1/activity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newPost.trim(),
          component: 'groups',
          primary_item_id: group.id,
          type: 'activity_update'
        }),
      });

      if (response.ok) {
        console.log('✅ Post created successfully');
        setNewPost('');
        fetchGroupActivity(); // Refresh activities
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('❌ Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const getMemberRole = (member: GroupMember): string => {
    if (member.is_admin) return 'Admin';
    if (member.is_mod) return 'Moderator';
    return 'Member';
  };

  const getRoleColor = (member: GroupMember): string => {
    if (member.is_admin) return '#e46c34';
    if (member.is_mod) return '#4c9c94';
    return '#999';
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    }
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const cleanHtmlContent = (htmlContent: string): string => {
    return htmlContent.replace(/<[^>]*>/g, '').trim();
  };

  const renderGroupHeader = () => {
    const avatarUrl = group.avatar_urls?.thumb || 
                     'https://via.placeholder.com/80x80/4c9c94/ffffff?text=' + group.name.charAt(0);
    
    return (
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {group.cover_image_url ? (
            <Image source={{ uri: group.cover_image_url }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage, styles.defaultCover]} />
          )}
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          {/* Leave Group Button */}
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
            <Text style={styles.leaveButtonText}>✕ LEAVE GROUP</Text>
          </TouchableOpacity>
        </View>

        {/* Group Info */}
        <View style={styles.groupInfoContainer}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: avatarUrl.startsWith('//') ? `https:${avatarUrl}` : avatarUrl 
              }}
              style={styles.groupAvatar}
            />
          </View>
          
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name}</Text>
            <View style={styles.groupMeta}>
              <Text style={styles.groupStatus}>
                {group.status.charAt(0).toUpperCase() + group.status.slice(1)} Group
              </Text>
              <Text style={styles.groupMetaSeparator}>•</Text>
              <Text style={styles.groupTime}>
                {formatTimeAgo(group.last_activity || group.date_created)}
              </Text>
            </View>
            <Text style={styles.memberCount}>
              {group.total_member_count} MEMBERS
            </Text>
          </View>
        </View>

        {/* Group Description */}
        {group.description.rendered && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.groupDescription}>
              {cleanHtmlContent(group.description.rendered)}
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'home' && styles.activeTab]}
            onPress={() => setActiveTab('home')}
          >
            <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
              HOME
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.activeTab]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
              MEMBERS
            </Text>
            {members.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{members.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'docs' && styles.activeTab]}
            onPress={() => setActiveTab('docs')}
          >
            <Text style={[styles.tabText, activeTab === 'docs' && styles.activeTabText]}>
              DOCS
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'invites' && styles.activeTab]}
            onPress={() => setActiveTab('invites')}
          >
            <Text style={[styles.tabText, activeTab === 'invites' && styles.activeTabText]}>
              SEND INVITES
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderMemberItem = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberItem}>
      <Image
        source={{ 
          uri: item.avatar_urls.thumb.startsWith('//') 
            ? `https:${item.avatar_urls.thumb}` 
            : item.avatar_urls.thumb 
        }}
        style={styles.memberAvatar}
      />
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={[styles.memberRole, { color: getRoleColor(item) }]}>
          {getMemberRole(item)}
        </Text>
      </View>
      
      <Text style={styles.memberJoinDate}>
        {formatTimeAgo(item.date_modified)}
      </Text>
    </View>
  );

  const renderActivityItem = ({ item }: { item: GroupActivity }) => (
    <View style={styles.activityItem}>
      <Image
        source={{ uri: item.user_avatar }}
        style={styles.activityAvatar}
      />
      
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityUser}>{item.user_display_name}</Text>
          <Text style={styles.activityTime}>{formatTimeAgo(item.date)}</Text>
        </View>
        
        <Text style={styles.activityText}>
          {cleanHtmlContent(item.content.rendered)}
        </Text>
      </View>
    </View>
  );

  const renderPostInput = () => (
    <View style={styles.postInputContainer}>
      <Image
        source={{ 
          uri: currentUser?.avatar_urls?.thumb || 
               'https://via.placeholder.com/40x40/4c9c94/ffffff?text=U'
        }}
        style={styles.postInputAvatar}
      />
      
      <View style={styles.postInputWrapper}>
        <TextInput
          style={styles.postInput}
          placeholder={`What's new in ${group.name}, ${currentUser?.name || 'there'}?`}
          value={newPost}
          onChangeText={setNewPost}
          multiline
          maxLength={1000}
          placeholderTextColor="#999"
        />
        
        <TouchableOpacity
          style={[styles.postButton, (!newPost.trim() || posting) && styles.postButtonDisabled]}
          onPress={handleCreatePost}
          disabled={!newPost.trim() || posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <View style={styles.tabContent}>
            {renderPostInput()}
            
            {activities.length > 0 ? (
              <FlatList
                data={activities}
                renderItem={renderActivityItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.activitySeparator} />}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📝</Text>
                <Text style={styles.emptyStateTitle}>No posts yet</Text>
                <Text style={styles.emptyStateText}>
                  Be the first to share something with the group!
                </Text>
              </View>
            )}
          </View>
        );
        
      case 'members':
        return (
          <View style={styles.tabContent}>
            <FlatList
              data={members}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.memberSeparator} />}
            />
          </View>
        );
        
      case 'docs':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📄</Text>
              <Text style={styles.emptyStateTitle}>No documents</Text>
              <Text style={styles.emptyStateText}>
                Documents shared in this group will appear here.
              </Text>
            </View>
          </View>
        );
        
      case 'invites':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>✉️</Text>
              <Text style={styles.emptyStateTitle}>Send Invitations</Text>
              <Text style={styles.emptyStateText}>
                Invite friends to join this group.
              </Text>
            </View>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      
      <ScrollView
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
        {renderGroupHeader()}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dbdde0',
  },
  scrollContainer: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  coverContainer: {
    position: 'relative',
    height: 120,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  defaultCover: {
    backgroundColor: '#4c9c94',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
  },
  leaveButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 0,
  },
  avatarContainer: {
    marginTop: -25,
    marginRight: 16,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4c9c94',
  },
  groupInfo: {
    flex: 1,
    paddingTop: 8,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupStatus: {
    fontSize: 14,
    color: '#4c9c94',
    fontWeight: '500',
  },
  groupMetaSeparator: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  groupTime: {
    fontSize: 14,
    color: '#999',
  },
  memberCount: {
    fontSize: 12,
    color: '#4c9c94',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4c9c94',
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#4c9c94',
  },
  tabBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4c9c94',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#fff',
    minHeight: 400,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  postInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  postInputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  postInputWrapper: {
    flex: 1,
  },
  postInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    maxHeight: 100,
    marginBottom: 8,
  },
  postButton: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  postButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberJoinDate: {
    fontSize: 12,
    color: '#999',
  },
  memberSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 78,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  activitySeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 68,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default GroupDetailsComponent;