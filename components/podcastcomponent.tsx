import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Alert,
} from 'react-native';

interface PodcastPlayerProps {
    podcast: {
        id: number;
        title: { rendered: string };
        content: { rendered: string };
        date: string;
        excerpt: { rendered: string };
    };
    onBack: () => void;
}

const PodcastPlayerComponent: React.FC<PodcastPlayerProps> = ({ podcast, onBack }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const extractAudioUrl = (content: string): string | null => {
        const audioMatch = content.match(/src="([^"]*\.(?:mp3|m4a|wav|ogg))"/i);
        return audioMatch ? audioMatch[1] : null;
    };

    const cleanHtmlContent = (htmlContent: string): string => {
        return htmlContent.replace(/<[^>]*>/g, '').trim();
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const audioUrl = extractAudioUrl(podcast.content.rendered);
    const description = cleanHtmlContent(podcast.excerpt.rendered) ||
        cleanHtmlContent(podcast.content.rendered);

    const handlePlayPause = () => {
        if (!audioUrl) {
            Alert.alert('Error', 'No audio file available');
            return;
        }

        // Here you would integrate with your audio player library
        // For example: react-native-sound, react-native-video, or expo-av
        setIsPlaying(!isPlaying);

        if (!isPlaying) {
            console.log('▶️ Playing audio:', audioUrl);
            // Start audio playback
        } else {
            console.log('⏸️ Pausing audio');
            // Pause audio playback
        }
    };

    const handleSeek = (position: number) => {
        // Implement seeking functionality
        setCurrentTime(position);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#e46c34" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Now Playing</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Podcast Info */}
                <View style={styles.podcastInfo}>
                    <View style={styles.podcastIcon}>
                        <Text style={styles.podcastIconText}>🎙️</Text>
                    </View>

                    <Text style={styles.podcastTitle}>{podcast.title.rendered}</Text>
                    <Text style={styles.podcastDate}>
                        {new Date(podcast.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                </View>

                {/* Player Controls */}
                <View style={styles.playerControls}>
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }
                                ]}
                            />
                        </View>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>

                    {/* Play/Pause Button */}
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={handlePlayPause}
                        disabled={!audioUrl}
                    >
                        <Text style={styles.playButtonText}>
                            {isPlaying ? '⏸️' : '▶️'}
                        </Text>
                    </TouchableOpacity>

                    {/* Additional Controls */}
                    <View style={styles.additionalControls}>
                        <TouchableOpacity style={styles.controlButton}>
                            <Text style={styles.controlButtonText}>⏪</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButton}>
                            <Text style={styles.controlButtonText}>⏩</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.controlButton}>
                            <Text style={styles.controlButtonText}>🔄</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Description */}
                {description && (
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>{description}</Text>
                    </View>
                )}

                {/* Audio URL Info (for debugging) */}
                {audioUrl && (
                    <View style={styles.debugInfo}>
                        <Text style={styles.debugTitle}>Audio Source:</Text>
                        <Text style={styles.debugText} numberOfLines={1}>
                            {audioUrl}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#dbdde0',
    },
    header: {
        backgroundColor: '#e46c34',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    placeholder: {
        width: 60, // Balance the back button
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    podcastInfo: {
        alignItems: 'center',
        marginBottom: 40,
    },
    podcastIcon: {
        width: 120,
        height: 120,
        backgroundColor: '#e46c34',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    podcastIconText: {
        fontSize: 48,
    },
    podcastTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    podcastDate: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    playerControls: {
        alignItems: 'center',
        marginBottom: 40,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        width: '100%',
    },
    timeText: {
        fontSize: 12,
        color: '#666',
        width: 40,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#e46c34',
    },
    playButton: {
        width: 80,
        height: 80,
        backgroundColor: '#e46c34',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    playButtonText: {
        fontSize: 32,
        color: '#fff',
    },
    additionalControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '60%',
    },
    controlButton: {
        width: 50,
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    controlButtonText: {
        fontSize: 20,
    },
    descriptionContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    descriptionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    debugInfo: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    debugTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    debugText: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'monospace',
    },
});

export default PodcastPlayerComponent;