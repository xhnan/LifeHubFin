import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,

  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {Account, getAccountSortValue} from '../services/account';
import { useFinanceStore } from '../store/FinanceStore';
import IconifyIcon from '../components/IconifyIcon';
import DateTimePickerComponent from '../components/DateTimePicker';
import {
  createTransaction,
  EntryRequest,
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

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  EXPENSE: '支出', INCOME: '收入', ASSET: '资产', LIABILITY: '负债', EQUITY: '权益',
};

const THEME = '#3B7DD8';

// 默认通用图标 — 数据库中大量科目都使用了这个
const DEFAULT_ICON = 'material-symbols-light:account-balance-wallet-outline-rounded';

// 根据科目名称匹配更合适的图标（仅当科目使用默认图标时生效）
const NAME_ICON_MAP: Record<string, string> = {
  // ── 餐饮 ──
  '餐饮': 'material-symbols-light:restaurant-rounded',
  '买菜生鲜': 'material-symbols-light:storefront-rounded',
  '一日三餐': 'material-symbols-light:restaurant-rounded',
  '零食饮料': 'material-symbols-light:local-cafe-rounded',
  // ── 交通 ──
  '日常交通': 'material-symbols-light:commute-rounded',
  '公共交通': 'material-symbols-light:directions-bus-rounded',
  '打车': 'material-symbols-light:local-taxi-rounded',
  '交通': 'material-symbols-light:flight-rounded',
  '车辆日常': 'material-symbols-light:directions-car-rounded',
  '车辆养护': 'material-symbols-light:car-repair-rounded',
  // ── 居住 ──
  '居住': 'material-symbols-light:home-rounded',
  '房租': 'material-symbols-light:home-rounded',
  '水电网': 'material-symbols-light:bolt-rounded',
  // ── 购物 ──
  '购物': 'material-symbols-light:local-mall-rounded',
  '数码电子': 'material-symbols-light:devices-rounded',
  '服饰': 'material-symbols-light:checkroom-rounded',
  '日用百货': 'material-symbols-light:shopping-cart-rounded',
  // ── 服务 ──
  '服务与订阅': 'material-symbols-light:subscriptions-rounded',
  '软件订阅': 'material-symbols-light:subscriptions-rounded',
  '手机话费': 'material-symbols-light:phone-android-rounded',
  // ── 医疗 ──
  '医疗': 'material-symbols-light:medical-services-outline-rounded',
  '看病': 'material-symbols-light:local-hospital-rounded',
  '药品': 'material-symbols-light:medication-rounded',
  // ── 学习 ──
  '个人提升': 'material-symbols-light:school-rounded',
  '书籍/课程': 'material-symbols-light:menu-book-rounded',
  // ── 差旅 ──
  '差旅与度假': 'material-symbols-light:luggage-rounded',
  '酒店住宿': 'material-symbols-light:hotel-rounded',
  '景点玩乐': 'material-symbols-light:attractions-rounded',
  '度假消费': 'material-symbols-light:beach-access-rounded',
  // ── 情感社交 ──
  '情感与社交': 'material-symbols-light:favorite-rounded',
  '伴侣投入': 'material-symbols-light:favorite-rounded',
  '孝敬长辈': 'material-symbols-light:elderly-rounded',
  '朋友人情': 'material-symbols-light:people-rounded',
  // ── 折旧 ──
  '折旧与摊销': 'material-symbols-light:trending-down-rounded',
  '汽车折旧': 'material-symbols-light:car-crash-rounded',
  // ── 收入 ──
  '收入': 'material-symbols-light:savings-rounded',
  '主动收入': 'material-symbols-light:work-rounded',
  '工资': 'material-symbols-light:payments-rounded',
  '奖金': 'material-symbols-light:emoji-events-rounded',
  '被动收入': 'material-symbols-light:trending-up-rounded',
  '利息': 'material-symbols-light:percent-rounded',
  '股息': 'material-symbols-light:show-chart-rounded',
  '二手交易': 'material-symbols-light:swap-horiz-rounded',
  // ── 资产 ──
  '资产': 'material-symbols-light:account-balance-rounded',
  '流动资产': 'material-symbols-light:payments-rounded',
  '现金': 'material-symbols-light:money-rounded',
  '支付宝': 'material-symbols-light:payments',
  '微信': 'material-symbols-light:chat-rounded',
  '投资资产': 'material-symbols-light:trending-up-rounded',
  '应收账款': 'material-symbols-light:receipt-long-rounded',
  '公司报销款': 'material-symbols-light:receipt-long-rounded',
  '借出款项': 'material-symbols-light:currency-exchange-rounded',
  '固定资产': 'material-symbols-light:domain-rounded',
  '汽车': 'material-symbols-light:directions-car-rounded',
  '受限资产': 'material-symbols-light:lock',
  '公积金': 'material-symbols-light:account-balance-rounded',
  // ── 负债 ──
  '负债': 'material-symbols-light:credit-card',
  '流动负债': 'material-symbols-light:credit-card',
  '花呗': 'material-symbols-light:credit-card',
  '长期负债': 'material-symbols-light:request-quote-rounded',
  '车贷': 'material-symbols-light:directions-car-rounded',
  '房贷': 'material-symbols-light:home-rounded',
  // ── 权益 ──
  '权益': 'material-symbols-light:balance-rounded',
  '期初权益': 'material-symbols-light:balance-rounded',
  '余额调整': 'material-symbols-light:tune-rounded',
  // ── 支出大类 ──
  '支出': 'material-symbols-light:local-mall-rounded',
};

