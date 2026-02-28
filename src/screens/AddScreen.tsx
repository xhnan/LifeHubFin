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
import IconifyIcon from '../components/IconifyIcon';
import DateTimePickerComponent from '../components/DateTimePicker';
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

const MODE_ACCENT: Record<QuickMode, string> = {
  expense: '#FF6B6B',
  income: '#51CF66',
  transfer: '#339AF0',
  advanced: '#845EF7',
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  EXPENSE: '支出', INCOME: '收入', ASSET: '资产', LIABILITY: '负债', EQUITY: '权益',
};

const AddScreen = ({navigation}: any) => {
  const [mode, setMode] = useState<QuickMode>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transDate, setTransDate] = useState(() => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`;
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

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('');
  const [pickerFilter, setPickerFilter] = useState<string[]>([]);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const accent = MODE_ACCENT[mode];

  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (selectedBookId) loadData(selectedBookId); }, [selectedBookId]);

  const loadBooks = async () => {
    try {
      const d = await getMyBooks();
      setBooks(d);
      if (d.length > 0) setSelectedBookId(d[0].id);
    } catch { Alert.alert('错误', '加载账本失败'); }
    finally { setLoading(false); }
  };

  const loadData = async (bid: number) => {
    try {
      const [a, t] = await Promise.all([getAccounts(bid).catch(() => []), getTags(bid).catch(() => [])]);
      setAccounts(Array.isArray(a) ? a : []);
      setTags(Array.isArray(t) ? t : []);
    } catch {}
  };

  const openPicker = (target: string, filter: string[]) => { setPickerTarget(target); setPickerFilter(filter); setPickerVisible(true); };

  const onPick = (acc: Account) => {
    setPickerVisible(false);
    const t = pickerTarget;
    if (t === 'expense') setExpenseAccountId(acc.id);
    else if (t === 'pay') setPayAccountId(acc.id);
    else if (t === 'income') setIncomeAccountId(acc.id);
    else if (t === 'deposit') setDepositAccountId(acc.id);
    else if (t === 'from') setFromAccountId(acc.id);
    else if (t === 'to') setToAccountId(acc.id);
    else if (t.startsWith('entry_')) {
      const idx = parseInt(t.replace('entry_', ''), 10);
      setEntries(p => p.map((e, i) => i === idx ? {...e, accountId: acc.id, accountName: acc.name} : e));
    }
  };

  const getName = (id: number | string | null) => !id ? '' : accounts.find(a => String(a.id) === String(id))?.name || '';
  const toggleTag = (tid: number) => setSelectedTagIds(p => p.includes(tid) ? p.filter(i => i !== tid) : [...p, tid]);
  const addEntry = () => setEntries(p => [...p, {key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: ''}]);
  const removeEntry = (i: number) => { if (entries.length <= 2) { Alert.alert('提示', '至少需要2条分录'); return; } setEntries(p => p.filter((_, j) => j !== i)); };
  const updateEntry = (i: number, f: keyof EntryRow, v: any) => setEntries(p => p.map((e, j) => j === i ? {...e, [f]: v} : e));

  const leafAccounts = (() => {
    const pids = new Set(accounts.map(a => String(a.parentId)).filter(s => s && s !== 'null'));
    const list = (pickerFilter.length > 0 ? accounts.filter(a => pickerFilter.includes(a.accountType)) : accounts).filter(a => !pids.has(String(a.id)));
    const seen = new Set<string>();
    return list.filter(a => { const k = String(a.id); if (seen.has(k)) return false; seen.add(k); return true; });
  })();

  const buildEntries = (): EntryRequest[] | null => {
    if (mode === 'advanced') {
      for (const e of entries) {
        if (!e.accountId) { Alert.alert('提示', '请为所有分录选择科目'); return null; }
        if (!e.amount || parseFloat(e.amount) <= 0) { Alert.alert('提示', '分录金额必须为正数'); return null; }
      }
      let ds = 0, cs = 0;
      entries.forEach(e => { const v = parseFloat(e.amount) || 0; e.direction === 'DEBIT' ? ds += v : cs += v; });
      if (Math.abs(ds - cs) > 0.001) { Alert.alert('借贷不平衡', `借方 ${ds.toFixed(2)} ≠ 贷方 ${cs.toFixed(2)}`); return null; }
      return entries.map(e => ({accountId: e.accountId!, direction: e.direction, amount: parseFloat(e.amount).toFixed(2), memo: e.memo || undefined} as EntryRequest));
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('提示', '请输入有效金额'); return null; }
    const s = amt.toFixed(2);
    if (mode === 'expense') {
      if (!expenseAccountId || !payAccountId) { Alert.alert('提示', '请选择支出科目和付款账户'); return null; }
      return [{accountId: expenseAccountId, direction: 'DEBIT' as const, amount: s}, {accountId: payAccountId, direction: 'CREDIT' as const, amount: s}] as EntryRequest[];
    }
    if (mode === 'income') {
      if (!incomeAccountId || !depositAccountId) { Alert.alert('提示', '请选择收入科目和收款账户'); return null; }
      return [{accountId: depositAccountId, direction: 'DEBIT' as const, amount: s}, {accountId: incomeAccountId, direction: 'CREDIT' as const, amount: s}] as EntryRequest[];
    }
    if (mode === 'transfer') {
      if (!fromAccountId || !toAccountId) { Alert.alert('提示', '请选择转出和转入账户'); return null; }
      return [{accountId: toAccountId, direction: 'DEBIT' as const, amount: s}, {accountId: fromAccountId, direction: 'CREDIT' as const, amount: s}] as EntryRequest[];
    }
    return null;
  };

  const autoDesc = (): string => {
    if (mode === 'expense') { const a = getName(expenseAccountId), b = getName(payAccountId); return a && b ? `${a} - ${b}` : a || '日常支出'; }
    if (mode === 'income') { const a = getName(incomeAccountId), b = getName(depositAccountId); return a && b ? `${a} - ${b}` : a || '收入'; }
    if (mode === 'transfer') { const a = getName(fromAccountId), b = getName(toAccountId); return a && b ? `${a} → ${b}` : '转账'; }
    return '复式记账';
  };

  const handleSubmit = async () => {
    if (!selectedBookId) { Alert.alert('提示', '请先选择账本'); return; }
    const desc = description.trim() || autoDesc();
    const ents = buildEntries();
    if (!ents) return;
    const dp = transDate.replace(' ', 'T').split(/[-T:]/);
    const da = dp.map(Number);
    if (da.length < 5) { Alert.alert('提示', '日期格式不正确'); return; }
    while (da.length < 6) da.push(0);
    setSubmitting(true);
    try {
      await createTransaction({transDate: da as any, description: desc, bookId: selectedBookId, tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined, entries: ents});
      Alert.alert('✅ 记账成功', desc, [{text: '继续记账', onPress: resetForm}, {text: '返回', onPress: () => navigation.goBack()}]);
    } catch (err: any) { Alert.alert('记账失败', err.message || '请稍后重试'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setDescription(''); setAmount(''); setSelectedTagIds([]);
    setExpenseAccountId(null); setPayAccountId(null); setIncomeAccountId(null); setDepositAccountId(null); setFromAccountId(null); setToAccountId(null);
    setEntries([{key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: ''}, {key: nextKey(), accountId: null, accountName: '', direction: 'CREDIT', amount: '', memo: ''}]);
  };

  const selectedBook = books.find(b => b.id === selectedBookId);

  // ── 科目选择行 ──
  const AccRow = ({icon, label, id, onPress}: {icon: string; label: string; id: number | string | null; onPress: () => void}) => (
    <TouchableOpacity style={$.row} onPress={onPress} activeOpacity={0.55}>
      <View style={[$.rowIcon, {backgroundColor: accent + '15'}]}><Text style={{fontSize: 16}}>{icon}</Text></View>
      <Text style={$.rowLabel}>{label}</Text>
      <Text style={[$.rowValue, !id && $.rowPlaceholder]} numberOfLines={1}>{id ? getName(id) : '请选择'}</Text>
      <Text style={$.rowArrow}>›</Text>
    </TouchableOpacity>
  );

  // ── 快捷科目 ──
  const renderQuickAccounts = () => {
    type RowDef = {icon: string; label: string; id: number | string | null; onPress: () => void};
    const rowMap: Partial<Record<QuickMode, RowDef[]>> = {
      expense: [
        {icon: '🏷️', label: '支出科目', id: expenseAccountId, onPress: () => openPicker('expense', ['EXPENSE'])},
        {icon: '💳', label: '付款账户', id: payAccountId, onPress: () => openPicker('pay', ['ASSET', 'LIABILITY'])},
      ],
      income: [
        {icon: '🏷️', label: '收入科目', id: incomeAccountId, onPress: () => openPicker('income', ['INCOME'])},
        {icon: '🏦', label: '收款账户', id: depositAccountId, onPress: () => openPicker('deposit', ['ASSET', 'LIABILITY'])},
      ],
      transfer: [
        {icon: '📤', label: '转出账户', id: fromAccountId, onPress: () => openPicker('from', ['ASSET', 'LIABILITY'])},
        {icon: '📥', label: '转入账户', id: toAccountId, onPress: () => openPicker('to', ['ASSET', 'LIABILITY'])},
      ],
    };
    const rows = rowMap[mode] || [];
    if (!rows.length) return null;
    return (
      <View style={$.card}>
        {rows.map((r, i) => (
          <React.Fragment key={r.label}>
            {i > 0 && <View style={$.divider} />}
            <AccRow {...r} />
          </React.Fragment>
        ))}
      </View>
    );
  };

  // ── 高级分录 ──
  const renderEntries = () => {
    let ds = 0, cs = 0;
    entries.forEach(e => { const v = parseFloat(e.amount) || 0; e.direction === 'DEBIT' ? ds += v : cs += v; });
    const ok = entries.some(e => e.amount) && Math.abs(ds - cs) < 0.001;
    return (
      <>
        <View style={$.balanceBar}>
          <View style={$.balanceHalf}>
            <Text style={$.balanceSmall}>借方</Text>
            <Text style={[$.balanceNum, {color: '#3B7DD8'}]}>¥{ds.toFixed(2)}</Text>
          </View>
          <View style={[$.balanceDot, {backgroundColor: ok ? '#51CF66' : '#FF6B6B'}]}>
            <Text style={$.balanceDotText}>{ok ? '✓' : '≠'}</Text>
          </View>
          <View style={[$.balanceHalf, {alignItems: 'flex-end'}]}>
            <Text style={$.balanceSmall}>贷方</Text>
            <Text style={[$.balanceNum, {color: '#E67E22'}]}>¥{cs.toFixed(2)}</Text>
          </View>
        </View>
        {entries.map((entry, idx) => (
          <View key={entry.key} style={$.entryCard}>
            <View style={$.entryHead}>
              <TouchableOpacity
                style={[$.entryDir, {backgroundColor: entry.direction === 'DEBIT' ? '#3B7DD8' : '#E67E22'}]}
                onPress={() => updateEntry(idx, 'direction', entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT')}>
                <Text style={$.entryDirText}>{entry.direction === 'DEBIT' ? '借' : '贷'}</Text>
              </TouchableOpacity>
              <Text style={$.entryNum}>分录 {idx + 1}</Text>
              {entries.length > 2 && (
                <TouchableOpacity onPress={() => removeEntry(idx)} style={$.entryDel}><Text style={$.entryDelText}>删除</Text></TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={$.entryAccBtn} onPress={() => openPicker(`entry_${idx}`, [])}>
              <Text style={[$.entryAccText, !entry.accountId && $.rowPlaceholder]}>{entry.accountId ? entry.accountName : '选择科目'}</Text>
              <Text style={$.rowArrow}>›</Text>
            </TouchableOpacity>
            <View style={$.entryInputs}>
              <View style={$.entryAmtWrap}>
                <Text style={$.entryAmtSign}>¥</Text>
                <TextInput style={$.entryAmtInput} placeholder="0.00" placeholderTextColor="#D0D5DD" keyboardType="decimal-pad" value={entry.amount} onChangeText={v => updateEntry(idx, 'amount', v)} />
              </View>
              <TextInput style={$.entryMemo} placeholder="备注" placeholderTextColor="#D0D5DD" value={entry.memo} onChangeText={v => updateEntry(idx, 'memo', v)} />
            </View>
          </View>
        ))}
        <TouchableOpacity style={$.addBtn} onPress={addEntry} activeOpacity={0.6}>
          <Text style={$.addBtnText}>＋ 添加分录</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ── 主渲染 ──
  if (loading) return (
    <SafeAreaView style={$.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={$.center}><ActivityIndicator size="large" color="#3B7DD8" /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={$.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />

      {/* 顶栏 — 统一蓝色 */}
      <View style={$.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={$.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={$.headerTitle}>记一笔</Text>
        <TouchableOpacity onPress={() => setBookPickerVisible(true)} style={$.bookChip}>
          <Text style={$.bookChipText}>📒 {selectedBook?.name || '账本'}</Text>
        </TouchableOpacity>
      </View>

      {/* 金额区域 — 蓝色背景 */}
      <View style={$.amountArea}>
        {/* 模式切换 */}
        <View style={$.modeRow}>
          {(['expense', 'income', 'transfer', 'advanced'] as QuickMode[]).map(m => {
            const active = mode === m;
            const labels: Record<QuickMode, string> = {expense: '支出', income: '收入', transfer: '转账', advanced: '高级'};
            return (
              <TouchableOpacity key={m} style={[$.modeItem, active && $.modeItemActive]} onPress={() => setMode(m)} activeOpacity={0.7}>
                <Text style={[$.modeText, active && $.modeTextActive]}>{labels[m]}</Text>
                {active && <View style={[$.modeBar2, {backgroundColor: MODE_ACCENT[m]}]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 金额输入 */}
        {mode !== 'advanced' && (
          <View style={$.amountRow}>
            <Text style={$.amountSign}>¥</Text>
            <TextInput style={$.amountInput} placeholder="0.00" placeholderTextColor="rgba(255,255,255,0.35)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} autoFocus />
          </View>
        )}
        {mode === 'advanced' && (
          <Text style={$.advHint}>复式记账 · 自由编辑分录</Text>
        )}
      </View>

      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={$.body} contentContainerStyle={$.bodyPad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* 科目 */}
          {mode !== 'advanced' && renderQuickAccounts()}
          {mode === 'advanced' && renderEntries()}

          {/* 描述 + 日期 */}
          <View style={$.card}>
            <View style={$.row}>
              <View style={[$.rowIcon, {backgroundColor: '#F0F6FF'}]}><Text style={{fontSize: 16}}>📝</Text></View>
              <Text style={$.rowLabel}>描述</Text>
              <TextInput style={$.rowInput} placeholder="选填，自动生成" placeholderTextColor="#D0D5DD" value={description} onChangeText={setDescription} maxLength={100} />
            </View>
            <View style={$.divider} />
            <TouchableOpacity style={$.row} onPress={() => setDatePickerVisible(true)} activeOpacity={0.55}>
              <View style={[$.rowIcon, {backgroundColor: '#F0F6FF'}]}><Text style={{fontSize: 16}}>📅</Text></View>
              <Text style={$.rowLabel}>日期</Text>
              <Text style={$.rowValue}>{transDate}</Text>
              <Text style={$.rowArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 标签 */}
          {tags.length > 0 && (
            <View style={$.card}>
              <View style={[$.row, {paddingBottom: 8}]}>
                <View style={[$.rowIcon, {backgroundColor: '#F0F6FF'}]}><Text style={{fontSize: 16}}>🏷️</Text></View>
                <Text style={$.rowLabel}>标签</Text>
              </View>
              <View style={$.tagGrid}>
                {tags.map(tag => {
                  const sel = selectedTagIds.includes(tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        $.tag,
                        sel && {backgroundColor: tag.color || '#3B7DD8', borderColor: tag.color || '#3B7DD8'},
                      ]}
                      onPress={() => toggleTag(tag.id)}
                      activeOpacity={0.6}>
                      <IconifyIcon icon={tag.icon || ''} size={18} color={sel ? '#fff' : '#666'} fallback="🏷️" />
                      <Text style={[$.tagText, sel && {color: '#fff'}]}>{tag.tagName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 提交 */}
          <TouchableOpacity style={[$.submit, submitting && {opacity: 0.6}]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.7}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <Text style={$.submitText}>💾  保存记录</Text>
            )}
          </TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 科目弹窗 */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={$.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={$.sheet} onStartShouldSetResponder={() => true}>
            <View style={$.handle} />
            <Text style={$.sheetTitle}>选择科目</Text>
            <ScrollView style={{paddingHorizontal: 20}} showsVerticalScrollIndicator={false}>
              {Object.entries(
                leafAccounts.reduce<Record<string, Account[]>>((g, a) => { (g[a.accountType] ||= []).push(a); return g; }, {}),
              ).map(([type, accs]) => (
                <View key={type} style={{marginBottom: 20}}>
                  <Text style={$.groupTitle}>{ACCOUNT_TYPE_LABEL[type] || type}</Text>
                  <View style={$.chipGrid}>
                    {accs.map((a, i) => (
                      <TouchableOpacity key={`${type}_${i}_${a.id}`} style={$.chip} onPress={() => onPick(a)} activeOpacity={0.55}>
                        <Text style={$.chipText}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {leafAccounts.length === 0 && <Text style={$.empty}>暂无可选科目</Text>}
              <View style={{height: 24}} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 账本弹窗 */}
      <Modal visible={bookPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={$.overlayCenter} activeOpacity={1} onPress={() => setBookPickerVisible(false)}>
          <View style={$.bookCard} onStartShouldSetResponder={() => true}>
            <View style={$.handle} />
            <Text style={$.sheetTitle}>选择账本</Text>
            {books.map(b => (
              <TouchableOpacity key={b.id} style={[$.bookRow, b.id === selectedBookId && $.bookRowActive]} onPress={() => { setSelectedBookId(b.id); setBookPickerVisible(false); }} activeOpacity={0.6}>
                <Text style={{fontSize: 20, marginRight: 12}}>📒</Text>
                <Text style={[$.bookName, b.id === selectedBookId && {color: '#3B7DD8', fontWeight: '700'}]}>{b.name}</Text>
                {b.id === selectedBookId && <Text style={{color: '#3B7DD8', fontWeight: '700', fontSize: 16}}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 日期时间选择器 */}
      <DateTimePickerComponent
        visible={datePickerVisible}
        value={transDate}
        onConfirm={(dateTime) => {
          setTransDate(dateTime);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const $ = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F7'},

  // Header — 统一蓝色
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#3B7DD8'},
  backBtn: {fontSize: 32, color: '#fff', lineHeight: 34},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#fff'},
  bookChip: {backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16},
  bookChipText: {fontSize: 12, color: '#fff', fontWeight: '600'},

  // Amount area — 蓝色背景
  amountArea: {backgroundColor: '#3B7DD8', paddingBottom: 20},
  modeRow: {flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16},
  modeItem: {flex: 1, alignItems: 'center', paddingVertical: 8},
  modeItemActive: {},
  modeText: {fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '600'},
  modeTextActive: {color: '#fff'},
  modeBar2: {width: 20, height: 3, borderRadius: 2, marginTop: 6},
  amountRow: {flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 24},
  amountSign: {fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginRight: 6},
  amountInput: {flex: 1, fontSize: 42, fontWeight: '800', color: '#fff', padding: 0, letterSpacing: -1},
  advHint: {fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingVertical: 8},

  // Body
  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 20, borderTopRightRadius: 20},
  bodyPad: {padding: 16, paddingTop: 16},

  // Card
  card: {backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 56},

  // Row
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14},
  rowIcon: {width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10},
  rowLabel: {fontSize: 14, fontWeight: '500', color: '#666', width: 64},
  rowValue: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right'},
  rowPlaceholder: {color: '#C8CDD5'},
  rowArrow: {fontSize: 16, color: '#D0D5DD', marginLeft: 4},
  rowInput: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right', padding: 0},

  // Tags
  tagGrid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 14, gap: 8},
  tag: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F6F8', borderWidth: 1.5, borderColor: '#E8ECF1', gap: 4},
  tagText: {fontSize: 13, fontWeight: '500', color: '#666'},

  // Submit
  submit: {backgroundColor: '#3B7DD8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4, elevation: 4, shadowColor: '#3B7DD8', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.25, shadowRadius: 8},
  submitText: {fontSize: 16, fontWeight: '700', color: '#fff'},

  // Advanced
  balanceBar: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3},
  balanceHalf: {flex: 1},
  balanceSmall: {fontSize: 11, color: '#999', marginBottom: 2},
  balanceNum: {fontSize: 18, fontWeight: '800'},
  balanceDot: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12},
  balanceDotText: {fontSize: 13, color: '#fff', fontWeight: '700'},

  entryCard: {backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3},
  entryHead: {flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8},
  entryDir: {paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8},
  entryDirText: {fontSize: 13, fontWeight: '700', color: '#fff'},
  entryNum: {flex: 1, fontSize: 13, color: '#999', fontWeight: '500'},
  entryDel: {paddingHorizontal: 8, paddingVertical: 4},
  entryDelText: {fontSize: 12, color: '#FF6B6B', fontWeight: '500'},
  entryAccBtn: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8},
  entryAccText: {flex: 1, fontSize: 14, color: '#1A1A2E'},
  entryInputs: {flexDirection: 'row', gap: 8},
  entryAmtWrap: {flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9},
  entryAmtSign: {fontSize: 14, fontWeight: '700', color: '#999', marginRight: 4},
  entryAmtInput: {flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A2E', padding: 0},
  entryMemo: {flex: 1, backgroundColor: '#F7F8FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#1A1A2E'},
  addBtn: {borderWidth: 1.5, borderColor: '#3B7DD8', borderStyle: 'dashed', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 10},
  addBtnText: {fontSize: 14, fontWeight: '600', color: '#3B7DD8'},

  // Modals
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  overlayCenter: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'},
  sheet: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingTop: 12},
  handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16},
  sheetTitle: {fontSize: 16, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 16},
  groupTitle: {fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 10, letterSpacing: 0.5},
  chipGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F5F6F8'},
  chipText: {fontSize: 14, color: '#333', fontWeight: '500'},
  empty: {fontSize: 14, color: '#C8CDD5', textAlign: 'center', paddingVertical: 40},

  bookCard: {backgroundColor: '#fff', borderRadius: 20, paddingTop: 12, paddingBottom: 20, paddingHorizontal: 20, width: '82%', elevation: 12, shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.12, shadowRadius: 16},
  bookRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginTop: 4},
  bookRowActive: {backgroundColor: '#F0F6FF'},
  bookName: {flex: 1, fontSize: 15, color: '#333', fontWeight: '500'},
});

export default AddScreen;
