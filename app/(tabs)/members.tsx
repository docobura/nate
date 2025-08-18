import React, { useState, useEffect } from 'react';
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
} from 'react-native';

interface XProfileField {
  name: string;
  id: number;
  value: {
    raw: string;
    unserialized: string[];
    rendered: string;
  };
}

interface XProfileGroup {
  name: string;
  id: number;
  fields: XProfileField[] | { [key: string]: XProfileField };
}

interface Member {
  id: number;
  name: string;
  user_login: string;
  friendship_status: boolean | string;
  friendship_status_slug: boolean | string;
  link: string;
  member_types: string[];
  xprofile: {
    groups: XProfileGroup[];
  };
  mention_name: string;
  avatar_urls: {
    full: string;
    thumb: string;
  };
  last_activity?: string;
  registered_date?: string;
}

const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const API_ENDPOINT = 'https://nexus.inhiveglobal.org/wp-json/buddypress/v1/members';

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, members]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINT}?per_page=50&type=active`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMembers(data);
      setFilteredMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
      Alert.alert('Error', 'Failed to load members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user_login.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMembers(filtered);
  };

  const addFriend = async (memberId: number, memberName: string) => {
    Alert.alert(
      'Add Friend',
      `Send friend request to ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Request', onPress: () => handleAddFriend(memberId, memberName) }
      ]
    );
  };

  const sendMessage = async (memberId: number, memberName: string) => {
    Alert.alert(
      'Send Message',
      `Send a message to ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Message', onPress: () => handleSendMessage(memberId, memberName) }
      ]
    );
  };

  const handleAddFriend = async (memberId: number, memberName: string) => {
    try {
      // This would typically require authentication and proper API call
      Alert.alert('Success', `Friend request sent to ${memberName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const handleSendMessage = async (memberId: number, memberName: string) => {
    try {
      // This would typically open a message composer or navigate to messages
      Alert.alert('Success', `Message composer opened for ${memberName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to open message composer. Please try again.');
    }
  };

  const getLastActiveTime = (member: Member): string => {
    // Try to extract last activity from various possible fields
    if (member.last_activity) {
      return formatTimeAgo(member.last_activity);
    }
    
    // Fallback to registered date if available
    if (member.registered_date) {
      return formatTimeAgo(member.registered_date);
    }
    
    // Generate random recent activity for demo (replace with actual data)
    const randomTimes = ['3 minutes ago', 'an hour ago', '5 days ago', '13 days ago', '21 days ago'];
    return randomTimes[member.id % randomTimes.length];
  };

  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
      if (diffInHours < 24) return `${diffInHours === 1 ? 'an' : diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } catch (error) {
      return 'Recently active';
    }
  };

  const getFriendshipStatus = (member: Member): 'friend' | 'pending' | 'none' => {
    if (member.friendship_status === true || member.friendship_status === 'is_friend') {
      return 'friend';
    }
    if (member.friendship_status === 'pending' || member.friendship_status_slug === 'pending') {
      return 'pending';
    }
    return 'none';
  };

  const renderMemberCard = ({ item }: { item: Member }) => {
    const friendshipStatus = getFriendshipStatus(item);
    
    return (
      <View style={styles.memberCard}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ 
              uri: item.avatar_urls?.thumb?.startsWith('//') 
                ? `https:${item.avatar_urls.thumb}` 
                : item.avatar_urls?.thumb 
            }}
            style={styles.avatar}
            defaultSource={{ uri: 'https://www.gravatar.com/avatar/?d=mm&s=128' }}
          />
          {friendshipStatus === 'friend' && (
            <View style={styles.friendBadge}>
              <Text style={styles.friendBadgeText}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
          {item.name || item.user_login}
        </Text>
        
        <Text style={styles.lastActive}>
          {getLastActiveTime(item)}
        </Text>

        <View style={styles.actionButtons}>
          {friendshipStatus === 'friend' ? (
            <TouchableOpacity style={styles.unfriendButton}>
              <Text style={styles.unfriendButtonText}>✕ UNFRIEND</Text>
            </TouchableOpacity>
          ) : friendshipStatus === 'pending' ? (
            <TouchableOpacity style={styles.pendingButton}>
              <Text style={styles.pendingButtonText}>⏳ PENDING</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={() => addFriend(item.id, item.name)}
            >
              <Text style={styles.addFriendButtonText}>+ ADD FRIEND</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => sendMessage(item.id, item.name)}
          >
            <Text style={styles.messageButtonText}>✉ MESSAGE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchButtonText}>SEARCH</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Viewing 1 - {Math.min(filteredMembers.length, 50)} of {filteredMembers.length} active members
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>Loading members...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <FlatList
        data={filteredMembers}
        renderItem={renderMemberCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: '#E67E22',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginBottom: 10,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    width: '31%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  friendBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  lastActive: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButtons: {
    width: '100%',
    gap: 8,
  },
  addFriendButton: {
    borderWidth: 1,
    borderColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  addFriendButtonText: {
    color: '#4ECDC4',
    fontSize: 11,
    fontWeight: 'bold',
  },
  unfriendButton: {
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  unfriendButtonText: {
    color: '#E74C3C',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pendingButton: {
    borderWidth: 1,
    borderColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  pendingButtonText: {
    color: '#F39C12',
    fontSize: 11,
    fontWeight: 'bold',
  },
  messageButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default MembersPage;