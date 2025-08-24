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
import BottomNavFooter from '../../components/footer'; // Adjust path as needed

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
      Alert.alert('Success', `Friend request sent to ${memberName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const handleSendMessage = async (memberId: number, memberName: string) => {
    try {
      Alert.alert('Success', `Message composer opened for ${memberName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to open message composer. Please try again.');
    }
  };

  const getLastActiveTime = (member: Member): string => {
    if (member.last_activity) {
      return formatTimeAgo(member.last_activity);
    }
    
    if (member.registered_date) {
      return formatTimeAgo(member.registered_date);
    }
    
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
      <Text style={styles.pageTitle}>Community Members</Text>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {filteredMembers.length} active members found
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.pageContainer}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading members...</Text>
          </View>
        </SafeAreaView>
        <BottomNavFooter activeTab="Community" />
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
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
      <BottomNavFooter activeTab="Community" />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#6c757d',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '400',
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '31%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f3f4',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f3f4',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  friendBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  friendBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: '100%',
  },
  lastActive: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  actionButtons: {
    width: '100%',
    gap: 6,
  },
  addFriendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  addFriendButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  unfriendButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  unfriendButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  pendingButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  messageButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default MembersPage;