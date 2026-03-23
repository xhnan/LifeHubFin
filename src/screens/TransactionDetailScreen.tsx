import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import IconifyIcon from '../components/IconifyIcon';
import {ROUTES} from '../constants/routes';
import type {
  RootStackNavigationPropType,
  TransactionDetailRouteProp,
} from '../navigation/types';
import type {Account} from '../services/account';
import {getErrorMessage} from '../services/errors';
import {
  deleteTransaction,
  getTransactionDetail,
  updateTransaction,
  type TransactionDetail,
  type TransactionEntry,
} from '../services/transaction';
import {useFinanceStore} from '../store/FinanceStore';

type TransactionDetailScreenProps = {
  route: TransactionDetailRouteProp;
  navigation: RootStackNavigationPropType<typeof ROUTES.transactionDetail>;
};

type PaymentAccountInfo = {
  id: number | string;
  name: string;
  icon: string;
};

const TEXT = {
  weekdays: [
    '\u5468\u65e5',
    '\u5468\u4e00',
    '\u5468\u4e8c',
    '\u5468\u4e09',
    '\u5468\u56db',
    '\u5468\u4e94',
    '\u5468\u516d',
  ],
  missingExpenseEntry: '\u652f\u51fa\u6d41\u6c34\u7f3a\u5c11\u501f\u65b9\u5206\u5f55',
  missingIncomeEntry: '\u6536\u5165\u6d41\u6c34\u7f3a\u5c11\u8d37\u65b9\u5206\u5f55',
  unsupportedEditError: '\u5f53\u524d\u4ea4\u6613\u7c7b\u578b\u6682\u4e0d\u652f\u6301\u7f16\u8f91',
  unknownAccount: '\u672a\u8bc6\u522b\u8d26\u6237',
  discardEditTitle: '\u653e\u5f03\u7f16\u8f91',
  discardEditMessage:
    '\u5f53\u524d\u4fee\u6539\u5c1a\u672a\u4fdd\u5b58\uff0c\u786e\u8ba4\u5173\u95ed\u5417\uff1f',
  keepEditing: '\u7ee7\u7eed\u7f16\u8f91',
  discard: '\u653e\u5f03',
  unsupportedEditTitle: '\u6682\u4e0d\u652f\u6301',
  unsupportedEditMessage:
    '\u5f53\u524d\u4ea4\u6613\u7c7b\u578b\u6682\u4e0d\u652f\u6301\u5728\u6b64\u9875\u9762\u7f16\u8f91\u3002',
  saveFailedTitle: '\u4fdd\u5b58\u5931\u8d25',
  detailNotReadyMessage:
    '\u4ea4\u6613\u8be6\u60c5\u5c1a\u672a\u52a0\u8f7d\u5b8c\u6210\u3002',
  invalidAmountTitle: '\u91d1\u989d\u65e0\u6548',
  invalidAmountMessage:
    '\u8bf7\u8f93\u5165\u5927\u4e8e 0 \u7684\u91d1\u989d\u3002',
  accountNotSelectedTitle: '\u8d26\u6237\u672a\u9009\u62e9',
  accountNotSelectedMessage:
    '\u8bf7\u9009\u62e9\u6536\u4ed8\u6b3e\u8d26\u6237\u3002',
  emptyDescriptionTitle: '\u5907\u6ce8\u4e0d\u80fd\u4e3a\u7a7a',
  emptyDescriptionMessage:
    '\u8bf7\u8f93\u5165\u4ea4\u6613\u5907\u6ce8\u3002',
  saveSuccessTitle: '\u4fdd\u5b58\u6210\u529f',
  saveSuccessMessage: '\u4ea4\u6613\u4fe1\u606f\u5df2\u66f4\u65b0\u3002',
  saveErrorFallback:
    '\u4fdd\u5b58\u4ea4\u6613\u4fe1\u606f\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  deleteTitle: '\u5220\u9664\u4ea4\u6613',
  deleteMessage:
    '\u5220\u9664\u540e\u65e0\u6cd5\u6062\u590d\uff0c\u786e\u8ba4\u7ee7\u7eed\u5417\uff1f',
  cancel: '\u53d6\u6d88',
  delete: '\u5220\u9664',
  deleting: '\u5220\u9664\u4e2d...',
  deleteSuccessTitle: '\u5220\u9664\u6210\u529f',
  deleteSuccessMessage: '\u4ea4\u6613\u5df2\u5220\u9664\u3002',
  confirm: '\u786e\u5b9a',
  deleteErrorTitle: '\u5220\u9664\u5931\u8d25',
  deleteErrorFallback:
    '\u5220\u9664\u4ea4\u6613\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  closeDetail: '\u5173\u95ed\u8be6\u60c5',
  editTransaction: '\u7f16\u8f91\u4ea4\u6613',
  transactionDetail: '\u4ea4\u6613\u8be6\u60c5',
  saving: '\u4fdd\u5b58\u4e2d...',
  save: '\u4fdd\u5b58',
  edit: '\u7f16\u8f91',
  loadingTransactionDetail:
    '\u52a0\u8f7d\u4ea4\u6613\u8be6\u60c5...',
  categoryFallback: '\u8d26',
  uncategorized: '\u672a\u5206\u7c7b',
  transactionInfo: '\u4ea4\u6613\u4fe1\u606f',
  transactionTime: '\u4ea4\u6613\u65f6\u95f4',
  transactionType: '\u4ea4\u6613\u7c7b\u578b',
  expense: '\u652f\u51fa',
  income: '\u6536\u5165',
  transfer: '\u8f6c\u8d26',
  other: '\u5176\u4ed6',
  paymentAccount: '\u6536\u4ed8\u6b3e\u8d26\u6237',
  accountFallback: '\u6237',
  description: '\u5907\u6ce8',
  descriptionPlaceholder: '\u8bf7\u8f93\u5165\u5907\u6ce8',
  entryDetails: '\u5206\u5f55\u660e\u7ec6',
  debit: '\u501f\u65b9',
  credit: '\u8d37\u65b9',
  tags: '\u6807\u7b7e',
} as const;

