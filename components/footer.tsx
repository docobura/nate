import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type BottomNavFooterProps = {
  activeTab?: string;
  onTabPress?: (tabId: string) => void;
};

const BottomNavFooter: React.FC<BottomNavFooterProps> = ({ activeTab = 'Home', onTabPress }) => {
  const navigation = useNavigation();
  
  const navItems = [
    { id: 'Home', icon: '🏠', label: 'Home' },
    { id: 'Community', icon: '👥', label: 'Community' },
    // { id: 'Impact', icon: '📊', label: 'Impacts' },
    { id: 'Resources', icon: '📚', label: 'Resources' },
    // { id: 'More', icon: '', label: 'More' },
  ];

  const handleTabPress = (tabId: string) => {
    // Handle specific navigation for Home tab
    if (tabId === 'Home') {
      navigation.navigate('dashboard' as never);
    } else {
      // Call the original onTabPress for other tabs
      onTabPress && onTabPress(tabId);
    }
  };

  return (
    <View style={styles.bottomNav}>
      <View style={styles.bottomNavGradient} />
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.bottomNavItem,
            activeTab === item.id && styles.activeBottomNavItem
          ]}
          onPress={() => handleTabPress(item.id)}
        >
          <View style={styles.bottomNavIconContainer}>
            <Text style={styles.bottomNavIcon}>{item.icon}</Text>
          </View>
          <Text style={[
            styles.bottomNavText,
            activeTab === item.id && styles.activeBottomNavText
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#4c9c94',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#3d7b74',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomNavGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  activeBottomNavItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bottomNavIconContainer: {
    marginBottom: 4,
  },
  bottomNavIcon: {
    fontSize: 20,
  },
  bottomNavText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  activeBottomNavText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default BottomNavFooter;