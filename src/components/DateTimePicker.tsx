import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
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
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);

  // 当外部 value 变化时，同步到内部状态
  useEffect(() => {
    setSelectedDate(parseDateTime(value));
  }, [value]);

  // 当 visible 变化时重置 picker 状态
  useEffect(() => {
    if (visible) {
      setPickerMode('date');
      setShowPicker(false);
    }
  }, [visible]);

  // 格式化日期时间为字符串
  const formatDateTime = (date: Date): string => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // 格式化日期显示
  const formatDateDisplay = (date: Date): string => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}`;
  };

  // 格式化时间显示
  const formatTimeDisplay = (date: Date): string => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
      // Android: 选择完日期后显示时间选择器
      if (Platform.OS === 'android' && pickerMode === 'date') {
        setPickerMode('time');
        setShowPicker(true);
      }
    }
  };

  const openDatePicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const openTimePicker = () => {
    setPickerMode('time');
    setShowPicker(true);
  };

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

          {/* 当前选择预览 */}
          <View style={s.previewBox}>
            <Text style={s.previewValue}>{formatDateTime(selectedDate)}</Text>
          </View>

          {/* iOS 原生日期时间选择器 */}
          {Platform.OS === 'ios' && (
            <View style={s.pickerWrapper}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor="#000"
                style={s.picker}
              />
              <View style={s.divider} />
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="spinner"
                onChange={handleDateChange}
                textColor="#000"
                style={s.picker}
              />
            </View>
          )}

          {/* Android 选择按钮 */}
          {Platform.OS === 'android' && (
            <View style={s.androidSection}>
              <TouchableOpacity
                style={s.androidPickerBtn}
                onPress={openDatePicker}
              >
                <Text style={s.androidPickerBtnLabel}>日期</Text>
                <Text style={s.androidPickerBtnValue}>
                  {formatDateDisplay(selectedDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.androidPickerBtn}
                onPress={openTimePicker}
              >
                <Text style={s.androidPickerBtnLabel}>时间</Text>
                <Text style={s.androidPickerBtnValue}>
                  {formatTimeDisplay(selectedDate)}
                </Text>
              </TouchableOpacity>

              {/* 原生选择器 */}
              {showPicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode={pickerMode}
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>
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
    color: '#3B7DD8',
    fontWeight: '600',
    textAlign: 'right',
  },
  previewBox: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F0F6FF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  previewValue: {
    fontSize: 18,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  pickerWrapper: {
    paddingVertical: 16,
  },
  picker: {
    height: 200,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  androidSection: {
    padding: 20,
  },
  androidPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  androidPickerBtnLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  androidPickerBtnValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});

export default DateTimePickerComponent;
