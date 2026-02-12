import React from 'react';
import {View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const TIPS = [
  {icon: '💡', title: '记账小技巧', desc: '每天花2分钟记录支出，月底不再迷茫'},
  {icon: '📊', title: '预算管理', desc: '设定月度预算，控制不必要的开支'},
  {icon: '🎯', title: '储蓄目标', desc: '设定存钱目标，让攒钱更有动力'},
  {icon: '📈', title: '投资入门', desc: '了解基础理财知识，让钱生钱'},
];

const TOOLS = [
  {icon: '🧮', title: '汇率换算', color: '#339AF0'},
  {icon: '📐', title: '利息计算', color: '#51CF66'},
  {icon: '🏷️', title: '比价助手', color: '#FF6B6B'},
  {icon: '📋', title: '账单导出', color: '#845EF7'},
];

const DiscoverScreen = () => (
  <SafeAreaView style={s.safe} edges={['top']}>
    <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
    <View style={s.header}>
      <Text style={s.headerTitle}>发现</Text>
      <Text style={s.headerSub}>探索更多理财工具与技巧</Text>
    </View>
    <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
      {/* 工具入口 */}
      <Text style={s.sectionTitle}>实用工具</Text>
      <View style={s.toolGrid}>
        {TOOLS.map(t => (
          <TouchableOpacity key={t.title} style={s.toolCard} activeOpacity={0.7}>
            <View style={[s.toolIconWrap, {backgroundColor: t.color + '18'}]}>
              <Text style={s.toolIcon}>{t.icon}</Text>
            </View>
            <Text style={s.toolTitle}>{t.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 理财知识 */}
      <Text style={s.sectionTitle}>理财知识</Text>
      {TIPS.map(tip => (
        <TouchableOpacity key={tip.title} style={s.tipCard} activeOpacity={0.7}>
          <Text style={s.tipIcon}>{tip.icon}</Text>
          <View style={s.tipInfo}>
            <Text style={s.tipTitle}>{tip.title}</Text>
            <Text style={s.tipDesc}>{tip.desc}</Text>
          </View>
          <Text style={s.tipArrow}>›</Text>
        </TouchableOpacity>
      ))}

      {/* 底部占位 */}
      <View style={s.comingSoon}>
        <Text style={s.comingIcon}>🚀</Text>
        <Text style={s.comingText}>更多功能即将上线</Text>
      </View>
      <View style={{height: 30}} />
    </ScrollView>
  </SafeAreaView>
);

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {backgroundColor: '#3B7DD8', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20},
  headerTitle: {fontSize: 22, fontWeight: '800', color: '#fff'},
  headerSub: {fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4},

  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 24, borderTopRightRadius: 24},
  bodyContent: {padding: 16, paddingTop: 20},

  sectionTitle: {fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 12, marginLeft: 4},

  // Tools
  toolGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24},
  toolCard: {width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  toolIconWrap: {width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10},
  toolIcon: {fontSize: 24},
  toolTitle: {fontSize: 14, fontWeight: '600', color: '#333'},

  // Tips
  tipCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  tipIcon: {fontSize: 28, marginRight: 14},
  tipInfo: {flex: 1},
  tipTitle: {fontSize: 15, fontWeight: '600', color: '#333'},
  tipDesc: {fontSize: 12, color: '#999', marginTop: 3},
  tipArrow: {fontSize: 20, color: '#D0D5DD'},

  // Coming soon
  comingSoon: {alignItems: 'center', paddingVertical: 32},
  comingIcon: {fontSize: 32, marginBottom: 8},
  comingText: {fontSize: 13, color: '#C8CDD5', fontWeight: '500'},
});

export default DiscoverScreen;
