import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {getErrorMessage} from '../services/errors';
import {login, saveAuthTokens} from '../services/auth';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

const LoginScreen = ({onLoginSuccess}: LoginScreenProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('提示', '请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const loginResponse = await login(username, password);
      await saveAuthTokens(loginResponse);
      onLoginSuccess(loginResponse.token);
    } catch (err) {
      Alert.alert('登录失败', getErrorMessage(err, '请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F4F7" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logoArea}>
          <Text style={styles.logoIcon}>💰</Text>
          <Text style={styles.logoTitle}>LifeHub 记账</Text>
          <Text style={styles.logoSubtitle}>账本管理与统计分析</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="用户名"
              placeholderTextColor="#B0B8C4"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="用户名输入框"
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="密码"
              placeholderTextColor="#B0B8C4"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="密码输入框"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="登录">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>登录</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F2F4F7'},
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 88,
    paddingBottom: 40,
  },
  logoArea: {alignItems: 'center', marginBottom: 36},
  logoIcon: {fontSize: 56},
  logoTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#222',
    marginTop: 12,
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  form: {gap: 16},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  inputIcon: {fontSize: 20, marginRight: 10},
  input: {flex: 1, fontSize: 16, color: '#333', paddingVertical: 4},
  loginBtn: {
    backgroundColor: '#3B7DD8',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#3B7DD8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginBtnDisabled: {opacity: 0.7},
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
});

export default LoginScreen;
