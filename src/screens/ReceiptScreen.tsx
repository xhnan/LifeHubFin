import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchCamera, launchImageLibrary, type ImagePickerResponse} from 'react-native-image-picker';

import DateTimePickerComponent from '../components/DateTimePicker';
import IconifyIcon from '../components/IconifyIcon';
import {ROUTES} from '../constants/routes';
import type {ReceiptRouteProp, RootStackNavigationPropType} from '../navigation/types';
import type {Account} from '../services/account';
import {getErrorMessage} from '../services/errors';
import NativeImageHandler from '../services/nativeImageHandler';
import {createTransaction, type EntryRequest} from '../services/transaction';
import {useFinanceStore} from '../store/FinanceStore';

type ReceiptScreenProps = {
  route: ReceiptRouteProp;
  navigation: RootStackNavigationPropType<typeof ROUTES.receipt>;
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  EXPENSE: '支出',
  INCOME: '收入',
  ASSET: '资产',
  LIABILITY: '负债',
  EQUITY: '权益',
};

const ReceiptScreen = ({route, navigation}: ReceiptScreenProps) => {
  const initialImageUri = route.params?.initialImageUri;
  const store = useFinanceStore();

  const [imageUri, setImageUri] = useState<string | null>(initialImageUri || null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payAccountId, setPayAccountId] = useState<number | string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [transDate, setTransDate] = useState(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours(),
    )}:${pad(now.getMinutes())}`;
  });

  const accounts = store.accounts;
  const selectedBookId = store.selectedBookId;
  const loading = store.initializing;

  useEffect(() => {
    return () => {
      if (initialImageUri && Platform.OS === 'android') {
        NativeImageHandler.clearSharedImage().catch(err => {
          console.warn('Failed to clear shared image:', err);
        });
      }
    };
  }, [initialImageUri]);

  const leafAccounts = useCallback(
    (types: string[]) => {
      const parentIds = new Set(accounts.map(account => String(account.parentId)).filter(Boolean));
      return accounts
        .filter(account => types.includes(account.accountType))
        .filter(account => !parentIds.has(String(account.id)));
    },
    [accounts],
  );

  const getAccountName = (id: number | string | null) =>
    !id ? '' : accounts.find(account => String(account.id) === String(id))?.name || '';

  const handlePickImage = (type: 'camera' | 'gallery') => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 1200,
      maxHeight: 1200,
    };

    const callback = (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorCode) {
        return;
      }

      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setImageUri(uri);
      }
    };

    if (type === 'camera') {
      launchCamera(options, callback);
      return;
    }

    launchImageLibrary(options, callback);
  };

  const handleSubmit = async () => {
    if (!selectedBookId) {
      Alert.alert('提示', '请先选择账本');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('提示', '请输入正确的金额');
      return;
    }

    if (!payAccountId) {
      Alert.alert('提示', '请选择付款账户');
      return;
    }

    const entries: EntryRequest[] = [
      {
        accountId: payAccountId,
        direction: 'CREDIT',
        amount: parsedAmount.toFixed(2),
      },
    ];

    const dateArray = transDate.replace(' ', 'T').split(/[-T:]/).map(Number);
    while (dateArray.length < 6) {
      dateArray.push(0);
    }

    setSubmitting(true);
    try {
      await createTransaction({
        transDate: dateArray as unknown as string,
        description: description.trim() || getAccountName(payAccountId),
        bookId: selectedBookId,
        entries,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('记账失败', getErrorMessage(err, '请重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const pickerAccounts = leafAccounts(['ASSET', 'LIABILITY']);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B7DD8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3B7DD8" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>拍照记账</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyPad} keyboardShouldPersistTaps="handled">
        <View style={styles.imageCard}>
          {imageUri ? (
            <TouchableOpacity onPress={() => setImageUri(null)} activeOpacity={0.8}>
              <Image source={{uri: imageUri}} style={styles.preview} resizeMode="cover" />
              <View style={styles.removeHint}>
                <Text style={styles.removeHintText}>点击移除图片</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.imageActions}>
                <TouchableOpacity style={styles.imageBtn} onPress={() => handlePickImage('camera')} activeOpacity={0.7}>
                  <IconifyIcon icon="mdi:camera" size={32} color="#3B7DD8" fallback="📷" />
                  <Text style={styles.imageBtnText}>拍照</Text>
                </TouchableOpacity>
                <View style={styles.imageDivider} />
                <TouchableOpacity style={styles.imageBtn} onPress={() => handlePickImage('gallery')} activeOpacity={0.7}>
                  <IconifyIcon icon="mdi:image-multiple" size={32} color="#3B7DD8" fallback="🖼️" />
                  <Text style={styles.imageBtnText}>相册</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowEmoji}>💰</Text>
            <Text style={styles.rowLabel}>金额</Text>
            <TextInput
              style={styles.rowInput}
              placeholder="0.00"
              placeholderTextColor="#D0D5DD"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setPickerVisible(true)} activeOpacity={0.55}>
            <Text style={styles.rowEmoji}>💳</Text>
            <Text style={styles.rowLabel}>付款账户</Text>
            <Text style={[styles.rowValue, !payAccountId && styles.rowPlaceholder]}>
              {payAccountId ? getAccountName(payAccountId) : '请选择账户'}
            </Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowEmoji}>📝</Text>
            <Text style={styles.rowLabel}>备注</Text>
            <TextInput
              style={styles.rowInput}
              placeholder="选填"
              placeholderTextColor="#D0D5DD"
              value={description}
              onChangeText={setDescription}
              maxLength={100}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setDatePickerVisible(true)} activeOpacity={0.55}>
            <Text style={styles.rowEmoji}>📅</Text>
            <Text style={styles.rowLabel}>时间</Text>
            <Text style={styles.rowValue}>{transDate}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>保存账单</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>选择付款账户</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {Object.entries(
                pickerAccounts.reduce<Record<string, Account[]>>((grouped, account) => {
                  (grouped[account.accountType] ||= []).push(account);
                  return grouped;
                }, {}),
              ).map(([type, groupedAccounts]) => (
                <View key={type} style={styles.groupSection}>
                  <Text style={styles.groupTitle}>{ACCOUNT_TYPE_LABEL[type] || type}</Text>
                  <View style={styles.chipGrid}>
                    {groupedAccounts.map(account => (
                      <TouchableOpacity
                        key={account.id}
                        style={styles.chip}
                        onPress={() => {
                          setPickerVisible(false);
                          setPayAccountId(account.id);
                        }}
                        activeOpacity={0.55}>
                        <Text style={styles.chipText}>{account.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
              {pickerAccounts.length === 0 && <Text style={styles.empty}>暂无可选账户</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <DateTimePickerComponent
        visible={datePickerVisible}
        value={transDate}
        onConfirm={dateTime => {
          setTransDate(dateTime);
          setDatePickerVisible(false);
        }}
        onCancel={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#3B7DD8'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F4F7'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3B7DD8',
  },
  backBtn: {fontSize: 32, color: '#fff', lineHeight: 34},
  headerTitle: {fontSize: 17, fontWeight: '700', color: '#fff'},
  headerSpacer: {width: 32},
  body: {flex: 1, backgroundColor: '#F2F4F7', borderTopLeftRadius: 20, borderTopRightRadius: 20},
  bodyPad: {padding: 16},
  imageCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  imagePlaceholder: {paddingVertical: 40, alignItems: 'center'},
  imageActions: {flexDirection: 'row', alignItems: 'center'},
  imageBtn: {alignItems: 'center', paddingHorizontal: 30, paddingVertical: 10},
  imageBtnText: {fontSize: 13, color: '#666', marginTop: 8, fontWeight: '500'},
  imageDivider: {width: 1, height: 50, backgroundColor: '#E8ECF1'},
  preview: {width: '100%', height: 220, borderRadius: 14},
  removeHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  removeHintText: {color: '#fff', fontSize: 12, fontWeight: '500'},
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#F0F2F5', marginLeft: 56},
  row: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14},
  rowEmoji: {fontSize: 16, marginRight: 10},
  rowLabel: {fontSize: 14, fontWeight: '500', color: '#666', width: 64},
  rowValue: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right'},
  rowPlaceholder: {color: '#C8CDD5'},
  rowArrow: {fontSize: 16, color: '#D0D5DD', marginLeft: 4},
  rowInput: {flex: 1, fontSize: 14, color: '#1A1A2E', textAlign: 'right', padding: 0},
  submit: {
    backgroundColor: '#3B7DD8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    elevation: 4,
    shadowColor: '#3B7DD8',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submitDisabled: {opacity: 0.6},
  submitText: {fontSize: 16, fontWeight: '700', color: '#fff'},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 12,
  },
  handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 16},
  sheetTitle: {fontSize: 16, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 16},
  sheetScroll: {paddingHorizontal: 20},
  groupSection: {marginBottom: 20},
  groupTitle: {fontSize: 12, fontWeight: '700', color: '#999', marginBottom: 10, letterSpacing: 0.5},
  chipGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F5F6F8'},
  chipText: {fontSize: 14, color: '#333', fontWeight: '500'},
  empty: {fontSize: 14, color: '#C8CDD5', textAlign: 'center', paddingVertical: 40},
});

export default ReceiptScreen;
