// EchoTrail - Full App Export for Snack
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Mock data og services
const mockUser = { email: 'demo@snack.dev', role: 'user' };
const mockTrails = [
  {
    id: '1',
    name: 'Preikestolen',
    difficulty: 'Hard',
    distance: '8 km',
    description: 'Spektakulær utsikt over Lysefjorden'
  },
  {
    id: '2',
    name: 'Trolltunga', 
    difficulty: 'Expert',
    distance: '28 km',
    description: 'Norges mest kjente fotospot'
  }
];

const mockMemories = [
  {
    id: '1',
    title: 'Solnedgang på Preikestolen',
    description: 'En magisk kveld',
    date: '2024-08-15'
  }
];

// Hovedkomponent
export default function EchoTrailApp() {
  const [activeTab, setActiveTab] = useState('discover');
  const [user, setUser] = useState(mockUser);

  const tabs = [
    { id: 'discover', title: 'Oppdag', icon: 'explore' },
    { id: 'memories', title: 'Minner', icon: 'photo-library' },
    { id: 'maps', title: 'Kart', icon: 'map' },
    { id: 'settings', title: 'Instillinger', icon: 'settings' }
  ];

  const renderDiscoverScreen = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Velkommen til EchoTrail! 🥾</Text>
        <Text style={styles.subText}>Oppdag fantastiske turer med AI-guidet historiefortelling</Text>
      </View>

      <Text style={styles.sectionTitle}>🏔️ Anbefalte Turer</Text>
      {mockTrails.map(trail => (
        <TouchableOpacity 
          key={trail.id} 
          style={styles.trailCard}
          onPress={() => Alert.alert(trail.name, trail.description)}
        >
          <View style={styles.trailHeader}>
            <Text style={styles.trailName}>{trail.name}</Text>
            <Text style={styles.trailDifficulty}>{trail.difficulty}</Text>
          </View>
          <Text style={styles.trailDistance}>{trail.distance}</Text>
          <Text style={styles.trailDescription}>{trail.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMemoriesScreen = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>📸 Mine Minner</Text>
      {mockMemories.map(memory => (
        <TouchableOpacity 
          key={memory.id} 
          style={styles.memoryCard}
          onPress={() => Alert.alert(memory.title, memory.description)}
        >
          <Text style={styles.memoryTitle}>{memory.title}</Text>
          <Text style={styles.memoryDescription}>{memory.description}</Text>
          <Text style={styles.memoryDate}>{memory.date}</Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => Alert.alert('Demo', 'I full-appen kan du legge til nye minner her!')}
      >
        <MaterialIcons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Legg til minne</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderMapScreen = () => (
    <View style={styles.content}>
      <View style={styles.mapPlaceholder}>
        <MaterialIcons name="map" size={64} color="#2563eb" />
        <Text style={styles.mapText}>🗺️ Interaktivt Kart</Text>
        <Text style={styles.mapSubText}>I full-appen vil dette vise et interaktivt kart med alle turer og din posisjon</Text>
        
        <TouchableOpacity 
          style={styles.mapButton}
          onPress={() => Alert.alert('Kart', 'Full kart-funksjonalitet tilgjengelig i native app')}
        >
          <Text style={styles.mapButtonText}>Åpne Fullskjerm Kart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettingsScreen = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>⚙️ Innstillinger</Text>
      
      <View style={styles.settingSection}>
        <Text style={styles.settingTitle}>Bruker</Text>
        <Text style={styles.settingValue}>{user.email}</Text>
        <Text style={styles.settingValue}>Rolle: {user.role}</Text>
      </View>

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => Alert.alert('Språk', 'Bytt mellom Norsk og Engelsk')}
      >
        <MaterialIcons name="language" size={24} color="#2563eb" />
        <Text style={styles.settingButtonText}>Språk (Norsk/English)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => Alert.alert('Lyd', 'AI stemme-innstillinger')}
      >
        <MaterialIcons name="volume-up" size={24} color="#2563eb" />
        <Text style={styles.settingButtonText}>AI Stemme</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingButton}
        onPress={() => Alert.alert('Om', 'EchoTrail versjon 1.0\nLaget med React Native og Expo')}
      >
        <MaterialIcons name="info" size={24} color="#2563eb" />
        <Text style={styles.settingButtonText}>Om Appen</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCurrentScreen = () => {
    switch(activeTab) {
      case 'discover': return renderDiscoverScreen();
      case 'memories': return renderMemoriesScreen();
      case 'maps': return renderMapScreen();
      case 'settings': return renderSettingsScreen();
      default: return renderDiscoverScreen();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>EchoTrail</Text>
        <Text style={styles.appSubtitle}>🍿 Snack Demo</Text>
      </View>

      {/* Content */}
      {renderCurrentScreen()}

      {/* Bottom Navigation */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialIcons 
              name={tab.icon}
              size={24}
              color={activeTab === tab.id ? '#2563eb' : '#6b7280'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  appHeader: {
    backgroundColor: '#2563eb',
    padding: 16,
    alignItems: 'center',
  },
  appTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  trailCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  trailDifficulty: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  trailDistance: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 4,
  },
  trailDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  memoryCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  memoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  memoryDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 32,
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  mapSubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  mapButton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  settingButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingButtonText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // Active tab styling handled by text/icon colors
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
