import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';

const THEME = '#3B7DD8';
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface DateTimePickerProps {
  visible: boolean;
  value: string; // 格式: "YYYY-MM-DD HH:mm"
  onConfirm: (dateTimeString: string) => void;
  onCancel: () => void;
}

const DateTimePickerComponent: React.FC<DateTimePickerProps> = ({
  visible,
  value,
  onConfirm,
  onCancel,
}) => {
  const parseDateTime = (str: string): Date => {
    const parts = str.replace(' ', 'T').split(/[-T:]/);
    const nums = parts.map(Number);
    const year = nums[0] || new Date().getFullYear();
    const month = nums[1] || 1;
    const day = nums[2] || 1;
    const hour = nums[3] ?? 0;
    const minute = nums[4] ?? 0;
    return new Date(year, month - 1, day, hour, minute);
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseDateTime(value),
  );

  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    const d = parseDateTime(value);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    const d = parseDateTime(value);
    setSelectedDate(d);
    setDisplayMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [value]);

  // 确认时保留原始时间的时分，只替换日期
  const handleConfirm = () => {
    const pad = (v: number) => String(v).padStart(2, '0');
    const d = selectedDate;
    const now = new Date();
    // 使用当前时间的时分
    const result = new Date(
      d.getFullYear(), d.getMonth(), d.getDate(),
      now.getHours(), now.getMinutes(),
    );
    onConfirm(
      `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())} ${pad(result.getHours())}:${pad(result.getMinutes())}`,
    );
  };

  // ── 日历数据 ──
  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const cells: { day: number; inMonth: boolean; date: Date }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, inMonth: false, date: new Date(year, month - 1, prevDays - i) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
    }

    return cells;
  }, [displayMonth]);

  const prevMonth = () => {
    setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== displayMonth.getMonth() || date.getFullYear() !== displayMonth.getFullYear()) {
      setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();
  const displayLabel = `${displayMonth.getFullYear()}年${displayMonth.getMonth() + 1}月`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          {/* 顶部标题栏 */}
          <View style={s.header}>
            <TouchableOpacity onPress={onCancel} style={s.headerBtn}>
              <Text style={s.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>选择日期</Text>
            <TouchableOpacity onPress={handleConfirm} style={s.headerBtn}>
              <Text style={s.confirmText}>确定</Text>
            </TouchableOpacity>
          </View>

          {/* 日历 */}
          <View style={s.calendarSection}>
            {/* 月份导航 */}
            <View style={s.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={s.arrowBtn}>
                <Text style={s.arrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={s.monthLabel}>{displayLabel}</Text>
              <TouchableOpacity onPress={nextMonth} style={s.arrowBtn}>
                <Text style={s.arrowText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 星期头 */}
            <View style={s.weekRow}>
              {WEEKDAYS.map(w => (
                <View key={w} style={s.weekCell}>
                  <Text style={[s.weekText, w === '日' && s.weekTextSun]}>{w}</Text>
                </View>
              ))}
            </View>

            {/* 日期格子 */}
            <View style={s.daysGrid}>
              {calendarDays.map((cell, idx) => {
                const isSelected = isSameDay(cell.date, selectedDate);
                const isToday = isSameDay(cell.date, today);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.dayCell,
                      isSelected && s.dayCellSelected,
                      isToday && !isSelected && s.dayCellToday,
                    ]}
                    onPress={() => selectDay(cell.date)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        s.dayText,
                        !cell.inMonth && s.dayTextOut,
                        isSelected && s.dayTextSelected,
                        isToday && !isSelected && s.dayTextToday,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
  },
  cancelText: {
    fontSize: 16,
    color: '#999',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  confirmText: {
    fontSize: 16,
    color: THEME,
    fontWeight: '600',
    textAlign: 'right',
  },

  // ── 日历 ──
  calendarSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 28,
    color: THEME,
    fontWeight: '300',
    marginTop: -4,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  weekTextSun: {
    color: '#E67E22',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}` as any,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  dayCellSelected: {
    backgroundColor: THEME,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: THEME,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  dayTextOut: {
    color: '#ccc',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: THEME,
    fontWeight: '600',
  },
});

export default DateTimePickerComponent;
