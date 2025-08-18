import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { getToken } from '../authen/authStorage';

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
  navigation?: any; // Add navigation prop if using React Navigation
}

const FriendsList: React.FC<FriendsListProps> = ({ navigation }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setError(error instanceof Error ? error.message : 'Failed to load friends');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  const handleUnfriend = async (friendshipId: number) => {
    Alert.alert(
      'Unfriend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfriend',
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
                setFriends(friends.filter(f => f.id !== friendshipId));
                Alert.alert('Success', 'Friend removed successfully');
              } else {
                Alert.alert('Error', 'Failed to remove friend');
              }
            } catch (error) {
              console.error('Error unfriending:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleMessageFriend = (friendId: number, friendName: string) => {
    // Navigate to messaging screen or implement messaging logic
    if (navigation) {
      navigation.navigate('Messages', { friendId, friendName });
    } else {
      Alert.alert('Message', `Start conversation with ${friendName}`);
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
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
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {item.friend_details?.name || 'Unknown User'}
        </Text>
        <Text style={styles.friendSince}>
          Friends since {new Date(item.date_created).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.messageButton]}
          onPress={() => handleMessageFriend(item.friend_id, item.friend_details?.name || 'User')}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.unfriendButton]}
          onPress={() => handleUnfriend(item.id)}
        >
          <Text style={styles.unfriendButtonText}>Unfriend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFriends}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {friends.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubText}>
            Start connecting with other members!
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  friendItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  friendSince: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: '#4A90E2',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  unfriendButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  unfriendButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default FriendsList;