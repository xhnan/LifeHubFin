import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export interface QuickOption {
  label: string;
  getYearMonth: () => {year: number; month: number};
}

interface MonthPickerProps {
  visible: boolean;
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
  quickOptions?: QuickOption[];
}

const MonthPicker: React.FC<MonthPickerProps> = ({
  visible,
  currentYear,
  currentMonth,
  onSelect,
  onClose,
  quickOptions,
}) => {
  const [pickerYear, setPickerYear] = useState(currentYear);

  const handleMonthSelect = useCallback(
    (month: number) => {
      onSelect(pickerYear, month);
      onClose();
    },
    [pickerYear, onSelect, onClose],
  );

  const handleQuickSelect = useCallback(
    (option: QuickOption) => {
      const {year, month} = option.getYearMonth();
      onSelect(year, month);
      onClose();
    },
    [onSelect, onClose],
  );

  const changeYear = useCallback((delta: number) => {
    setPickerYear(p => p + delta);
  }, []);

  const now = new Date();
  const currentTodayYear = now.getFullYear();
  const currentTodayMonth = now.getMonth() + 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.card} onStartShouldSetResponder={() => true}>
          {/* 拖动指示条 */}
          <View style={s.handle} />

          {/* 快捷选项 */}
          {quickOptions && quickOptions.length > 0 && (
            <View style={s.quickSection}>
              <Text style={s.quickTitle}>快捷选择</Text>
              <View style={s.quickGrid}>
                {quickOptions.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.quickBtn}
                    onPress={() => handleQuickSelect(opt)}
                    activeOpacity={0.7}>
                    <Text style={s.quickBtnText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 年份选择 */}
          <View style={s.yearRow}>
            <TouchableOpacity
              onPress={() => changeYear(-1)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              style={s.yearArrowBtn}
              activeOpacity={0.7}>
              <Text style={s.yearArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={s.yearText}>{pickerYear}年</Text>
            <TouchableOpacity
              onPress={() => changeYear(1)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              style={s.yearArrowBtn}
              activeOpacity={0.7}>
              <Text style={s.yearArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 月份网格 */}
          <View style={s.monthGrid}>
            {MONTHS.map(month => {
              const isSelected = pickerYear === currentYear && month === currentMonth;
              const isCurrentMonth =
                pickerYear === currentTodayYear && month === currentTodayMonth;

              return (
                <TouchableOpacity
                  key={month}
                  style={[
                    s.monthCell,
                    isSelected && s.monthCellSelected,
                    isCurrentMonth && !isSelected && s.monthCellCurrent,
                  ]}
                  onPress={() => handleMonthSelect(month)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      s.monthCellText,
                      isSelected && s.monthCellTextSelected,
                      isCurrentMonth && !isSelected && s.monthCellTextCurrent,
                    ]}>
                    {month}月
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 回到今天按钮 */}
          <TouchableOpacity
            style={s.todayBtn}
            onPress={() => handleQuickSelect({
              label: '回到今天',
              getYearMonth: () => ({year: currentTodayYear, month: currentTodayMonth}),
            })}
            activeOpacity={0.7}>
            <Text style={s.todayBtnText}>📅 回到本月</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // 快捷选项
  quickSection: {
    marginBottom: 20,
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },

  // 年份选择
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  yearArrowBtn: {
    paddingVertical: 4,
  },
  yearArrow: {
    fontSize: 28,
    color: '#3B7DD8',
    paddingHorizontal: 20,
    fontWeight: '300',
  },
  yearText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    minWidth: 80,
    textAlign: 'center',
  },

  // 月份网格
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  monthCell: {
    width: '23%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  monthCellSelected: {
    backgroundColor: '#3B7DD8',
  },
  monthCellCurrent: {
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  monthCellText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  monthCellTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  monthCellTextCurrent: {
    color: '#10B981',
    fontWeight: '700',
  },

  // 回到今天
  todayBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
  },
  todayBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B7DD8',
  },
});

export default MonthPicker;

// 预设快捷选项工厂
export const createQuickOptions = (): QuickOption[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return [
    {
      label: '本月',
      getYearMonth: () => ({year, month}),
    },
    {
      label: '上月',
      getYearMonth: () => {
        if (month === 1) return {year: year - 1, month: 12};
        return {year, month: month - 1};
      },
    },
    {
      label: '今年',
      getYearMonth: () => ({year, month: 1}),
    },
    {
      label: '去年',
      getYearMonth: () => ({year: year - 1, month: 1}),
    },
  ];
};
