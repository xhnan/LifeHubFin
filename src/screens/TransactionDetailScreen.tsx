import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import IconifyIcon from '../components/IconifyIcon';
import type {TransactionItem} from '../services/transaction';
import type {Account} from '../services/account';
import {getAccounts} from '../services/account';
import DateTimePickerComponent from '../components/DateTimePicker';

type TransactionDetailRouteProp = RouteProp<
  {params: {transaction: TransactionItem}},
  'params'
>;

const formatFullDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return `${year}-${month}-${day} ${weekday} ${hour}:${minute}`;
};

const TransactionDetailScreen = ({navigation}: any) => {
  const route = useRoute<TransactionDetailRouteProp>();
  const transaction = route.params?.transaction as TransactionItem;

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccountId, setEditAccountId] = useState<number | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);

  // 初始化编辑数据
  useEffect(() => {
    if (transaction) {
      setEditAmount(Math.abs(transaction.displayAmount).toString());
      setEditDescription(transaction.description || '');
      setEditDate(transaction.transDate);
      // TODO: 需要从transaction中获取accountId
    }
  }, [transaction]);

  // 获取账户列表（编辑时）
  useEffect(() => {
    if (isEditing) {
      // TODO: 需要bookId，可以从navigation或route获取
      // getAccounts(bookId).then(setAccounts).catch(() => setAccounts([]));
    }
  }, [isEditing]);

  // 动画
  const slideAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 并行执行动画
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    if (isEditing) {
      Alert.alert('提示', '正在编辑中，确定要关闭吗？', [
        {text: '取消', style: 'cancel'},
        {text: '确定', onPress: doClose},
      ]);
    } else {
      doClose();
    }
  };

  const doClose = () => {
    // 关闭时的动画
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (transaction) {
      setEditAmount(Math.abs(transaction.displayAmount).toString());
      setEditDescription(transaction.description || '');
      setEditDate(transaction.transDate);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (transaction) {
      setEditAmount(Math.abs(transaction.displayAmount).toString());
      setEditDescription(transaction.description || '');
      setEditDate(transaction.transDate);
    }
  };

  const handleAccountSelect = (accountId: number) => {
    setEditAccountId(accountId);
    setAccountPickerVisible(false);
  };

  const handleSave = () => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }

    // TODO: 调用更新交易API
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setIsEditing(false);
      Alert.alert('成功', '交易已更新');
      // 这里可以刷新数据或通知父组件更新
    }, 500);
  };

  if (!transaction) {
    return null;
  }

  const isExpense = transaction.transType === 'EXPENSE';
  const amountStr = isExpense
    ? `-${Math.abs(editAmount || transaction.displayAmount).toFixed(2)}`
    : `+${Math.abs(editAmount || transaction.displayAmount).toFixed(2)}`;

  return (
    <View style={s.root}>
      {/* 背景遮罩 */}
      <Animated.View style={[s.backdrop, {opacity: fadeAnim}]}>
        <TouchableOpacity
          style={s.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* 底部弹出的内容 */}
      <Animated.View
        style={[
          s.sheet,
          {
            transform: [{translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 300],
            })}],
            opacity: fadeAnim,
          },
        ]}
        onStartShouldSetResponder={() => true}>

        {/* 顶部操作栏 */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={handleClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={s.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={s.topBarTitle}>{isEditing ? '编辑交易' : '账单详情'}</Text>
          {isEditing ? (
            <View style={s.editActions}>
              <TouchableOpacity onPress={handleCancelEdit} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={s.cancelBtn}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}} disabled={saving}>
                <Text style={[s.saveBtn, saving && s.saveBtnDisabled]}>
                  {saving ? '保存中...' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleEdit} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={s.editBtn}>编辑</Text>
            </TouchableOpacity>
          )}
        </View>

          {/* 内容 */}
          <ScrollView
            style={s.scrollContent}
            contentContainerStyle={s.scrollPad}
            showsVerticalScrollIndicator={false}>
            {/* 金额卡片 */}
            <View style={s.amountCard}>
              <View style={s.amountIconWrap}>
                <IconifyIcon
                  icon={transaction.categoryIcon}
                  size={48}
                  color="#3B7DD8"
                  fallback="📌"
                />
              </View>
              <Text style={s.categoryName}>{transaction.categoryName}</Text>
              {isEditing ? (
                <View style={s.editAmountRow}>
                  <Text style={[s.amount, isExpense ? s.amountExp : s.amountInc]}>
                    {isExpense ? '-' : '+'}
                  </Text>
                  <TextInput
                    style={s.amountInput}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#D0D5DD"
                  />
                </View>
              ) : (
                <Text style={[s.amount, isExpense ? s.amountExp : s.amountInc]}>
                  {amountStr}
                </Text>
              )}
            </View>

            {/* 详细信息 */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>详细信息</Text>

              <View style={[s.infoRow, isEditing && {alignItems: 'flex-start'}]}>
                <Text style={s.infoLabel}>交易时间</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={s.dateEditBtn}
                    onPress={() => setDatePickerVisible(true)}>
                    <Text style={s.dateEditText}>{editDate}</Text>
                    <Text style={s.dateEditArrow}>›</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={s.infoValue}>
                    {formatFullDateTime(transaction.transDate)}
                  </Text>
                )}
              </View>

              <View style={s.divider} />

              <View style={s.infoRow}>
                <Text style={s.infoLabel}>交易类型</Text>
                <Text style={s.infoValue}>
                  {transaction.transType === 'EXPENSE'
                    ? '支出'
                    : transaction.transType === 'INCOME'
                    ? '收入'
                    : transaction.transType === 'TRANSFER'
                    ? '转账'
                    : '其他'}
                </Text>
              </View>

              <View style={s.divider} />

              <View style={s.infoRow}>
                <Text style={s.infoLabel}>付款账户</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={s.accountEditBtn}
                    onPress={() => setAccountPickerVisible(true)}>
                    <Text style={s.accountEditText}>
                      {editAccountId ? '已选择账户' : '选择账户'}
                    </Text>
                    <Text style={s.accountEditArrow}>›</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.accountRow}>
                    <IconifyIcon
                      icon={transaction.targetAccountIcon}
                      size={14}
                      color="#666"
                      fallback="💳"
                    />
                    <Text style={s.infoValue}>
                      {' '}
                      {transaction.targetAccountName}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.divider} />
              <View style={[s.infoRow, isEditing && {alignItems: 'flex-start'}]}>
                <Text style={s.infoLabel}>备注</Text>
                {isEditing ? (
                  <TextInput
                    style={s.textInput}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="添加备注..."
                    placeholderTextColor="#C8CDD5"
                    multiline
                    maxLength={200}
                  />
                ) : (
                  <Text style={s.infoValue}>{transaction.description || '-'}</Text>
                )}
              </View>

              {transaction.tags && transaction.tags.length > 0 ? (
                <>
                  <View style={s.divider} />
                  <View style={[s.infoRow, {alignItems: 'flex-start'}]}>
                    <Text style={s.infoLabel}>标签</Text>
                    <View style={s.tagsContainer}>
                      {transaction.tags.map(tag => (
                        <View
                          key={tag.tagId}
                          style={[s.tag, {backgroundColor: tag.color + '20'}]}>
                          <Text style={[s.tagText, {color: tag.color}]}>
                            {tag.tagName}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            <View style={{height: 24}} />
          </ScrollView>
        </Animated.View>

        {/* 日期时间选择器 */}
        <DateTimePickerComponent
          visible={datePickerVisible}
          value={editDate}
          onConfirm={(dateTime) => {
            setEditDate(dateTime);
            setDatePickerVisible(false);
          }}
          onCancel={() => setDatePickerVisible(false)}
        />

        {/* 账户选择器 */}
        <Modal visible={accountPickerVisible} transparent animationType="slide">
          <TouchableOpacity
            style={s.pickerOverlay}
            activeOpacity={1}
            onPress={() => setAccountPickerVisible(false)}>
            <View style={s.pickerSheet} onStartShouldSetResponder={() => true}>
              <View style={s.pickerHandle} />
              <Text style={s.pickerTitle}>选择付款账户</Text>
              <View style={s.accountOptions}>
                {accounts.length === 0 ? (
                  <Text style={s.noAccountText}>暂无账户</Text>
                ) : (
                  accounts.map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[s.accountOption, editAccountId === acc.id && s.accountOptionActive]}
                      onPress={() => handleAccountSelect(acc.id)}>
                      <View style={s.accountOptionRow}>
                        <IconifyIcon icon={acc.icon || 'mdi:account'} size={20} color="#666" fallback="💳" />
                        <Text style={s.accountOptionText}>{acc.name}</Text>
                      </View>
                      {editAccountId === acc.id && <Text style={s.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#F2F4F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '72%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8ECF1',
  },
  closeBtn: {
    fontSize: 24,
    color: '#999',
    width: 32,
    textAlign: 'center',
  },
  editBtn: {
    fontSize: 14,
    color: '#3B7DD8',
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  saveBtn: {
    fontSize: 14,
    color: '#3B7DD8',
    fontWeight: '600',
  },
  saveBtnDisabled: {
    color: '#C8CDD5',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    padding: 8,
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
    minHeight: 36,
  },
  editAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    minWidth: 100,
    padding: 0,
    textAlign: 'center',
  },
  dateEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateEditText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dateEditArrow: {
    fontSize: 16,
    color: '#3B7DD8',
    marginLeft: 4,
  },
  accountEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accountEditText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  accountEditArrow: {
    fontSize: 16,
    color: '#3B7DD8',
    marginLeft: 4,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  accountOptions: {
    paddingHorizontal: 20,
    gap: 8,
  },
  noAccountText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F6F8',
  },
  accountOptionActive: {
    backgroundColor: '#E8F0FE',
  },
  accountOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  checkIcon: {
    fontSize: 18,
    color: '#3B7DD8',
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPad: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  amountIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  amount: {fontSize: 28, fontWeight: '800', letterSpacing: 0.5},
  amountInc: {color: '#52c41a'},
  amountExp: {color: '#333'},

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {fontSize: 14, color: '#999'},
  infoValue: {fontSize: 14, color: '#333', fontWeight: '500', textAlign: 'right'},
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F2F5',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    maxWidth: '60%',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TransactionDetailScreen;
