/* eslint-disable import/no-unresolved */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { 
  Path, 
  Rect, 
  Circle, 
  Polygon, 
  Line, 
  G, 
  Defs, 
  Pattern,
  LinearGradient as SvgLinearGradient,
  Stop
} from 'react-native-svg';

const { width } = Dimensions.get('window');

interface Group {
  id: number;
  creator_id: number;
  parent_id: number;
  date_created: string;
  date_created_gmt: string;
  created_since: string;
  description: {
    raw: string;
    rendered: string;
  };
  enable_forum: boolean;
  link: string;
  name: string;
  slug: string;
  status: string;
  types: string[];
  total_member_count: number;
  last_activity: string | null;
  last_activity_diff: string | null;
  avatar_urls: {
    full: string;
    thumb: string;
  };
  _links: any;
}

// Pattern Components
const ChevronPattern = ({ color1, color2 }: { color1: string; color2: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 200 200">
    <Defs>
      <Pattern id="chevron" patternUnits="userSpaceOnUse" width="20" height="20">
        <Path d="M0 0 L10 10 L0 20 L10 30 L0 40" stroke={color1} strokeWidth="2" fill="none" />
        <Path d="M10 0 L20 10 L10 20 L20 30 L10 40" stroke={color2} strokeWidth="2" fill="none" />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#chevron)" />
  </Svg>
);

const WavePattern = ({ color1, color2 }: { color1: string; color2: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 200 200">
    <Defs>
      <SvgLinearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={color1} />
        <Stop offset="100%" stopColor={color2} />
      </SvgLinearGradient>
    </Defs>
    <Path d="M0,50 Q50,0 100,50 T200,50 L200,100 Q150,150 100,100 T0,100 Z" fill={color1} />
    <Path d="M0,100 Q50,50 100,100 T200,100 L200,150 Q150,200 100,150 T0,150 Z" fill={color2} />
    <Path d="M0,150 Q50,100 100,150 T200,150 L200,200 L0,200 Z" fill="url(#waveGrad)" />
  </Svg>
);

const GridPattern = ({ color1, color2 }: { color1: string; color2: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 200 200">
    <Defs>
      <Pattern id="grid" patternUnits="userSpaceOnUse" width="20" height="20">
        <Rect width="10" height="10" fill={color1} />
        <Rect x="10" y="10" width="10" height="10" fill={color1} />
        <Rect x="10" y="0" width="10" height="10" fill={color2} />
        <Rect x="0" y="10" width="10" height="10" fill={color2} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#grid)" />
  </Svg>
);

const DotsPattern = ({ color1, color2 }: { color1: string; color2: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 200 200">
    <Defs>
      <Pattern id="dots" patternUnits="userSpaceOnUse" width="15" height="15">
        <Circle cx="7.5" cy="7.5" r="2" fill={color1} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill={color2} />
    <Rect width="100%" height="100%" fill="url(#dots)" />
  </Svg>
);

const StripesPattern = ({ color1, color2 }: { color1: string; color2: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 200 200">
    <Defs>
      <Pattern id="stripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <Rect width="5" height="10" fill={color1} />
        <Rect x="5" width="5" height="10" fill={color2} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#stripes)" />
  </Svg>
);

const TrianglePattern = ({ color1, color2 }: { color1: string; color2: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 200 200">
    <Defs>
      <Pattern id="triangles" patternUnits="userSpaceOnUse" width="30" height="30">
        <Polygon points="15,0 30,25 0,25" fill={color1} />
        <Polygon points="15,30 0,5 30,5" fill={color2} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#triangles)" />
  </Svg>
);

const GroupCard: React.FC<{ group: Group; index: number; onJoin: (groupId: number) => void }> = ({ group, index, onJoin }) => {
  const getCardConfig = (idx: number) => {
    const configs = [
      { 
        pattern: ChevronPattern, 
        colors: ['#4a90a4', '#7ab7d3'], 
        bgColor: '#5ba0b5',
        textColor: '#ffffff'
      },
      { 
        pattern: WavePattern, 
        colors: ['#ff7b54', '#4a90a4'], 
        bgColor: '#e85a4f',
        textColor: '#ffffff'
      },
      { 
        pattern: GridPattern, 
        colors: ['#ff7b54', '#4a90a4'], 
        bgColor: '#d63031',
        textColor: '#ffffff'
      },
      { 
        pattern: DotsPattern, 
        colors: ['#4a90a4', '#ffd93d'], 
        bgColor: '#6c5ce7',
        textColor: '#ffffff'
      },
      { 
        pattern: TrianglePattern, 
        colors: ['#4a90a4', '#74b9ff'], 
        bgColor: '#0984e3',
        textColor: '#ffffff'
      },
      { 
        pattern: StripesPattern, 
        colors: ['#ff7675', '#fd79a8'], 
        bgColor: '#e84393',
        textColor: '#ffffff'
      },
    ];
    return configs[idx % configs.length];
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const config = getCardConfig(index);
  const PatternComponent = config.pattern;

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: config.bgColor }]}>
        <View style={styles.patternContainer}>
          <PatternComponent color1={config.colors[0]} color2={config.colors[1]} />
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.circleContainer}>
              <View style={styles.circle}>
                <Text style={styles.circleText}>{group.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</Text>
              </View>
            </View>
            <Text style={[styles.groupName, { color: config.textColor }]}>{group.name}</Text>
            <Text style={[styles.groupType, { color: config.textColor }]}>Public Group</Text>
            <Text style={[styles.memberCount, { color: config.textColor }]}>
              {group.total_member_count} members
            </Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.description, { color: config.textColor }]}>
              {truncateText(stripHtml(group.description.rendered), 100)}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.createdDate, { color: config.textColor }]}>
              {group.created_since}
            </Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => onJoin(group.id)}
            >
              <Text style={styles.joinButtonText}>Join Group</Text>
              <Text style={styles.plusIcon}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const GroupsScreen: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('https://nexus.inhiveglobal.org/wp-json/buddypress/v1/groups');
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(group =>
        group.name.toLowerCase().includes(query.toLowerCase()) ||
        group.description.raw.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  };

  const handleJoinGroup = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    Alert.alert(
      'Join Group',
      `Would you like to join "${group?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: () => {
            Alert.alert('Success', 'You have successfully joined the group!');
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Clusters</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.allGroupsButton}>
          <Text style={styles.allGroupsText}>All Groups</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{groups.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createGroupButton}>
          <Text style={styles.createGroupText}>Create a Group</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Groups..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
    </View>
  );

  const renderGroup = ({ item, index }: { item: Group; index: number }) => (
    <GroupCard group={item} index={index} onJoin={handleJoinGroup} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4ECDC4']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  allGroupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  allGroupsText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  createGroupButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createGroupText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#4ECDC4',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchInput: {
    height: 45,
    fontSize: 16,
    color: '#fff',
  },
  listContainer: {
    padding: 10,
  },
  cardContainer: {
    flex: 1,
    margin: 5,
    maxWidth: (width - 30) / 2,
  },
  card: {
    borderRadius: 8,
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.3,
  },
  cardContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  circleContainer: {
    marginBottom: 15,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  circleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
    lineHeight: 20,
  },
  groupType: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 10,
  },
  description: {
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardFooter: {
    alignItems: 'center',
    marginTop: 10,
  },
  createdDate: {
    fontSize: 11,
    opacity: 0.8,
    marginBottom: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 5,
    fontSize: 12,
  },
  plusIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GroupsScreen;