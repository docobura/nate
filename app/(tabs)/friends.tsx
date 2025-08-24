import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { getToken } from '../authen/authStorage';
import BottomNavFooter from '../../components/footer'; // Adjust path as needed

interface Friend {
  id: number;
  initiator_id: number;
  friend_id: number;
  is_confirmed: boolean;
  date_created: string;
  friend_details?: {
    id: number;
    name: string;
    avatar_urls?: {
      full: string;
      thumb: string;
    };
    user_url?: string;
  };
}

interface FriendsListProps {
  navigation?: any;
}

const { width } = Dimensions.get('window');

const FriendsList: React.FC<FriendsListProps> = ({ navigation }) => {
  // State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Community');
  
  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchFriends();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    filterFriends();
  }, [searchQuery, friends]);

  // Footer navigation handler
  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
    
    switch (tabId) {
      case 'Home':
        console.log('Navigating to Home');
        break;
      case 'Community':
        console.log('Already on Community');
        break;
      case 'Impact':
        console.log('Navigating to Impact');
        break;
      case 'Resources':
        console.log('Navigating to Resources');
        break;
      case 'More':
        console.log('Navigating to More');
        break;
    }
  };

  const filterFriends = () => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const filtered = friends.filter(friend =>
      friend.friend_details?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredFriends(filtered);
  };

  const fetchFriends = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in to view your friends.');
        return;
      }

      const response = await fetch('https://nexus.inhiveglobal.org/wp-json/buddypress/v1/friends', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const friendsData: Friend[] = await response.json();

      // Fetch friend details for each friend
      const friendsWithDetails = await Promise.all(
        friendsData.map(async (friendship) => {
          try {
            const friendResponse = await fetch(
              `https://nexus.inhiveglobal.org/wp-json/buddypress/v1/members/${friendship.friend_id}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (friendResponse.ok) {
              const friendDetails = await friendResponse.json();
              return {
                ...friendship,
                friend_details: friendDetails,
              };
            } else {
              return friendship;
            }
          } catch (error) {
            console.error(`Error fetching friend details for ID ${friendship.friend_id}:`, error);
            return friendship;
          }
        })
      );

      setFriends(friendsWithDetails);
      setFilteredFriends(friendsWithDetails);
      setError(null);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setError(error instanceof Error ? error.message : 'Failed to load friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  const handleUnfriend = async (friendshipId: number, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              const response = await fetch(
                `https://nexus.inhiveglobal.org/wp-json/buddypress/v1/friends/${friendshipId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (response.ok) {
                const updatedFriends = friends.filter(f => f.id !== friendshipId);
                setFriends(updatedFriends);
                setFilteredFriends(updatedFriends.filter(friend =>
                  friend.friend_details?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery.trim()
                ));
                Alert.alert('Success', `${friendName} has been removed from your friends.`);
              } else {
                Alert.alert('Error', 'Failed to remove friend. Please try again.');
              }
            } catch (error) {
              console.error('Error unfriending:', error);
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleMessageFriend = (friendId: number, friendName: string) => {
    if (navigation) {
      navigation.navigate('Messages', { friendId, friendName });
    } else {
      Alert.alert('Message', `Start conversation with ${friendName}`, [
        { text: 'OK', style: 'default' }
      ]);
    }
  };

  const handleViewProfile = (friendId: number, friendName: string) => {
    if (navigation) {
      navigation.navigate('Profile', { userId: friendId, userName: friendName });
    } else {
      Alert.alert('Profile', `View ${friendName}'s profile`);
    }
  };

  const getTimeSinceFriends = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return '1 day ago';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
      return `${Math.floor(diffInDays / 365)} years ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  const renderFriendItem = ({ item, index }: { item: Friend; index: number }) => (
    <Animated.View
      style={[
        styles.friendItemContainer,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => handleViewProfile(item.friend_id, item.friend_details?.name || 'User')}
        activeOpacity={0.9}
      >
        <View style={styles.avatarContainer}>
          {item.friend_details?.avatar_urls?.thumb ? (
            <Image
              source={{ uri: item.friend_details.avatar_urls.thumb }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>
                {item.friend_details?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.onlineIndicator} />
        </View>

        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>
            {item.friend_details?.name || 'Unknown User'}
          </Text>
          <Text style={styles.friendSince}>
            Friends since {getTimeSinceFriends(item.date_created)}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleMessageFriend(item.friend_id, item.friend_details?.name || 'User')}
          >
            <Text style={styles.messageIcon}>💬</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleUnfriend(item.id, item.friend_details?.name || 'User')}
          >
            <Text style={styles.moreIcon}>⋯</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Friends</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
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

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {filteredFriends.length} {filteredFriends.length === 1 ? 'friend' : 'friends'}
          {searchQuery && ` matching "${searchQuery}"`}
        </Text>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No friends found' : 'No friends yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No friends match "${searchQuery}"`
          : "Start connecting with other members to build your network!"
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
        <BottomNavFooter 
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFriends}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <BottomNavFooter 
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      
      <FlatList
        data={filteredFriends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
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
          filteredFriends.length === 0 && styles.emptyListContainer
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
    backgroundColor: '#f8f9fa',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  header: {
    backgroundColor: '#4c9c94',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearIcon: {
    fontSize: 16,
    color: '#666',
    padding: 4,
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  friendItemContainer: {
    marginBottom: 12,
  },
  friendItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4c9c94',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  friendSince: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4c9c94',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageIcon: {
    fontSize: 18,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  moreIcon: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default FriendsList;