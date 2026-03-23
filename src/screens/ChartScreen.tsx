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
import {
  getMonthlyStatistics, MonthlyStatistics,
  getYearlyTrend, MonthTrend,
  getCategoryRank, CategoryItem,
  getTagStatistics, TagStatItem,
  getAccountBalances, AccountBalance,
} from '../services/statistics';
import {
  getTransactionDetails,
  DailyGroup,
} from '../services/transaction';
import IconifyIcon from '../components/IconifyIcon';
import MonthPicker, {createQuickOptions} from '../components/MonthPicker';

const SW = Dimensions.get('window').width;
type Tab = 'overview' | 'category' | 'asset' | 'calendar';

const RANK_COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#74C0FC', '#B197FC', '#E599F7', '#CED4DA'];

const ChartScreen = () => {
  const [bookId, setBookId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  // 数据
  const [monthly, setMonthly] = useState<MonthlyStatistics | null>(null);
  const [yearTrend, setYearTrend] = useState<MonthTrend[]>([]);
  const [expCategories, setExpCategories] = useState<CategoryItem[]>([]);
  const [incCategories, setIncCategories] = useState<CategoryItem[]>([]);
  const [expTotal, setExpTotal] = useState(0);
  const [incTotal, setIncTotal] = useState(0);
  const [tagStats, setTagStats] = useState<TagStatItem[]>([]);
  const [tagTotal, setTagTotal] = useState(0);
  const [assets, setAssets] = useState<AccountBalance[]>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [liabilities, setLiabilities] = useState<AccountBalance[]>([]);
  const [liabilityTotal, setLiabilityTotal] = useState(0);
  const [rankType, setRankType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [dailyGroups, setDailyGroups] = useState<DailyGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    getMyBooks().then(books => {
      if (books.length > 0) setBookId(books[0].id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchAll = useCallback(async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const {start, end} = (() => {
        const lastDay = new Date(year, month, 0).getDate();
        return {
          start: `${year}-${String(month).padStart(2, '0')}-01`,
          end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        };
      })();

      const [ms, yt, expR, incR, ts, ab, lb, td] = await Promise.all([
        getMonthlyStatistics(bookId, year, month).catch(() => null),
        getYearlyTrend(bookId, year).catch(() => ({year, months: []} as any)),
        getCategoryRank(bookId, 'EXPENSE', year, month).catch(() => ({total: 0, categories: []} as any)),
        getCategoryRank(bookId, 'INCOME', year, month).catch(() => ({total: 0, categories: []} as any)),
        getTagStatistics(bookId, year, month).catch(() => ({total: 0, tags: []} as any)),
        getAccountBalances(bookId, 'ASSET').catch(() => ({total: 0, accounts: []} as any)),
        getAccountBalances(bookId, 'LIABILITY').catch(() => ({total: 0, accounts: []} as any)),
        getTransactionDetails({bookId, startDate: start, endDate: end, pageNum: 1, pageSize: 1000}).catch(() => ({dailyGroups: []} as any)),
      ]);
      setMonthly(ms);
      setYearTrend(yt?.months || []);
      setExpCategories(expR?.categories || []); setExpTotal(expR?.total || 0);
      setIncCategories(incR?.categories || []); setIncTotal(incR?.total || 0);
      setTagStats(ts?.tags || []); setTagTotal(ts?.total || 0);
      setAssets(ab?.accounts || []); setAssetTotal(ab?.total || 0);
      setLiabilities(lb?.accounts || []); setLiabilityTotal(lb?.total || 0);
      setDailyGroups(td?.dailyGroups || []);
    } catch {}
    finally { setLoading(false); }
  }, [bookId, year, month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const changeMonth = (offset: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + offset);
    setCurrentDate(d);
  };

  const openPicker = () => setPickerVisible(true);

  const handleMonthSelect = (selectedYear: number, selectedMonth: number) => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  // ── 概览 Tab ──
  const renderOverview = () => {
    const inc = monthly?.totalIncome || 0;
    const exp = monthly?.totalExpense || 0;
    const bal = monthly?.balance || 0;
    const total = inc + exp;
    const incPct = total > 0 ? (inc / total * 100) : 0;
    const expPct = total > 0 ? (exp / total * 100) : 0;
    const maxBar = Math.max(...yearTrend.map(m => Math.max(m.income, m.expense)), 1);

    return (
      <>
        {/* 月度概览卡 */}
        <View style={s.card}>
          <View style={s.overviewRow}>
            <View style={s.overviewItem}>
              <Text style={s.overviewLabel}>收入</Text>
              <Text style={s.overviewInc}>¥{inc.toFixed(2)}</Text>
            </View>
            <View style={s.overviewDivider} />
            <View style={s.overviewItem}>
              <Text style={s.overviewLabel}>支出</Text>
              <Text style={s.overviewExp}>¥{exp.toFixed(2)}</Text>
            </View>
            <View style={s.overviewDivider} />
            <View style={s.overviewItem}>
              <Text style={s.overviewLabel}>结余</Text>
              <Text style={[s.overviewBal, bal < 0 && s.negativeRedText]}>¥{bal.toFixed(2)}</Text>
            </View>
          </View>
          {/* 比例条 */}
          <View style={s.ratioBar}>
            {incPct > 0 && <View style={[s.ratioInc, {flex: incPct}]} />}
            {expPct > 0 && <View style={[s.ratioExp, {flex: expPct}]} />}
          </View>
          <View style={s.ratioLabels}>
            <Text style={s.ratioLabelInc}>收入 {incPct.toFixed(0)}%</Text>
            <Text style={s.ratioLabelExp}>支出 {expPct.toFixed(0)}%</Text>
          </View>
        </View>

        {/* 年度趋势 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📈 {year}年趋势</Text>
          <View style={s.trendLegend}>
            <View style={s.legendItem}><View style={[s.legendDot, s.legendDotIncome]} /><Text style={s.legendText}>收入</Text></View>
            <View style={s.legendItem}><View style={[s.legendDot, s.legendDotExpense]} /><Text style={s.legendText}>支出</Text></View>
          </View>
          {yearTrend.length > 0 ? yearTrend.map(m => {
            const incW = Math.max((m.income / maxBar) * (SW - 180), 2);
            const expW = Math.max((m.expense / maxBar) * (SW - 180), 2);
            const isCurrent = m.month === month;
            return (
              <View key={m.month} style={[s.trendRow, isCurrent && s.trendRowCurrent]}>
                <Text style={[s.trendMonth, isCurrent && s.trendMonthCurrent]}>{m.month}月</Text>
                <View style={s.trendBars}>
                  {m.income > 0 && <View style={[s.trendBarInc, {width: incW}]} />}
                  {m.expense > 0 && <View style={[s.trendBarExp, {width: expW}]} />}
                </View>
                <View style={s.trendValues}>
                  {m.income > 0 && <Text style={[s.trendValueInc, isCurrent && s.trendValueCurrent]}>¥{m.income.toFixed(0)}</Text>}
                  {m.expense > 0 && <Text style={[s.trendValueExp, isCurrent && s.trendValueCurrent]}>¥{m.expense.toFixed(0)}</Text>}
                </View>
              </View>
            );
          }) : <Text style={s.emptyText}>暂无数据</Text>}
        </View>

        {/* 标签统计 */}
        {tagStats.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🏷️ 标签统计</Text>
            <Text style={s.cardSubtitle}>共 ¥{tagTotal.toFixed(2)}</Text>
            {tagStats.map((t, i) => (
              <View key={t.tagId} style={s.tagRow}>
                <View style={[s.tagDot, {backgroundColor: t.color || RANK_COLORS[i % RANK_COLORS.length]}]} />
                <Text style={s.tagName}>{t.tagName}</Text>
                <Text style={s.tagCount}>{t.count}笔</Text>
                <Text style={s.tagAmount}>¥{t.amount.toFixed(2)}</Text>
                <Text style={s.tagPct}>{t.percentage.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── 分类排行 Tab ──
  const renderCategory = () => {
    const cats = rankType === 'EXPENSE' ? expCategories : incCategories;
    const total = rankType === 'EXPENSE' ? expTotal : incTotal;
    const maxAmt = cats.length > 0 ? cats[0].amount : 1;

    return (
      <>
        {/* 收支切换 */}
        <View style={s.rankToggle}>
          <TouchableOpacity style={[s.rankTab, rankType === 'EXPENSE' && s.rankTabActiveExp]} onPress={() => setRankType('EXPENSE')}>
            <Text style={[s.rankTabText, rankType === 'EXPENSE' && s.rankTabTextActive]}>支出排行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.rankTab, rankType === 'INCOME' && s.rankTabActiveInc]} onPress={() => setRankType('INCOME')}>
            <Text style={[s.rankTabText, rankType === 'INCOME' && s.rankTabTextActive]}>收入排行</Text>
          </TouchableOpacity>
        </View>

        {/* 总额 */}
        <View style={s.card}>
          <View style={s.rankTotalRow}>
            <Text style={s.rankTotalLabel}>{rankType === 'EXPENSE' ? '总支出' : '总收入'}</Text>
            <Text style={[s.rankTotalAmount, rankType === 'EXPENSE' ? s.rankTotalAmountExpense : s.rankTotalAmountIncome]}>
              ¥{total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 分类列表 */}
        {cats.length > 0 ? cats.map((c, i) => {
          const color = RANK_COLORS[i % RANK_COLORS.length];
          const rankColorStyle = i < 3 ? {color} : undefined;
          const barW = Math.max((c.amount / maxAmt) * 100, 3);
          return (
            <View key={`${c.accountId}_${i}`} style={s.card}>
              <View style={s.catRow}>
                <View style={s.catRank}>
                  <Text style={[s.catRankNum, rankColorStyle]}>{i + 1}</Text>
                </View>
                <View style={s.catIconWrap}>
                  <IconifyIcon icon={c.accountIcon} size={20} color={color} fallback="📁" />
                </View>
                <View style={s.catInfo}>
                  <View style={s.catNameRow}>
                    <Text style={s.catName}>{c.accountName}</Text>
                    <Text style={s.catAmount}>¥{c.amount.toFixed(2)}</Text>
                  </View>
                  <View style={s.catBarBg}>
                    <View style={[s.catBarFill, {width: `${barW}%`, backgroundColor: color}]} />
                  </View>
                  <Text style={s.catPct}>{c.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          );
        }) : (
          <View style={s.emptyWrap}><Text style={s.emptyIcon}>📊</Text><Text style={s.emptyText}>暂无分类数据</Text></View>
        )}
      </>
    );
  };

  // ── 资产 Tab ──
  const renderAsset = () => {
    const netWorth = assetTotal - liabilityTotal;
    return (
      <>
        {/* 净资产卡 */}
        <View style={s.netWorthCard}>
          <Text style={s.netWorthLabel}>净资产</Text>
          <Text style={[s.netWorthAmount, netWorth < 0 && s.negativeRedText]}>
            ¥{netWorth.toFixed(2)}
          </Text>
          <View style={s.netWorthRow}>
            <View style={s.netWorthItem}>
              <Text style={s.netWorthItemLabel}>总资产</Text>
              <Text style={s.netWorthItemInc}>¥{assetTotal.toFixed(2)}</Text>
            </View>
            <View style={s.netWorthSep} />
            <View style={s.netWorthItem}>
              <Text style={s.netWorthItemLabel}>总负债</Text>
              <Text style={s.netWorthItemExp}>¥{liabilityTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* 资产列表 */}
        {assets.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🏦 资产账户</Text>
            {assets.map((a, i) => (
              <View key={`a_${a.accountId}_${i}`}>
                {i > 0 && <View style={s.listDivider} />}
                <View style={s.balanceRow}>
                  <View style={s.balanceIconWrap}>
                    <IconifyIcon icon={a.accountIcon} size={20} color="#339AF0" fallback="🏦" />
                  </View>
                  <Text style={s.balanceName}>{a.accountName}</Text>
                  <Text style={s.balanceAmount}>¥{a.balance.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 负债列表 */}
        {liabilities.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>💳 负债账户</Text>
            {liabilities.map((a, i) => (
              <View key={`l_${a.accountId}_${i}`}>
                {i > 0 && <View style={s.listDivider} />}
                <View style={s.balanceRow}>
                  <View style={[s.balanceIconWrap, s.balanceIconWrapLiability]}>
                    <IconifyIcon icon={a.accountIcon} size={20} color="#FF6B6B" fallback="💳" />
                  </View>
                  <Text style={s.balanceName}>{a.accountName}</Text>
                  <Text style={[s.balanceAmount, s.balanceAmountExpense]}>¥{a.balance.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {assets.length === 0 && liabilities.length === 0 && (
          <View style={s.emptyWrap}><Text style={s.emptyIcon}>🏦</Text><Text style={s.emptyText}>暂无资产数据</Text></View>
        )}
      </>
    );
  };

  // ── 日历 Tab ──
  const renderCalendar = () => {
    // 获取当月日历
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=周日, 1=周一, ...

    // 创建每日数据映射
    const dailyMap = new Map<string, {income: number; expense: number; count: number}>();
    dailyGroups.forEach(g => {
      dailyMap.set(g.date, {
        income: g.dailyIncome,
        expense: g.dailyExpense,
        count: g.transactions.length,
      });
    });

    // 计算日历网格 - 按周分组
    const calendarWeeks: Array<Array<Date | null>> = [];
    let currentWeek: Array<Date | null> = [];

    // 填充月初空白 - getDay() 返回 0-6，0是周日
    const emptySlots = startDayOfWeek;
    for (let i = 0; i < emptySlots; i++) {
      currentWeek.push(null);
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month - 1, day));
      if (currentWeek.length === 7) {
        calendarWeeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // 填充月末空白
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      calendarWeeks.push(currentWeek);
    }

    const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <>
        {/* 月度汇总 */}
        <View style={s.calendarSummary}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>总收入</Text>
            <Text style={s.summaryInc}>¥{(monthly?.totalIncome || 0).toFixed(2)}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>总支出</Text>
            <Text style={s.summaryExp}>¥{(monthly?.totalExpense || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* 日历 */}
        <View style={s.card}>
          <View style={s.calendarHeader}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={s.weekdayCell}>
                <Text style={s.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>
          {calendarWeeks.map((week, weekIndex) => (
            <View key={weekIndex} style={s.calendarWeek}>
              {week.map((date, dayIndex) => {
                if (!date) {
                  return <View key={`empty_${weekIndex}_${dayIndex}`} style={s.calendarDayEmpty} />;
                }

                const day = date.getDate();
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const data = dailyMap.get(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toDateString() === date.toDateString();

                // 计算样式：选中状态优先，今天状态作为辅助
                const dayStyle = [
                  s.calendarDay,
                  isSelected && s.calendarDaySelected,
                  // 如果今天但未选中，显示绿色边框
                  isToday && !isSelected && s.calendarDayToday,
                ];

                const numberStyle = [
                  s.dayNumber,
                  isToday && s.dayNumberToday,
                  isSelected && s.dayNumberSelected,
                ];

                return (
                  <TouchableOpacity
                    key={`${weekIndex}_${day}`}
                    style={dayStyle}
                    onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                    activeOpacity={0.7}>
                    <Text style={numberStyle}>{day}</Text>
                    {data && data.count > 0 ? (
                      <View style={s.dayAmounts}>
                        {data.income > 0 && (
                          <Text style={[s.dayIncomeAmount, isSelected && s.dayAmountTextSelected]} numberOfLines={1}>
                            ¥{data.income >= 1000 ? (data.income / 1000).toFixed(1) + 'k' : data.income.toFixed(0)}
                          </Text>
                        )}
                        {data.expense > 0 && (
                          <Text style={[s.dayExpenseAmount, isSelected && s.dayAmountTextSelected]} numberOfLines={1}>
                            ¥{data.expense >= 1000 ? (data.expense / 1000).toFixed(1) + 'k' : data.expense.toFixed(0)}
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* 图例 */}
          <View style={s.calendarLegend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, s.legendDotIncome]} />
              <Text style={s.legendText}>收入</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, s.legendDotExpense]} />
              <Text style={s.legendText}>支出</Text>
            </View>
          </View>
        </View>

        {/* 选中日期详情 */}
        {selectedDate && dailyMap.has(selectedDate) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📅 {selectedDate} 详情</Text>
            {(() => {
              const data = dailyMap.get(selectedDate)!;
              const dayGroup = dailyGroups.find(g => g.date === selectedDate);
              return (
                <>
                  <View style={s.dateDetailRow}>
                    <Text style={s.dateDetailLabel}>收入</Text>
                    <Text style={s.dateDetailInc}>¥{data.income.toFixed(2)}</Text>
                  </View>
                  <View style={s.dateDetailRow}>
                    <Text style={s.dateDetailLabel}>支出</Text>
                    <Text style={s.dateDetailExp}>¥{data.expense.toFixed(2)}</Text>
                  </View>
                  <View style={s.dateDetailRow}>
                    <Text style={s.dateDetailLabel}>结余</Text>
                    <Text style={[s.dateDetailBal, (data.income - data.expense) < 0 && s.negativeRedText]}>
                      ¥{(data.income - data.expense).toFixed(2)}
                    </Text>
                  </View>
                  <View style={s.dateDetailRow}>
                    <Text style={s.dateDetailLabel}>笔数</Text>
                    <Text style={s.dateDetailCount}>{data.count} 笔</Text>
                  </View>

                  {/* 交易列表 */}
                  {dayGroup && dayGroup.transactions.length > 0 && (
                    <View style={s.transactionList}>
                      {dayGroup.transactions.map((t, i) => (
                        <View key={t.transId || i} style={s.transactionItem}>
                          <View style={s.transIcon}>
                            <IconifyIcon icon={t.categoryIcon} size={16} color="#3B7DD8" fallback="📌" />
                          </View>
                          <View style={s.transInfo}>
                            <Text style={s.transCategory}>{t.categoryName}</Text>
                            <Text style={s.transAccount}>{t.targetAccountName}</Text>
                          </View>
                          <Text style={[s.transAmount, t.transType === 'EXPENSE' ? s.transAmountExp : s.transAmountInc]}>
                            {t.transType === 'EXPENSE' ? '-' : '+'}¥{t.displayAmount.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        )}
      </>
    );
  };

  // ── 主渲染 ──
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={s.header}>
        {/* 月份导航 */}
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={s.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openPicker} style={s.dateBtn} activeOpacity={0.7}>
            <Text style={s.navDate}>{year}年{month}月</Text>
            <Text style={s.dateDrop}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
        {/* Tab 切换 */}
        <View style={s.tabBar}>
          {([
            {key: 'overview' as Tab, label: '概览', icon: '📊'},
            {key: 'category' as Tab, label: '分类', icon: '🏷️'},
            {key: 'calendar' as Tab, label: '日历', icon: '📅'},
            {key: 'asset' as Tab, label: '资产', icon: '🏦'},
          ]).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabItem, tab === t.key && s.tabItemActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}>
              <Text style={s.tabIcon}>{t.icon}</Text>
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.emptyWrap}><ActivityIndicator size="large" color="#3B7DD8" /></View>
        ) : tab === 'overview' ? renderOverview() : tab === 'category' ? renderCategory() : tab === 'calendar' ? renderCalendar() : renderAsset()}
        <View style={s.bottomSpacer} />
      </ScrollView>

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

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  header: {backgroundColor: '#3B7DD8', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16},
  navRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  navArrow: {fontSize: 26, color: 'rgba(255,255,255,0.6)', paddingHorizontal: 20, fontWeight: '300'},
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  navDate: {fontSize: 17, fontWeight: '700', color: '#fff'},
  dateDrop: {fontSize: 10, color: 'rgba(255,255,255,0.6)', marginLeft: 6},

  tabBar: {flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 3, gap: 3},
  tabItem: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, gap: 4},
  tabItemActive: {backgroundColor: '#fff'},
  tabIcon: {fontSize: 14},
  tabLabel: {fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)'},
  tabLabelActive: {color: '#3B7DD8'},

  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 24, borderTopRightRadius: 24},
  bodyContent: {padding: 16, paddingTop: 20},

  // Card
  card: {backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  cardTitle: {fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14},
  cardSubtitle: {fontSize: 12, color: '#999', marginTop: -10, marginBottom: 14},

  // Overview
  overviewRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 18},
  overviewItem: {flex: 1, alignItems: 'center'},
  overviewDivider: {width: 1, height: 32, backgroundColor: '#F0F2F5'},
  overviewLabel: {fontSize: 12, color: '#999', marginBottom: 6},
  overviewInc: {fontSize: 17, fontWeight: '800', color: '#51CF66'},
  overviewExp: {fontSize: 17, fontWeight: '800', color: '#FF6B6B'},
  overviewBal: {fontSize: 17, fontWeight: '800', color: '#339AF0'},
  negativeRedText: {color: '#FF6B6B'},

  ratioBar: {flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F0F2F5'},
  ratioInc: {backgroundColor: '#51CF66'},
  ratioExp: {backgroundColor: '#FF6B6B'},
  ratioLabels: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  ratioLabelInc: {fontSize: 11, color: '#51CF66', fontWeight: '600'},
  ratioLabelExp: {fontSize: 11, color: '#FF6B6B', fontWeight: '600'},

  // Trend
  trendLegend: {flexDirection: 'row', gap: 16, marginBottom: 12},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendDotIncome: {backgroundColor: '#51CF66'},
  legendDotExpense: {backgroundColor: '#FF6B6B'},
  legendText: {fontSize: 12, color: '#999'},
  trendRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 5},
  trendRowCurrent: {backgroundColor: '#F0F6FF', borderRadius: 8, marginHorizontal: -8, paddingHorizontal: 8},
  trendMonth: {width: 32, fontSize: 12, color: '#999', fontWeight: '500'},
  trendMonthCurrent: {color: '#3B7DD8', fontWeight: '700'},
  trendBars: {flex: 1, gap: 2, marginRight: 8},
  trendBarInc: {height: 5, borderRadius: 3, backgroundColor: '#51CF66'},
  trendBarExp: {height: 5, borderRadius: 3, backgroundColor: '#FF6B6B'},
  trendValues: {width: 70, alignItems: 'flex-end', gap: 2},
  trendValueInc: {fontSize: 11, fontWeight: '600', color: '#51CF66'},
  trendValueExp: {fontSize: 11, fontWeight: '600', color: '#FF6B6B'},
  trendValueCurrent: {fontWeight: '800'},

  // Tags
  tagRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10},
  tagDot: {width: 10, height: 10, borderRadius: 5},
  tagName: {flex: 1, fontSize: 14, fontWeight: '500', color: '#333'},
  tagCount: {fontSize: 12, color: '#C8CDD5', width: 36},
  tagAmount: {fontSize: 14, fontWeight: '600', color: '#1A1A2E', width: 90, textAlign: 'right'},
  tagPct: {fontSize: 12, color: '#999', width: 44, textAlign: 'right'},

  // Category rank
  rankToggle: {flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 3, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  rankTab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12},
  rankTabActiveExp: {backgroundColor: '#FF6B6B'},
  rankTabActiveInc: {backgroundColor: '#51CF66'},
  rankTabText: {fontSize: 14, fontWeight: '600', color: '#999'},
  rankTabTextActive: {color: '#fff'},
  rankTotalRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  rankTotalLabel: {fontSize: 14, color: '#999'},
  rankTotalAmount: {fontSize: 22, fontWeight: '800'},
  rankTotalAmountExpense: {color: '#FF6B6B'},
  rankTotalAmountIncome: {color: '#51CF66'},

  catRow: {flexDirection: 'row', alignItems: 'center'},
  catRank: {width: 24, alignItems: 'center'},
  catRankNum: {fontSize: 14, fontWeight: '800', color: '#CED4DA'},
  catIconWrap: {width: 36, height: 36, borderRadius: 12, backgroundColor: '#F5F6F8', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10},
  catInfo: {flex: 1},
  catNameRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  catName: {fontSize: 14, fontWeight: '600', color: '#333'},
  catAmount: {fontSize: 14, fontWeight: '700', color: '#1A1A2E'},
  catBarBg: {height: 6, borderRadius: 3, backgroundColor: '#F0F2F5', overflow: 'hidden', marginBottom: 4},
  catBarFill: {height: 6, borderRadius: 3},
  catPct: {fontSize: 11, color: '#C8CDD5'},

  // Asset
  netWorthCard: {backgroundColor: '#3B7DD8', borderRadius: 20, padding: 24, marginBottom: 12, alignItems: 'center'},
  netWorthLabel: {fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6},
  netWorthAmount: {fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 16},
  netWorthRow: {flexDirection: 'row', alignItems: 'center', width: '100%'},
  netWorthItem: {flex: 1, alignItems: 'center'},
  netWorthSep: {width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)'},
  netWorthItemLabel: {fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4},
  netWorthItemInc: {fontSize: 15, fontWeight: '700', color: '#A8E6CF'},
  netWorthItemExp: {fontSize: 15, fontWeight: '700', color: '#FFB3B3'},

  balanceRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 14},
  balanceIconWrap: {width: 36, height: 36, borderRadius: 12, backgroundColor: '#F0F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12},
  balanceIconWrapLiability: {backgroundColor: '#FFF0F0'},
  balanceName: {flex: 1, fontSize: 14, fontWeight: '500', color: '#333'},
  balanceAmount: {fontSize: 15, fontWeight: '700', color: '#1A1A2E'},
  balanceAmountExpense: {color: '#FF6B6B'},
  listDivider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 48},

  // Calendar - 优化版本
  calendarSummary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  summaryItem: {flex: 1, alignItems: 'center'},
  summaryDivider: {width: 1, height: 32, backgroundColor: '#F0F2F5'},
  summaryLabel: {fontSize: 11, color: '#9CA3AF', marginBottom: 5, letterSpacing: 0.3},
  summaryInc: {fontSize: 17, fontWeight: '800', color: '#10B981'},
  summaryExp: {fontSize: 17, fontWeight: '800', color: '#EF4444'},

  calendarHeader: {flexDirection: 'row', marginBottom: 10, paddingHorizontal: 4},
  weekdayCell: {flex: 1, height: 28, alignItems: 'center', justifyContent: 'center'},
  weekdayText: {fontSize: 13, fontWeight: '600', color: '#9CA3AF'},
  calendarWeek: {flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4},
  calendarDayEmpty: {flex: 1, height: 72},
  calendarDay: {
    flex: 1,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    margin: 2,
  },
  // 选中状态：蓝色边框 + 浅蓝色背景，保持内容可读性
  calendarDaySelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B7DD8',
    shadowColor: '#3B7DD8',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  // 今天状态：绿色边框（可与选中状态叠加）
  calendarDayToday: {
    borderColor: '#10B981',
  },
  // 日期数字样式
  dayNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 5,
  },
  // 今天的日期数字颜色
  dayNumberToday: {
    color: '#059669',
  },
  // 选中的日期数字颜色
  dayNumberSelected: {
    color: '#3B7DD8',
    fontWeight: '800',
  },
  dayAmounts: {
    alignItems: 'center',
    gap: 2,
  },
  // 收入金额标签 - 保持颜色语义
  dayIncomeAmount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    minWidth: 32,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  // 支出金额标签 - 保持颜色语义
  dayExpenseAmount: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    minWidth: 32,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  // 选中状态下金额标签保持原样，不改变颜色以保留语义
  dayAmountTextSelected: {},
  dayEmptyAmount: {fontSize: 8, color: '#CBD5E0'},
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  dateDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  dateDetailLabel: {fontSize: 13, color: '#718096', fontWeight: '600'},
  dateDetailInc: {fontSize: 16, fontWeight: '800', color: '#10B981'},
  dateDetailExp: {fontSize: 16, fontWeight: '800', color: '#EF4444'},
  dateDetailBal: {fontSize: 16, fontWeight: '800', color: '#3B82F6'},
  dateDetailCount: {fontSize: 13, color: '#4B5563', fontWeight: '600'},

  transactionList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  transIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transInfo: {flex: 1, marginLeft: 10},
  transCategory: {fontSize: 14, fontWeight: '700', color: '#1F2937'},
  transAccount: {fontSize: 11, color: '#9CA3AF', marginTop: 2},
  transAmount: {fontSize: 15, fontWeight: '800'},
  transAmountInc: {color: '#10B981'},
  transAmountExp: {color: '#EF4444'},

  // Empty
  emptyWrap: {alignItems: 'center', justifyContent: 'center', paddingVertical: 60},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 14, color: '#C8CDD5'},
  bottomSpacer: {height: 30},
});

export default ChartScreen;
