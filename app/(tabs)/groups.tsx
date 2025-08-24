import React, { useState, useEffect, useRef, useCallback } from 'react';
// CHANGE 1: Fix the import path - adjust based on your actual file structure
import BottomNavFooter from '../../components/footer'; // or '@/components/footer/BottomNavFooter'
import { storeToken, getToken } from '../authen/authStorage'; 
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
  Animated,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Group {
  id: number;
  name: string;
  description: {
    raw: string;
    rendered: string;
  } | string;
  slug: string;
  status: string;
  date_created: string;
  created_since?: string;
  avatar_urls: {
    full: string;
    thumb: string;
  };
  total_member_count: number;
  last_activity?: string | null;
  last_activity_diff?: string | null;
}

const InterestGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [joinLoading, setJoinLoading] = useState<number | null>(null);
  
  // CHANGE 2: Add footer state management
  const [activeTab, setActiveTab] = useState<string>('Community');
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const API_ENDPOINT = 'https://nexus.inhiveglobal.org/wp-json/buddypress/v1/groups';

  useEffect(() => {
    fetchGroups();
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
    // Debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      filterGroups();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, groups]);

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
        // Already on community page
        console.log('Already on Community');
        break;
      case 'Impact':
        // navigation.navigate('Impact');
        console.log('Navigating to Impact');
        break;
      case 'Resources':
        // navigation.navigate('Resources');
        console.log('Navigating to Resources');
        break;
      case 'More':
        // navigation.navigate('More');
        console.log('Navigating to More');
        break;
      default:
        break;
    }
  };

  const fetchGroups = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await fetch(`${API_ENDPOINT}?per_page=50&orderby=last_activity`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGroups(data);
      setFilteredGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Error', 'Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroups(true);
  }, []);

  const filterGroups = () => {
    let filtered = [...groups];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(group => {
        const description = typeof group.description === 'string' 
          ? group.description 
          : group.description?.raw || '';
        
        return group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               description.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Sort by last activity
    filtered.sort((a, b) => {
      return new Date(b.last_activity || b.date_created).getTime() - 
             new Date(a.last_activity || a.date_created).getTime();
    });

    setFilteredGroups(filtered);
  };

  const joinGroup = async (groupId: number, groupName: string) => {
    Alert.alert(
      'Join Group',
      `Would you like to join "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join', onPress: () => handleJoinGroup(groupId) }
      ]
    );
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      setJoinLoading(groupId);
      const token = await getToken();

      if (!token) {
        Alert.alert('Error', 'You must be logged in to join a group.');
        return;
      }

      const response = await fetch(`https://nexus.inhiveglobal.org/wp-json/buddypress/v1/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to join group.');
        return;
      }

      const responseData = await response.json();

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Successfully joined the group!');
        // Update the local group data
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.id === groupId 
              ? { ...group, total_member_count: group.total_member_count + 1 }
              : group
          )
        );
      } else {
        Alert.alert('Warning', 'Request processed but status unclear. Please check your group memberships.');
      }
    } catch (error) {
      console.error('Error in joinGroup:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    } finally {
      setJoinLoading(null);
    }
  };

  const goBack = () => {
    // Add your navigation logic here
    console.log('Going back...');
    // Example: navigation.goBack() or navigation.navigate('Home')
  };

  const getTimeSinceLastActivity = (group: Group): string => {
    if (group.last_activity_diff) {
      return group.last_activity_diff;
    }
    
    const dateToUse = group.last_activity || group.date_created;
    if (!dateToUse) return 'Unknown';
    
    try {
      const date = new Date(dateToUse);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return '1 day ago';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      return `${Math.floor(diffInDays / 30)} months ago`;
    } catch (error) {
      return 'Unknown';
    }
  };

  const getGroupIcon = (groupName: string): string => {
    const name = groupName.toLowerCase();
    if (name.includes('diversity') || name.includes('equity') || name.includes('inclusion')) return '⚖️';
    if (name.includes('refugee') || name.includes('rights')) return '🔔';
    if (name.includes('disability')) return '♿';
    if (name.includes('environment') || name.includes('climate')) return '🌍';
    if (name.includes('tech') || name.includes('innovation')) return '💻';
    if (name.includes('health') || name.includes('wellness')) return '🏥';
    if (name.includes('education') || name.includes('learning')) return '📚';
    if (name.includes('youth') || name.includes('young')) return '🌟';
    return '👥';
  };

  const getCardStyle = (memberCount: number) => {
    if (memberCount > 50) return styles.popularCard;
    if (memberCount > 20) return styles.activeCard;
    return styles.regularCard;
  };

  const openGroupDetails = (group: Group) => {
    setSelectedGroup(group);
  };

  const renderGroupCard = ({ item, index }: { item: Group; index: number }) => (
    <Animated.View
      style={[
        styles.cardContainer,
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
        style={[styles.groupCard, getCardStyle(item.total_member_count)]}
        onPress={() => openGroupDetails(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardHeader}>
          <View style={styles.groupIconContainer}>
            {item.avatar_urls?.thumb ? (
              <Image
                source={{ uri: item.avatar_urls.thumb }}
                style={styles.groupAvatar}
                onError={() => console.log('Failed to load avatar for group:', item.name)}
              />
            ) : (
              <View style={styles.iconFallback}>
                <Text style={styles.groupIcon}>{getGroupIcon(item.name)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.memberBadge}>
            <Text style={styles.memberCount}>
              {item.total_member_count || 0}
            </Text>
            <Text style={styles.memberLabel}>
              {(item.total_member_count || 0) === 1 ? 'MEMBER' : 'MEMBERS'}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.groupName} numberOfLines={2} ellipsizeMode="tail">
            {item.name || 'Unnamed Group'}
          </Text>
          
          <Text style={styles.lastActivity}>
            Active {getTimeSinceLastActivity(item)}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            joinLoading === item.id && styles.joinButtonLoading
          ]}
          onPress={() => joinGroup(item.id, item.name || 'Unknown Group')}
          disabled={joinLoading === item.id}
        >
          {joinLoading === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.joinButtonIcon}>+</Text>
              <Text style={styles.joinButtonText}>JOIN</Text>
            </>
          )}
        </TouchableOpacity>

        {item.total_member_count > 50 && (
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingText}>🔥</Text>
          </View>
        )}
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
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interest Groups</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups by name or topic..."
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
          Showing {filteredGroups.length} of {groups.length} groups
        </Text>
      </View>
    </Animated.View>
  );

  const renderGroupModal = () => (
    <Modal
      visible={selectedGroup !== null}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSelectedGroup(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setSelectedGroup(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {selectedGroup && (
            <>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  {selectedGroup.avatar_urls?.full ? (
                    <Image
                      source={{ uri: selectedGroup.avatar_urls.full }}
                      style={styles.modalAvatar}
                    />
                  ) : (
                    <View style={styles.modalIconFallback}>
                      <Text style={styles.modalIcon}>{getGroupIcon(selectedGroup.name)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modalTitle}>{selectedGroup.name}</Text>
                <Text style={styles.modalMembers}>
                  {selectedGroup.total_member_count} members
                </Text>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  {typeof selectedGroup.description === 'string' 
                    ? selectedGroup.description 
                    : selectedGroup.description?.raw || 'No description available'}
                </Text>
                
                <View style={styles.modalStats}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Created</Text>
                    <Text style={styles.modalStatValue}>
                      {new Date(selectedGroup.date_created).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatLabel}>Last Active</Text>
                    <Text style={styles.modalStatValue}>
                      {getTimeSinceLastActivity(selectedGroup)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.modalJoinButton}
                onPress={() => {
                  setSelectedGroup(null);
                  joinGroup(selectedGroup.id, selectedGroup.name);
                }}
              >
                <Text style={styles.modalJoinButtonText}>Join This Group</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // CHANGE 4: Fix loading state with proper footer props
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Discovering groups...</Text>
        </View>
        <BottomNavFooter 
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
      </SafeAreaView>
    );
  }

  // CHANGE 5: Fix main return with proper footer props
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      <FlatList
        data={filteredGroups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4c9c94"
            colors={["#4c9c94"]}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
      {renderGroupModal()}
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
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 24,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: '#94a3b8',
    padding: 4,
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: (width - 48) / 2,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
  },
  regularCard: {},
  activeCard: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  popularCard: {
    borderColor: '#f59e0b',
    borderWidth: 2,
    backgroundColor: '#fffbeb',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  groupIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  iconFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4c9c94',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 24,
    color: '#fff',
  },
  memberBadge: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  memberCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  memberLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  cardContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  lastActivity: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#4c9c94',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  joinButtonLoading: {
    backgroundColor: '#94a3b8',
  },
  joinButtonIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748b',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalIconFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4c9c94',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 32,
    color: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalMembers: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  modalStat: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  modalJoinButton: {
    backgroundColor: '#4c9c94',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalJoinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InterestGroupsPage;