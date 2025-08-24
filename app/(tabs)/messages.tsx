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
} from "react-native";
import { getToken } from "../authen/authStorage";
import BottomNavFooter from '../../components/footer';
import { useEffect, useRef, useState , useCallback} from "react";

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
  messages?: any[];
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
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Chat state
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

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

  const API_BASE = "https://nexus.inhiveglobal.org/wp-json";
  const BETTER_MESSAGES_API = "https://nexus.inhiveglobal.org/wp-json/better-messages/v1";

  useEffect(() => {
    console.log("🚀 UnifiedMessagingComponent: Component mounted");
    initializeComponent();
  }, []);

  useEffect(() => {
    console.log("🔍 Search query changed:", searchQuery);
    filterThreads();
  }, [searchQuery, threads]);

  // Animation effect for chat view
  useEffect(() => {
    if (selectedChat) {
      console.log("📱 Opening chat view for:", selectedChat.otherUser.name);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      console.log("📱 Closing chat view, returning to list");
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedChat]);

  const initializeComponent = async () => {
    console.log("🔧 Initializing messaging component");
    try {
      await fetchCurrentUser();
      await fetchThreads();
    } catch (error) {
      console.error("❌ Failed to initialize component:", error);
    }
  };

  const getAuthHeaders = async () => {
    console.log("🔐 Getting authentication headers");
    const token = await getToken();
    if (!token) {
      console.warn("⚠️ No authentication token found");
      Alert.alert(
        "Authentication Error",
        "Please log in again to access messages."
      );
      return null;
    }
    console.log("✅ Token found, length:", token.length);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchCurrentUser = async () => {
    console.log("👤 Fetching current user data");
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      // Try multiple endpoints to get current user
      const endpoints = [
        `${API_BASE}/wp/v2/users/me`,
        `${API_BASE}/buddypress/v1/members/me`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log("👤 Trying user endpoint:", endpoint);
          const response = await fetch(endpoint, { headers });
          
          if (response.ok) {
            const userData = await response.json();
            console.log("✅ Current user fetched successfully:", {
              id: userData.id,
              name: userData.name || userData.display_name,
              endpoint
            });
            setCurrentUser({
              id: userData.id,
              name: userData.name || userData.display_name || 'User',
              avatar_urls: userData.avatar_urls
            });
            return;
          } else {
            console.log("❌ User endpoint failed:", endpoint, response.status);
          }
        } catch (error) {
          console.log("❌ User endpoint error:", endpoint, error);
        }
      }

      // Fallback: Set a default user
      console.log("⚠️ Using fallback user data");
      setCurrentUser({
        id: 1, // Fallback ID
        name: 'Current User',
        avatar_urls: {
          full: 'https://via.placeholder.com/96x96/cccccc/666666?text=U',
          thumb: 'https://via.placeholder.com/48x48/cccccc/666666?text=U'
        }
      });
    } catch (error) {
      console.error("❌ Error in fetchCurrentUser:", error);
    }
  };

  const fetchThreads = async (isRefresh = false) => {
    console.log("📥 Fetching threads using Better Messages API", isRefresh ? "(refresh)" : "(initial)");
    try {
      if (!isRefresh) setLoading(true);

      const headers = await getAuthHeaders();
      if (!headers) {
        console.error("❌ No authorization header available");
        return;
      }

      // Use Better Messages API endpoint
      const endpoint = `${BETTER_MESSAGES_API}/threads`;
      
      console.log("📡 Fetching from Better Messages endpoint:", endpoint);
      const response = await fetch(endpoint, { headers });
      
      console.log("📡 API Response status:", response.status);

      if (response.ok) {
        const threadsData = await response.json();
        console.log("✅ Better Messages API response:", {
          isArray: Array.isArray(threadsData),
          length: Array.isArray(threadsData) ? threadsData.length : 'Not array',
          hasThreads: threadsData.threads ? threadsData.threads.length : 'No threads property',
          sample: Array.isArray(threadsData) && threadsData.length > 0 ? {
            id: threadsData[0].id,
            hasParticipants: !!threadsData[0].participants || !!threadsData[0].recipients,
          } : 'No data',
          rawStructure: Object.keys(threadsData),
          firstItemKeys: threadsData.threads ? Object.keys(threadsData.threads[0] || {}) : 
                        Array.isArray(threadsData) ? Object.keys(threadsData[0] || {}) : []
        });

        // Log the raw data structure for debugging
        console.log("🔍 Raw API response structure:", JSON.stringify(threadsData, null, 2).substring(0, 1000));

        // Handle different response formats from Better Messages API
        let processedThreads = [];

        if (threadsData.threads && Array.isArray(threadsData.threads)) {
          // Format: { threads: [...], users: [...], messages: [...] }
          console.log("📦 Processing threads from .threads property");
          processedThreads = threadsData.threads.map((thread: any) => 
            transformBetterMessagesThread(thread, threadsData.users || [], threadsData.messages || [])
          );
        } else if (Array.isArray(threadsData)) {
          // Format: [...] (direct array)
          console.log("📦 Processing direct array of threads");
          processedThreads = threadsData.map(thread => 
            transformBetterMessagesThread(thread, [], [])
          );
        } else if (threadsData.data && Array.isArray(threadsData.data)) {
          // Format: { data: [...] }
          console.log("📦 Processing threads from .data property");
          processedThreads = threadsData.data.map((thread: any) => 
            transformBetterMessagesThread(thread, [], [])
          );
        } else {
          console.log("❌ Unknown API response format");
        }

        if (processedThreads.length > 0) {
          // Sort by most recent
          processedThreads.sort((a: { date: string | number | Date; }, b: { date: string | number | Date; }) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          // console.log("✅ Better Messages threads processed successfully:", processedThreads.length, "conversations");
          // console.log("📋 Final processed threads:", processedThreads.map((t: { id: any; recipients: string | any[]; subject: { rendered: any; }; }) => ({
          //   id: t.id,
          //   recipientsCount: t.recipients.length,
          //   // hasOtherUser: !!getOtherUser(t.recipients),
          //   subject: t.subject.rendered
          // })));

          setThreads(processedThreads);
          setFilteredThreads(processedThreads);
        } else {
          console.log("⚠️ No threads found in Better Messages response");
          setThreads([]);
          setFilteredThreads([]);
        }
      } else {
        const errorText = await response.text();
        console.log("❌ Better Messages API failed:", response.status, errorText);
        
        // Fallback to original BuddyPress API if Better Messages fails
        await fetchThreadsFromBuddyPress(isRefresh);
      }
      
    } catch (error) {
      console.error("❌ Error in fetchThreads:", error);
      
      // Fallback to original BuddyPress API
      await fetchThreadsFromBuddyPress(isRefresh);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const transformBetterMessagesThread = (thread: any, users: any[] = [], messages: any[] = []): Thread => {
    console.log("🔧 Transforming Better Messages thread:", {
      id: thread.thread_id,
      participants: thread.participants,
      usersAvailable: users.length,
      messagesAvailable: messages.length
    });

    // Find the latest message for this thread
    const threadMessages = messages.filter(msg => msg.thread_id === thread.thread_id);
    const latestMessage = threadMessages.length > 0 
      ? threadMessages.reduce((latest, current) => 
          current.created_at > latest.created_at ? current : latest
        )
      : null;

    console.log("📨 Latest message for thread:", {
      threadId: thread.thread_id,
      messageCount: threadMessages.length,
      latestMessage: latestMessage?.message || "No messages"
    });

    // Transform participants from IDs to user objects
    const recipients = transformBetterMessagesParticipants(thread.participants || [], users);

    // Transform Better Messages API response to our Thread interface
    const transformedThread = {
      id: thread.thread_id || thread.id,
      message_id: thread.thread_id || thread.id,
      last_sender_id: latestMessage?.sender_id || 0,
      subject: {
        rendered: thread.subject || thread.title || "Chat"
      },
      excerpt: {
        rendered: latestMessage?.message || thread.excerpt || ""
      },
      message: {
        rendered: latestMessage?.message || thread.message || ""
      },
      date: latestMessage ? new Date(latestMessage.created_at).toISOString() : 
            thread.lastTime ? new Date(thread.lastTime).toISOString() : 
            new Date().toISOString(),
      date_gmt: latestMessage ? new Date(latestMessage.created_at).toISOString() : 
                thread.lastTime ? new Date(thread.lastTime).toISOString() : 
                new Date().toISOString(),
      unread_count: thread.unread || 0,
      sender_ids: {},
      recipients: recipients,
      messages: threadMessages || []
    };

    console.log("✅ Transformed thread:", {
      id: transformedThread.id,
      recipientsCount: transformedThread.recipients.length,
      recipients: transformedThread.recipients.map(r => ({ id: r.user_id, name: r.name })),
      latestMessage: transformedThread.excerpt.rendered
    });

    return transformedThread;
  };

  const transformBetterMessagesParticipants = (participantIds: any[], users: any[]): Recipient[] => {
    console.log("👥 Transforming participants:", {
      participantIds,
      usersAvailable: users.length,
      userIds: users.map(u => u.user_id || u.id)
    });
    
    // Convert participant IDs to full user objects
    const participants = participantIds.map(participantId => {
      const user = users.find(u => (u.user_id || u.id) == participantId);
      
      if (!user) {
        console.log("⚠️ User not found for participant ID:", participantId);
        return {
          id: participantId,
          user_id: participantId,
          name: `User ${participantId}`,
          display_name: `User ${participantId}`,
          user_avatars: {
            full: `https://via.placeholder.com/96x96/cccccc/666666?text=${participantId}`,
            thumb: `https://via.placeholder.com/48x48/cccccc/666666?text=${participantId}`
          },
          avatar_urls: {
            full: `https://via.placeholder.com/96x96/cccccc/666666?text=${participantId}`,
            thumb: `https://via.placeholder.com/48x48/cccccc/666666?text=${participantId}`
          },
          unread_count: 0,
          is_deleted: 0,
          sender_only: 0,
          thread_id: 0,
          user_link: ""
        };
      }

      const transformed = {
        id: user.user_id || user.id,
        user_id: user.user_id || user.id,
        name: user.name || user.display_name,
        display_name: user.name || user.display_name,
        user_avatars: {
          full: user.avatar || `https://via.placeholder.com/96x96/cccccc/666666?text=${(user.name || 'U').charAt(0)}`,
          thumb: user.avatar || `https://via.placeholder.com/48x48/cccccc/666666?text=${(user.name || 'U').charAt(0)}`
        },
        avatar_urls: {
          full: user.avatar || `https://via.placeholder.com/96x96/cccccc/666666?text=${(user.name || 'U').charAt(0)}`,
          thumb: user.avatar || `https://via.placeholder.com/48x48/cccccc/666666?text=${(user.name || 'U').charAt(0)}`
        },
        unread_count: 0,
        is_deleted: 0,
        sender_only: 0,
        thread_id: 0,
        user_link: user.url || ""
      };

      console.log("👤 Transformed participant:", {
        id: transformed.user_id,
        name: transformed.name,
        avatar: transformed.user_avatars.thumb
      });

      return transformed;
    });

    return participants;
  };

  const fetchThreadsFromBuddyPress = async (isRefresh = false) => {
    console.log("📥 Fallback: Fetching threads from BuddyPress API");
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      const endpoints = [
        `${API_BASE}/buddypress/v1/messages?per_page=50&type=all`,
        `${API_BASE}/buddypress/v1/messages?per_page=50`,
        `${API_BASE}/buddypress/v1/messages`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { headers });
          
          if (response.ok) {
            const threadsData = await response.json();
            
            if (Array.isArray(threadsData) && threadsData.length > 0) {
              const processedThreads = threadsData.map(thread => ({
                ...thread,
                subject: thread.subject || { rendered: 'No Subject' },
                excerpt: thread.excerpt || { rendered: thread.message?.rendered || 'No content' },
                message: thread.message || { rendered: '' },
                recipients: thread.recipients || []
              }));

              const groupedThreads = groupThreadsByUser(processedThreads);
              setThreads(groupedThreads);
              setFilteredThreads(groupedThreads);
              return;
            }
          }
        } catch (error) {
          console.log("❌ BuddyPress endpoint error:", endpoint, error);
        }
      }

      setThreads([]);
      setFilteredThreads([]);
      
    } catch (error) {
      console.error("❌ Error in BuddyPress fallback:", error);
    }
  };

  const groupThreadsByUser = (threads: Thread[]): Thread[] => {
    const userThreadsMap = new Map<number, Thread>();

    threads.forEach((thread) => {
      const otherUser = getOtherUser(thread.recipients);
      if (otherUser && typeof otherUser.user_id === "number") {
        const existingThread = userThreadsMap.get(otherUser.user_id);

        if (
          !existingThread ||
          new Date(thread.date) > new Date(existingThread.date)
        ) {
          userThreadsMap.set(otherUser.user_id, thread);
        }
      }
    });

    return Array.from(userThreadsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

    const fetchConversation = async (threadId: number, silent = false) => {
        console.log("💬 Fetching conversation using Better Messages API for thread ID:", threadId);
        try {
            if (!silent) setChatLoading(true);

            const headers = await getAuthHeaders();
            if (!headers) {
                console.error("❌ No authorization header available for conversation");
                return;
            }

            // Try multiple Better Messages API endpoints to get all messages
            const betterMessagesEndpoints = [
                `${BETTER_MESSAGES_API}/thread/${threadId}/messages`, // Try messages endpoint first
                `${BETTER_MESSAGES_API}/thread/${threadId}?include_messages=true`, // With parameter
                `${BETTER_MESSAGES_API}/thread/${threadId}`, // Original endpoint
                `${BETTER_MESSAGES_API}/messages?thread_id=${threadId}`, // Direct messages endpoint
                `${BETTER_MESSAGES_API}/threads/${threadId}/messages`, // Alternative format
            ];

            for (const endpoint of betterMessagesEndpoints) {
                try {
                    console.log("💬 Trying Better Messages conversation endpoint:", endpoint);
                    const response = await fetch(endpoint, { headers });

                    if (response.ok) {
                        const data = await response.json();
                        console.log("💬 Better Messages conversation data received:", {
                            endpoint,
                            type: Array.isArray(data) ? 'array' : typeof data,
                            hasMessages: data.messages ? data.messages.length : 'No messages property',
                            hasThread: !!data.thread,
                            dataKeys: Object.keys(data),
                            rawDataSample: JSON.stringify(data).substring(0, 500)
                        });

                        let conversationMessages: ChatMessage[] = [];

                        // Handle different response formats from Better Messages API
                        if (data.messages && Array.isArray(data.messages)) {
                            console.log("📦 Processing messages from .messages property:", data.messages.length);
                            conversationMessages = data.messages.map((msg: any, index: number) =>
                                transformBetterMessagesMessage(msg, threadId, index)
                            );
                        } else if (Array.isArray(data)) {
                            console.log("📦 Processing direct array of messages:", data.length);
                            conversationMessages = data.map((msg: any, index: number) =>
                                transformBetterMessagesMessage(msg, threadId, index)
                            );
                        } else if (data.data && Array.isArray(data.data)) {
                            console.log("📦 Processing messages from .data property:", data.data.length);
                            conversationMessages = data.data.map((msg: any, index: number) =>
                                transformBetterMessagesMessage(msg, threadId, index)
                            );
                        }

                        if (conversationMessages.length > 0) {
                            console.log("✅ Found messages from Better Messages API:", conversationMessages.length);

                            // Sort by date to ensure proper order
                            conversationMessages.sort((a, b) =>
                                new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime()
                            );

                            // Remove duplicates based on message ID
                            const uniqueMessages = conversationMessages.filter(
                                (message, index, self) => index === self.findIndex((m) => m.id === message.id)
                            );

                            console.log("✅ Better Messages conversation processed successfully:", uniqueMessages.length, "unique messages");
                            console.log("📋 Message senders:", uniqueMessages.map(m => ({ id: m.id, sender: m.sender_id, content: m.message.rendered.substring(0, 50) })));

                            setMessages(uniqueMessages);

                            setTimeout(() => {
                                chatFlatListRef.current?.scrollToEnd({ animated: !silent });
                            }, 100);

                            return;
                        }
                    } else {
                        console.log("❌ Better Messages endpoint failed:", endpoint, response.status);
                    }
                } catch (error) {
                    console.log("❌ Better Messages conversation error for endpoint:", endpoint, error);
                }
            }

            // If no Better Messages endpoint worked, try using the threads endpoint and filter
            console.log("💬 Trying to get conversation from main threads endpoint");
            try {
                const threadsEndpoint = `${BETTER_MESSAGES_API}/threads`;
                const response = await fetch(threadsEndpoint, { headers });

                if (response.ok) {
                    const threadsData = await response.json();
                    console.log("💬 Got threads data for filtering:", {
                        hasMessages: threadsData.messages ? threadsData.messages.length : 'No messages',
                        hasThreads: threadsData.threads ? threadsData.threads.length : 'No threads'
                    });

                    if (threadsData.messages && Array.isArray(threadsData.messages)) {
                        // Filter messages for this specific thread
                        const threadMessages = threadsData.messages.filter((msg: any) =>
                            msg.thread_id == threadId || msg.thread_id == threadId.toString()
                        );

                        console.log("💬 Filtered messages for thread:", threadMessages.length, "out of", threadsData.messages.length);

                        if (threadMessages.length > 0) {
                            const conversationMessages = threadMessages.map((msg: any, index: number) =>
                                transformBetterMessagesMessage(msg, threadId, index)
                            );

                            conversationMessages.sort((a:any, b:any) =>
                                new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime()
                            );

                            const uniqueMessages = conversationMessages.filter(
                                (message:any, index:any, self:any) => index === self.findIndex((m:any) => m.id === message.id)
                            );

                            // console.log("✅ Conversation from threads endpoint processed:", uniqueMessages.length, "messages");
                            // console.log("📋 Message senders:", uniqueMessages.map(m:any => ({ id: m.id, sender: m.sender_id, content: m.message.rendered.substring(0, 50) })));

                            setMessages(uniqueMessages);

                            setTimeout(() => {
                                chatFlatListRef.current?.scrollToEnd({ animated: !silent });
                            }, 100);

                            return;
                        }
                    }
                }
            } catch (error) {
                console.log("❌ Error getting conversation from threads endpoint:", error);
            }

            // Fallback to BuddyPress API
            console.log("💬 Falling back to BuddyPress API");
            await fetchConversationFromBuddyPress(threadId, silent);

        } catch (error) {
            console.error("❌ Error in fetchConversation:", error);
            if (!silent) {
                Alert.alert("Error", "Failed to load conversation. Please try again.");
            }
        } finally {
            setChatLoading(false);
        }
    };

  const transformBetterMessagesMessage = (msg: any, threadId: number, index: number): ChatMessage => {
    // Convert the timestamp format - Better Messages uses high precision timestamps
    let dateString = new Date().toISOString();
    if (msg.created_at) {
      try {
        // If timestamp is in milliseconds (13+ digits), use directly
        // If it's the high precision format from Better Messages, convert it
        const timestamp = typeof msg.created_at === 'string' ? 
          parseInt(msg.created_at) : msg.created_at;
        
        if (timestamp > 1000000000000) { // Timestamp is in milliseconds or higher precision
          dateString = new Date(timestamp).toISOString();
        } else {
          dateString = new Date(timestamp * 1000).toISOString();
        }
      } catch (error) {
        console.log("⚠️ Error parsing timestamp:", msg.created_at, error);
        dateString = new Date().toISOString();
      }
    }

    return {
      id: msg.message_id || msg.id || `${threadId}_${index}`,
      thread_id: threadId,
      sender_id: msg.sender_id || msg.user_id || msg.author_id,
      subject: { rendered: msg.subject || "" },
      message: { rendered: msg.message || msg.content || msg.text || "" },
      date_sent: dateString,
      is_starred: msg.favorited || msg.is_starred || false,
    };
  };

  const fetchConversationFromBuddyPress = async (threadId: number, silent = false) => {
    console.log("💬 Fallback: Fetching conversation from BuddyPress API");
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      const endpoints = [
        `${API_BASE}/buddypress/v1/messages/${threadId}?context=view`,
        `${API_BASE}/buddypress/v1/messages/${threadId}`,
        `${API_BASE}/buddypress/v1/messages?thread_id=${threadId}`,
        `${API_BASE}/buddypress/v1/messages?include=${threadId}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { headers });
          
          if (response.ok) {
            const data = await response.json();
            let conversationMessages: ChatMessage[] = [];

            if (data.messages && Array.isArray(data.messages)) {
              conversationMessages = data.messages.map((msg: any, index: number) => ({
                id: msg.id || `${threadId}_${index}`,
                thread_id: threadId,
                sender_id: msg.sender_id || msg.user_id,
                subject: msg.subject || { rendered: "" },
                message: msg.message || msg.content || { rendered: msg.content?.rendered || msg.message?.rendered || "" },
                date_sent: msg.date_sent || msg.date || new Date().toISOString(),
                is_starred: msg.is_starred || false,
              }));
            } else if (Array.isArray(data)) {
              conversationMessages = data.map((msg: any, index: number) => ({
                id: msg.id || `${threadId}_${index}`,
                thread_id: threadId,
                sender_id: msg.sender_id || msg.user_id,
                subject: msg.subject || { rendered: "" },
                message: msg.message || msg.content || { rendered: msg.content?.rendered || msg.message?.rendered || "" },
                date_sent: msg.date_sent || msg.date || new Date().toISOString(),
                is_starred: msg.is_starred || false,
              }));
            }

            if (conversationMessages.length > 0) {
              conversationMessages.sort((a, b) => 
                new Date(a.date_sent).getTime() - new Date(b.date_sent).getTime()
              );

              const uniqueMessages = conversationMessages.filter(
                (message, index, self) => index === self.findIndex((m) => m.id === message.id)
              );

              setMessages(uniqueMessages);
              
              setTimeout(() => {
                chatFlatListRef.current?.scrollToEnd({ animated: !silent });
              }, 100);
              
              return;
            }
          }
        } catch (error) {
          console.log("❌ BuddyPress conversation endpoint error:", endpoint, error);
        }
      }

      setMessages([]);

    } catch (error) {
      console.error("❌ Error in BuddyPress conversation fallback:", error);
    }
  };

 const onRefresh = useCallback(() => {
  console.log("🔄 Pull to refresh triggered");
  setRefreshing(true);
  if (selectedChat) {
    fetchConversation(selectedChat.threadId, true);
  } else {
    fetchThreads(true);
  }
}, [selectedChat]);




// Fix: Remove the type annotation, just use [selectedChat]
  const filterThreads = () => {
    if (!searchQuery.trim()) {
      console.log("🔍 Clearing search filter");
      setFilteredThreads(threads);
      return;
    }

    console.log("🔍 Filtering threads with query:", searchQuery);
    const filtered = threads.filter((thread) => {
      const otherUser = getOtherUser(thread.recipients);
      const messageContent = cleanMessageContent(thread.excerpt.rendered);

      const matches =
        (otherUser?.name &&
          otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        messageContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.subject.rendered
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matches;
    });

    console.log("🔍 Filter results:", filtered.length, "out of", threads.length, "threads");
    setFilteredThreads(filtered);
  };

  const openChat = (thread: Thread) => {
    const otherUser = getOtherUser(thread.recipients);
    if (!otherUser) {
      console.error("❌ Cannot open chat: No other user found in thread");
      Alert.alert("Error", "Cannot open this conversation. Please try again.");
      return;
    }

    const userId = otherUser.user_id || otherUser.id;
    const userName = otherUser.name || otherUser.display_name || "Unknown User";
    const avatarUrl =
      otherUser.user_avatars?.thumb ||
      otherUser.avatar_urls?.thumb ||
      "https://via.placeholder.com/50x50/cccccc/666666?text=U";

    console.log("🎯 Opening conversation with:", userName, `(User ID: ${userId}, Thread ID: ${thread.id})`);

    const chatData: SelectedChat = {
      threadId: thread.id,
      otherUserId: userId ?? 0,
      otherUser: {
        id: userId ?? 0,
        name: userName,
        avatar: avatarUrl,
      },
    };

    setSelectedChat(chatData);
    setMessages([]);
    fetchConversation(thread.id);
  };

  const closeChat = () => {
    console.log("❌ Closing chat, returning to threads list");
    setSelectedChat(null);
    setMessages([]);
    setNewMessage("");
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) {
      console.warn("⚠️ Cannot send message: empty message or no chat selected");
      return;
    }

    const messageToSend = newMessage.trim();
    console.log("📤 Sending message to thread:", selectedChat.threadId);

    setNewMessage("");
    setSending(true);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        throw new Error("Authentication required");
      }

      // Optimistic update
      const optimisticMessage: ChatMessage = {
        id: Date.now(),
        thread_id: selectedChat.threadId,
        sender_id: currentUser!.id,
        subject: { rendered: "Re: Chat" },
        message: { rendered: messageToSend },
        date_sent: new Date().toISOString(),
        is_starred: false,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Scroll to bottom
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Try Better Messages API first, then fallback to BuddyPress
      const sendEndpoints = [
        {
          url: `${BETTER_MESSAGES_API}/thread/${selectedChat.threadId}/send`,
          payload: {
            message: messageToSend,
            thread_id: selectedChat.threadId,
          },
        },
        {
          url: `${BETTER_MESSAGES_API}/send`,
          payload: {
            message: messageToSend,
            thread_id: selectedChat.threadId,
            recipients: [selectedChat.otherUser.id]
          },
        },
        {
          url: `${API_BASE}/buddypress/v1/messages`,
          payload: {
            subject: "Re: Chat",
            message: messageToSend,
            recipients: [selectedChat.otherUser.id],
            thread_id: selectedChat.threadId,
          },
        },
        {
          url: `${API_BASE}/buddypress/v1/messages`,
          payload: {
            content: messageToSend,
            recipients: [selectedChat.otherUser.id],
          },
        },
      ];

      let messageSent = false;

      for (const approach of sendEndpoints) {
        try {
          console.log("📤 Trying send approach:", approach.url);
          const response = await fetch(approach.url, {
            method: "POST",
            headers,
            body: JSON.stringify(approach.payload),
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log("✅ Message sent successfully:", responseData);
            messageSent = true;
            break;
          } else {
            const errorText = await response.text();
            console.log("❌ Send approach failed:", response.status, errorText);
          }
        } catch (error) {
          console.log("❌ Send approach error:", error);
        }
      }

      if (messageSent) {
        // Refresh conversation after a delay
        setTimeout(() => {
          fetchConversation(selectedChat.threadId, true);
          fetchThreads(true);
        }, 1500);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      
      // Remove optimistic message
      setMessages((prev) => prev.filter((msg) => msg.id !== Date.now()));
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (recipients: Recipient[]) => {
    console.log("🔍 Getting other user from recipients:", {
      currentUserId: currentUser?.id,
      recipientsCount: recipients?.length || 0,
      recipients: recipients?.map(r => ({ id: r.user_id || r.id, name: r.name })) || []
    });

    if (!currentUser || !recipients || recipients.length === 0) {
      console.log("❌ No current user or recipients");
      return null;
    }

    const otherUser = recipients.find((recipient) => {
      const userId = recipient.user_id || recipient.id;
      const isDifferentUser = userId && userId !== currentUser.id;
      console.log("🔍 Checking recipient:", {
        recipientId: userId,
        currentUserId: currentUser.id,
        isDifferent: isDifferentUser,
        name: recipient.name
      });
      return isDifferentUser;
    });

    console.log("🎯 Found other user:", otherUser ? {
      id: otherUser.user_id || otherUser.id,
      name: otherUser.name
    } : "None found");

    return otherUser;
  };

  const cleanMessageContent = (htmlContent: string): string => {
    if (!htmlContent) return "";
    return htmlContent.replace(/<[^>]*>/g, "").trim();
  };

  const formatMessageTime = (dateString: string): string => {
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - messageDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
    }

    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return messageDate.toLocaleDateString();
  };

  const renderThreadItem = ({ item }: { item: Thread }) => {
    console.log("🎨 Rendering thread item:", {
      threadId: item.id,
      recipientsCount: item.recipients?.length || 0
    });

    const otherUser = getOtherUser(item.recipients);
    const lastMessage = cleanMessageContent(item.excerpt.rendered);
    const isUnread = item.unread_count > 0;

    console.log("🎨 Thread render data:", {
      threadId: item.id,
      hasOtherUser: !!otherUser,
      otherUserName: otherUser?.name,
      lastMessage: lastMessage?.substring(0, 50),
      isUnread
    });

    if (!otherUser) {
      console.log("❌ No other user found for thread:", item.id);
      return null;
    }

    const avatarUrl =
      otherUser.user_avatars?.thumb ||
      otherUser.avatar_urls?.thumb ||
      "https://via.placeholder.com/50x50/cccccc/666666?text=U";

    const userName = otherUser.name || otherUser.display_name || "Unknown User";

    return (
      <TouchableOpacity
        style={[styles.threadItem, isUnread && styles.unreadThread]}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: avatarUrl.startsWith("//") ? `https:${avatarUrl}` : avatarUrl,
            }}
            style={styles.avatar}
            defaultSource={{
              uri: "https://via.placeholder.com/50x50/cccccc/666666?text=U",
            }}
          />
          {isUnread && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text
              style={[styles.userName, isUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {userName}
            </Text>
            <Text style={styles.timeText}>{formatMessageTime(item.date)}</Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[styles.lastMessage, isUnread && styles.unreadMessage]}
              numberOfLines={1}
            >
              {lastMessage || "No message content"}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 99 ? "99+" : item.unread_count}
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
      <View
        style={[
          styles.messageContainer,
          isCurrentUser
            ? styles.sentMessageContainer
            : styles.receivedMessageContainer,
        ]}
      >
        {!isCurrentUser && selectedChat && (
          <Image
            source={{
              uri: selectedChat.otherUser.avatar.startsWith("//")
                ? `https:${selectedChat.otherUser.avatar}`
                : selectedChat.otherUser.avatar,
            }}
            style={styles.messageAvatar}
            defaultSource={{
              uri: "https://via.placeholder.com/30x30/cccccc/666666?text=U",
            }}
          />
        )}

        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.sentText : styles.receivedText,
            ]}
          >
            {messageContent}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isCurrentUser ? styles.sentTime : styles.receivedTime,
            ]}
          >
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
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderChatHeader = () => (
    <View style={styles.chatHeader}>
      <TouchableOpacity style={styles.backButton} onPress={closeChat}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <View style={styles.headerUserInfo}>
        {selectedChat && (
          <>
            <Image
              source={{
                uri: selectedChat.otherUser.avatar.startsWith("//")
                  ? `https:${selectedChat.otherUser.avatar}`
                  : selectedChat.otherUser.avatar,
              }}
              style={styles.headerAvatar}
              defaultSource={{
                uri: "https://via.placeholder.com/40x40/cccccc/666666?text=U",
              }}
            />
            <View>
              <Text style={styles.headerUserName}>
                {selectedChat.otherUser.name}
              </Text>
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
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
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
              uri: selectedChat.otherUser.avatar.startsWith("//")
                ? `https:${selectedChat.otherUser.avatar}`
                : selectedChat.otherUser.avatar,
            }}
            style={styles.emptyAvatar}
            defaultSource={{
              uri: "https://via.placeholder.com/80x80/cccccc/666666?text=U",
            }}
          />
          <Text style={styles.emptyTitle}>
            Start conversation with {selectedChat.otherUser.name}
          </Text>
          <Text style={styles.emptySubtitle}>
            Send a message to begin your conversation
          </Text>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.pageContainer}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#4c9c94" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4c9c94" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        </SafeAreaView>
        <BottomNavFooter activeTab="More" />
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
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
                  // onRefresh={onRefresh}
                  tintColor="#4c9c94"
                  colors={["#4c9c94"]}
                />
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContainer,
                filteredThreads.length === 0 && styles.emptyListContainer,
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
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
                    messages.length === 0 && styles.emptyMessagesContainer,
                  ]}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      // onRefresh={onRefresh}
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
      <BottomNavFooter activeTab="More" />
    </View>
  );
};
// Note: You'll need to add the StyleSheet.create({...}) with all the styles here
// The styles weren't included in the original code, but would be the same as before



const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: "#dbdde0",
  },
  container: {
    flex: 1,
    backgroundColor: "#dbdde0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#4c9c94",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: "#666",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: "#999",
    padding: 4,
  },
  listContainer: {
    paddingTop: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  threadItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  unreadThread: {
    backgroundColor: "#fff8f0",
    borderLeftWidth: 4,
    borderLeftColor: "#4c9c94",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4c9c94",
    borderWidth: 2,
    borderColor: "#fff",
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  unreadText: {
    fontWeight: "700",
    color: "#1a1a1a",
  },
  timeText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: "#333",
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#4c9c94",
    borderRadius: 12,
    minWidth: 24,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    backgroundColor: "#4c9c94",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: "#000",
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
    color: "#fff",
    fontWeight: "300",
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  headerStatus: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  chatContent: {
    flex: 1,
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  sentMessageContainer: {
    justifyContent: "flex-end",
  },
  receivedMessageContainer: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sentBubble: {
    backgroundColor: "#4c9c94",
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: "#e46c34",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: "#fff",
  },
  receivedText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  sentTime: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "right",
  },
  receivedTime: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  inputContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8f9fa",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: "#4c9c94",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#f0f0f0",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default UnifiedMessagingComponent;
function myUseCallback(arg0: () => void, arg1: (SelectedChat | null)[]) {
  throw new Error("Function not implemented.");
}