/** 如果科目使用默认图标，根据名称匹配更合适的图标 */
const getSmartIcon = (icon: string | undefined | null, name: string): string => {
  const trimName = (name || '').trim();
  if (!icon || icon === DEFAULT_ICON) {
    return NAME_ICON_MAP[trimName] || DEFAULT_ICON;
  }
  return icon;
};

const uniqueAccountsById = (list: Account[]): Account[] => {
  const seen = new Set<string>();
  return list.filter(item => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortByWeight = (list: Account[]): Account[] =>
  [...list].sort((a, b) => getAccountSortValue(a) - getAccountSortValue(b));

const AddScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const store = useFinanceStore();
  const [mode, setMode] = useState<QuickMode>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [noteFocused, setNoteFocused] = useState(false);
  const [transDate, setTransDate] = useState(() => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  });

  // 从全局 store 读取缓存数据
  const books = store.books;
  const selectedBookId = store.selectedBookId;
  const accounts = store.accounts;
  const subjectCategories = store.subjectCategories;
  const tags = store.tags;
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [expenseAccountId, setExpenseAccountId] = useState<number | string | null>(null);
  const [payAccountId, setPayAccountId] = useState<number | string | null>(null);
  const [incomeAccountId, setIncomeAccountId] = useState<number | string | null>(null);
  const [depositAccountId, setDepositAccountId] = useState<number | string | null>(null);
  const [fromAccountId, setFromAccountId] = useState<number | string | null>(null);
  const [toAccountId, setToAccountId] = useState<number | string | null>(null);

  const [entries, setEntries] = useState<EntryRow[]>([
    { key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: '' },
    { key: nextKey(), accountId: null, accountName: '', direction: 'CREDIT', amount: '', memo: '' },
  ]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('');
  const [pickerFilter, setPickerFilter] = useState<string[]>([]);
  const [bookPickerVisible, setBookPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // 切换账本时使用 store 的 switchBook 方法
  const handleSwitchBook = async (bookId: number) => {
    await store.switchBook(bookId);
  };

  const getEvaluatedAmount = () => {
    try {
      const str = (amountStr || '0').replace(/[^\d.+-]/g, '');
      const match = str.match(/([+-]?)([0-9.]+)/g);
      if (!match) return 0;
      return match.reduce((sum, part) => sum + parseFloat(part || '0'), 0);
    } catch { return 0; }
  };

  const allLeafAccounts = useMemo(() => {
    const pids = new Set(accounts.map(a => String(a.parentId)).filter(s => s && s !== 'null'));
    const list = accounts.filter(a => !pids.has(String(a.id)));
    const seen = new Set<string>();
    return list.filter(a => { const k = String(a.id); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [accounts]);

  const expenseOccurrenceSubjects = useMemo(() => {
    const apiList = subjectCategories?.expense?.occurrenceSubjects;
    if (Array.isArray(apiList) && apiList.length > 0) {
      return sortByWeight(uniqueAccountsById(apiList));
    }
    return allLeafAccounts.filter(a => a.accountType === 'EXPENSE');
  }, [subjectCategories, allLeafAccounts]);

  const incomeOccurrenceSubjects = useMemo(() => {
    const apiList = subjectCategories?.income?.occurrenceSubjects;
    if (Array.isArray(apiList) && apiList.length > 0) {
      return sortByWeight(uniqueAccountsById(apiList));
    }
    return allLeafAccounts.filter(a => a.accountType === 'INCOME');
  }, [subjectCategories, allLeafAccounts]);

  const expensePaymentSubjects = useMemo(() => {
    const apiList = subjectCategories?.expense?.paymentSubjects;
    if (Array.isArray(apiList) && apiList.length > 0) {
      return sortByWeight(uniqueAccountsById(apiList));
    }
    return allLeafAccounts.filter(a => ['ASSET', 'LIABILITY'].includes(a.accountType));
  }, [subjectCategories, allLeafAccounts]);

  const incomeReceiptSubjects = useMemo(() => {
    const apiList = subjectCategories?.income?.receiptSubjects;
    if (Array.isArray(apiList) && apiList.length > 0) {
      return sortByWeight(uniqueAccountsById(apiList));
    }
    return allLeafAccounts.filter(a => ['ASSET', 'LIABILITY'].includes(a.accountType));
  }, [subjectCategories, allLeafAccounts]);

  const transferCandidateAccounts = useMemo(() => {
    return allLeafAccounts.filter(a => ['ASSET', 'LIABILITY'].includes(a.accountType));
  }, [allLeafAccounts]);

  const [pickerOptions, setPickerOptions] = useState<Account[] | null>(null);

  const pickerLeafAccounts = useMemo(() => {
    if (pickerOptions && pickerOptions.length > 0) {
      return uniqueAccountsById(pickerOptions);
    }
    return pickerFilter.length > 0
      ? allLeafAccounts.filter(a => pickerFilter.includes(a.accountType))
      : allLeafAccounts;
  }, [pickerOptions, allLeafAccounts, pickerFilter]);

  useEffect(() => {
    if (
      expenseOccurrenceSubjects.length > 0 &&
      !expenseOccurrenceSubjects.some(a => String(a.id) === String(expenseAccountId))
    ) {
      setExpenseAccountId(expenseOccurrenceSubjects[0].id);
    }

    if (
      incomeOccurrenceSubjects.length > 0 &&
      !incomeOccurrenceSubjects.some(a => String(a.id) === String(incomeAccountId))
    ) {
      setIncomeAccountId(incomeOccurrenceSubjects[0].id);
    }

    if (
      expensePaymentSubjects.length > 0 &&
      !expensePaymentSubjects.some(a => String(a.id) === String(payAccountId))
    ) {
      setPayAccountId(expensePaymentSubjects[0].id);
    }

    if (
      incomeReceiptSubjects.length > 0 &&
      !incomeReceiptSubjects.some(a => String(a.id) === String(depositAccountId))
    ) {
      setDepositAccountId(incomeReceiptSubjects[0].id);
    }

    if (transferCandidateAccounts.length > 0) {
      if (!transferCandidateAccounts.some(a => String(a.id) === String(fromAccountId))) {
        setFromAccountId(transferCandidateAccounts[0].id);
      }

      if (!transferCandidateAccounts.some(a => String(a.id) === String(toAccountId))) {
        setToAccountId(
          transferCandidateAccounts.length > 1
            ? transferCandidateAccounts[1].id
            : transferCandidateAccounts[0].id,
        );
      }
    }
  }, [
    expenseOccurrenceSubjects,
    incomeOccurrenceSubjects,
    expensePaymentSubjects,
    incomeReceiptSubjects,
    transferCandidateAccounts,
    expenseAccountId,
    incomeAccountId,
    payAccountId,
    depositAccountId,
    fromAccountId,
    toAccountId,
  ]);

  const openPicker = (target: string, filter: string[], options?: Account[]) => {
    setPickerTarget(target);
    setPickerFilter(filter);
    setPickerOptions(options && options.length > 0 ? options : null);
    setPickerVisible(true);
  };

  const onPick = (acc: Account) => {
    setPickerVisible(false);
    const t = pickerTarget;
    if (t === 'pay') setPayAccountId(acc.id);
    else if (t === 'deposit') setDepositAccountId(acc.id);
    else if (t === 'from') setFromAccountId(acc.id);
    else if (t === 'to') setToAccountId(acc.id);
    else if (t.startsWith('entry_')) {
      const idx = parseInt(t.replace('entry_', ''), 10);
      setEntries(p => p.map((e, i) => i === idx ? { ...e, accountId: acc.id, accountName: acc.name } : e));
    }
  };

  const getName = (id: number | string | null) => !id ? '' : accounts.find(a => String(a.id) === String(id))?.name || '';
  const toggleTag = (tid: number) => setSelectedTagIds(p => p.includes(tid) ? p.filter(i => i !== tid) : [...p, tid]);
  const addEntry = () => setEntries(p => [...p, { key: nextKey(), accountId: null, accountName: '', direction: 'DEBIT', amount: '', memo: '' }]);
  const removeEntry = (i: number) => { if (entries.length <= 2) { Alert.alert('提示', '至少需要2条分录'); return; } setEntries(p => p.filter((_, j) => j !== i)); };
  const updateEntry = (i: number, f: keyof EntryRow, v: any) => setEntries(p => p.map((e, j) => j === i ? { ...e, [f]: v } : e));

  const buildEntries = (): EntryRequest[] | null => {
    if (mode === 'advanced') {
      for (const e of entries) {
        if (!e.accountId) { Alert.alert('提示', '请选择科目'); return null; }
        if (!e.amount || parseFloat(e.amount) <= 0) { Alert.alert('提示', '金额必需正数'); return null; }
      }
      return entries.map(e => ({ accountId: e.accountId!, direction: e.direction, amount: parseFloat(e.amount).toFixed(2), memo: e.memo || undefined } as EntryRequest));
    }
    const amt = getEvaluatedAmount();
    if (!amt || amt <= 0) { Alert.alert('提示', '请输入有效金额'); return null; }
    const s = amt.toFixed(2);
    if (mode === 'expense') {
      if (!expenseAccountId || !payAccountId) { Alert.alert('提示', '请选择科目和账户'); return null; }
      return [{ accountId: expenseAccountId, direction: 'DEBIT', amount: s }, { accountId: payAccountId, direction: 'CREDIT', amount: s }];
    }
    if (mode === 'income') {
      if (!incomeAccountId || !depositAccountId) { Alert.alert('提示', '请选择科目和账户'); return null; }
      return [{ accountId: depositAccountId, direction: 'DEBIT', amount: s }, { accountId: incomeAccountId, direction: 'CREDIT', amount: s }];
    }
    if (mode === 'transfer') {
      if (!fromAccountId || !toAccountId) { Alert.alert('提示', '请选择转接账户'); return null; }
      return [{ accountId: toAccountId, direction: 'DEBIT', amount: s }, { accountId: fromAccountId, direction: 'CREDIT', amount: s }];
    }
    return null;
  };

  const autoDesc = (): string => {
    if (mode === 'expense') { const a = getName(expenseAccountId), b = getName(payAccountId); return a && b ? `${a} - ${b}` : a || '日常支出'; }
    if (mode === 'income') { const a = getName(incomeAccountId), b = getName(depositAccountId); return a && b ? `${a} - ${b}` : a || '收入'; }
    if (mode === 'transfer') { const a = getName(fromAccountId), b = getName(toAccountId); return a && b ? `${a} → ${b}` : '转账'; }
    return '记账';
  };

  const handleSubmit = async () => {
    if (!selectedBookId) { Alert.alert('提示', '请先选择账本'); return; }
    const desc = description.trim() || autoDesc();

    // For Advanced, amounts come from entries. For others, evaluate the overall amount.
    if (mode !== 'advanced') {
      const ev = getEvaluatedAmount();
      if (ev <= 0) {
        Alert.alert('提示', '请输入大于0的金额');
        return;
      }
    }

    const ents = buildEntries();
    if (!ents) return;
    const dp = transDate.replace(' ', 'T').split(/[-T:]/);
    const da = dp.map(Number);
    if (da.length < 3) { Alert.alert('提示', '日期格式错误'); return; }
    if (da.length < 6) {
      const now = new Date();
      while (da.length < 6) da.push(0);
      da[3] = now.getHours();
      da[4] = now.getMinutes();
      da[5] = now.getSeconds();
    }
    setSubmitting(true);
    try {
      await createTransaction({ transDate: da as any, description: desc, bookId: selectedBookId, tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined, entries: ents });
      // 记账成功，直接返回明细页面（DetailScreen 会自动刷新数据）
      navigation.goBack();
    } catch (err: any) { Alert.alert('记账失败', err.message || '重试'); }
    finally { setSubmitting(false); }
  };

  const handleKey = (key: string) => {
    if (key === '完成') {
      const match = amountStr.match(/[+-]$/);
      if (match) {
        setAmountStr(amountStr.slice(0, -1));
      } else {
        handleSubmit();
      }
      return;
    }
    if (key === '⌫') {
      setAmountStr(prev => prev.length > 0 ? prev.slice(0, -1) : '');
      return;
    }
    if (key === '今天' || key.match(/^\d{2}-\d{2}$/)) {
      setDatePickerVisible(true);
      return;
    }

    setAmountStr(prev => {
      if (prev.length > 20) return prev;
      if (['+', '-'].includes(key)) {
        if (['+', '-'].includes(prev.slice(-1))) return prev.slice(0, -1) + key;
        if (prev.slice(-1) === '.') return prev.slice(0, -1) + key;
        if (prev === '') return '0' + key;
        return prev + key;
      }
      if (key === '.') {
      const seg = prev.split(/[+-]/).pop();
        if (seg?.includes('.')) return prev;
        if (prev === '' || ['+', '-'].includes(prev.slice(-1))) return prev + '0.';
        return prev + '.';
      }
      if (prev === '0') return key;
      const seg2 = prev.split(/[+-]/).pop();
      if (seg2 === '0') return prev.slice(0, -1) + key;
      return prev + key;
    });
  };

  const getShortDate = () => {
    const d = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    const tStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (transDate.startsWith(tStr)) return '今天';
    return transDate.substring(5, 10); // MM-DD
  };

  const KEYPAD = [
    ['7', '8', '9', getShortDate()],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '-'],
    ['.', '0', '⌫', '完成']
  ];

  const advancedBottomSpacerStyle = useMemo(
    () => ({height: insets.bottom, backgroundColor: '#F2F4F7'}),
    [insets.bottom],
  );
  const keypadBottomSafeStyle = useMemo(
    () => ({height: insets.bottom, backgroundColor: '#F5F6F8'}),
    [insets.bottom],
  );

  const renderCategoryGrid = () => {
    const isExp = mode === 'expense';
    const list = isExp ? expenseOccurrenceSubjects : incomeOccurrenceSubjects;
    const selectedId = isExp ? expenseAccountId : incomeAccountId;

    return (
      <ScrollView bounces={false} contentContainerStyle={$.gridContent} showsVerticalScrollIndicator={false}>
        <View style={$.grid}>
          {list.map(a => {
            const isSel = String(a.id) === String(selectedId);
            const smartIcon = getSmartIcon(a.icon, a.name);
            return (
              <TouchableOpacity
                key={a.id}
                style={$.gridItem}
                onPress={() => isExp ? setExpenseAccountId(a.id) : setIncomeAccountId(a.id)}
                activeOpacity={0.6}
              >
                <View style={[$.iconCircle, isSel && $.iconCircleSel]}>
                  <IconifyIcon icon={smartIcon} size={26} color={isSel ? '#fff' : '#555'} fallback="📌" />
                </View>
                <Text style={[$.gridLabel, isSel && $.gridLabelSel]} numberOfLines={1}>{a.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={$.gridBottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={$.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* Header */}
      <View style={$.header}>
        <TouchableOpacity style={$.headSide} onPress={() => navigation.goBack()}>
          <Text style={$.headCancelText}>取消</Text>
        </TouchableOpacity>

        <View style={$.tabs}>
          {(['expense', 'income', 'transfer', 'advanced'] as QuickMode[]).map(m => {
            const labels: Record<QuickMode, string> = { expense: '支出', income: '收入', transfer: '转账', advanced: '高级' };
            const ac = mode === m;
            return (
              <TouchableOpacity key={m} style={$.tab} onPress={() => setMode(m)}>
                <Text style={[$.tabText, ac && $.tabTextAc]}>{labels[m]}</Text>
                {ac && <View style={$.tabBar} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[$.headSide, $.headSideRight]} onPress={() => setBookPickerVisible(true)}>
          <Text style={$.bookNameText} numberOfLines={1}>{selectedBookId ? books.find(b => b.id === selectedBookId)?.name : '账本'}</Text>
        </TouchableOpacity>
      </View>

      {/* Body Area */}
      <View style={$.body}>
        {(mode === 'expense' || mode === 'income') && renderCategoryGrid()}

        {mode === 'transfer' && (
          <View style={$.formPad}>
            <TouchableOpacity style={$.transferBtn} onPress={() => openPicker('from', ['ASSET', 'LIABILITY'], transferCandidateAccounts)}>
              <Text style={$.transferIcon}>📤</Text>
              <Text style={$.transferLabel}>转出账户</Text>
              <Text style={$.transferVal}>{getName(fromAccountId) || '请选择'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[$.transferBtn, $.transferBtnSpaced]} onPress={() => openPicker('to', ['ASSET', 'LIABILITY'], transferCandidateAccounts)}>
              <Text style={$.transferIcon}>📥</Text>
              <Text style={$.transferLabel}>转入账户</Text>
              <Text style={$.transferVal}>{getName(toAccountId) || '请选择'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'advanced' && (
          <ScrollView contentContainerStyle={$.formPad} showsVerticalScrollIndicator={false}>
            {entries.map((ent, i) => (
              <View key={ent.key} style={$.entryCard}>
                <TouchableOpacity style={[$.entryDir, ent.direction === 'DEBIT' ? $.entryDirDebit : $.entryDirCredit]} onPress={() => updateEntry(i, 'direction', ent.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT')}>
                  <Text style={$.entryDirText}>{ent.direction === 'DEBIT' ? '借' : '贷'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={$.entryAcc} onPress={() => openPicker(`entry_${i}`, [])}>
                  <Text style={$.entryAccText}>{ent.accountId ? ent.accountName : '点击选科目'}</Text>
                </TouchableOpacity>
                <TextInput style={$.entryInput} placeholder="金额" keyboardType="decimal-pad" value={ent.amount} onChangeText={v => updateEntry(i, 'amount', v)} />
                {entries.length > 2 && (
                  <TouchableOpacity onPress={() => removeEntry(i)} style={$.entryDel}><Text style={$.entryDeleteText}>×</Text></TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={$.entryAdd} onPress={addEntry}><Text style={$.entryAddText}>+ 添加分录</Text></TouchableOpacity>
            <View style={$.advancedBottomSpacer} />
          </ScrollView>
        )}
      </View>

      {/* Bottom safe area spacer for advanced mode */}
      {mode === 'advanced' && (
        <View style={advancedBottomSpacerStyle} />
      )}

      {/* Tags Scroll */}
      {tags.length > 0 && mode !== 'advanced' && (
        <View style={$.tagsRowWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$.tagsRow}>
            {tags.map(tag => {
              const sel = selectedTagIds.includes(tag.id);
              return (
                <TouchableOpacity key={tag.id} style={[$.tagChip, sel && $.tagChipSel]} onPress={() => toggleTag(tag.id)}>
                  <IconifyIcon icon={tag.icon || ''} size={13} color={sel ? '#fff' : '#666'} fallback="🏷️" />
                  <Text style={[$.tagChipText, sel && $.tagChipTextSelected]}>{tag.tagName}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Bottom Area: Note Input & Display Amt & Keyboard */}
      {mode !== 'advanced' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Math.max(insets.bottom, 8)}>
          <View style={$.bottomArea}>

            {/* Pay Accounts Scroll (Single Row) */}
            {mode !== 'transfer' && (
              <View style={$.payRowWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={$.payRow}>
                  {(mode === 'expense' ? expensePaymentSubjects : incomeReceiptSubjects).map(acc => {
                    const isPaySel = mode === 'expense' ? acc.id === payAccountId : acc.id === depositAccountId;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[$.payChip, isPaySel && $.payChipSel]}
                        onPress={() => mode === 'expense' ? setPayAccountId(acc.id) : setDepositAccountId(acc.id)}>
                        <Text style={[$.payChipText, isPaySel && $.payChipTextSel]}>{acc.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* Input Row */}
            <View style={$.inputRow}>
              <Text style={$.noteLabel}>备注:</Text>
              <TextInput
                style={$.noteInput}
                placeholder="点击填写"
                placeholderTextColor="#bbb"
                value={description}
                onChangeText={setDescription}
                maxLength={40}
                returnKeyType="done"
                blurOnSubmit
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
              />
              <View style={$.amtWrap}>
                <Text style={$.amtCurrency}>¥</Text>
                <Text style={$.amtValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{amountStr || '0.00'}</Text>
              </View>
            </View>

            {/* Custom Keypad */}
            {!noteFocused ? (
              <>
                <View style={$.keypad}>
              {KEYPAD.map((row, i) => (
                <View style={$.keyRow} key={`row_${i}`}>
                  {row.map(btn => {
                    const isDone = btn === '完成';
                    const isDateBtn = btn === '今天' || btn.match(/^\d{2}-\d{2}$/);
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[$.keyBtn, isDone && $.keyDoneBtn]}
                        onPress={() => handleKey(btn)}
                        onLongPress={() => btn === '⌫' ? setAmountStr('') : undefined}
                        activeOpacity={0.6}>
                        {submitting && isDone ? (
                          <ActivityIndicator color="#fff" />
                        ) : isDateBtn ? (
                          <View style={$.dateBtnContent}>
                            <IconifyIcon icon="material-symbols-light:calendar-month-rounded" size={20} color={THEME} />
                            <Text style={$.dateBtnText}>{btn}</Text>
                          </View>
                        ) : (
                          <Text style={[$.keyText, isDone && $.keyDoneText]}>{btn}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
                </View>
                <View style={keypadBottomSafeStyle} />
              </>
            ) : (
              <View style={$.noteKeyboardSpacer} />
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Shared Modals */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={$.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={$.sheet} onStartShouldSetResponder={() => true}>
            <View style={$.sheetLine} />
            <Text style={$.sheetTitle}>请选择</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={$.sheetScrollContent}>
              {Object.entries(
                pickerLeafAccounts.reduce<Record<string, Account[]>>((g, a) => { (g[a.accountType] ||= []).push(a); return g; }, {}),
              ).map(([type, accs]) => (
                <View key={type} style={$.sheetGroup}>
                  <Text style={$.sheetGrp}>{ACCOUNT_TYPE_LABEL[type] || type}</Text>
                  <View style={$.sheetChips}>
                    {accs.map(a => (
                      <TouchableOpacity key={a.id} style={$.sheetChip} onPress={() => onPick(a)}>
                        <Text style={$.sheetChipText}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {pickerLeafAccounts.length === 0 && <Text style={$.sheetEmptyText}>无可用选项</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={bookPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={$.overlayMid} activeOpacity={1} onPress={() => setBookPickerVisible(false)}>
          <View style={$.bookCard} onStartShouldSetResponder={() => true}>
            <Text style={$.sheetTitle}>我的账本</Text>
            {books.map(b => (
              <TouchableOpacity key={b.id} style={[$.bookRow, b.id === selectedBookId && $.bookRowAc]} onPress={() => { handleSwitchBook(b.id); setBookPickerVisible(false); }}>
                <Text style={[$.bookName, b.id === selectedBookId && $.bookNameActive]}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <DateTimePickerComponent
        visible={datePickerVisible}
        value={transDate}
        mode="date"
        onConfirm={(dateTime) => { setTransDate(dateTime); setDatePickerVisible(false); }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const $ = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingHorizontal: 16 },
  headSide: { width: 56, justifyContent: 'center' },
  headSideRight: { alignItems: 'flex-end' },
  headCancelText: { fontSize: 15, color: '#fff' },
  bookNameText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  tabs: { flexDirection: 'row', flex: 1, justifyContent: 'center' },
  tab: { paddingHorizontal: 14, paddingVertical: 10, position: 'relative', alignItems: 'center' },
  tabText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '400' },
  tabTextAc: { color: '#fff', fontWeight: '700' },
  tabBar: { position: 'absolute', bottom: 4, width: 20, height: 3, backgroundColor: '#fff', borderRadius: 2 },

  body: { flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },

  gridContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  iconCircleSel: { backgroundColor: THEME, elevation: 3, shadowColor: THEME, shadowOpacity: 0.3, shadowRadius: 6 },
  gridLabel: { fontSize: 12, color: '#888', maxWidth: 64, textAlign: 'center' },
  gridLabelSel: { color: THEME, fontWeight: '700' },
  gridBottomSpacer: { height: 12 },

  tagsRowWrapper: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E8E8E8' },
  tagsRow: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0F2F5', borderRadius: 16 },
  tagChipSel: { backgroundColor: THEME },
  tagChipText: { fontSize: 12, color: '#666' },
  tagChipTextSelected: { color: '#fff' },

  payRowWrapper: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E8E8E8' },
  payRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  payChip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#F0F2F5', borderRadius: 20, borderWidth: 1.2, borderColor: '#E0E3E8' },
  payChipSel: { backgroundColor: THEME, borderColor: THEME },
  payChipText: { fontSize: 13, color: '#555' },
  payChipTextSel: { color: '#FFF', fontWeight: '600' },

  bottomArea: { backgroundColor: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8E8E8' },
  noteLabel: { color: '#bbb', marginHorizontal: 6 },
  noteInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 0 },
  noteKeyboardSpacer: { height: 12, backgroundColor: '#FFF' },
  amtWrap: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 8, maxWidth: 180 },
  amtCurrency: { fontSize: 16, color: THEME, fontWeight: '600', marginRight: 2 },
  amtValue: { fontSize: 28, color: '#111', fontWeight: '800' },

  keypad: { backgroundColor: '#F5F6F8', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  keyRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8D8D8' },
  keyBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#D8D8D8', backgroundColor: '#FFF' },
  keyDoneBtn: { backgroundColor: THEME },
  keyText: { fontSize: 22, color: '#333', fontWeight: '400' },
  keyDoneText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  dateBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dateBtnText: { fontSize: 16, color: THEME, fontWeight: '600' },

  formPad: { padding: 16 },
  transferBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6F8', padding: 16, borderRadius: 12 },
  transferBtnSpaced: { marginTop: 12 },
  transferIcon: { fontSize: 20, marginRight: 12 },
  transferLabel: { fontSize: 15, color: '#666', width: 70 },
  transferVal: { flex: 1, fontSize: 16, color: '#111', textAlign: 'right', fontWeight: '500' },

  entryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6F8', padding: 12, borderRadius: 12, marginBottom: 8 },
  entryDir: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  entryDirDebit: { backgroundColor: '#3B7DD8' },
  entryDirCredit: { backgroundColor: '#E67E22' },
  entryDirText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  entryAcc: { flex: 1 },
  entryAccText: { fontSize: 15, color: '#333' },
  entryInput: { width: 90, textAlign: 'right', fontSize: 16, fontWeight: '600', padding: 0 },
  entryDel: { marginLeft: 12, paddingHorizontal: 4 },
  entryDeleteText: { color: '#E63946', fontSize: 20 },
  entryAdd: { alignItems: 'center', paddingVertical: 12, borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 12 },
  entryAddText: { color: '#666' },
  advancedBottomSpacer: { height: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayMid: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  sheetLine: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', paddingVertical: 16 },
  sheetScrollContent: { padding: 20 },
  sheetGroup: { marginBottom: 20 },
  sheetGrp: { fontSize: 13, color: '#999', marginBottom: 12 },
  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sheetChip: { backgroundColor: '#F5F6F8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sheetChipText: { fontSize: 14, color: '#333' },
  sheetEmptyText: { textAlign: 'center', color: '#ccc', marginVertical: 30 },

  bookCard: { width: '80%', backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  bookRow: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F0F0F0' },
  bookRowAc: { backgroundColor: '#F9F9F9' },
  bookName: { fontSize: 16, textAlign: 'center', color: '#666' },
  bookNameActive: { fontWeight: '700', color: '#111' }
});

export default AddScreen;
