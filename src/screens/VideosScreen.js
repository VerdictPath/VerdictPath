import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { VIDEOS } from '../constants/mockData';

const VideosScreen = ({ onNavigate }) => {
  const handleWatchVideo = () => {
    Alert.alert('Coming Soon', 'Video player integration in progress');
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <Text style={commonStyles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Video Library</Text>
      </View>

      <View style={styles.videosContainer}>
        {VIDEOS.map(video => (
          <View key={video.id} style={styles.videoCard}>
            <View style={styles.videoThumbnail}>
              <Text style={styles.videoIcon}>🎥</Text>
            </View>
            
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.videoDuration}>{video.duration}</Text>
              <View style={styles.videoFooter}>
                <Text style={styles.videoPrice}>${video.price}</Text>
                <TouchableOpacity 
                  style={styles.watchButton}
                  onPress={handleWatchVideo}
                >
                  <Text style={styles.watchButtonText}>Watch</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  videosContainer: {
    padding: 20,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: 120,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 48,
  },
  videoInfo: {
    flex: 1,
    padding: 15,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  videoDuration: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  videoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  watchButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  watchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VideosScreen;
