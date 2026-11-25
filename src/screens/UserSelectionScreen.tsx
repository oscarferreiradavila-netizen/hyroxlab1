import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { User, Zap } from 'lucide-react-native';
import { useTrainingStore, AppUserId } from '../store/useTrainingStore';

export const UserSelectionScreen: React.FC = () => {
  const { selectUser } = useTrainingStore();

  const handleSelect = (userId: AppUserId) => {
    selectUser(userId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brandBox}>
          <View style={styles.logoCircle}>
            <Zap size={32} color="#0F172A" fill="#0F172A" />
          </View>
          <Text style={styles.title}>HYROXLAB</Text>
          <Text style={styles.subtitle}>¿Quién va a entrenar hoy?</Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.userCard, styles.oscarCard]}
            onPress={() => handleSelect('oscar')}
            activeOpacity={0.85}
          >
            <View style={[styles.avatarCircle, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <User size={36} color="#F59E0B" />
            </View>
            <Text style={styles.userName}>OSCAR</Text>
            <Text style={styles.userHint}>Perfil, marcas y entrenos de Oscar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.userCard, styles.saraCard]}
            onPress={() => handleSelect('sara')}
            activeOpacity={0.85}
          >
            <View style={[styles.avatarCircle, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
              <User size={36} color="#38BDF8" />
            </View>
            <Text style={styles.userName}>SARA</Text>
            <Text style={styles.userHint}>Perfil, marcas y entrenos de Sara</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 16,
  },
  userCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  oscarCard: {
    borderColor: '#F59E0B',
  },
  saraCard: {
    borderColor: '#38BDF8',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  userHint: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
});
