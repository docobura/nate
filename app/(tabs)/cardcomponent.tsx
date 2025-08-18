import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export interface Member {
  id: number;
  name: string;
  user_login: string;
  friendship_status: boolean;
  friendship_status_slug: boolean;
  link: string;
  member_types: string[];
  xprofile: {
    groups: {
      name: string;
      id: number;
      fields: {
        name: string;
        id: number;
        value: {
          raw: string;
          unserialized: string[];
          rendered: string;
        };
      }[];
    }[];
  };
  mention_name: string;
  avatar_urls: {
    full: string;
    thumb: string;
  };
  _links: {
    self: {
      href: string;
      targetHints: {
        allow: string[];
      };
    }[];
    collection: {
      href: string;
    }[];
  };
}


interface MemberCardProps {
  member: Member;
  onAddFriend: (memberId: number) => void;
  onPrivateMessage: (memberId: number) => void;
  onBlock: (memberId: number) => void;
  lastSeen?: string;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onAddFriend,
  onPrivateMessage,
  onBlock,
  lastSeen,
}) => {
  const getAvatarSource = () => {
    if (member.avatar_urls.thumb && member.avatar_urls.thumb.startsWith('//')) {
      return { uri: `https:${member.avatar_urls.thumb}` };
    }
    return { uri: member.avatar_urls.thumb };
  };

  const renderDefaultAvatar = () => (
    <View style={styles.defaultAvatar}>
      <Text style={styles.defaultAvatarText}>
        {member.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {member.avatar_urls.thumb ? (
            <Image
              source={getAvatarSource()}
              style={styles.avatar}
              defaultSource={require('../../assets/images/logo.png')} // Add a default avatar image
            />
          ) : (
            renderDefaultAvatar()
          )}
          <Text style={styles.memberName}>{member.name}</Text>
          {lastSeen && (
            <Text style={styles.lastSeen}>{lastSeen}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={() => onAddFriend(member.id)}
          >
            <Text style={styles.addFriendText}>Add Friend</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.privateMessageButton}
            onPress={() => onPrivateMessage(member.id)}
          >
            <Text style={styles.privateMessageText}>Private Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.blockButton}
            onPress={() => onBlock(member.id)}
          >
            <Text style={styles.blockText}>Block</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#5A9B9B',
    borderRadius: 12,
    margin: 8,
    width: (width - 48) / 2, // Two columns with margins
    minHeight: 280,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  memberName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  lastSeen: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 8,
  },
  addFriendButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addFriendText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  privateMessageButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  privateMessageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  blockButton: {
    backgroundColor: '#424242',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  blockText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MemberCard;