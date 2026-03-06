import React, {useRef, useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import IconifyIcon from '../components/IconifyIcon';
import type {TransactionItem, TransactionDetail, TransactionEntry} from '../services/transaction';
import {getTransactionDetail, deleteTransaction, updateTransaction} from '../services/transaction';
import {useFinanceStore} from '../store/FinanceStore';
import type {Account} from '../services/account';
import DateTimePickerComponent from '../components/DateTimePicker';

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
  [...list].sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0));

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
  const store = useFinanceStore();

  // 完整交易详情
  const [fullDetail, setFullDetail] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editPaymentAccountId, setEditPaymentAccountId] = useState<number | string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 从 store 获取账户数据
  const accounts = store.accounts;
  const subjectCategories = store.subjectCategories;

  // 计算叶子节点账户
  const allLeafAccounts = useMemo(() => {
    const pids = new Set(accounts.map(a => String(a.parentId)).filter(s => s && s !== 'null'));
    const list = accounts.filter(a => !pids.has(String(a.id)));
    const seen = new Set<string>();
    return list.filter(a => { const k = String(a.id); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [accounts]);

  // 复用 AddScreen 的付款账户逻辑
  const paymentSubjects = useMemo(() => {
    const txType = fullDetail?.transType || transaction?.transType;
    if (txType === 'EXPENSE') {
      const apiList = subjectCategories?.expense?.paymentSubjects;
      if (Array.isArray(apiList) && apiList.length > 0) {
        return sortByWeight(uniqueAccountsById(apiList));
      }
    } else if (txType === 'INCOME') {
      const apiList = subjectCategories?.income?.receiptSubjects;
      if (Array.isArray(apiList) && apiList.length > 0) {
        return sortByWeight(uniqueAccountsById(apiList));
      }
    }
    return allLeafAccounts.filter(a => ['ASSET', 'LIABILITY'].includes(a.accountType));
  }, [subjectCategories, allLeafAccounts, fullDetail, transaction]);

  // 从分录中提取付款账户ID
  const extractPaymentAccountId = (detail: TransactionDetail): number | string | null => {
    const isExpense = detail.transType === 'EXPENSE';
    const isIncome = detail.transType === 'INCOME';

    if (isExpense) {
      // 支出：付款账户是贷方（CREDIT）
      const creditEntry = detail.entries.find(e => e.direction === 'CREDIT');
      return creditEntry?.accountId || null;
    } else if (isIncome) {
      // 收入：付款账户（收款账户）是借方（DEBIT）
      const debitEntry = detail.entries.find(e => e.direction === 'DEBIT');
      return debitEntry?.accountId || null;
    }
    return null;
  };

  // 从分录中提取付款账户信息（用于查看模式显示）
  const extractPaymentAccountInfo = (detail: TransactionDetail) => {
    const isExpense = detail.transType === 'EXPENSE';
    const isIncome = detail.transType === 'INCOME';

    if (isExpense) {
      // 支出：付款账户是贷方
      const creditEntry = detail.entries.find(e => e.direction === 'CREDIT');
      return creditEntry ? { name: creditEntry.accountName, icon: creditEntry.accountIcon } : null;
    } else if (isIncome) {
      // 收入：收款账户是借方
      const debitEntry = detail.entries.find(e => e.direction === 'DEBIT');
      return debitEntry ? { name: debitEntry.accountName, icon: debitEntry.accountIcon } : null;
    }
    return null;
  };

  // 从详情中提取金额（优先 detail.amount，回退到 entries 中的金额）
  const getDetailAmount = (detail: TransactionDetail): number => {
    const topAmount = Math.abs(parseFloat(detail.amount || '0'));
    if (!isNaN(topAmount) && topAmount > 0) {
      return topAmount;
    }
    // 从 entries 中提取金额作为兜底
    if (detail.entries && detail.entries.length > 0) {
      const entryAmount = Math.abs(parseFloat(detail.entries[0].amount || '0'));
      if (!isNaN(entryAmount) && entryAmount > 0) {
        return entryAmount;
      }
    }
    // 最后回退到 transaction.displayAmount
    return Math.abs(transaction?.displayAmount || 0);
  };

  // 获取完整交易详情（包含分录）
  useEffect(() => {
    if (transaction?.transId) {
      setLoadingDetail(true);
      getTransactionDetail(transaction.transId)
        .then(detail => {
          setFullDetail(detail);
          setEditDescription(detail.description || '');
          const amountValue = getDetailAmount(detail);
          setEditAmountStr(amountValue > 0 ? amountValue.toString() : '');
          // 从分录中提取付款账户
          const paymentAccountId = extractPaymentAccountId(detail);
          if (paymentAccountId) {
            setEditPaymentAccountId(paymentAccountId);
          }
        })
        .catch(() => {
          // 如果获取失败，至少保留显示数据
          setFullDetail(null);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [transaction]);

  // 动画
  const slideAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    if (fullDetail) {
      setEditDescription(fullDetail.description || '');
      const amountValue = getDetailAmount(fullDetail);
      setEditAmountStr(amountValue > 0 ? amountValue.toString() : '');
      const paymentAccountId = extractPaymentAccountId(fullDetail);
      if (paymentAccountId) {
        setEditPaymentAccountId(paymentAccountId);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (fullDetail) {
      setEditDescription(fullDetail.description || '');
      const amountValue = getDetailAmount(fullDetail);
      setEditAmountStr(amountValue > 0 ? amountValue.toString() : '');
      const paymentAccountId = extractPaymentAccountId(fullDetail);
      if (paymentAccountId) {
        setEditPaymentAccountId(paymentAccountId);
      }
    }
  };

  const handleSave = async () => {
    if (!transaction?.transId || !fullDetail) {
      Alert.alert('提示', '交易信息不完整');
      return;
    }

    // 验证金额
    const amount = parseFloat(editAmountStr);
    if (!amount || amount <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }

    // 验证付款账户
    if (!editPaymentAccountId) {
      Alert.alert('提示', '请选择付款账户');
      return;
    }

    // 验证描述
    const newDescription = editDescription.trim();
    if (!newDescription) {
      Alert.alert('提示', '请输入交易描述');
      return;
    }

    setSaving(true);
    try {
      // 重新构造分录
      const isExpense = fullDetail.transType === 'EXPENSE';
      const isIncome = fullDetail.transType === 'INCOME';

      let newEntries: TransactionEntry[] = [];

      if (isExpense) {
        // 支出：借方是支出科目，贷方是付款账户
        const debitEntry = fullDetail.entries.find(e => e.direction === 'DEBIT');
        const creditEntry = fullDetail.entries.find(e => e.direction === 'CREDIT');

        if (debitEntry) {
          newEntries.push({
            ...debitEntry,
            amount: amount.toFixed(2),
          });
        }
        newEntries.push({
          accountId: editPaymentAccountId as number,
          direction: 'CREDIT',
          amount: amount.toFixed(2),
        });
      } else if (isIncome) {
        // 收入：借方是收款账户，贷方是收入科目
        newEntries.push({
          accountId: editPaymentAccountId as number,
          direction: 'DEBIT',
          amount: amount.toFixed(2),
        });

        const creditEntry = fullDetail.entries.find(e => e.direction === 'CREDIT');
        if (creditEntry) {
          newEntries.push({
            ...creditEntry,
            amount: amount.toFixed(2),
          });
        }
      } else {
        // 转账或其他类型，暂时不支持编辑
        Alert.alert('提示', '该类型交易暂不支持编辑');
        return;
      }

      await updateTransaction(transaction.transId, {
        description: newDescription,
        entries: newEntries.map(e => ({
          accountId: e.accountId,
          direction: e.direction,
          amount: e.amount,
          memo: e.memo,
        })),
        tagIds: fullDetail.tags.map(t => t.tagId),
      });

      setIsEditing(false);
      Alert.alert('成功', '交易已更新', [
        {
          text: '确定',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('更新失败', error.message || '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      '删除后将无法恢复，确定要删除这条交易记录吗？',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            if (!transaction?.transId) return;

            setDeleting(true);
            try {
              await deleteTransaction(transaction.transId);
              Alert.alert('成功', '交易记录已删除', [
                {
                  text: '确定',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error: any) {
              Alert.alert('删除失败', error.message || '请稍后重试');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!transaction) {
    return null;
  }

  const displayData = fullDetail || transaction;
  const isExpense = displayData.transType === 'EXPENSE';
  const amountNum = fullDetail
    ? getDetailAmount(fullDetail)
    : Math.abs(displayData.displayAmount);
  const amountStr = isExpense
    ? `-${amountNum.toFixed(2)}`
    : `+${amountNum.toFixed(2)}`;

  // 获取付款账户信息（用于查看模式显示）
  const getPaymentAccountDisplay = () => {
    // 查看模式：优先从 fullDetail.entries 中提取，回退到 transaction 数据
    if (fullDetail) {
      const accountInfo = extractPaymentAccountInfo(fullDetail);
      if (accountInfo) {
        return accountInfo;
      }
    }
    // 回退到 transaction 的 targetAccount 数据
    return {
      name: displayData.targetAccountName || '未知账户',
      icon: displayData.targetAccountIcon || 'mdi:account'
    };
  };

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
            <View style={s.viewActions}>
              <TouchableOpacity onPress={handleEdit} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={s.editBtn}>编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                disabled={deleting}
                style={s.deleteBtnWrapper}>
                <Text style={[s.deleteBtn, deleting && s.deleteBtnDisabled]}>
                  {deleting ? '删除中' : '删除'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

          {/* 内容 */}
          <ScrollView
            style={s.scrollContent}
            contentContainerStyle={s.scrollPad}
            showsVerticalScrollIndicator={false}>
            {loadingDetail ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color="#3B7DD8" />
                <Text style={s.loadingText}>加载中...</Text>
              </View>
            ) : (
              <>
                {/* 金额卡片 */}
                <View style={s.amountCard}>
                  <View style={s.amountIconWrap}>
                    <IconifyIcon
                      icon={displayData.categoryIcon}
                      size={48}
                      color="#3B7DD8"
                      fallback="📌"
                    />
                  </View>
                  <Text style={s.categoryName}>{displayData.categoryName}</Text>
                  {isEditing ? (
                    <View style={s.amountEditRow}>
                      <Text style={[s.amountPrefix, isExpense ? s.amountExp : s.amountInc]}>
                        {isExpense ? '-' : '+'}
                      </Text>
                      <TextInput
                        style={[s.amountInput, isExpense ? s.amountExp : s.amountInc]}
                        value={editAmountStr}
                        onChangeText={setEditAmountStr}
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

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>交易时间</Text>
                    <Text style={s.infoValue}>
                      {formatFullDateTime(displayData.transDate)}
                    </Text>
                  </View>

                  <View style={s.divider} />

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>交易类型</Text>
                    <Text style={s.infoValue}>
                      {displayData.transType === 'EXPENSE'
                        ? '支出'
                        : displayData.transType === 'INCOME'
                        ? '收入'
                        : displayData.transType === 'TRANSFER'
                        ? '转账'
                        : '其他'}
                    </Text>
                  </View>

                  <View style={s.divider} />

                  {isEditing ? (
                    <View>
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>付款账户</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.payRow}>
                        {paymentSubjects.map(acc => {
                          const isSel = String(acc.id) === String(editPaymentAccountId);
                          return (
                            <TouchableOpacity
                              key={acc.id}
                              style={[s.payChip, isSel && s.payChipSel]}
                              onPress={() => setEditPaymentAccountId(acc.id)}>
                              <Text style={[s.payChipText, isSel && s.payChipTextSel]}>
                                {acc.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>付款账户</Text>
                      <View style={s.accountRow}>
                        <IconifyIcon
                          icon={getPaymentAccountDisplay().icon}
                          size={14}
                          color="#666"
                          fallback="💳"
                        />
                        <Text style={s.infoValue}>
                          {' '}
                          {getPaymentAccountDisplay().name}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={s.divider} />
                  <View style={[s.infoRow, {alignItems: 'flex-start'}]}>
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
                      <Text style={s.infoValue}>{displayData.description || '-'}</Text>
                    )}
                  </View>

                  {/* 显示分录信息 */}
                  {fullDetail?.entries && fullDetail.entries.length > 0 && (
                    <>
                      <View style={s.divider} />
                      <View style={[s.infoRow, {alignItems: 'flex-start'}]}>
                        <Text style={s.infoLabel}>分录明细</Text>
                        <View style={s.entriesContainer}>
                          {fullDetail.entries.map((entry, index) => (
                            <View key={entry.entryId || index} style={s.entryItem}>
                              <Text style={s.entryDirection}>
                                {entry.direction === 'DEBIT' ? '借' : '贷'}
                              </Text>
                              <Text style={s.entryAccount}>{entry.accountName}</Text>
                              <Text style={s.entryAmount}>{entry.amount}</Text>
                              {entry.memo && (
                                <Text style={s.entryMemo}>{entry.memo}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    </>
                  )}

                  {displayData.tags && displayData.tags.length > 0 ? (
                    <>
                      <View style={s.divider} />
                      <View style={[s.infoRow, {alignItems: 'flex-start'}]}>
                        <Text style={s.infoLabel}>标签</Text>
                        <View style={s.tagsContainer}>
                          {displayData.tags.map(tag => (
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
              </>
            )}

            <View style={{height: 24}} />
          </ScrollView>
        </Animated.View>

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
  viewActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  editBtn: {
    fontSize: 14,
    color: '#3B7DD8',
    fontWeight: '600',
  },
  deleteBtnWrapper: {
    paddingLeft: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8ECF1',
  },
  deleteBtn: {
    fontSize: 14,
    color: '#FF4D4F',
    fontWeight: '600',
  },
  deleteBtnDisabled: {
    color: '#C8CDD5',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  amountEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountPrefix: {
    fontSize: 28,
    fontWeight: '800',
  },
  amountInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 80,
    padding: 0,
  },
  payRow: {
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  payChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E0E3E8',
  },
  payChipSel: {
    backgroundColor: '#3B7DD8',
    borderColor: '#3B7DD8',
  },
  payChipText: {
    fontSize: 13,
    color: '#555',
  },
  payChipTextSel: {
    color: '#FFF',
    fontWeight: '600',
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
  entriesContainer: {
    flex: 1,
    gap: 8,
  },
  entryItem: {
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  entryDirection: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    minWidth: 32,
  },
  entryAccount: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  entryAmount: {
    fontSize: 14,
    color: '#3B7DD8',
    fontWeight: '600',
  },
  entryMemo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
