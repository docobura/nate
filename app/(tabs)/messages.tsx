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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { getToken } from '../authen/authStorage';

interface Recipient {
  id?: number;
  is_deleted?: number;
  name?: string;
  sender_only?: number;
  thread_id?: number;
  unread_count?: number;
  user_id?: number;
  user_link?: string;
  user_avatars?: {
    full: string;
    thumb: string;
  };
  // Additional possible fields
  avatar_urls?: {
    full: string;
    thumb: string;
  };
  display_name?: string;
}

interface Thread {
  id: number;
  message_id: number;
  last_sender_id: number;
  subject: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  message: {
    rendered: string;
  };
  date: string;
  date_gmt: string;
  unread_count: number;
  sender_ids: Record<string, number>;
  recipients: Recipient[];
}

interface ChatMessage {
  id: number;
  thread_id: number;
  sender_id: number;
  subject: {
    rendered: string;
  };
  message: {
    rendered: string;
  };
  date_sent: string;
  is_starred: boolean;
}

interface User {
  id: number;
  name: string;
  avatar_urls?: {
    full: string;
    thumb: string;
  };
}

interface SelectedChat {
  threadId: number;
  otherUserId: number;
  otherUser: {
    id: number;
    name: string;
    avatar: string;
  };
}

const UnifiedMessagingComponent: React.FC = () => {
  // List state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Chat state
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  
  // UI state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  
  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Refs
  const chatFlatListRef = useRef<FlatList>(null);
  const listFlatListRef = useRef<FlatList>(null);

  const API_BASE = 'https://nexus.inhiveglobal.org/wp-json';

  useEffect(() => {
    console.log('🚀 UnifiedMessagingComponent: Component mounted');
    initializeComponent();
  }, []);

  useEffect(() => {
    console.log('🔍 Search query changed:', searchQuery);
    filterThreads();
  }, [searchQuery, threads]);

  // Animation effect for chat view
  useEffect(() => {
    if (selectedChat) {
      console.log('📱 Opening chat view for:', selectedChat.otherUser.name);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      console.log('📱 Closing chat view, returning to list');
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedChat]);

  const initializeComponent = async () => {
    console.log('🔧 Initializing messaging component');
    try {
      await fetchCurrentUser();
      await fetchThreads();
    } catch (error) {
      console.error('❌ Failed to initialize component:', error);
    }
  };

  const getAuthHeaders = async () => {
    console.log('🔐 Getting authentication headers');
    const token = await getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found');
      Alert.alert('Authentication Error', 'Please log in again to access messages.');
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
          userData: userData
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

  const groupThreadsByUser = (threads: Thread[]): Thread[] => {
    const userThreadsMap = new Map<number, Thread>();
    
    threads.forEach(thread => {
      const otherUser = getOtherUser(thread.recipients);
      if (otherUser && typeof otherUser.user_id === 'number') {
        const existingThread = userThreadsMap.get(otherUser.user_id);
        
        // Keep the most recent thread for each user
        if (!existingThread || new Date(thread.date) > new Date(existingThread.date)) {
          userThreadsMap.set(otherUser.user_id, thread);
        }
      }
    });
    
    return Array.from(userThreadsMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const fetchThreads = async (isRefresh = false) => {
    console.log('📥 Fetching threads list', isRefresh ? '(refresh)' : '(initial)');
    try {
      if (!isRefresh) setLoading(true);
      
      const headers = await getAuthHeaders();
      
      if (!headers.Authorization) {
        console.error('❌ No authorization header available');
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`${API_BASE}/buddypress/v1/messages`, { headers });
      
      console.log('📡 API Response status:', response.status);
      
      if (response.ok) {
        const threadsData = await response.json();
        console.log('✅ Raw API Response:', threadsData);
        console.log('✅ Threads fetched successfully:', threadsData.length, 'conversations');
        
        threadsData.forEach((thread: Thread, index: number) => {
          console.log(`📋 Thread ${index + 1} raw recipients:`, thread.recipients);
          const otherUser = getOtherUser(thread.recipients);
          console.log(`📋 Thread ${index + 1}:`, {
            id: thread.id,
            message_id: thread.message_id,
            otherUser: otherUser?.name || 'Unknown',
            lastMessage: cleanMessageContent(thread.excerpt.rendered).substring(0, 50),
            unreadCount: thread.unread_count,
            date: thread.date,
            currentUserId: currentUser?.id,
            allRecipientIds: thread.recipients.map(r => r.user_id || r.id)
          });
        });
        
        const groupedThreads = groupThreadsByUser(threadsData);
        console.log('✅ Threads grouped by user:', groupedThreads.length, 'unique conversations');
        
        setThreads(groupedThreads);
        setFilteredThreads(groupedThreads);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch threads:', response.status, errorText);
        throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching threads:', error);
      Alert.alert('Error', 'Failed to load messages. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchConversation = async (threadId: number, silent = false) => {
    console.log('💬 Fetching conversation for thread ID:', threadId, silent ? '(silent)' : '');
    try {
      if (!silent) setChatLoading(true);
      
      const headers = await getAuthHeaders();
      
      if (!headers.Authorization) {
        console.error('❌ No authorization header available for conversation');
        throw new Error('Authentication required');
      }
      
      // Get the specific thread first
      const threadResponse = await fetch(`${API_BASE}/buddypress/v1/messages/${threadId}`, { headers });
      
      console.log('📡 Thread API Response status:', threadResponse.status);
      
      if (threadResponse.ok) {
        const threadData = await threadResponse.json();
        console.log('✅ Thread data fetched:', threadData);
        
        let conversationMessages: ChatMessage[] = [];
        
        // The key fix: extract all messages from the thread's messages array
        if (threadData.messages && Array.isArray(threadData.messages)) {
          console.log('📦 Found messages array with', threadData.messages.length, 'messages');
          
          conversationMessages = threadData.messages.map((msg: any, index: number) => {
            console.log(`📝 Processing message ${index + 1}:`, {
              id: msg.id,
              sender_id: msg.sender_id,
              content: msg.message?.rendered || msg.content?.rendered || 'No content',
              date: msg.date_sent || msg.date
            });
            
            return {
              id: msg.id || `${threadId}_${index}`,
              thread_id: threadId,
              sender_id: msg.sender_id,
              subject: msg.subject || { rendered: '' },
              message: msg.message || msg.content || { rendered: msg.message?.rendered || msg.content?.rendered || '' },
              date_sent: msg.date_sent || msg.date || new Date().toISOString(),
              is_starred: msg.is_starred || false,
            };
          });
        } else {
          // Fallback: if no messages array, try to get all threads and find this one
          console.log('📦 No messages array found, trying fallback approach');
          const allThreadsResponse = await fetch(`${API_BASE}/buddypress/v1/messages`, { headers });
          
          if (allThreadsResponse.ok) {
            const allThreads = await allThreadsResponse.json();
            const currentThread = allThreads.find((t: Thread) => t.id === threadId);
            
            if (currentThread?.messages && Array.isArray(currentThread.messages)) {
              console.log('📦 Found messages in fallback thread:', currentThread.messages.length);
              
              conversationMessages = currentThread.messages.map((msg: any, index: number) => ({
                id: msg.id || `${threadId}_${index}`,
                thread_id: threadId,
                sender_id: msg.sender_id,
                subject: msg.subject || { rendered: '' },
                message: msg.message || msg.content || { rendered: msg.message?.rendered || msg.content?.rendered || '' },
                date_sent: msg.date_sent || msg.date || new Date().toISOString(),
                is_starred: msg.is_starred || false,
              }));
            } else if (currentThread?.message) {
              // Last resort: single message from thread
              console.log('📦 Using single message from thread');
              conversationMessages = [{
                id: currentThread.message_id,
                thread_id: threadId,
                sender_id: currentThread.last_sender_id,
                subject: currentThread.subject,
                message: currentThread.message,
                date_sent: currentThread.date,
                is_starred: false,
              }];
            }
          }
        }
        
        // Sort messages by date (chronological order - oldest first)
        conversationMessages.sort((a, b) => 
          new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime()
        );
        
        // Remove duplicates based on message ID
        const uniqueMessages = conversationMessages.filter((message, index, self) => 
          index === self.findIndex(m => m.id === message.id)
        );
        
        console.log('✅ Conversation processed:', uniqueMessages.length, 'unique messages');
        uniqueMessages.forEach((msg, index) => {
          const isCurrentUser = msg.sender_id === currentUser?.id;
          console.log(`💬 Message ${index + 1}:`, {
            id: msg.id,
            sender: msg.sender_id,
            isCurrentUser,
            content: cleanMessageContent(msg.message.rendered).substring(0, 50),
            date: msg.date_sent
          });
        });
        
        setMessages(uniqueMessages);
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          chatFlatListRef.current?.scrollToEnd({ animated: !silent });
        }, 100);
        
      } else {
        const errorText = await threadResponse.text();
        console.error('❌ Failed to fetch thread:', threadResponse.status, errorText);
        
        // Alternative approach: Try to get all messages and filter by thread
        console.log('🔄 Trying alternative message fetching approach');
        await fetchConversationAlternative(threadId, silent);
      }
    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      if (!silent) {
        Alert.alert('Error', 'Failed to load conversation. Please try again.');
      }
    } finally {
      setChatLoading(false);
    }
  };

  const fetchConversationAlternative = async (threadId: number, silent: boolean) => {
    try {
      const headers = await getAuthHeaders();
      
      // Try different endpoints for getting thread messages
      const endpoints = [
        `${API_BASE}/buddypress/v1/messages/${threadId}/messages`,
        `${API_BASE}/buddypress/v1/messages?thread_id=${threadId}`,
        `${API_BASE}/buddypress/v1/messages?per_page=100&include=${threadId}`,
      ];
      
      for (const endpoint of endpoints) {
        console.log('🔄 Trying alternative endpoint:', endpoint);
        try {
          const response = await fetch(endpoint, { headers });
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Alternative endpoint worked:', endpoint, 'Data length:', Array.isArray(data) ? data.length : 'Not array');
            
            if (Array.isArray(data) && data.length > 0) {
              const conversationMessages = data.map((msg: any, index: number) => ({
                id: msg.id || `${threadId}_alt_${index}`,
                thread_id: threadId,
                sender_id: msg.sender_id || msg.user_id,
                subject: msg.subject || { rendered: '' },
                message: msg.message || msg.content || { rendered: msg.message?.rendered || msg.content?.rendered || msg.text || '' },
                date_sent: msg.date_sent || msg.date || new Date().toISOString(),
                is_starred: false,
              }));
              
              // Sort by date
              conversationMessages.sort((a, b) => 
                new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime()
              );
              
              console.log('✅ Alternative messages processed:', conversationMessages.length);
              setMessages(conversationMessages);
              return;
            }
          }
        } catch (e) {
          console.log('❌ Alternative endpoint failed:', endpoint, e);
        }
      }
      
      // If all endpoints fail, show empty state
      console.log('❌ All alternative endpoints failed, showing empty conversation');
      setMessages([]);
      
    } catch (error) {
      console.error('❌ Alternative conversation fetch failed:', error);
      setMessages([]);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    if (selectedChat) {
      fetchConversation(selectedChat.threadId, true);
    } else {
      fetchThreads(true);
    }
  }, [selectedChat]);

  const filterThreads = () => {
    if (!searchQuery.trim()) {
      console.log('🔍 Clearing search filter');
      setFilteredThreads(threads);
      return;
    }

    console.log('🔍 Filtering threads with query:', searchQuery);
    const filtered = threads.filter(thread => {
      const otherUser = getOtherUser(thread.recipients);
      const messageContent = cleanMessageContent(thread.excerpt.rendered);
      
      const matches = (
        (otherUser?.name && otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        messageContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.subject.rendered.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return matches;
    });
    
    console.log('🔍 Filter results:', filtered.length, 'out of', threads.length, 'threads');
    setFilteredThreads(filtered);
  };

  const openChat = (thread: Thread) => {
    const otherUser = getOtherUser(thread.recipients);
    if (!otherUser) {
      console.error('❌ Cannot open chat: No other user found in thread');
      return;
    }

    const userId = otherUser.user_id || otherUser.id;
    const userName = otherUser.name || otherUser.display_name || 'Unknown User';
    const avatarUrl = otherUser.user_avatars?.thumb || 
                   otherUser.avatar_urls?.thumb || 
                     'https://via.placeholder.com/50x50/cccccc/666666?text=U';

    console.log('🎯 Opening conversation with:', userName, `(User ID: ${userId}, Thread ID: ${thread.id})`);
    
    const chatData: SelectedChat = {
      threadId: thread.id, // Use the actual thread ID
      otherUserId: userId ?? 0,
      otherUser: {
        id: userId,
        name: userName,
        avatar: avatarUrl,
      },
    };

    setSelectedChat(chatData);
    setMessages([]); // Clear previous messages
    fetchConversation(thread.id); // Fetch conversation using thread ID
  };

  const closeChat = () => {
    console.log('❌ Closing chat, returning to threads list');
    setSelectedChat(null);
    setMessages([]);
    setNewMessage('');
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) {
      console.warn('⚠️ Cannot send message: empty message or no chat selected');
      return;
    }

    const messageToSend = newMessage.trim();
    console.log('📤 Sending message to thread:', selectedChat.threadId, 'Message:', messageToSend.substring(0, 50) + '...');
    
    setNewMessage('');
    setSending(true);

    try {
      const headers = await getAuthHeaders();
      
      if (!headers.Authorization) {
        console.error('❌ No authorization header available for sending message');
        throw new Error('Authentication required');
      }
      
      // Add optimistic message update first (better UX)
      const optimisticMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        thread_id: selectedChat.threadId,
        sender_id: currentUser!.id,
        subject: { rendered: 'Re: Chat' },
        message: { rendered: messageToSend },
        date_sent: new Date().toISOString(),
        is_starred: false,
      };

      console.log('⚡ Adding optimistic message to UI');
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Scroll to bottom immediately
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Try multiple approaches to send the message
      const sendApproaches = [
        // Approach 1: Reply to existing thread
        {
          url: `${API_BASE}/buddypress/v1/messages/${selectedChat.threadId}`,
          method: 'POST',
          payload: {
            content: messageToSend,
            message: messageToSend
          }
        },
        // Approach 2: Create new message in thread
        {
          url: `${API_BASE}/buddypress/v1/messages`,
          method: 'POST',
          payload: {
            subject: "Re: Chat",
            message: messageToSend,
            content: messageToSend,
            recipients: [selectedChat.otherUser.id],
            thread_id: selectedChat.threadId
          }
        },
        // Approach 3: Simple message post
        {
          url: `${API_BASE}/buddypress/v1/messages`,
          method: 'POST',
          payload: {
            message: messageToSend,
            recipients: [selectedChat.otherUser.id],
            thread_id: selectedChat.threadId
          }
        }
      ];
      
      let messageSent = false;
      
      for (const approach of sendApproaches) {
        console.log('📤 Trying send approach:', approach.url, approach.payload);
        
        try {
          const response = await fetch(approach.url, {
            method: approach.method,
            headers,
            body: JSON.stringify(approach.payload),
          });

          console.log('📤 Send response status:', response.status);

          if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Message sent successfully with approach:', approach.url, responseData);
            messageSent = true;
            break;
          } else {
            const errorText = await response.text();
            console.log('❌ Send approach failed:', approach.url, 'Status:', response.status, 'Error:', errorText);
          }
        } catch (error) {
          console.log('❌ Send approach error:', approach.url, error);
        }
      }
      
      if (messageSent) {
        console.log('✅ Message sent successfully! Refreshing conversation...');
        
        // Refresh conversation to get the actual message from server
        setTimeout(() => {
          console.log('🔄 Refreshing conversation from server');
          fetchConversation(selectedChat.threadId, true);
          // Also refresh the threads list to update last message
          fetchThreads(true);
        }, 1500); // Wait a bit longer for server to process
        
      } else {
        console.error('❌ All message sending attempts failed');
        Alert.alert('Error', 'Failed to send message. Please try again.');
        
        // Remove the optimistic message since sending failed
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageToSend); // Restore message
      }
        
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== Date.now()));
      setNewMessage(messageToSend); // Restore message
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (recipients: Recipient[]) => {
    console.log('🔍 Finding other user from recipients:', recipients);
    console.log('🔍 Current user ID:', currentUser?.id);
    
    if (!currentUser || !recipients || recipients.length === 0) {
      console.log('❌ No current user or recipients');
      return null;
    }
    
    // Try different possible structures
    const otherUser = recipients.find(recipient => {
      const userId = recipient.user_id || recipient.id;
      console.log('🔍 Checking recipient:', { userId, currentUserId: currentUser.id, recipient });
      return userId && userId !== currentUser.id;
    });
    
    console.log('✅ Found other user:', otherUser);
    return otherUser;
  };

  const cleanMessageContent = (htmlContent: string): string => {
    return htmlContent.replace(/<[^>]*>/g, '').trim();
  };

  const formatMessageTime = (dateString: string): string => {
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - messageDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    }
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return messageDate.toLocaleDateString();
  };

  // Set up polling for new messages when in chat view
  useEffect(() => {
    if (selectedChat) {
      console.log('⏰ Setting up conversation polling for thread ID:', selectedChat.threadId);
      const interval = setInterval(() => {
        console.log('🔄 Polling for new messages in conversation');
        fetchConversation(selectedChat.threadId, true);
      }, 30000); // Poll every 30 seconds

      return () => {
        console.log('⏰ Clearing conversation polling');
        clearInterval(interval);
      };
    }
  }, [selectedChat]);

  const renderThreadItem = ({ item }: { item: Thread }) => {
    const otherUser = getOtherUser(item.recipients);
    const lastMessage = cleanMessageContent(item.excerpt.rendered);
    const isUnread = item.unread_count > 0;

    if (!otherUser) {
      console.log('❌ Skipping thread item - no other user found for thread:', item.id);
      return null;
    }

    // Get avatar URL with fallbacks
    const avatarUrl = otherUser.user_avatars?.thumb || 
                     otherUser.avatar_urls?.thumb || 
                     'https://via.placeholder.com/50x50/cccccc/666666?text=U';
    
    const userName = otherUser.name || otherUser.display_name || 'Unknown User';

    console.log('🎨 Rendering thread item:', {
      threadId: item.id,
      userName,
      avatarUrl,
      lastMessage: lastMessage.substring(0, 30)
    });

    return (
      <TouchableOpacity
        style={[styles.threadItem, isUnread && styles.unreadThread]}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ 
              uri: avatarUrl.startsWith('//') 
                ? `https:${avatarUrl}` 
                : avatarUrl 
            }}
            style={styles.avatar}
            defaultSource={{ uri: 'https://via.placeholder.com/50x50/cccccc/666666?text=U' }}
          />
          {isUnread && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={[styles.userName, isUnread && styles.unreadText]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.timeText}>
              {formatMessageTime(item.date)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text 
              style={[styles.lastMessage, isUnread && styles.unreadMessage]} 
              numberOfLines={1}
            >
              {lastMessage || 'No message content'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.sender_id === currentUser?.id;
    const messageContent = cleanMessageContent(item.message.rendered);

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessageContainer : styles.receivedMessageContainer
      ]}>
        {!isCurrentUser && selectedChat && (
          <Image
            source={{ 
              uri: selectedChat.otherUser.avatar.startsWith('//') 
                ? `https:${selectedChat.otherUser.avatar}` 
                : selectedChat.otherUser.avatar 
            }}
            style={styles.messageAvatar}
            defaultSource={{ uri: 'https://via.placeholder.com/30x30/cccccc/666666?text=U' }}
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.sentBubble : styles.receivedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.sentText : styles.receivedText
          ]}>
            {messageContent}
          </Text>
          
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.sentTime : styles.receivedTime
          ]}>
            {formatMessageTime(item.date_sent)}
          </Text>
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Messages</Text>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
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

  const renderChatHeader = () => (
    <View style={styles.chatHeader}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={closeChat}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.headerUserInfo}>
        {selectedChat && (
          <>
            <Image
              source={{ 
                uri: selectedChat.otherUser.avatar.startsWith('//') 
                  ? `https:${selectedChat.otherUser.avatar}` 
                  : selectedChat.otherUser.avatar 
              }}
              style={styles.headerAvatar}
              defaultSource={{ uri: 'https://via.placeholder.com/40x40/cccccc/666666?text=U' }}
            />
            <View>
              <Text style={styles.headerUserName}>{selectedChat.otherUser.name}</Text>
              <Text style={styles.headerStatus}>Active now</Text>
            </View>
          </>
        )}
      </View>
      
      <TouchableOpacity style={styles.moreButton}>
        <Text style={styles.moreButtonText}>⋮</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMessageInput = () => (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          placeholderTextColor="#999"
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No Messages Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start a conversation with someone from your network
      </Text>
    </View>
  );

  const renderChatEmptyState = () => (
    <View style={styles.emptyContainer}>
      {selectedChat && (
        <>
          <Image
            source={{ 
              uri: selectedChat.otherUser.avatar.startsWith('//') 
                ? `https:${selectedChat.otherUser.avatar}` 
                : selectedChat.otherUser.avatar 
            }}
            style={styles.emptyAvatar}
            defaultSource={{ uri: 'https://via.placeholder.com/80x80/cccccc/666666?text=U' }}
          />
          <Text style={styles.emptyTitle}>Start conversation with {selectedChat.otherUser.name}</Text>
          <Text style={styles.emptySubtitle}>
            Send a message to begin your conversation
          </Text>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c9c94" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
      
      {!selectedChat ? (
        // Messages List View
        <>
          {renderListHeader()}
          <FlatList
            ref={listFlatListRef}
            data={filteredThreads}
            renderItem={renderThreadItem}
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
              filteredThreads.length === 0 && styles.emptyListContainer
            ]}
            ListEmptyComponent={renderEmptyState}
          />
        </>
      ) : (
        // Chat View
        <Animated.View 
          style={[
            styles.chatContainer,
            {
              opacity: slideAnim,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {renderChatHeader()}
          
          <KeyboardAvoidingView 
            style={styles.chatContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {chatLoading ? (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="large" color="#4c9c94" />
                <Text style={styles.loadingText}>Loading conversation...</Text>
              </View>
            ) : (
              <FlatList
                ref={chatFlatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={[
                  styles.messagesContainer,
                  messages.length === 0 && styles.emptyMessagesContainer
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#4c9c94"
                    colors={["#4c9c94"]}
                  />
                }
                ListEmptyComponent={renderChatEmptyState}
                onContentSizeChange={() => {
                  chatFlatListRef.current?.scrollToEnd({ animated: true });
                }}
              />
            )}
            
            {renderMessageInput()}
          </KeyboardAvoidingView>
        </Animated.View>
      )}
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
    paddingTop: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadThread: {
    backgroundColor: '#fff8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#4c9c94',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4c9c94',
    borderWidth: 2,
    borderColor: '#fff',
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: '#1a1a1a',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#4c9c94',
    borderRadius: 12,
    minWidth: 24,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    backgroundColor: '#4c9c94',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyMessagesContainer: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  sentMessageContainer: {
    justifyContent: 'flex-end',
  },
  receivedMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sentBubble: {
    backgroundColor: '#4c9c94',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#e46c34',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  receivedTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#4c9c94',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
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
    marginBottom: 16,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
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

export default UnifiedMessagingComponent;