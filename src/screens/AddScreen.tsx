import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getMyBooks, Book} from '../services/book';
import {getAccounts, Account} from '../services/account';
import {getTags, Tag} from '../services/tag';
import {
  createTransaction,
  EntryRequest,
  CreateTransactionRequest,
} from '../services/transaction';

type QuickMode = 'expense' | 'income' | 'transfer' | 'advanced';

interface EntryRow {
  key: string;
  accountId: number | string | null;
  accountName: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  memo: string;
}

let entryKeySeq = 0;
const nextKey = () => `e_${++entryKeySeq}`;

const MODE_CONFIG: {key: QuickMode; label: string; icon: string; color: string}[] = [
  {key: 'expense', label: '支出', icon: '💸', color: '#FF6B6B'},
  {key: 'income', label: '收入', icon: '💰', color: '#51CF66'},
  {key: 'transfer', label: '转账', icon: '🔄', color: '#339AF0'},
  {key: 'advanced', label: '高级', icon: '📋', color: '#845EF7'},
];

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  EXPENSE: '💸 支出',
  INCOME: '💰 收入',
  ASSET: '🏦 资产',
  LIABILITY: '💳 负债',
  EQUITY: '📊 权益',
};

const AddScreen = ({navigation}: any) => {
  const [mode, setMode] = useState<QuickMode>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transDate, setTransDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}`;
  });

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [expenseAccountId, setExpenseAccountId] = useState<number | string | null>(null);
  const [payAccountId, setPayAccountId] = useState<number | string | null>(null);
  const [incomeAccountId, setIncomeAccountId] = useState<number | string | null>(null);
  const [depositAccountId, setDepositAccountId] = useState<number | string | null>(null);
  const [fromAccountId, setFromAccountId] = useState<number | string | null>(null);
  const [toAccountId, setToAccountId] = useState<number | string | null>(null);

  const [entries, setEntries] = useState<EntryRow[]>([
    {key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: ''},
    {key: nextKey(), accountId: null, accountName: '', direction: 'CREDIT', amount: '', memo: ''},
  ]);

  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [accountPickerTarget, setAccountPickerTarget] = useState('');
  const [accountPickerFilter, setAccountPickerFilter] = useState<string[]>([]);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);

  const currentModeConfig = MODE_CONFIG.find(m => m.key === mode)!;

  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (selectedBookId) loadAccountsAndTags(selectedBookId); }, [selectedBookId]);

  const loadBooks = async () => {
    try {
      const data = await getMyBooks();
      setBooks(data);
      if (data.length > 0) setSelectedBookId(data[0].id);
    } catch { Alert.alert('错误', '加载账本失败'); }
    finally { setLoading(false); }
  };

  const loadAccountsAndTags = async (bookId: number) => {
    try {
      const [accs, tgs] = await Promise.all([
        getAccounts(bookId).catch(() => [] as Account[]),
        getTags(bookId).catch(() => [] as Tag[]),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setTags(Array.isArray(tgs) ? tgs : []);
    } catch {}
  };

  const openAccountPicker = (target: string, filterTypes: string[]) => {
    setAccountPickerTarget(target);
    setAccountPickerFilter(filterTypes);
    setAccountPickerVisible(true);
  };

  const onSelectAccount = (account: Account) => {
    setAccountPickerVisible(false);
    const t = accountPickerTarget;
    if (t === 'expense') setExpenseAccountId(account.id);
    else if (t === 'pay') setPayAccountId(account.id);
    else if (t === 'income') setIncomeAccountId(account.id);
    else if (t === 'deposit') setDepositAccountId(account.id);
    else if (t === 'from') setFromAccountId(account.id);
    else if (t === 'to') setToAccountId(account.id);
    else if (t.startsWith('entry_')) {
      const idx = parseInt(t.replace('entry_', ''), 10);
      setEntries(prev => prev.map((e, i) => i === idx ? {...e, accountId: account.id, accountName: account.name} : e));
    }
  };

  const getAccountName = (id: number | string | null) => {
    if (!id) return '';
    return accounts.find(a => String(a.id) === String(id))?.name || '';
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.includes(tagId) ? prev.filter(i => i !== tagId) : [...prev, tagId]);
  };

  const addEntry = () => {
    setEntries(prev => [...prev, {key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: ''}]);
  };

  const removeEntry = (idx: number) => {
    if (entries.length <= 2) { Alert.alert('提示', '至少需要2条分录'); return; }
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = (idx: number, field: keyof EntryRow, value: any) => {
    setEntries(prev => prev.map((e, i) => (i === idx ? {...e, [field]: value} : e)));
  };

  const leafAccounts = (() => {
    const parentIds = new Set(accounts.map(a => String(a.parentId)).filter(s => s && s !== 'null'));
    const leaves = (accountPickerFilter.length > 0
      ? accounts.filter(a => accountPickerFilter.includes(a.accountType))
      : accounts
    ).filter(a => !parentIds.has(String(a.id)));
    const seen = new Set<string>();
    return leaves.filter(a => { const k = String(a.id); if (seen.has(k)) return false; seen.add(k); return true; });
  })();

  const buildEntries = (): EntryRequest[] | null => {
    if (mode === 'advanced') {
      for (const e of entries) {
        if (!e.accountId) { Alert.alert('提示', '请为所有分录选择科目'); return null; }
        if (!e.amount || parseFloat(e.amount) <= 0) { Alert.alert('提示', '分录金额必须为正数'); return null; }
      }
      let debitSum = 0, creditSum = 0;
      entries.forEach(e => { const v = parseFloat(e.amount) || 0; e.direction === 'DEBIT' ? debitSum += v : creditSum += v; });
      if (Math.abs(debitSum - creditSum) > 0.001) {
        Alert.alert('借贷不平衡', `借方 ${debitSum.toFixed(2)} ≠ 贷方 ${creditSum.toFixed(2)}`);
        return null;
      }
      return entries.map(e => ({accountId: e.accountId!, direction: e.direction, amount: parseFloat(e.amount).toFixed(2), memo: e.memo || undefined} as EntryRequest));
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('提示', '请输入有效金额'); return null; }
    const amtStr = amt.toFixed(2);
    if (mode === 'expense') {
      if (!expenseAccountId || !payAccountId) { Alert.alert('提示', '请选择支出科目和付款账户'); return null; }
      return [{accountId: expenseAccountId, direction: 'DEBIT' as const, amount: amtStr}, {accountId: payAccountId, direction: 'CREDIT' as const, amount: amtStr}] as EntryRequest[];
    }
    if (mode === 'income') {
      if (!incomeAccountId || !depositAccountId) { Alert.alert('提示', '请选择收入科目和收款账户'); return null; }
      return [{accountId: depositAccountId, direction: 'DEBIT' as const, amount: amtStr}, {accountId: incomeAccountId, direction: 'CREDIT' as const, amount: amtStr}] as EntryRequest[];
    }
    if (mode === 'transfer') {
      if (!fromAccountId || !toAccountId) { Alert.alert('提示', '请选择转出和转入账户'); return null; }
      return [{accountId: toAccountId, direction: 'DEBIT' as const, amount: amtStr}, {accountId: fromAccountId, direction: 'CREDIT' as const, amount: amtStr}] as EntryRequest[];
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!selectedBookId) { Alert.alert('提示', '请先选择账本'); return; }
    if (!description.trim()) { Alert.alert('提示', '请输入交易描述'); return; }
    const builtEntries = buildEntries();
    if (!builtEntries) return;
    const req: CreateTransactionRequest = {
      transDate: transDate.replace(' ', 'T') + ':00',
      description: description.trim(),
      bookId: selectedBookId,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      entries: builtEntries,
    };
    setSubmitting(true);
    try {
      await createTransaction(req);
      Alert.alert('✅ 记账成功', description.trim(), [
        {text: '继续记账', onPress: resetForm},
        {text: '返回', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) { Alert.alert('记账失败', err.message || '请稍后重试'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setDescription(''); setAmount(''); setSelectedTagIds([]);
    setExpenseAccountId(null); setPayAccountId(null);
    setIncomeAccountId(null); setDepositAccountId(null);
    setFromAccountId(null); setToAccountId(null);
    setEntries([
      {key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: ''},
      {key: nextKey(), accountId: null, accountName: '', direction: 'CREDIT', amount: '', memo: ''},
    ]);
  };

  const selectedBook = books.find(b => b.id === selectedBookId);

  // ── 科目选择弹窗 ──
  const renderAccountPicker = () => {
    const grouped = leafAccounts.reduce<Record<string, Account[]>>((acc, item) => {
      const t = item.accountType;
      if (!acc[t]) acc[t] = [];
      acc[t].push(item);
      return acc;
    }, {});
    return (
      <Modal visible={accountPickerVisible} transparent animationType="slide">
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setAccountPickerVisible(false)}>
          <View style={st.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={st.modalHandle} />
            <Text style={st.modalTitle}>选择科目</Text>
            <ScrollView style={st.modalScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(grouped).map(([type, accs]) => (
                <View key={type} style={st.accountGroup}>
                  <Text style={st.accountGroupTitle}>{ACCOUNT_TYPE_LABEL[type] || type}</Text>
                  <View style={st.accountGrid}>
                    {accs.map((acc, i) => (
                      <TouchableOpacity key={`${type}_${i}_${acc.id}`} style={st.accountChip} onPress={() => onSelectAccount(acc)} activeOpacity={0.6}>
                        <Text style={st.accountChipIcon}>{acc.icon && acc.icon.includes(':') ? '📁' : (acc.icon || '📁')}</Text>
                        <Text style={st.accountChipText} numberOfLines={1}>{acc.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {leafAccounts.length === 0 && <Text style={st.emptyHint}>暂无可选科目</Text>}
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ── 账本选择弹窗 ──
  const renderBookPicker = () => (
    <Modal visible={bookPickerVisible} transparent animationType="fade">
      <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setBookPickerVisible(false)}>
        <View style={st.bookPickerCard} onStartShouldSetResponder={() => true}>
          <View style={st.modalHandle} />
          <Text style={st.modalTitle}>选择账本</Text>
          {books.map(b => (
            <TouchableOpacity
              key={b.id}
              style={[st.bookItem, b.id === selectedBookId && st.bookItemActive]}
              onPress={() => { setSelectedBookId(b.id); setBookPickerVisible(false); }}
              activeOpacity={0.6}>
              <Text style={st.bookItemIcon}>📒</Text>
              <Text style={[st.bookItemText, b.id === selectedBookId && st.bookItemTextActive]}>{b.name}</Text>
              {b.id === selectedBookId && <Text style={st.bookCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ── 科目选择行 ──
  const AccountRow = ({icon, label, accountId, onPress}: {icon: string; label: string; accountId: number | string | null; onPress: () => void}) => (
    <TouchableOpacity style={st.fieldRow} onPress={onPress} activeOpacity={0.6}>
      <Text style={st.fieldIcon}>{icon}</Text>
      <Text style={st.fieldLabel}>{label}</Text>
      <Text style={[st.fieldValue, !accountId && st.fieldPlaceholder]} numberOfLines={1}>
        {accountId ? getAccountName(accountId) : '请选择'}
      </Text>
      <Text style={st.fieldArrow}>›</Text>
    </TouchableOpacity>
  );

  // ── 快捷模式科目 ──
  const renderQuickAccounts = () => {
    if (mode === 'expense') return (
      <View style={st.card}>
        <AccountRow icon="🏷️" label="支出科目" accountId={expenseAccountId} onPress={() => openAccountPicker('expense', ['EXPENSE'])} />
        <View style={st.divider} />
        <AccountRow icon="💳" label="付款账户" accountId={payAccountId} onPress={() => openAccountPicker('pay', ['ASSET', 'LIABILITY'])} />
      </View>
    );
    if (mode === 'income') return (
      <View style={st.card}>
        <AccountRow icon="🏷️" label="收入科目" accountId={incomeAccountId} onPress={() => openAccountPicker('income', ['INCOME'])} />
        <View style={st.divider} />
        <AccountRow icon="🏦" label="收款账户" accountId={depositAccountId} onPress={() => openAccountPicker('deposit', ['ASSET', 'LIABILITY'])} />
      </View>
    );
    if (mode === 'transfer') return (
      <View style={st.card}>
        <AccountRow icon="📤" label="转出账户" accountId={fromAccountId} onPress={() => openAccountPicker('from', ['ASSET', 'LIABILITY'])} />
        <View style={st.divider} />
        <AccountRow icon="📥" label="转入账户" accountId={toAccountId} onPress={() => openAccountPicker('to', ['ASSET', 'LIABILITY'])} />
      </View>
    );
    return null;
  };

  // ── 高级分录 ──
  const renderAdvancedEntries = () => {
    let debitSum = 0, creditSum = 0;
    entries.forEach(e => { const v = parseFloat(e.amount) || 0; e.direction === 'DEBIT' ? debitSum += v : creditSum += v; });
    const balanced = entries.some(e => e.amount) && Math.abs(debitSum - creditSum) < 0.001;
    return (
      <View>
        <View style={st.balanceBanner}>
          <Text style={st.balanceBannerLabel}>借方</Text>
          <Text style={st.balanceBannerDebit}>¥{debitSum.toFixed(2)}</Text>
          <Text style={[st.balanceBannerEq, balanced ? {color: '#51CF66'} : {color: '#FF6B6B'}]}>
            {balanced ? '=' : '≠'}
          </Text>
          <Text style={st.balanceBannerLabel}>贷方</Text>
          <Text style={st.balanceBannerCredit}>¥{creditSum.toFixed(2)}</Text>
        </View>
        {entries.map((entry, idx) => (
          <View key={entry.key} style={st.entryCard}>
            <View style={st.entryTop}>
              <View style={[st.entryBadge, entry.direction === 'DEBIT' ? {backgroundColor: '#3B7DD8'} : {backgroundColor: '#E67E22'}]}>
                <Text style={st.entryBadgeText}>{entry.direction === 'DEBIT' ? '借' : '贷'}</Text>
              </View>
              <TouchableOpacity
                style={[st.dirToggle, entry.direction === 'DEBIT' && st.dirToggleActive]}
                onPress={() => updateEntry(idx, 'direction', entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT')}>
                <Text style={st.dirToggleText}>切换</Text>
              </TouchableOpacity>
              <View style={{flex: 1}} />
              {entries.length > 2 && (
                <TouchableOpacity onPress={() => removeEntry(idx)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Text style={st.entryRemove}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={st.entryAccountRow} onPress={() => openAccountPicker(`entry_${idx}`, [])}>
              <Text style={st.entryAccountIcon}>📁</Text>
              <Text style={[st.entryAccountName, !entry.accountId && st.fieldPlaceholder]} numberOfLines={1}>
                {entry.accountId ? entry.accountName : '选择科目'}
              </Text>
              <Text style={st.fieldArrow}>›</Text>
            </TouchableOpacity>
            <View style={st.entryInputRow}>
              <View style={st.entryAmountWrap}>
                <Text style={st.entryAmountPrefix}>¥</Text>
                <TextInput style={st.entryAmountInput} placeholder="0.00" placeholderTextColor="#D0D5DD" keyboardType="decimal-pad" value={entry.amount} onChangeText={v => updateEntry(idx, 'amount', v)} />
              </View>
              <TextInput style={st.entryMemoInput} placeholder="备注" placeholderTextColor="#D0D5DD" value={entry.memo} onChangeText={v => updateEntry(idx, 'memo', v)} />
            </View>
          </View>
        ))}
        <TouchableOpacity style={st.addEntryBtn} onPress={addEntry} activeOpacity={0.6}>
          <Text style={st.addEntryIcon}>＋</Text>
          <Text style={st.addEntryText}>添加分录</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── 主渲染 ──
  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={currentModeConfig.color} />
        <View style={st.loadingWrap}><ActivityIndicator size="large" color="#3B7DD8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[st.safe, {backgroundColor: currentModeConfig.color}]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={currentModeConfig.color} />

      {/* 顶栏 */}
      <View style={[st.header, {backgroundColor: currentModeConfig.color}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.headerBtn} activeOpacity={0.6}>
          <Text style={st.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>记一笔</Text>
        <TouchableOpacity onPress={() => setBookPickerVisible(true)} style={st.bookSelector} activeOpacity={0.6}>
          <Text style={st.bookSelectorText}>{selectedBook?.name || '账本'}</Text>
          <Text style={st.bookSelectorArrow}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* 模式切换 */}
      <View style={[st.modeBar, {backgroundColor: currentModeConfig.color}]}>
        {MODE_CONFIG.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[st.modeTab, mode === m.key && st.modeTabActive]}
            onPress={() => setMode(m.key)}
            activeOpacity={0.7}>
            <Text style={st.modeIcon}>{m.icon}</Text>
            <Text style={[st.modeLabel, mode === m.key && st.modeLabelActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={st.body} contentContainerStyle={st.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 金额（快捷模式） */}
          {mode !== 'advanced' && (
            <View style={st.amountCard}>
              <Text style={[st.amountCurrency, {color: currentModeConfig.color}]}>¥</Text>
              <TextInput
                style={st.amountInput}
                placeholder="0.00"
                placeholderTextColor="#D0D5DD"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          )}

          {/* 科目选择 */}
          {mode !== 'advanced' && renderQuickAccounts()}

          {/* 高级分录 */}
          {mode === 'advanced' && renderAdvancedEntries()}

          {/* 详情卡片 */}
          <View style={st.card}>
            <View style={st.fieldRow}>
              <Text style={st.fieldIcon}>📝</Text>
              <Text style={st.fieldLabel}>描述</Text>
              <TextInput
                style={st.fieldInput}
                placeholder="例如：周末超市采购"
                placeholderTextColor="#D0D5DD"
                value={description}
                onChangeText={setDescription}
                maxLength={100}
              />
            </View>
            <View style={st.divider} />
            <View style={st.fieldRow}>
              <Text style={st.fieldIcon}>📅</Text>
              <Text style={st.fieldLabel}>日期</Text>
              <TextInput
                style={st.fieldInput}
                placeholder="yyyy-MM-dd HH:mm"
                placeholderTextColor="#D0D5DD"
                value={transDate}
                onChangeText={setTransDate}
              />
            </View>
          </View>

          {/* 标签 */}
          {tags.length > 0 && (
            <View style={st.card}>
              <View style={st.tagHeader}>
                <Text style={st.fieldIcon}>🏷️</Text>
                <Text style={st.fieldLabel}>标签</Text>
              </View>
              <View style={st.tagGrid}>
                {tags.map(tag => {
                  const sel = selectedTagIds.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[st.tagChip, sel && {backgroundColor: tag.color || '#3B7DD8', borderColor: tag.color || '#3B7DD8'}]}
                      onPress={() => toggleTag(tag.id)}
                      activeOpacity={0.6}>
                      <Text style={[st.tagText, sel && {color: '#fff'}]}>{tag.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[st.submitBtn, {backgroundColor: currentModeConfig.color}, submitting && {opacity: 0.6}]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={st.submitText}>保存记录</Text>
            }
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {renderAccountPicker()}
      {renderBookPicker()}
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: {flex: 1},
  loadingWrap: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F7'},

  // Header
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10},
  headerBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'},
  headerBtnText: {fontSize: 16, color: '#fff', fontWeight: '600'},
  headerTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center'},
  bookSelector: {flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16},
  bookSelectorText: {fontSize: 13, color: '#fff', fontWeight: '600'},
  bookSelectorArrow: {fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 4},

  // Mode bar
  modeBar: {flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 10},
  modeTab: {flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)'},
  modeTabActive: {backgroundColor: 'rgba(255,255,255,0.35)'},
  modeIcon: {fontSize: 20, marginBottom: 4},
  modeLabel: {fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600'},
  modeLabelActive: {color: '#fff'},

  // Body
  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 24, borderTopRightRadius: 24},
  bodyContent: {padding: 16, paddingTop: 20},

  // Amount
  amountCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  amountCurrency: {fontSize: 30, fontWeight: '800', marginRight: 8},
  amountInput: {flex: 1, fontSize: 36, fontWeight: '800', color: '#1A1A2E', padding: 0, letterSpacing: -0.5},

  // Card
  card: {backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 52},

  // Field row
  fieldRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15},
  fieldIcon: {fontSize: 18, marginRight: 12},
  fieldLabel: {fontSize: 14, fontWeight: '600', color: '#666', width: 68},
  fieldValue: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right'},
  fieldPlaceholder: {color: '#C8CDD5'},
  fieldArrow: {fontSize: 16, color: '#D0D5DD', marginLeft: 6},
  fieldInput: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right', padding: 0},

  // Tags
  tagHeader: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 15, paddingBottom: 10},
  tagGrid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 14, gap: 8},
  tagChip: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F6F8', borderWidth: 1.5, borderColor: '#E8ECF1'},
  tagText: {fontSize: 13, fontWeight: '500', color: '#666'},

  // Submit
  submitBtn: {borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4, elevation: 4, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 12},
  submitText: {fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.5},

  // Advanced entries
  balanceBanner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8, gap: 8},
  balanceBannerLabel: {fontSize: 12, color: '#999', fontWeight: '500'},
  balanceBannerDebit: {fontSize: 16, fontWeight: '700', color: '#3B7DD8'},
  balanceBannerEq: {fontSize: 18, fontWeight: '800'},
  balanceBannerCredit: {fontSize: 16, fontWeight: '700', color: '#E67E22'},

  entryCard: {backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 8},
  entryTop: {flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8},
  entryBadge: {paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8},
  entryBadgeText: {fontSize: 13, fontWeight: '700', color: '#fff'},
  dirToggle: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F0F2F5'},
  dirToggleActive: {},
  dirToggleText: {fontSize: 12, color: '#999', fontWeight: '500'},
  entryRemove: {fontSize: 16, color: '#D0D5DD', fontWeight: '600'},

  entryAccountRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10},
  entryAccountIcon: {fontSize: 16, marginRight: 10},
  entryAccountName: {flex: 1, fontSize: 14, color: '#1A1A2E'},

  entryInputRow: {flexDirection: 'row', gap: 8},
  entryAmountWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10},
  entryAmountPrefix: {fontSize: 14, fontWeight: '700', color: '#999', marginRight: 4},
  entryAmountInput: {flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E', padding: 0},
  entryMemoInput: {flex: 1, backgroundColor: '#F7F8FA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A2E'},

  addEntryBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#845EF7', borderStyle: 'dashed', borderRadius: 16, paddingVertical: 14, marginBottom: 12, gap: 6},
  addEntryIcon: {fontSize: 16, color: '#845EF7', fontWeight: '600'},
  addEntryText: {fontSize: 14, fontWeight: '600', color: '#845EF7'},

  // Account picker modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingTop: 12},
  modalHandle: {width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E4EA', alignSelf: 'center', marginBottom: 16},
  modalTitle: {fontSize: 17, fontWeight: '700', color: '#1A1A2E', textAlign: 'center', marginBottom: 16},
  modalScroll: {paddingHorizontal: 20},

  accountGroup: {marginBottom: 20},
  accountGroupTitle: {fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 10, letterSpacing: 0.5},
  accountGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  accountChip: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F5F6F8', gap: 6},
  accountChipIcon: {fontSize: 14},
  accountChipText: {fontSize: 14, color: '#333', fontWeight: '500'},
  emptyHint: {fontSize: 14, color: '#C8CDD5', textAlign: 'center', paddingVertical: 40},

  // Book picker
  bookPickerCard: {backgroundColor: '#fff', borderRadius: 24, paddingTop: 12, paddingBottom: 20, paddingHorizontal: 20, marginHorizontal: 32, alignSelf: 'center', width: '85%', elevation: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.15, shadowRadius: 20},
  bookItem: {flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginTop: 4},
  bookItemActive: {backgroundColor: '#F0F6FF'},
  bookItemIcon: {fontSize: 20, marginRight: 12},
  bookItemText: {flex: 1, fontSize: 15, color: '#333', fontWeight: '500'},
  bookItemTextActive: {color: '#3B7DD8', fontWeight: '700'},
  bookCheck: {fontSize: 16, color: '#3B7DD8', fontWeight: '700'},
});

export default AddScreen;
