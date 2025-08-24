import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import BottomNavFooter from '../../components/footer';

const PodcastsComingSoonPage: React.FC = () => {
  return (
    <View style={styles.pageContainer}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Podcasts</Text>
            <Text style={styles.pageSubtitle}>
              Listen to inspiring stories and insights from industry leaders
            </Text>
          </View>

          {/* Coming Soon Card */}
          <View style={styles.comingSoonCard}>
            <View style={styles.iconContainer}>
              <Text style={styles.podcastIcon}>🎧</Text>
            </View>
            
            <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
            <Text style={styles.comingSoonDescription}>
              Get ready for an immersive audio experience! We're curating amazing podcast content 
              featuring industry experts, success stories, and actionable insights.
            </Text>

            {/* Features Preview */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What's Coming:</Text>
              
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎙️</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Expert Interviews</Text>
                  <Text style={styles.featureDescription}>
                    Deep conversations with industry leaders and innovators
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📚</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Educational Series</Text>
                  <Text style={styles.featureDescription}>
                    Learn new skills and stay updated with industry trends
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>💡</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Success Stories</Text>
                  <Text style={styles.featureDescription}>
                    Inspiring journeys from entrepreneurs and thought leaders
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>⏰</Text>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Flexible Listening</Text>
                  <Text style={styles.featureDescription}>
                    Download, bookmark, and listen at your own pace
                  </Text>
                </View>
              </View>
            </View>

            {/* Call to Action */}
            <TouchableOpacity style={styles.notifyButton}>
              <Text style={styles.notifyButtonText}>Get Early Access</Text>
            </TouchableOpacity>
          </View>

          {/* Content Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Content Preview</Text>
            
            <View style={styles.episodePreview}>
              <View style={styles.episodeIcon}>
                <Text style={styles.episodeNumber}>01</Text>
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>Building Resilient Teams</Text>
                <Text style={styles.episodeGuest}>with Sarah Johnson, CEO of TechFlow</Text>
                <Text style={styles.episodeDuration}>45 min • Leadership</Text>
              </View>
            </View>

            <View style={styles.episodePreview}>
              <View style={styles.episodeIcon}>
                <Text style={styles.episodeNumber}>02</Text>
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>The Future of Remote Work</Text>
                <Text style={styles.episodeGuest}>with Marcus Chen, HR Director</Text>
                <Text style={styles.episodeDuration}>38 min • Workplace</Text>
              </View>
            </View>

            <View style={styles.episodePreview}>
              <View style={styles.episodeIcon}>
                <Text style={styles.episodeNumber}>03</Text>
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle}>Innovation in Fintech</Text>
                <Text style={styles.episodeGuest}>with Dr. Emily Roberts, Fintech Expert</Text>
                <Text style={styles.episodeDuration}>52 min • Technology</Text>
              </View>
            </View>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Production Progress</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <Text style={styles.progressText}>60% Complete</Text>
            <Text style={styles.estimatedLaunch}>First Episodes: March 2024</Text>
          </View>

          {/* Newsletter Signup */}
          <View style={styles.newsletterCard}>
            <Text style={styles.newsletterTitle}>Stay Tuned</Text>
            <Text style={styles.newsletterDescription}>
              Be the first to know when new episodes drop and get exclusive behind-the-scenes content.
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Subscribe for Updates</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Suggest Topics</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      <BottomNavFooter activeTab="Resources" />
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    marginBottom: 16,
    marginTop: 20,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  comingSoonCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fdf4f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  podcastIcon: {
    fontSize: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  notifyButton: {
    backgroundColor: '#e46c34',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#e46c34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  notifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  episodePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  episodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e46c34',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  episodeNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  episodeGuest: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  episodeDuration: {
    fontSize: 12,
    color: '#9c9c9c',
    fontWeight: '500',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e46c34',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e46c34',
    textAlign: 'center',
    marginBottom: 4,
  },
  estimatedLaunch: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  newsletterCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  newsletterDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#e46c34',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4c9c94',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4c9c94',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PodcastsComingSoonPage;