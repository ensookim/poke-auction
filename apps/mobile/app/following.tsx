import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { palette } from '@/constants/ui';
import followService, { FollowUser } from '@/services/followService';

export default function FollowingScreen() {
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>(
    'following',
  );

  const load = useCallback(async () => {
    const [fing, fers] = await Promise.all([
      followService.getFollowing(),
      followService.getFollowers(),
    ]);
    setFollowing(fing);
    setFollowers(fers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unfollow = async (userId: number) => {
    await followService.unfollow(userId);
    await load();
  };

  const rows = activeTab === 'following' ? following : followers;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={palette.ink} />
        </Pressable>
        <ThemedText style={styles.title}>팔로우</ThemedText>
        <View style={styles.headerPad} />
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <ThemedText
            style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}
          >
            팔로잉 {following.length}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
        >
          <ThemedText
            style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}
          >
            팔로워 {followers.length}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>목록이 비어 있습니다.</ThemedText>
          </View>
        ) : (
          rows.map((user) => (
            <View key={user.userId} style={styles.row}>
              <View>
                <ThemedText style={styles.name}>{user.nickname}</ThemedText>
                <ThemedText style={styles.meta}>회원번호 #{user.userId}</ThemedText>
              </View>
              {activeTab === 'following' ? (
                <Pressable style={styles.unfollowBtn} onPress={() => unfollow(user.userId)}>
                  <ThemedText style={styles.unfollowText}>언팔로우</ThemedText>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  backButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  title: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  headerPad: { width: 36 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: { alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 8, flex: 1, paddingVertical: 10 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { color: '#111827', fontSize: 13, fontWeight: '900' },
  tabTextActive: { color: '#FFFFFF' },
  content: { gap: 10, padding: 16 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, padding: 18 },
  emptyText: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  row: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: palette.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  name: { color: '#111827', fontSize: 14, fontWeight: '900' },
  meta: { color: '#6B7280', fontSize: 12, fontWeight: '700', marginTop: 2 },
  unfollowBtn: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  unfollowText: { color: '#374151', fontSize: 12, fontWeight: '900' },
});
