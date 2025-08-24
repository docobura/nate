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
import { launchImageLibrary, MediaType } from 'react-native-image-picker';
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
    user_avatar?: string; // Made optional
    user_display_name: string;
    type: string;
    attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
    }>;
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

interface AttachedFile {
    uri: string;
    name: string;
    type: string;
    size: number;
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
    const [activeTab, setActiveTab] = useState<'home' | 'members' | 'docs' | 'invites'>('home');
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [newPost, setNewPost] = useState<string>('');
    const [posting, setPosting] = useState<boolean>(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

    // Animation
    const slideAnim = useRef(new Animated.Value(300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

    // Helper function to safely get avatar URL
    const getAvatarUrl = (avatarUrl?: string, fallbackText?: string): string => {
        if (!avatarUrl) {
            return `https://via.placeholder.com/80x80/4c9c94/ffffff?text=${fallbackText?.charAt(0) || 'U'}`;
        }

        if (avatarUrl.startsWith('//')) {
            return `https:${avatarUrl}`;
        }

        return avatarUrl;
    };

    // Helper function to safely check and format avatar URLs
    const formatAvatarUrl = (avatarUrl?: string): string => {
        if (!avatarUrl || typeof avatarUrl !== 'string') {
            return 'https://via.placeholder.com/80x80/4c9c94/ffffff?text=U';
        }

        if (avatarUrl.startsWith('//')) {
            return `https:${avatarUrl}`;
        }

        return avatarUrl;
    };

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

            const response = await fetch(`${API_BASE}/buddypress/v1/groups/${group.id}/members?per_page=100`, { headers });

            console.log('📡 Members API Response status:', response.status);

            if (response.ok) {
                const membersData = await response.json();
                console.log('✅ Members fetched successfully:', membersData.length, 'members');

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

            const response = await fetch(`${API_BASE}/buddypress/v1/activity?component=groups&primary_id=${group.id}&per_page=50`, { headers });

            if (response.ok) {
                const activitiesData = await response.json();
                console.log('✅ Activities fetched successfully:', activitiesData.length, 'activities');

                // Log the structure of activities to debug
                if (activitiesData.length > 0) {
                    console.log('📊 Activity structure sample:', JSON.stringify(activitiesData[0], null, 2));
                }

                setActivities(activitiesData);
            } else {
                console.log('❌ Failed to fetch activities, using mock data');
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

    const handleFileAttachment = () => {
        Alert.alert(
            'Add Attachment',
            'Choose what you want to attach:',
            [
                {
                    text: 'Photo Library',
                    onPress: () => selectFromLibrary('photo'),
                },
                {
                    text: 'Video Library',
                    onPress: () => selectFromLibrary('video'),
                },
                {
                    text: 'Camera',
                    onPress: () => selectFromCamera(),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const selectFromLibrary = (mediaType: 'photo' | 'video') => {
        const options = {
            mediaType: mediaType as MediaType,
            quality: 0.8,
            selectionLimit: 5, // Allow multiple selection
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel || response.errorMessage) {
                console.log('📎 File selection cancelled or error:', response.errorMessage);
                return;
            }

            if (response.assets) {
                const validFiles = response.assets.filter(asset => {
                    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                        Alert.alert('File Too Large', `${asset.fileName} is larger than 10MB and cannot be attached.`);
                        return false;
                    }
                    return true;
                });

                if (validFiles.length > 0) {
                    const newFiles: AttachedFile[] = validFiles.map(asset => ({
                        uri: asset.uri || '',
                        name: asset.fileName || `${mediaType}_${Date.now()}`,
                        type: asset.type || (mediaType === 'photo' ? 'image/jpeg' : 'video/mp4'),
                        size: asset.fileSize || 0,
                    }));

                    setAttachedFiles(prev => [...prev, ...newFiles]);
                    console.log('✅ Files attached successfully:', newFiles.length);
                }
            }
        });
    };

    const selectFromCamera = () => {
        Alert.alert(
            'Take Photo/Video',
            'What do you want to capture?',
            [
                {
                    text: 'Photo',
                    onPress: () => captureFromCamera('photo'),
                },
                {
                    text: 'Video',
                    onPress: () => captureFromCamera('video'),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const captureFromCamera = (mediaType: 'photo' | 'video') => {
        const options = {
            mediaType: mediaType as MediaType,
            quality: 0.8,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel || response.errorMessage) {
                console.log('📸 Camera capture cancelled or error:', response.errorMessage);
                return;
            }

            if (response.assets && response.assets[0]) {
                const asset = response.assets[0];

                if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                    Alert.alert('File Too Large', 'The captured file is larger than 10MB and cannot be attached.');
                    return;
                }

                const newFile: AttachedFile = {
                    uri: asset.uri || '',
                    name: asset.fileName || `captured_${mediaType}_${Date.now()}`,
                    type: asset.type || (mediaType === 'photo' ? 'image/jpeg' : 'video/mp4'),
                    size: asset.fileSize || 0,
                };

                setAttachedFiles(prev => [...prev, newFile]);
                console.log('✅ File captured and attached successfully');
            }
        });
    };

    const removeAttachedFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreatePost = async () => {
        if (!newPost.trim() && attachedFiles.length === 0) {
            Alert.alert('Empty Post', 'Please write something or attach a file.');
            return;
        }

        setPosting(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Create FormData for file uploads
            const formData = new FormData();
            formData.append('content', newPost.trim());
            formData.append('component', 'groups');
            formData.append('primary_item_id', group.id.toString());
            formData.append('type', 'activity_update');

            // Add files to FormData
            attachedFiles.forEach((file, index) => {
                formData.append(`attachment_${index}`, {
                    uri: file.uri,
                    type: file.type,
                    name: file.name,
                } as any);
            });

            const response = await fetch(`${API_BASE}/buddypress/v1/activity`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (response.ok) {
                console.log('✅ Post created successfully');
                setNewPost('');
                setAttachedFiles([]);
                fetchGroupActivity(); // Refresh activities
                Alert.alert('Success', 'Your post has been shared with the group!');
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
                        Alert.alert('Success', 'You have left the group.', [
                            { text: 'OK', onPress: onBack }
                        ]);
                    }
                }
            ]
        );
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

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileType: string): string => {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
        return '📎';
    };

    const renderAttachedFilePreview = (file: AttachedFile, index: number) => {
        if (file.type.startsWith('image/')) {
            return (
                <View key={index} style={styles.attachedImagePreview}>
                    <Image source={{ uri: file.uri }} style={styles.attachedImage} />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeAttachedFile(index)}
                    >
                        <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                </View>
            );
        } else {
            return (
                <View key={index} style={styles.attachedFileItem}>
                    <Text style={styles.attachedFileIcon}>{getFileIcon(file.type)}</Text>
                    <View style={styles.attachedFileInfo}>
                        <Text style={styles.attachedFileName} numberOfLines={1}>
                            {file.name}
                        </Text>
                        <Text style={styles.attachedFileSize}>
                            {formatFileSize(file.size)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => removeAttachedFile(index)}
                    >
                        <Text style={styles.removeFileText}>✕</Text>
                    </TouchableOpacity>
                </View>
            );
        }
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
                                uri: formatAvatarUrl(avatarUrl)
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
                    uri: formatAvatarUrl(item.avatar_urls?.thumb)
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
                source={{
                    uri: formatAvatarUrl(item.user_avatar)
                }}
                style={styles.activityAvatar}
            />

            <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                    <View style={styles.activityUserInfo}>
                        <Text style={styles.activityUser}>{item.user_display_name || 'Unknown User'}</Text>
                        <Text style={styles.activityAction}>
                            {item.type === 'activity_update' ? 'shared a post' : 'posted in group'}
                        </Text>
                    </View>
                    <Text style={styles.activityTime}>{formatTimeAgo(item.date)}</Text>
                </View>

                {item.content?.rendered && (
                    <Text style={styles.activityText}>
                        {cleanHtmlContent(item.content.rendered)}
                    </Text>
                )}

                {/* Show attachments if they exist */}
                {item.attachments && item.attachments.length > 0 && (
                    <View style={styles.attachmentsContainer}>
                        {item.attachments.map((attachment, index) => (
                            attachment.type.startsWith('image/') ? (
                                <View key={index} style={styles.attachmentImageContainer}>
                                    <Image
                                        source={{ uri: attachment.url }}
                                        style={styles.attachmentImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity key={index} style={styles.attachmentItem}>
                                    <Text style={styles.attachmentIcon}>{getFileIcon(attachment.type)}</Text>
                                    <View style={styles.attachmentInfo}>
                                        <Text style={styles.attachmentName} numberOfLines={1}>
                                            {attachment.name}
                                        </Text>
                                        <Text style={styles.attachmentSize}>
                                            {formatFileSize(attachment.size)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        ))}
                    </View>
                )}
            </View>
        </View>
    );

    const renderPostInput = () => (
        <View style={styles.postInputContainer}>
            <Image
                source={{
                    uri: formatAvatarUrl(currentUser?.avatar_urls?.thumb)
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

                {/* Show attached files */}
                {attachedFiles.length > 0 && (
                    <View style={styles.attachedFilesContainer}>
                        {attachedFiles.map((file, index) => renderAttachedFilePreview(file, index))}
                    </View>
                )}

                <View style={styles.postActions}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={handleFileAttachment}
                    >
                        <Text style={styles.attachButtonText}>📷</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.postButton,
                            (!newPost.trim() && attachedFiles.length === 0) || posting && styles.postButtonDisabled
                        ]}
                        onPress={handleCreatePost}
                        disabled={(!newPost.trim() && attachedFiles.length === 0) || posting}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.postButtonText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
    attachedFilesContainer: {
        marginBottom: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    attachedImagePreview: {
        position: 'relative',
        marginRight: 8,
        marginBottom: 8,
    },
    attachedImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    removeImageButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#f44336',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    attachedFileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderRadius: 8,
        marginBottom: 4,
    },
    attachedFileIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    attachedFileInfo: {
        flex: 1,
    },
    attachedFileName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
    },
    attachedFileSize: {
        fontSize: 10,
        color: '#666',
    },
    removeFileButton: {
        padding: 4,
    },
    removeFileText: {
        fontSize: 14,
        color: '#999',
    },
    postActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attachButton: {
        padding: 8,
        borderRadius: 16,
        backgroundColor: '#e0e0e0',
    },
    attachButtonText: {
        fontSize: 16,
    },
    postButton: {
        backgroundColor: '#4c9c94',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 16,
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
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    activityUserInfo: {
        flex: 1,
    },
    activityUser: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 2,
    },
    activityAction: {
        fontSize: 12,
        color: '#4c9c94',
        fontWeight: '500',
    },
    activityTime: {
        fontSize: 12,
        color: '#999',
    },
    activityText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    attachmentsContainer: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    attachmentImageContainer: {
        marginRight: 8,
        marginBottom: 8,
    },
    attachmentImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 8,
        marginBottom: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#4c9c94',
    },
    attachmentIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
    },
    attachmentSize: {
        fontSize: 10,
        color: '#666',
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