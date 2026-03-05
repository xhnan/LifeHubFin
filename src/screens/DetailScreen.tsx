import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  SectionList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  getTransactionDetails,
  DailyGroup,
  TransactionItem,
} from '../services/transaction';
import {getMyBooks} from '../services/book';
import IconifyIcon from '../components/IconifyIcon';
import MonthPicker, {createQuickOptions} from '../components/MonthPicker';

const SCREEN_W = Dimensions.get('window').width;

/** 获取月份的起止日期 */
const getMonthRange = (year: number, month: number) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return {start, end};
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const DetailScreen = () => {
  const navigation = useNavigation<any>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pickerVisible, setPickerVisible] = useState(false);

  const [bookId, setBookId] = useState<number | null>(null);
  const [dailyGroups, setDailyGroups] = useState<DailyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const balance = totalIncome - totalExpense;

  // 初始化：获取第一个账本
  useEffect(() => {
    getMyBooks()
      .then(books => {
        if (books.length > 0) {
          setBookId(books[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // 拉取交易明细
  const fetchDetails = useCallback(async () => {
    if (!bookId) return;
    const {start, end} = getMonthRange(year, month);
    try {
      const result = await getTransactionDetails({
        bookId,
        startDate: start,
        endDate: end,
        pageNum: 1,
        pageSize: 100,
      });
      setDailyGroups(result.dailyGroups || []);
      // 汇总月收入/支出
      let inc = 0;
      let exp = 0;
      (result.dailyGroups || []).forEach(g => {
        inc += g.dailyIncome;
        exp += g.dailyExpense;
      });
      setTotalIncome(inc);
      setTotalExpense(exp);
    } catch {
      setDailyGroups([]);
      setTotalIncome(0);
      setTotalExpense(0);
    }
  }, [bookId, year, month]);

  // 当bookId或currentDate变化时查询数据（currentDate变化会导致year/month变化）
  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    fetchDetails().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, currentDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetails();
    setRefreshing(false);
  };

  const changeMonth = useCallback(
    (offset: number) => {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() + offset);
      setCurrentDate(next);
    },
    [currentDate],
  );

  const handleMonthSelect = useCallback(
    (selectedYear: number, selectedMonth: number) => {
      setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
      setPickerVisible(false);
    },
    [],
  );

  const openPicker = useCallback(() => {
    setPickerVisible(true);
  }, []);

  // SectionList 数据
  const sections = dailyGroups.map(group => ({
    date: group.date,
    dailyIncome: group.dailyIncome,
    dailyExpense: group.dailyExpense,
    data: group.transactions,
  }));

  const renderTransaction = ({item}: {item: TransactionItem}) => {
    const isExpense = item.transType === 'EXPENSE';
    const amountStr = isExpense
      ? `-${Math.abs(item.displayAmount).toFixed(2)}`
      : `+${Math.abs(item.displayAmount).toFixed(2)}`;

    return (
      <TouchableOpacity
        style={styles.transItem}
        onPress={() => navigation.navigate('账单详情', {transaction: item})}
        activeOpacity={0.7}>
        <View style={styles.transIconWrap}>
          <IconifyIcon icon={item.categoryIcon} size={24} color="#3B7DD8" fallback="📌" />
        </View>
        <View style={styles.transInfo}>
          <Text style={styles.transCategory}>{item.categoryName}</Text>
          <View style={styles.transMetaRow}>
            <View style={styles.transAccountRow}>
              <IconifyIcon icon={item.targetAccountIcon} size={12} color="#aaa" fallback="💳" />
              <Text style={styles.transAccount}> {item.targetAccountName}</Text>
            </View>
            <Text style={styles.transTime}>{formatTime(item.transDate)}</Text>
          </View>
        </View>
        <Text style={[styles.transAmount, isExpense ? styles.amountExp : styles.amountInc]}>
          {amountStr}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: {date: string; dailyIncome: number; dailyExpense: number};
  }) => {
    const d = new Date(section.date);
    const weekday = WEEKDAYS[d.getDay()];
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionDate}>
          {section.date} {weekday}
        </Text>
        <View style={styles.sectionStats}>
          {section.dailyIncome > 0 && (
            <Text style={styles.sectionIncome}>
              收 {section.dailyIncome.toFixed(2)}
            </Text>
          )}
          {section.dailyExpense > 0 && (
            <Text style={styles.sectionExpense}>
              支 {section.dailyExpense.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color="#3B7DD8" />
        </View>
      );
    }
    if (sections.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>暂无明细记录</Text>
          <Text style={styles.emptyHint}>点击下方 + 开始记账吧</Text>
        </View>
      );
    }
    return (
      <SectionList
        sections={sections}
        keyExtractor={item => String(item.transId)}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityLabel="上个月">
            <Text style={styles.navArrow}>{'‹'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openPicker} style={styles.dateBtn}>
            <Text style={styles.dateText}>
              {year}.{String(month).padStart(2, '0')}
            </Text>
            <Text style={styles.dateDrop}>▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeMonth(1)}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityLabel="下个月">
            <Text style={styles.navArrow}>{'›'}</Text>
          </TouchableOpacity>

          <View style={styles.topSpacer} />

          <View style={styles.statGroup}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>收入</Text>
              <Text style={styles.statIncome}>+{totalIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>支出</Text>
              <Text style={styles.statExpense}>-{totalExpense.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>本月结余</Text>
          <Text style={styles.balanceValue}>¥ {balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {renderBody()}
        {/* 悬浮按钮组 */}
        <View style={styles.fabGroup}>
          <TouchableOpacity
            style={styles.addFab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('拍照记账')}
            accessibilityLabel="拍照记账">
            <Text style={styles.addFabText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.voiceFab}
            activeOpacity={0.8}
            accessibilityLabel="语音输入">
            <IconifyIcon icon="mdi:microphone" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <MonthPicker
        visible={pickerVisible}
        currentYear={year}
        currentMonth={month}
        onSelect={handleMonthSelect}
        onClose={() => setPickerVisible(false)}
        quickOptions={createQuickOptions()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {
    backgroundColor: '#3B7DD8',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topRow: {flexDirection: 'row', alignItems: 'center'},
  navArrow: {fontSize: 24, color: 'rgba(255,255,255,0.7)', paddingHorizontal: 2},
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  dateText: {fontSize: 15, color: '#fff', fontWeight: '700', letterSpacing: 0.5},
  dateDrop: {fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 4},
  topSpacer: {flex: 1},
  statGroup: {flexDirection: 'row', alignItems: 'center'},
  statItem: {alignItems: 'flex-end'},
  statLabel: {fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1},
  statIncome: {fontSize: 13, fontWeight: '700', color: '#A8E6CF'},
  statExpense: {fontSize: 13, fontWeight: '700', color: '#FFB3B3'},
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 12,
    borderRadius: 1,
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {fontSize: 13, color: 'rgba(255,255,255,0.75)'},
  balanceValue: {fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5},
  body: {
    flex: 1,
    backgroundColor: '#F2F4F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  voiceFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B7DD8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#3B7DD8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGroup: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    alignItems: 'center',
    gap: 12,
  },
  addFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#51CF66',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#51CF66',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addFabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 30,
  },
  listContent: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24},
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionDate: {fontSize: 13, fontWeight: '600', color: '#666'},
  sectionStats: {flexDirection: 'row', gap: 12},
  sectionIncome: {fontSize: 12, color: '#52c41a'},
  sectionExpense: {fontSize: 12, color: '#E74C3C'},
  // Transaction item
  transItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  transIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transInfo: {flex: 1},
  transCategory: {fontSize: 15, fontWeight: '600', color: '#333'},
  transDesc: {fontSize: 12, color: '#999', marginTop: 2},
  transMetaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8},
  transAccountRow: {flexDirection: 'row', alignItems: 'center'},
  transAccount: {fontSize: 11, color: '#aaa'},
  transTime: {fontSize: 11, color: '#ccc'},
  transAmount: {fontSize: 16, fontWeight: '700', marginLeft: 8},
  amountInc: {color: '#52c41a'},
  amountExp: {color: '#333'},
  // Empty
  emptyWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 15, color: '#999', marginBottom: 6},
  emptyHint: {fontSize: 12, color: '#ccc'},
});

export default DetailScreen;
