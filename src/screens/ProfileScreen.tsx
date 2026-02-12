import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

const MENU_ITEMS = [
  {icon: '📒', label: '账本管理', route: '账本管理'},
  {icon: '🏷️', label: '标签管理', route: null},
  {icon: '📁', label: '科目管理', route: null},
  {icon: '📤', label: '数据导出', route: null},
];

const SETTINGS = [
  {icon: '🔔', label: '提醒设置'},
  {icon: '🎨', label: '主题外观'},
  {icon: '🔒', label: '安全设置'},
  {icon: '❓', label: '帮助与反馈'},
];

const ProfileScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>👤</Text>
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName}>LifeHub 用户</Text>
          <Text style={s.userSub}>管理你的财务生活</Text>
        </View>
      </View>
      <View style={s.body}>
        {/* 功能菜单 */}
        <View style={s.card}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={s.divider} />}
              <TouchableOpacity
                style={s.menuRow}
                onPress={() => item.route && navigation.navigate(item.route)}
                activeOpacity={0.6}>
                <Text style={s.menuIcon}>{item.icon}</Text>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuArrow}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* 设置 */}
        <View style={s.card}>
          {SETTINGS.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={s.divider} />}
              <TouchableOpacity style={s.menuRow} activeOpacity={0.6}>
                <Text style={s.menuIcon}>{item.icon}</Text>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuArrow}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <Text style={s.version}>LifeHub v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B7DD8', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
  avatar: {width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16},
  avatarText: {fontSize: 28},
  userInfo: {flex: 1},
  userName: {fontSize: 20, fontWeight: '800', color: '#fff'},
  userSub: {fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4},

  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 16},

  card: {backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 52},

  menuRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16},
  menuIcon: {fontSize: 20, marginRight: 14},
  menuLabel: {flex: 1, fontSize: 15, fontWeight: '500', color: '#333'},
  menuArrow: {fontSize: 18, color: '#D0D5DD'},

  version: {textAlign: 'center', fontSize: 12, color: '#C8CDD5', marginTop: 24},
});

export default ProfileScreen;
