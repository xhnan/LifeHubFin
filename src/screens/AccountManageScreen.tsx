import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {updateAccountOrders, Account} from '../services/account';
import {useFinanceStore} from '../store/FinanceStore';

export default function AccountManageScreen() {
  const navigation = useNavigation();
  const {subjectCategories, refreshBookData, selectedBookId} = useFinanceStore();

  const [activeTab, setActiveTab] = useState<'payment' | 'occurrence'>('payment');
  const [dataList, setDataList] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!subjectCategories) return;
    const items =
      activeTab === 'payment'
        ? subjectCategories.expense.paymentSubjects
        : subjectCategories.expense.occurrenceSubjects;
    
    // Sort by sortWeight descending (越大越靠前)
    const sorted = [...items].sort((a, b) => (b.sortWeight ?? 0) - (a.sortWeight ?? 0));
    setDataList(sorted);
    setHasChanges(false);
  }, [subjectCategories, activeTab]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newData = [...dataList];
    const temp = newData[index];
    newData[index] = newData[index - 1];
    newData[index - 1] = temp;
    setDataList(newData);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === dataList.length - 1) return;
    const newData = [...dataList];
    const temp = newData[index];
    newData[index] = newData[index + 1];
    newData[index + 1] = temp;
    setDataList(newData);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedBookId) return;
    setSaving(true);
    try {
      const updates = dataList.map((item, index) => {
        let weight = (dataList.length - index) * 10;
        return {
          id: item.id,
          sortWeight: weight,
        };
      });
      await updateAccountOrders(selectedBookId, updates);
      Alert.alert('成功', '排序已保存');
      await refreshBookData();
      setHasChanges(false);
    } catch (err: any) {
      Alert.alert('保存失败', err.message || '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSort = async () => {
    if (!selectedBookId) return;
    Alert.alert('重置排序', '确定要清除所有自定义排序恢复默认吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '重置',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const updates = dataList.map((item) => ({
              id: item.id,
              sortWeight: null,
            }));
            await updateAccountOrders(selectedBookId, updates);
            Alert.alert('成功', '排序已重置');
            await refreshBookData();
            setHasChanges(false);
          } catch (err: any) {
            Alert.alert('重置失败', err.message || '请稍后重试');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({item, index}: {item: Account; index: number}) => (
    <View style={styles.itemRow}>
      <Text style={styles.itemIcon}>{item.icon || '💳'}</Text>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.fullName && item.fullName !== item.name && (
          <Text style={styles.itemFullName}>{item.fullName}</Text>
        )}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.arrowButton, index === 0 && styles.disabledButton]}
          disabled={index === 0}
          onPress={() => handleMoveUp(index)}>
          <Text style={index === 0 ? styles.disabledArrowText : styles.arrowText}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.arrowButton,
            index === dataList.length - 1 && styles.disabledButton,
          ]}
          disabled={index === dataList.length - 1}
          onPress={() => handleMoveDown(index)}>
          <Text
            style={
              index === dataList.length - 1
                ? styles.disabledArrowText
                : styles.arrowText
            }>
            ↓
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>账户排序</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleResetSort} disabled={saving} style={styles.actionButton}>
            <Text style={[styles.actionText, styles.resetText]}>重置</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasChanges || saving}
            style={styles.actionButton}>
            {saving ? (
              <ActivityIndicator size="small" color="#3B7DD8" />
            ) : (
              <Text style={[styles.actionText, !hasChanges && styles.disabledActionText]}>
                保存
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}>
          <Text
            style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
            支付账户
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'occurrence' && styles.activeTab]}
          onPress={() => setActiveTab('occurrence')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'occurrence' && styles.activeTabText,
            ]}>
            支出分类
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dataList}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无数据</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backText: {
    fontSize: 16,
    color: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#3B7DD8',
    fontWeight: '600',
  },
  resetText: {
    color: '#FF3B30',
  },
  disabledActionText: {
    color: '#A0B9DF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B7DD8',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  activeTabText: {
    color: '#3B7DD8',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemFullName: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
  },
  arrowText: {
    fontSize: 18,
    color: '#3B7DD8',
    fontWeight: '600',
  },
  disabledArrowText: {
    fontSize: 18,
    color: '#CCC',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
});
