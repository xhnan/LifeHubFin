import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  // 解析传入的日期字符串
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
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

  // 当外部 value 变化时，同步到内部状态
  useEffect(() => {
    setSelectedDate(parseDateTime(value));
  }, [value]);

  // 格式化日期时间为字符串
  const formatDateTime = (date: Date): string => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 格式化日期显示
  const formatDateDisplay = (date: Date): string => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = days[date.getDay()];
    return `${year}年${month}月${day}日 星期${weekDay}`;
  };

  // 格式化时间显示
  const formatTimeDisplay = (date: Date): string => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 快捷日期选择
  const setQuickDate = (daysOffset: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + daysOffset);
    newDate.setHours(selectedDate.getHours());
    newDate.setMinutes(selectedDate.getMinutes());
    setSelectedDate(newDate);
  };

  const setQuickTime = (hour: number, minute: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hour);
    newDate.setMinutes(minute);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onConfirm(formatDateTime(selectedDate));
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const openDatePicker = () => {
    setMode('date');
    setShowPicker(true);
  };

  const openTimePicker = () => {
    setMode('time');
    setShowPicker(true);
  };

  const quickDates = [
    { label: '今天', offset: 0 },
    { label: '昨天', offset: -1 },
    { label: '前天', offset: -2 },
    { label: '明天', offset: 1 },
  ];

  const quickTimes = [
    {
      label: '现在',
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
    },
    { label: '早上', hour: 9, minute: 0 },
    { label: '中午', hour: 12, minute: 0 },
    { label: '下午', hour: 15, minute: 0 },
    { label: '晚上', hour: 18, minute: 0 },
  ];

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
            <Text style={s.headerTitle}>选择日期时间</Text>
            <TouchableOpacity onPress={handleConfirm} style={s.headerBtn}>
              <Text style={s.confirmText}>确定</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* 快捷日期选择 */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>快捷日期</Text>
              <View style={s.quickRow}>
                {quickDates.map(item => (
                  <TouchableOpacity
                    key={item.label}
                    style={s.quickBtn}
                    onPress={() => setQuickDate(item.offset)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.quickBtnText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 日期选择器 */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>日期</Text>
              <TouchableOpacity
                style={s.displayBox}
                onPress={openDatePicker}
                activeOpacity={0.7}
              >
                <Text style={s.displayIcon}>📅</Text>
                <View style={s.displayContent}>
                  <Text style={s.displayLabel}>日期</Text>
                  <Text style={s.displayValue}>
                    {formatDateDisplay(selectedDate)}
                  </Text>
                </View>
                <Text style={s.displayArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 快捷时间选择 */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>快捷时间</Text>
              <View style={s.quickRow}>
                {quickTimes.map(item => (
                  <TouchableOpacity
                    key={item.label}
                    style={[s.quickBtn, s.quickBtnSmall]}
                    onPress={() => setQuickTime(item.hour, item.minute)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.quickBtnText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 时间选择器 */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>时间</Text>
              <TouchableOpacity
                style={s.displayBox}
                onPress={openTimePicker}
                activeOpacity={0.7}
              >
                <Text style={s.displayIcon}>🕐</Text>
                <View style={s.displayContent}>
                  <Text style={s.displayLabel}>时间</Text>
                  <Text style={s.displayValue}>
                    {formatTimeDisplay(selectedDate)}
                  </Text>
                </View>
                <Text style={s.displayArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 当前选择预览 */}
            <View style={s.previewBox}>
              <Text style={s.previewLabel}>当前选择</Text>
              <Text style={s.previewValue}>{formatDateTime(selectedDate)}</Text>
            </View>
          </ScrollView>

          {/* 原生日期时间选择器 */}
          {showPicker && (
            <>
              {Platform.OS === 'ios' && (
                <View style={s.pickerContainer}>
                  <DateTimePicker
                    value={selectedDate}
                    mode={mode}
                    display="spinner"
                    onChange={handleDateChange}
                    textColor="#000"
                  />
                  <TouchableOpacity
                    style={s.pickerDoneBtn}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={s.pickerDoneText}>完成</Text>
                  </TouchableOpacity>
                </View>
              )}
              {Platform.OS === 'android' && (
                <DateTimePicker
                  value={selectedDate}
                  mode={mode}
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </>
          )}
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
    maxHeight: '85%',
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
    color: '#3B7DD8',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
    fontWeight: '500',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickBtn: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickBtnText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  displayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  displayIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  displayContent: {
    flex: 1,
  },
  displayLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  displayValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  displayArrow: {
    fontSize: 24,
    color: '#D0D5DD',
  },
  previewBox: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0E3FF',
  },
  previewLabel: {
    fontSize: 13,
    color: '#3B7DD8',
    marginBottom: 6,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 18,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pickerDoneBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#3B7DD8',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
  },
  pickerDoneText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default DateTimePickerComponent;