const uniqueAccountsById = (list: Account[]): Account[] => {
  const seen = new Set<string>();
  return list.filter(account => {
    const key = String(account.id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const sortByWeight = (list: Account[]) =>
  [...list].sort((left, right) => (left.sortWeight ?? 0) - (right.sortWeight ?? 0));

const formatFullDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${TEXT.weekdays[date.getDay()]} ${hours}:${minutes}`;
};

const getDetailAmount = (detail: TransactionDetail, fallbackAmount: number) => {
  const topLevelAmount = Math.abs(Number.parseFloat(detail.amount || '0'));
  if (topLevelAmount > 0) {
    return topLevelAmount;
  }

  const entryAmount = Math.abs(Number.parseFloat(detail.entries[0]?.amount || '0'));
  if (entryAmount > 0) {
    return entryAmount;
  }

  return Math.abs(fallbackAmount);
};

const getPaymentAccountInfo = (detail: TransactionDetail): PaymentAccountInfo | null => {
  const entry =
    detail.transType === 'EXPENSE'
      ? detail.entries.find(item => item.direction === 'CREDIT')
      : detail.transType === 'INCOME'
      ? detail.entries.find(item => item.direction === 'DEBIT')
      : null;

  if (!entry) {
    return null;
  }

  return {
    id: entry.accountId,
    name: entry.accountName,
    icon: entry.accountIcon,
  };
};

const getEditableEntries = (
  detail: TransactionDetail,
  amount: number,
  paymentAccountId: number | string,
): TransactionEntry[] => {
  const formattedAmount = amount.toFixed(2);

  if (detail.transType === 'EXPENSE') {
    const debitEntry = detail.entries.find(entry => entry.direction === 'DEBIT');
    if (!debitEntry) {
      throw new Error(TEXT.missingExpenseEntry);
    }

    return [
      {
        ...debitEntry,
        amount: formattedAmount,
      },
      {
        accountId: Number(paymentAccountId),
        accountName: '',
        accountIcon: '',
        accountType: 'ASSET',
        direction: 'CREDIT',
        amount: formattedAmount,
      },
    ];
  }

  if (detail.transType === 'INCOME') {
    const creditEntry = detail.entries.find(entry => entry.direction === 'CREDIT');
    if (!creditEntry) {
      throw new Error(TEXT.missingIncomeEntry);
    }

    return [
      {
        accountId: Number(paymentAccountId),
        accountName: '',
        accountIcon: '',
        accountType: 'ASSET',
        direction: 'DEBIT',
        amount: formattedAmount,
      },
      {
        ...creditEntry,
        amount: formattedAmount,
      },
    ];
  }

  throw new Error(TEXT.unsupportedEditError);
};

const TransactionDetailScreen = ({
  route,
  navigation,
}: TransactionDetailScreenProps) => {
  const transaction = route.params.transaction;
  const {accounts, subjectCategories} = useFinanceStore();

  const [fullDetail, setFullDetail] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentAccountId, setEditPaymentAccountId] = useState<number | string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const slideAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const allLeafAccounts = useMemo(() => {
    const parentIds = new Set(
      accounts.map(account => String(account.parentId)).filter(id => id && id !== 'null'),
    );

    return uniqueAccountsById(
      accounts.filter(account => !parentIds.has(String(account.id))),
    );
  }, [accounts]);

  const displayData = fullDetail ?? transaction;
  const amountNum = fullDetail
    ? getDetailAmount(fullDetail, transaction.displayAmount)
    : Math.abs(transaction.displayAmount);
  const isExpense = displayData.transType === 'EXPENSE';
  const isIncome = displayData.transType === 'INCOME';
  const isEditableType = isExpense || isIncome;

  const paymentSubjects = useMemo(() => {
    if (displayData.transType === 'EXPENSE') {
      const paymentAccounts = subjectCategories?.expense?.paymentSubjects;
      if (paymentAccounts?.length) {
        return sortByWeight(uniqueAccountsById(paymentAccounts));
      }
    }

    if (displayData.transType === 'INCOME') {
      const receiptAccounts = subjectCategories?.income?.receiptSubjects;
      if (receiptAccounts?.length) {
        return sortByWeight(uniqueAccountsById(receiptAccounts));
      }
    }

    return allLeafAccounts.filter(account =>
      ['ASSET', 'LIABILITY'].includes(account.accountType),
    );
  }, [allLeafAccounts, displayData.transType, subjectCategories]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    let active = true;

    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const detail = await getTransactionDetail(transaction.transId);
        if (!active) {
          return;
        }

        setFullDetail(detail);
        setEditDescription(detail.description || '');
        setEditAmount(String(getDetailAmount(detail, transaction.displayAmount)));
        setEditPaymentAccountId(getPaymentAccountInfo(detail)?.id ?? null);
      } catch {
        if (active) {
          setFullDetail(null);
        }
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    };

    loadDetail();

    return () => {
      active = false;
    };
  }, [transaction.displayAmount, transaction.transId]);

  const paymentAccountDisplay = useMemo(() => {
    if (fullDetail) {
      const paymentAccount = getPaymentAccountInfo(fullDetail);
      if (paymentAccount) {
        return paymentAccount;
      }
    }

    return {
      id: 0,
      name: transaction.targetAccountName || TEXT.unknownAccount,
      icon: transaction.targetAccountIcon || 'mdi:wallet-outline',
    };
  }, [fullDetail, transaction.targetAccountIcon, transaction.targetAccountName]);

  const closeScreen = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  const handleClose = () => {
    if (!isEditing) {
      closeScreen();
      return;
    }

    Alert.alert(TEXT.discardEditTitle, TEXT.discardEditMessage, [
      {text: TEXT.keepEditing, style: 'cancel'},
      {text: TEXT.discard, onPress: closeScreen},
    ]);
  };

  const resetEditState = (detail: TransactionDetail) => {
    setEditDescription(detail.description || '');
    setEditAmount(String(getDetailAmount(detail, transaction.displayAmount)));
    setEditPaymentAccountId(getPaymentAccountInfo(detail)?.id ?? null);
  };

  const handleEdit = () => {
    if (!fullDetail || !isEditableType) {
      Alert.alert(TEXT.unsupportedEditTitle, TEXT.unsupportedEditMessage);
      return;
    }

    resetEditState(fullDetail);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (fullDetail) {
      resetEditState(fullDetail);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!fullDetail) {
      Alert.alert(TEXT.saveFailedTitle, TEXT.detailNotReadyMessage);
      return;
    }

    const parsedAmount = Number.parseFloat(editAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(TEXT.invalidAmountTitle, TEXT.invalidAmountMessage);
      return;
    }

    if (!editPaymentAccountId) {
      Alert.alert(TEXT.accountNotSelectedTitle, TEXT.accountNotSelectedMessage);
      return;
    }

    const description = editDescription.trim();
    if (!description) {
      Alert.alert(TEXT.emptyDescriptionTitle, TEXT.emptyDescriptionMessage);
      return;
    }

    setSaving(true);
    try {
      const entries = getEditableEntries(fullDetail, parsedAmount, editPaymentAccountId);

      await updateTransaction(transaction.transId, {
        description,
        entries: entries.map(entry => ({
          accountId: entry.accountId,
          direction: entry.direction,
          amount: entry.amount,
          memo: entry.memo,
        })),
        tagIds: fullDetail.tags.map(tag => tag.tagId),
      });

      const refreshedDetail = await getTransactionDetail(transaction.transId);
      setFullDetail(refreshedDetail);
      resetEditState(refreshedDetail);
      setIsEditing(false);
      Alert.alert(TEXT.saveSuccessTitle, TEXT.saveSuccessMessage);
    } catch (error) {
      Alert.alert(TEXT.saveFailedTitle, getErrorMessage(error, TEXT.saveErrorFallback));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(TEXT.deleteTitle, TEXT.deleteMessage, [
      {text: TEXT.cancel, style: 'cancel'},
      {
        text: TEXT.delete,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteTransaction(transaction.transId);
            Alert.alert(TEXT.deleteSuccessTitle, TEXT.deleteSuccessMessage, [
              {
                text: TEXT.confirm,
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch (error) {
            Alert.alert(
              TEXT.deleteErrorTitle,
              getErrorMessage(error, TEXT.deleteErrorFallback),
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const amountText = `${isExpense ? '-' : '+'}${amountNum.toFixed(2)}`;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, {opacity: fadeAnim}]}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 320],
                }),
              },
            ],
          },
        ]}
        onStartShouldSetResponder={() => true}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={styles.hitSlop}
            accessibilityLabel={TEXT.closeDetail}>
            <Text style={styles.closeBtn}>{'\u00d7'}</Text>
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>
            {isEditing ? TEXT.editTransaction : TEXT.transactionDetail}
          </Text>

          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancelEdit} hitSlop={styles.hitSlop}>
                <Text style={styles.cancelBtn}>{TEXT.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} hitSlop={styles.hitSlop} disabled={saving}>
                <Text style={[styles.saveBtn, saving && styles.actionDisabled]}>
                  {saving ? TEXT.saving : TEXT.save}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.viewActions}>
              <TouchableOpacity onPress={handleEdit} hitSlop={styles.hitSlop}>
                <Text style={[styles.editBtn, !isEditableType && styles.actionDisabled]}>
                  {TEXT.edit}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={styles.hitSlop}
                disabled={deleting}
                style={styles.deleteBtnWrapper}>
                <Text style={[styles.deleteBtn, deleting && styles.actionDisabled]}>
                  {deleting ? TEXT.deleting : TEXT.delete}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollPad}
          showsVerticalScrollIndicator={false}>
          {loadingDetail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B7DD8" />
              <Text style={styles.loadingText}>{TEXT.loadingTransactionDetail}</Text>
            </View>
          ) : (
            <>
              <View style={styles.amountCard}>
                <View style={styles.amountIconWrap}>
                  <IconifyIcon
                    icon={displayData.categoryIcon}
                    size={48}
                    color="#3B7DD8"
                    fallback={TEXT.categoryFallback}
                  />
                </View>
                <Text style={styles.categoryName}>
                  {displayData.categoryName || TEXT.uncategorized}
                </Text>

                {isEditing ? (
                  <View style={styles.amountEditRow}>
                    <Text
                      style={[
                        styles.amountPrefix,
                        isExpense ? styles.amountExpense : styles.amountIncome,
                      ]}>
                      {isExpense ? '-' : '+'}
                    </Text>
                    <TextInput
                      style={[
                        styles.amountInput,
                        isExpense ? styles.amountExpense : styles.amountIncome,
                      ]}
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#D0D5DD"
                    />
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.amount,
                      isExpense ? styles.amountExpense : styles.amountIncome,
                    ]}>
                    {amountText}
                  </Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{TEXT.transactionInfo}</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{TEXT.transactionTime}</Text>
                  <Text style={styles.infoValue}>
                    {formatFullDateTime(displayData.transDate)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{TEXT.transactionType}</Text>
                  <Text style={styles.infoValue}>
                    {displayData.transType === 'EXPENSE'
                      ? TEXT.expense
                      : displayData.transType === 'INCOME'
                      ? TEXT.income
                      : displayData.transType === 'TRANSFER'
                      ? TEXT.transfer
                      : TEXT.other}
                  </Text>
                </View>

                <View style={styles.divider} />

                {isEditing ? (
                  <View style={styles.editorBlock}>
                    <Text style={styles.infoLabel}>{TEXT.paymentAccount}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.payRow}>
                      {paymentSubjects.map(account => {
                        const selected = String(account.id) === String(editPaymentAccountId);
                        return (
                          <TouchableOpacity
                            key={String(account.id)}
                            style={[styles.payChip, selected && styles.payChipSelected]}
                            onPress={() => setEditPaymentAccountId(account.id)}>
                            <Text
                              style={[
                                styles.payChipText,
                                selected && styles.payChipTextSelected,
                              ]}>
                              {account.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{TEXT.paymentAccount}</Text>
                    <View style={styles.accountRow}>
                      <IconifyIcon
                        icon={paymentAccountDisplay.icon}
                        size={14}
                        color="#666"
                        fallback={TEXT.accountFallback}
                      />
                      <Text style={styles.infoValueInline}>{paymentAccountDisplay.name}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={[styles.infoRow, styles.infoRowTopAligned]}>
                  <Text style={styles.infoLabel}>{TEXT.description}</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder={TEXT.descriptionPlaceholder}
                      placeholderTextColor="#C8CDD5"
                      multiline
                      maxLength={200}
                    />
                  ) : (
                    <Text style={styles.infoValue}>{displayData.description || '-'}</Text>
                  )}
                </View>

                {fullDetail?.entries.length ? (
                  <>
                    <View style={styles.divider} />
                    <View style={[styles.infoRow, styles.infoRowTopAligned]}>
                      <Text style={styles.infoLabel}>{TEXT.entryDetails}</Text>
                      <View style={styles.entriesContainer}>
                        {fullDetail.entries.map((entry, index) => (
                          <View
                            key={entry.entryId || `${entry.accountId}-${index}`}
                            style={styles.entryItem}>
                            <View style={styles.entryHeader}>
                              <Text style={styles.entryDirection}>
                                {entry.direction === 'DEBIT' ? TEXT.debit : TEXT.credit}
                              </Text>
                              <Text style={styles.entryAmount}>{entry.amount}</Text>
                            </View>
                            <Text style={styles.entryAccount}>{entry.accountName}</Text>
                            {entry.memo ? (
                              <Text style={styles.entryMemo}>{entry.memo}</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                ) : null}

                {displayData.tags?.length ? (
                  <>
                    <View style={styles.divider} />
                    <View style={[styles.infoRow, styles.infoRowTopAligned]}>
                      <Text style={styles.infoLabel}>{TEXT.tags}</Text>
                      <View style={styles.tagsContainer}>
                        {displayData.tags.map(tag => (
                          <View
                            key={tag.tagId}
                            style={[styles.tag, {backgroundColor: `${tag.color}20`}]}>
                            <Text style={[styles.tagText, {color: tag.color}]}>
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

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    height: '72%',
    backgroundColor: '#F2F4F7',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
  closeBtn: {
    width: 32,
    fontSize: 24,
    textAlign: 'center',
    color: '#999',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  viewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B7DD8',
  },
  cancelBtn: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  saveBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B7DD8',
  },
  deleteBtnWrapper: {
    paddingLeft: 8,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#E8ECF1',
  },
  deleteBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4D4F',
  },
  actionDisabled: {
    color: '#C8CDD5',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPad: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  amountCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
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
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F6FF',
  },
  categoryName: {
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    minWidth: 80,
    padding: 0,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  amountIncome: {
    color: '#52C41A',
  },
  amountExpense: {
    color: '#333',
  },
  section: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoRowTopAligned: {
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    color: '#333',
  },
  infoValueInline: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F2F5',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorBlock: {
    paddingVertical: 12,
  },
  payRow: {
    paddingTop: 8,
    paddingBottom: 2,
    alignItems: 'center',
    gap: 8,
  },
  payChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E0E3E8',
    backgroundColor: '#F0F2F5',
  },
  payChipSelected: {
    borderColor: '#3B7DD8',
    backgroundColor: '#3B7DD8',
  },
  payChipText: {
    fontSize: 13,
    color: '#555',
  },
  payChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    padding: 8,
    fontSize: 14,
    textAlign: 'right',
    color: '#333',
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
  },
  entriesContainer: {
    flex: 1,
    gap: 8,
  },
  entryItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F5F6F8',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  entryDirection: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  entryAccount: {
    fontSize: 13,
    color: '#333',
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B7DD8',
  },
  entryMemo: {
    marginTop: 4,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
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
  bottomSpacer: {
    height: 24,
  },
});

export default TransactionDetailScreen;
