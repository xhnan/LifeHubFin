import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getMyBooks} from '../services/book';
import {getTransactionDetails, DailyGroup} from '../services/transaction';

const SCREEN_W = Dimensions.get('window').width;
const BAR_AREA_W = SCREEN_W - 80;

const getMonthRange = (year: number, month: number) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return {start, end};
};

type ViewMode = 'overview' | 'daily';

const ChartScreen = () => {
  const [bookId, setBookId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyGroups, setDailyGroups] = useState<DailyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    getMyBooks().then(books => {
      if (books.length > 0) setBookId(books[0].id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchData = useCallback(async () => {
    if (!bookId) return;
    const {start, end} = getMonthRange(year, month);
    try {
      const result = await getTransactionDetails({bookId, startDate: start, endDate: end, pageNum: 1, pageSize: 100});
      setDailyGroups(result.dailyGroups || []);
    } catch { setDailyGroups([]); }
  }, [bookId, year, month]);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [bookId, fetchData]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + offset);
    setCurrentDate(next);
  };

  // 汇总数据
  let totalIncome = 0, totalExpense = 0;
  dailyGroups.forEach(g => { totalIncome += g.dailyIncome; totalExpense += g.dailyExpense; });
  const total = totalIncome + totalExpense;
  const incPct = total > 0 ? (totalIncome / total) * 100 : 0;
  const expPct = total > 0 ? (totalExpense / total) * 100 : 0;

  // 每日数据（用于柱状图）
  const maxDaily = Math.max(...dailyGroups.map(g => Math.max(g.dailyIncome, g.dailyExpense)), 1);

  const renderOverview = () => (
    <View>
      {/* 收支环形概览 */}
      <View style={s.summaryCard}>
        <View style={s.ringRow}>
          <View style={s.ringOuter}>
            <View style={[s.ringInner, {borderColor: totalExpense >= totalIncome ? '#FF6B6B' : '#51CF66'}]}>
              <Text style={s.ringAmount}>¥{(totalIncome - totalExpense).toFixed(0)}</Text>
              <Text style={s.ringLabel}>结余</Text>
            </View>
          </View>
          <View style={s.summaryStats}>
            <View style={s.summaryRow}>
              <View style={[s.dot, {backgroundColor: '#51CF66'}]} />
              <Text style={s.summaryStatLabel}>收入</Text>
              <Text style={s.summaryStatIncome}>¥{totalIncome.toFixed(2)}</Text>
            </View>
            <View style={s.summaryRow}>
              <View style={[s.dot, {backgroundColor: '#FF6B6B'}]} />
              <Text style={s.summaryStatLabel}>支出</Text>
              <Text style={s.summaryStatExpense}>¥{totalExpense.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        {/* 比例条 */}
        <View style={s.ratioBar}>
          <View style={[s.ratioIncome, {flex: incPct || 1}]} />
          <View style={[s.ratioExpense, {flex: expPct || 1}]} />
        </View>
        <View style={s.ratioLabels}>
          <Text style={s.ratioLabelInc}>收入 {incPct.toFixed(0)}%</Text>
          <Text style={s.ratioLabelExp}>支出 {expPct.toFixed(0)}%</Text>
        </View>
      </View>

      {/* 每日趋势 */}
      <View style={s.trendCard}>
        <Text style={s.trendTitle}>每日趋势</Text>
        {dailyGroups.length === 0 ? (
          <Text style={s.emptyText}>暂无数据</Text>
        ) : (
          dailyGroups.map((g, i) => {
            const day = g.date.slice(8);
            const incW = (g.dailyIncome / maxDaily) * BAR_AREA_W;
            const expW = (g.dailyExpense / maxDaily) * BAR_AREA_W;
            return (
              <View key={`${g.date}_${i}`} style={s.barRow}>
                <Text style={s.barDay}>{day}日</Text>
                <View style={s.barArea}>
                  {g.dailyIncome > 0 && <View style={[s.barIncome, {width: Math.max(incW, 4)}]} />}
                  {g.dailyExpense > 0 && <View style={[s.barExpense, {width: Math.max(expW, 4)}]} />}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  const renderDaily = () => (
    <View>
      {dailyGroups.length === 0 ? (
        <View style={s.emptyWrap}><Text style={s.emptyIcon}>📊</Text><Text style={s.emptyText}>暂无数据</Text></View>
      ) : (
        dailyGroups.map((g, i) => (
          <View key={`${g.date}_${i}`} style={s.dailyCard}>
            <View style={s.dailyHeader}>
              <Text style={s.dailyDate}>{g.date}</Text>
              <View style={s.dailyStats}>
                {g.dailyIncome > 0 && <Text style={s.dailyInc}>+{g.dailyIncome.toFixed(2)}</Text>}
                {g.dailyExpense > 0 && <Text style={s.dailyExp}>-{g.dailyExpense.toFixed(2)}</Text>}
              </View>
            </View>
            <View style={s.dailyBarWrap}>
              <View style={s.dailyBarBg}>
                {g.dailyIncome > 0 && <View style={[s.dailyBarInc, {flex: g.dailyIncome}]} />}
                {g.dailyExpense > 0 && <View style={[s.dailyBarExp, {flex: g.dailyExpense}]} />}
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={s.header}>
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={s.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.navDate}>{year}年{month}月</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={s.viewToggle}>
          <TouchableOpacity style={[s.viewTab, viewMode === 'overview' && s.viewTabActive]} onPress={() => setViewMode('overview')}>
            <Text style={[s.viewTabText, viewMode === 'overview' && s.viewTabTextActive]}>概览</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.viewTab, viewMode === 'daily' && s.viewTabActive]} onPress={() => setViewMode('daily')}>
            <Text style={[s.viewTabText, viewMode === 'daily' && s.viewTabTextActive]}>每日</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.emptyWrap}><ActivityIndicator size="large" color="#3B7DD8" /></View>
        ) : viewMode === 'overview' ? renderOverview() : renderDaily()}
        <View style={{height: 30}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {backgroundColor: '#3B7DD8', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16},
  navRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  navArrow: {fontSize: 24, color: 'rgba(255,255,255,0.7)', paddingHorizontal: 16},
  navDate: {fontSize: 17, fontWeight: '700', color: '#fff'},
  viewToggle: {flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 3},
  viewTab: {flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10},
  viewTabActive: {backgroundColor: '#fff'},
  viewTabText: {fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)'},
  viewTabTextActive: {color: '#3B7DD8'},

  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 24, borderTopRightRadius: 24},
  bodyContent: {padding: 16, paddingTop: 20},

  // Summary card
  summaryCard: {backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  ringRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  ringOuter: {width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center', marginRight: 20},
  ringInner: {width: 84, height: 84, borderRadius: 42, borderWidth: 4, alignItems: 'center', justifyContent: 'center'},
  ringAmount: {fontSize: 18, fontWeight: '800', color: '#1A1A2E'},
  ringLabel: {fontSize: 11, color: '#999', marginTop: 2},
  summaryStats: {flex: 1, gap: 12},
  summaryRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  dot: {width: 8, height: 8, borderRadius: 4},
  summaryStatLabel: {fontSize: 13, color: '#999', width: 36},
  summaryStatIncome: {fontSize: 16, fontWeight: '700', color: '#51CF66'},
  summaryStatExpense: {fontSize: 16, fontWeight: '700', color: '#FF6B6B'},

  ratioBar: {flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F0F2F5'},
  ratioIncome: {backgroundColor: '#51CF66', borderRadius: 4},
  ratioExpense: {backgroundColor: '#FF6B6B', borderRadius: 4},
  ratioLabels: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  ratioLabelInc: {fontSize: 11, color: '#51CF66', fontWeight: '600'},
  ratioLabelExp: {fontSize: 11, color: '#FF6B6B', fontWeight: '600'},

  // Trend
  trendCard: {backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  trendTitle: {fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 16},
  barRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  barDay: {width: 36, fontSize: 12, color: '#999', fontWeight: '500'},
  barArea: {flex: 1, gap: 3},
  barIncome: {height: 6, borderRadius: 3, backgroundColor: '#51CF66'},
  barExpense: {height: 6, borderRadius: 3, backgroundColor: '#FF6B6B'},

  // Daily
  dailyCard: {backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  dailyHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  dailyDate: {fontSize: 14, fontWeight: '600', color: '#333'},
  dailyStats: {flexDirection: 'row', gap: 12},
  dailyInc: {fontSize: 13, fontWeight: '600', color: '#51CF66'},
  dailyExp: {fontSize: 13, fontWeight: '600', color: '#FF6B6B'},
  dailyBarWrap: {height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F0F2F5'},
  dailyBarBg: {flex: 1, flexDirection: 'row', borderRadius: 4, overflow: 'hidden'},
  dailyBarInc: {backgroundColor: '#51CF66'},
  dailyBarExp: {backgroundColor: '#FF6B6B'},

  // Empty
  emptyWrap: {alignItems: 'center', justifyContent: 'center', paddingVertical: 60},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 14, color: '#C8CDD5'},
});

export default ChartScreen;
