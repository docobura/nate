import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface SidebarProps {
  isVisible: boolean;
  toggleSidebar: () => void;
}

// Define only the allowed route strings to use with router.push
type AllowedRoutes = '/members' | '/clusters' | '/friends';

const Sidebar: React.FC<SidebarProps> = ({ isVisible, toggleSidebar }) => {
  const router = useRouter();

  if (!isVisible) return null;

  // type-safe navigation function
  const handleNavigation = (path: AllowedRoutes) => {
    router.push(path);
    toggleSidebar(); // close sidebar after navigation
  };

  return (
    <View style={styles.sidebar}>
      <TouchableOpacity style={styles.closeButton} onPress={toggleSidebar}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>

      <View style={styles.menu}>
        {[
          '🏠 Home Pages',
          '👥 Members',
          '👫 Friends',
          '💬 Messages',
          '🔔 Notifications',
          '💡 Forums',
          '🛒 Marketplace',
          '⚙️ Settings',
          '📘 Single Course',
          '📄 Single Lesson',
          '💼 Nexus Entrepreneur',
        ].map((item, index) => {
          if (item === '👥 Members') {
            return (
              <TouchableOpacity key={index} onPress={() => handleNavigation('/members')}>
                <Text style={styles.menuItem}>{item}</Text>
              </TouchableOpacity>
            );
          }

          if (item === '👫 Friends') {
            return (
              <TouchableOpacity key={index} onPress={() => handleNavigation('/friends')}>
                <Text style={styles.menuItem}>{item}</Text>
              </TouchableOpacity>
            );
          }

          if (item === '🛒 Marketplace') {
            return (
              <TouchableOpacity key={index} onPress={() => handleNavigation('/clusters')}>
                <Text style={styles.menuItem}>{item}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <Text key={index} style={styles.menuItem}>{item}</Text>
          );
        })}
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 250,
    backgroundColor: '#f2f2f2',
    padding: 15,
    zIndex: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeText: {
    fontSize: 28,
    color: '#004080',
  },
  menu: {
    marginTop: 10,
  },
  menuItem: {
    fontSize: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});

export default Sidebar;
