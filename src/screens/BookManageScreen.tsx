import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';

import {ROUTES} from '../constants/routes';
import type {RootStackNavigationPropType} from '../navigation/types';
import {getMyBooks, type Book} from '../services/book';
import {getErrorMessage} from '../services/errors';

const CURRENCY_LABEL: Record<string, string> = {
  CNY: '¥ 人民币',
  SGD: 'S$ 新加坡元',
};

const BookManageScreen = ({
  navigation,
}: {
  navigation: RootStackNavigationPropType<typeof ROUTES.bookManage>;
}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);

      getMyBooks()
        .then(data => {
          if (!cancelled) {
            setBooks(Array.isArray(data) ? data : []);
            setError('');
          }
        })
        .catch(err => {
          if (!cancelled) {
            setError(getErrorMessage(err, '加载失败'));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getMyBooks();
      setBooks(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, '加载失败'));
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({item}: {item: Book}) => (
    <View style={styles.bookItem}>
      <Text style={styles.bookIcon}>📚</Text>
      <View style={styles.bookInfo}>
        <Text style={styles.bookName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.bookDesc} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.bookCurrency}>
          {CURRENCY_LABEL[item.defaultCurrency] || item.defaultCurrency}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B7DD8" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (books.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>暂无账本</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={books}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          accessibilityLabel="返回">
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>账本管理</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.body}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3B7DD8',
  },
  backBtn: {fontSize: 32, color: '#fff', lineHeight: 34},
  title: {fontSize: 17, fontWeight: '700', color: '#fff'},
  placeholder: {width: 32},
  body: {
    flex: 1,
    backgroundColor: '#F2F4F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  list: {paddingHorizontal: 16},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  bookIcon: {fontSize: 28, marginRight: 14},
  bookInfo: {flex: 1},
  bookName: {fontSize: 16, fontWeight: '600', color: '#333'},
  bookDesc: {fontSize: 13, color: '#999', marginTop: 3},
  bookCurrency: {fontSize: 12, color: '#3B7DD8', marginTop: 4},
  arrow: {fontSize: 22, color: '#ccc'},
  errorText: {fontSize: 14, color: '#E74C3C', marginBottom: 12},
  retryBtn: {
    backgroundColor: '#3B7DD8',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {color: '#fff', fontSize: 14, fontWeight: '600'},
  emptyText: {fontSize: 14, color: '#B0B8C4'},
});

export default BookManageScreen;
