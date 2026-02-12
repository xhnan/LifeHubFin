import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {getMyBooks, Book} from '../services/book';
import {getAccounts, Account} from '../services/account';
import {createTransaction, EntryRequest} from '../services/transaction';
import IconifyIcon from '../components/IconifyIcon';

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  EXPENSE: '支出', INCOME: '收入', ASSET: '资产', LIABILITY: '负债', EQUITY: '权益',
};

const ReceiptScreen = ({navigation}: any) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transDate, setTransDate] = useState(() => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`;
  });

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [payAccountId, setPayAccountId] = useState<number | string | null>(null);

  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    getMyBooks()
      .then(d => {
        setBooks(d);
        if (d.length > 0) setSelectedBookId(d[0].id);
      })
      .catch(() => Alert.alert('错误', '加载账本失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBookId) {
      getAccounts(selectedBookId)
        .then(a => setAccounts(Array.isArray(a) ? a : []))
        .catch(() => setAccounts([]));
    }
  }, [selectedBookId]);

  const leafAccounts = useCallback(
    (types: string[]) => {
      const pids = new Set(accounts.map(a => String(a.parentId)).filter(s => s && s !== 'null'));
      return accounts
        .filter(a => types.includes(a.accountType))
        .filter(a => !pids.has(String(a.id)));
    },
    [accounts],
  );

  const getName = (id: number | string | null) =>
    !id ? '' : accounts.find(a => String(a.id) === String(id))?.name || '';

  const handlePickImage = (type: 'camera' | 'gallery') => {
    const options = {mediaType: 'photo' as const, quality: 0.8 as const, maxWidth: 1200, maxHeight: 1200};
    const cb = (res: ImagePickerResponse) => {
      if (res.didCancel || res.errorCode) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) setImageUri(uri);
    };
    if (type === 'camera') launchCamera(options, cb);
    else launchImageLibrary(options, cb);
  };

  const openPicker = () => {
    setPickerVisible(true);
  };

  const onPick = (acc: Account) => {
    setPickerVisible(false);
    setPayAccountId(acc.id);
  };

  const handleSubmit = async () => {
    if (!selectedBookId) { Alert.alert('提示', '请先选择账本'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('提示', '请输入有效金额'); return; }
    if (!payAccountId) { Alert.alert('提示', '请选择付款账户'); return; }

    const s = amt.toFixed(2);
    const entries: EntryRequest[] = [
      {accountId: payAccountId, direction: 'CREDIT', amount: s},
    ];
    const desc = description.trim() || getName(payAccountId);
    const dp = transDate.replace(' ', 'T').split(/[-T:]/);
    const da = dp.map(Number);
    while (da.length < 6) da.push(0);

    setSubmitting(true);
    try {
      await createTransaction({
        transDate: da as any,
        description: desc,
        bookId: selectedBookId,
        entries,
      });
      Alert.alert('✅ 记账成功', desc, [
        {text: '继续', onPress: resetForm},
        {text: '返回', onPress: () => navigation.goBack()},
      ]);
    } catch (err: any) {
      Alert.alert('记账失败', err.message || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setImageUri(null);
    setAmount('');
    setDescription('');
    setPayAccountId(null);
  };

  const pickerAccounts = leafAccounts(['ASSET', 'LIABILITY']);

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
        <View style={s.center}><ActivityIndicator size="large" color="#3B7DD8" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />

      {/* 顶栏 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={s.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>拍照记账</Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyPad} keyboardShouldPersistTaps="handled">
        {/* 图片区域 */}
        <View style={s.imageCard}>
          {imageUri ? (
            <TouchableOpacity onPress={() => setImageUri(null)} activeOpacity={0.8}>
              <Image source={{uri: imageUri}} style={s.preview} resizeMode="cover" />
              <View style={s.removeHint}>
                <Text style={s.removeHintText}>点击移除</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.imagePlaceholder}>
              <View style={s.imageActions}>
                <TouchableOpacity style={s.imageBtn} onPress={() => handlePickImage('camera')} activeOpacity={0.7}>
                  <IconifyIcon icon="mdi:camera" size={32} color="#3B7DD8" fallback="📷" />
                  <Text style={s.imageBtnText}>拍照</Text>
                </TouchableOpacity>
                <View style={s.imageDivider} />
                <TouchableOpacity style={s.imageBtn} onPress={() => handlePickImage('gallery')} activeOpacity={0.7}>
                  <IconifyIcon icon="mdi:image-multiple" size={32} color="#3B7DD8" fallback="🖼️" />
                  <Text style={s.imageBtnText}>相册</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 金额 */}
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowEmoji}>💰</Text>
            <Text style={s.rowLabel}>金额</Text>
            <TextInput
              style={s.rowInput}
              placeholder="0.00"
              placeholderTextColor="#D0D5DD"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* 付款账户 */}
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={openPicker} activeOpacity={0.55}>
            <Text style={s.rowEmoji}>💳</Text>
            <Text style={s.rowLabel}>付款账户</Text>
            <Text style={[s.rowValue, !payAccountId && s.rowPlaceholder]}>
              {payAccountId ? getName(payAccountId) : '请选择'}
            </Text>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 描述 + 日期 */}
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowEmoji}>📝</Text>
            <Text style={s.rowLabel}>描述</Text>
            <TextInput
              style={s.rowInput}
              placeholder="选填"
              placeholderTextColor="#D0D5DD"
              value={description}
              onChangeText={setDescription}
              maxLength={100}
            />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.rowEmoji}>📅</Text>
            <Text style={s.rowLabel}>日期</Text>
            <TextInput
              style={s.rowInput}
              placeholder="yyyy-MM-dd HH:mm"
              placeholderTextColor="#D0D5DD"
              value={transDate}
              onChangeText={setTransDate}
            />
          </View>
        </View>

        {/* 提交 */}
        <TouchableOpacity
          style={[s.submit, submitting && {opacity: 0.6}]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitText}>💾  保存记录</Text>
          )}
        </TouchableOpacity>
        <View style={{height: 40}} />
      </ScrollView>

      {/* 科目选择弹窗 */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>选择付款账户</Text>
            <ScrollView style={{paddingHorizontal: 20}} showsVerticalScrollIndicator={false}>
              {Object.entries(
                pickerAccounts.reduce<Record<string, Account[]>>((g, a) => {
                  (g[a.accountType] ||= []).push(a);
                  return g;
                }, {}),
              ).map(([type, accs]) => (
                <View key={type} style={{marginBottom: 20}}>
                  <Text style={s.groupTitle}>{ACCOUNT_TYPE_LABEL[type] || type}</Text>
                  <View style={s.chipGrid}>
                    {accs.map((a, i) => (
                      <TouchableOpacity
                        key={`${type}_${i}_${a.id}`}
                        style={s.chip}
                        onPress={() => onPick(a)}
                        activeOpacity={0.55}>
                        <Text style={s.chipText}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {pickerAccounts.length === 0 && (
                <Text style={s.empty}>暂无可选科目</Text>
              )}
              <View style={{height: 24}} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F7'},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#3B7DD8'},
  backBtn: {fontSize: 32, color: '#fff', lineHeight: 34},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#fff'},
  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 20, borderTopRightRadius: 20},
  bodyPad: {padding: 16},

  imageCard: {backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3},
  imagePlaceholder: {paddingVertical: 40, alignItems: 'center'},
  imageActions: {flexDirection: 'row', alignItems: 'center'},
  imageBtn: {alignItems: 'center', paddingHorizontal: 30, paddingVertical: 10},
  imageBtnText: {fontSize: 13, color: '#666', marginTop: 8, fontWeight: '500'},
  imageDivider: {width: 1, height: 50, backgroundColor: '#E8ECF1'},
  preview: {width: '100%', height: 220, borderRadius: 14},
  removeHint: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, alignItems: 'center', borderBottomLeftRadius: 14, borderBottomRightRadius: 14},
  removeHintText: {color: '#fff', fontSize: 12, fontWeight: '500'},

  card: {backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 56},
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14},
  rowEmoji: {fontSize: 16, marginRight: 10},
  rowLabel: {fontSize: 14, fontWeight: '500', color: '#666', width: 64},
  rowValue: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right'},
  rowPlaceholder: {color: '#C8CDD5'},
  rowArrow: {fontSize: 16, color: '#D0D5DD', marginLeft: 4},
  rowInput: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right', padding: 0},

  submit: {backgroundColor: '#3B7DD8', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4, elevation: 4, shadowColor: '#3B7DD8', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.25, shadowRadius: 8},
  submitText: {fontSize: 16, fontWeight: '700', color: '#fff'},

  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingTop: 12},
  handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16},
  sheetTitle: {fontSize: 16, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 16},
  groupTitle: {fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 10, letterSpacing: 0.5},
  chipGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F5F6F8'},
  chipText: {fontSize: 14, color: '#333', fontWeight: '500'},
  empty: {fontSize: 14, color: '#C8CDD5', textAlign: 'center', paddingVertical: 40},
});

export default ReceiptScreen;
