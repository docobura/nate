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
    SafeAreaView,
    StatusBar,
    RefreshControl,
    Animated,
    Dimensions,
} from 'react-native';
import { getToken } from '../authen/authStorage';
import PodcastPlayerComponent from '../../components/podcastcomponent';
import BottomNavFooter from '../../components/footer'; // Import the footer component

interface PodcastTitle {
    rendered: string;
}

interface PodcastContent {
    rendered: string;
    protected: boolean;
}

interface PodcastExcerpt {
    rendered: string;
    protected: boolean;
}

interface Podcast {
    id: number;
    date: string;
    date_gmt: string;
    modified: string;
    modified_gmt: string;
    slug: string;
    status: string;
    type: string;
    link: string;
    title: PodcastTitle;
    content: PodcastContent;
    excerpt: PodcastExcerpt;
    author: number;
    featured_media: number;
    comment_status: string;
    ping_status: string;
    podcast_categories: number[];
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

const PodcastsComponent: React.FC = () => {
    // State
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [filteredPodcasts, setFilteredPodcasts] = useState<Podcast[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null); // Navigation state

    // Refs
    const listRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

    useEffect(() => {
        console.log('🚀 PodcastsComponent: Component mounted');
        initializeComponent();
    }, []);

    useEffect(() => {
        console.log('🔍 Search query changed:', searchQuery);
        filterPodcasts();
    }, [searchQuery, podcasts]);

    // Fade in animation on mount
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const initializeComponent = async () => {
        console.log('🔧 Initializing podcasts component');
        try {
            await fetchCurrentUser();
            await fetchPodcasts();
        } catch (error) {
            console.error('❌ Failed to initialize component:', error);
        }
    };

    const getAuthHeaders = async () => {
        console.log('🔐 Getting authentication headers');
        const token = await getToken();
        if (!token) {
            console.warn('⚠️ No authentication token found');
            // For podcasts, we might not need authentication for public content
            return {
                'Content-Type': 'application/json',
            };
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
            if (headers.Authorization) {
                const response = await fetch(`${API_BASE}/wp/v2/users/me`, { headers });

                if (response.ok) {
                    const userData = await response.json();
                    console.log('✅ Current user fetched:', {
                        id: userData.id,
                        name: userData.name,
                    });
                    setCurrentUser(userData);
                } else {
                    console.log('ℹ️ User not authenticated, continuing with public access');
                }
            }
        } catch (error) {
            console.log('ℹ️ Continuing without user authentication');
        }
    };

    const fetchPodcasts = async (isRefresh = false) => {
        console.log('📥 Fetching podcasts', isRefresh ? '(refresh)' : '(initial)');
        try {
            if (!isRefresh) setLoading(true);

            const headers = await getAuthHeaders();

            // API call to get podcasts
            const response = await fetch(`${API_BASE}/wp/v2/podcasts?per_page=100&_embed=author`, { headers });

            console.log('📡 API Response status:', response.status);

            if (response.ok) {
                const podcastsData = await response.json();
                console.log('✅ Raw API Response:', podcastsData);
                console.log('✅ Podcasts fetched successfully:', podcastsData.length, 'podcasts');

                // Sort podcasts by date (most recent first)
                const sortedPodcasts = podcastsData.sort((a: Podcast, b: Podcast) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                sortedPodcasts.forEach((podcast: Podcast, index: number) => {
                    console.log(`🎙️ Podcast ${index + 1}:`, {
                        id: podcast.id,
                        title: podcast.title.rendered,
                        date: podcast.date,
                        categories: podcast.podcast_categories,
                    });
                });

                setPodcasts(sortedPodcasts);
                setFilteredPodcasts(sortedPodcasts);
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to fetch podcasts:', response.status, errorText);
                throw new Error(`Failed to fetch podcasts: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error fetching podcasts:', error);
            Alert.alert('Error', 'Failed to load podcasts. Please check your connection and try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        console.log('🔄 Pull to refresh triggered');
        setRefreshing(true);
        fetchPodcasts(true);
    }, []);

    const filterPodcasts = () => {
        if (!searchQuery.trim()) {
            console.log('🔍 Clearing search filter');
            setFilteredPodcasts(podcasts);
            return;
        }

        console.log('🔍 Filtering podcasts with query:', searchQuery);
        const filtered = podcasts.filter(podcast => {
            const podcastContent = cleanHtmlContent(podcast.content.rendered);
            const podcastExcerpt = cleanHtmlContent(podcast.excerpt.rendered);

            const matches = (
                podcast.title.rendered.toLowerCase().includes(searchQuery.toLowerCase()) ||
                podcastContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
                podcastExcerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                podcast.slug.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return matches;
        });

        console.log('🔍 Filter results:', filtered.length, 'out of', podcasts.length, 'podcasts');
        setFilteredPodcasts(filtered);
    };

    const cleanHtmlContent = (htmlContent: string): string => {
        return htmlContent.replace(/<[^>]*>/g, '').trim();
    };

    const formatDate = (dateString: string): string => {
        const podcastDate = new Date(dateString);
        const now = new Date();
        const diffInMs = now.getTime() - podcastDate.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
        }

        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;

        return podcastDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const extractAudioUrl = (content: string): string | null => {
        const audioMatch = content.match(/src="([^"]*\.(?:mp3|m4a|wav|ogg))"/i);
        return audioMatch ? audioMatch[1] : null;
    };

    const getDurationFromContent = (content: string): string => {
        // This is a placeholder - you might want to extract actual duration from metadata
        // or calculate it from the audio file
        return 'Unknown duration';
    };

    // Navigate to podcast player
    const handlePodcastPress = (podcast: Podcast) => {
        console.log('🎯 Podcast pressed:', podcast.title.rendered);
        const audioUrl = extractAudioUrl(podcast.content.rendered);
        if (audioUrl) {
            setSelectedPodcast(podcast); // Navigate to podcast player
        } else {
            Alert.alert('Error', 'Audio file not found for this podcast.');
        }
    };

    // Back navigation handler
    const handleBackToPodcasts = () => {
        console.log('🔙 Returning to podcasts list');
        setSelectedPodcast(null);
    };

    // Handle footer navigation
    const handleTabPress = (tabId: string) => {
        console.log('🔗 Footer tab pressed:', tabId);
        // Handle specific navigation for different tabs
        switch (tabId) {
            case 'Home':
                // Navigation is handled in the footer component
                break;
            case 'Resources':
                console.log('📍 Already in Resources (Podcasts) section');
                break;
            case 'Community':
                console.log('👥 Navigate to Community');
                // Add navigation logic for Community if needed
                break;
            default:
                console.log('❓ Unknown tab:', tabId);
        }
    };

    const renderPodcastItem = ({ item, index }: { item: Podcast; index: number }) => {
        const podcastDescription = cleanHtmlContent(item.excerpt.rendered) ||
            cleanHtmlContent(item.content.rendered);
        const audioUrl = extractAudioUrl(item.content.rendered);
        const hasAudio = !!audioUrl;

        return (
            <Animated.View
                style={[
                    styles.podcastItemContainer,
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
                    style={styles.podcastItem}
                    onPress={() => handlePodcastPress(item)}
                    activeOpacity={0.7}
                    disabled={!hasAudio}
                >
                    {/* Podcast Header */}
                    <View style={styles.podcastHeader}>
                        <View style={styles.podcastIconContainer}>
                            <Text style={styles.podcastIcon}>🎙️</Text>
                        </View>

                        <View style={styles.podcastTitleContainer}>
                            <Text style={styles.podcastTitle} numberOfLines={2}>
                                {item.title.rendered}
                            </Text>
                            <Text style={styles.podcastDate}>
                                {formatDate(item.date)}
                            </Text>
                        </View>

                        <View style={styles.playButtonContainer}>
                            {hasAudio ? (
                                <View style={[styles.playButton, styles.playButtonActive]}>
                                    <Text style={styles.playButtonText}>▶️</Text>
                                </View>
                            ) : (
                                <View style={[styles.playButton, styles.playButtonInactive]}>
                                    <Text style={styles.playButtonTextInactive}>⚠️</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Podcast Content */}
                    <View style={styles.podcastContent}>
                        <Text style={styles.podcastDescription} numberOfLines={3}>
                            {podcastDescription || 'No description available'}
                        </Text>

                        <View style={styles.podcastFooter}>
                            <View style={styles.statusContainer}>
                                <Text style={styles.statusIcon}>🔊</Text>
                                <Text style={styles.statusText}>
                                    {hasAudio ? 'Ready to play' : 'Audio unavailable'}
                                </Text>
                            </View>

                            <View style={styles.categoryContainer}>
                                <Text style={styles.categoryIcon}>📂</Text>
                                <Text style={styles.categoryText}>
                                    {item.podcast_categories.length > 0 ? 'Categorized' : 'General'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Podcasts</Text>
            <Text style={styles.headerSubtitle}>
                {podcasts.length} {podcasts.length === 1 ? 'episode' : 'episodes'}
            </Text>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search podcasts..."
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
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={styles.emptyTitle}>No Podcasts Found</Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery
                    ? `No podcasts match "${searchQuery}"`
                    : "No podcast episodes are available at the moment.\nCheck back later for new content!"
                }
            </Text>
        </View>
    );

    const renderSeparator = () => <View style={styles.separator} />;

    if (loading) {
        return (
            <View style={styles.pageContainer}>
                <SafeAreaView style={styles.container}>
                    <StatusBar barStyle="light-content" backgroundColor="#e46c34" />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#e46c34" />
                        <Text style={styles.loadingText}>Loading podcasts...</Text>
                    </View>
                </SafeAreaView>
                <BottomNavFooter activeTab="Resources" onTabPress={handleTabPress} />
            </View>
        );
    }

    // Conditional rendering - Show podcast player if selected
    if (selectedPodcast) {
        return (
            <View style={styles.pageContainer}>
                <PodcastPlayerComponent
                    podcast={selectedPodcast}
                    onBack={handleBackToPodcasts}
                />
                <BottomNavFooter activeTab="Resources" onTabPress={handleTabPress} />
            </View>
        );
    }

    // Default render - Show podcasts list
    return (
        <View style={styles.pageContainer}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#e46c34" />

                {renderHeader()}

                <FlatList
                    ref={listRef}
                    data={filteredPodcasts}
                    renderItem={renderPodcastItem}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#e46c34"
                            colors={["#e46c34"]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.listContainer,
                        filteredPodcasts.length === 0 && styles.emptyListContainer
                    ]}
                    ListEmptyComponent={renderEmptyState}
                    ItemSeparatorComponent={renderSeparator}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                />
            </SafeAreaView>
            <BottomNavFooter activeTab="Resources" onTabPress={handleTabPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    pageContainer: {
        flex: 1,
        backgroundColor: '#dbdde0',
    },
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
        backgroundColor: '#e46c34',
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
        paddingBottom: 20, // Add bottom padding for footer
    },
    emptyListContainer: {
        flex: 1,
    },
    podcastItemContainer: {
        marginBottom: 12,
    },
    podcastItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        overflow: 'hidden',
        padding: 16,
    },
    podcastHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    podcastIconContainer: {
        width: 50,
        height: 50,
        backgroundColor: '#e46c34',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    podcastIcon: {
        fontSize: 24,
    },
    podcastTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    podcastTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    podcastDate: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    playButtonContainer: {
        justifyContent: 'center',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonActive: {
        backgroundColor: '#e46c34',
    },
    playButtonInactive: {
        backgroundColor: '#f0f0f0',
    },
    playButtonText: {
        fontSize: 16,
        color: '#fff',
    },
    playButtonTextInactive: {
        fontSize: 16,
        color: '#999',
    },
    podcastContent: {
        paddingLeft: 62, // Align with title container
    },
    podcastDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    podcastFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        color: '#e46c34',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    categoryText: {
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

export default PodcastsComponent;