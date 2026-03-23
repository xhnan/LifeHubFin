import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
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

  const handleConfirm = () => {
    onConfirm(formatDateTime(selectedDate));
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // 生成年份列表（前后10年）
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from(
    { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
    (_, i) => i + 1
  );
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const updateYear = (year: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
  };

  const updateMonth = (month: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(month - 1);
    setSelectedDate(newDate);
  };

  const updateDay = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const updateHour = (hour: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hour);
    setSelectedDate(newDate);
  };

  const updateMinute = (minute: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMinutes(minute);
    setSelectedDate(newDate);
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

          {/* Android 滚轮选择器 */}
          {Platform.OS === 'android' && (
            <View style={s.androidSection}>
              <View style={s.wheelRow}>
                <WheelPicker
                  items={years.map(y => ({ label: String(y), value: y }))}
                  selectedValue={selectedDate.getFullYear()}
                  onSelect={updateYear}
                />
                <WheelPicker
                  items={months.map(m => ({ label: String(m).padStart(2, '0'), value: m }))}
                  selectedValue={selectedDate.getMonth() + 1}
                  onSelect={updateMonth}
                />
                <WheelPicker
                  items={days.map(d => ({ label: String(d).padStart(2, '0'), value: d }))}
                  selectedValue={selectedDate.getDate()}
                  onSelect={updateDay}
                />
              </View>
              <View style={s.divider} />
              <View style={s.wheelRow}>
                <WheelPicker
                  items={hours.map(h => ({ label: String(h).padStart(2, '0'), value: h }))}
                  selectedValue={selectedDate.getHours()}
                  onSelect={updateHour}
                />
                <Text style={s.colon}>:</Text>
                <WheelPicker
                  items={minutes.map(m => ({ label: String(m).padStart(2, '0'), value: m }))}
                  selectedValue={selectedDate.getMinutes()}
                  onSelect={updateMinute}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// 滚轮选择器组件
interface PickerItem {
  label: string;
  value: number;
}

interface WheelPickerProps {
  items: PickerItem[];
  selectedValue: number;
  onSelect: (value: number) => void;
}

const WheelPicker: React.FC<WheelPickerProps> = ({ items, selectedValue, onSelect }) => {
  const scrollViewRef = React.useRef<ScrollView>(null);
  const itemHeight = 44;
  const visibleItemCount = 5;

  useEffect(() => {
    const index = items.findIndex(item => item.value === selectedValue);
    if (index >= 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: index * itemHeight,
        animated: false,
      });
    }
  }, [items, selectedValue]);

  return (
    <View style={[s.wheelPicker, { height: itemHeight * visibleItemCount }]}>
      <View style={s.selectionIndicator} />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
          if (items[index]) {
            onSelect(items[index].value);
          }
        }}
        contentContainerStyle={{
          paddingVertical: (itemHeight * (visibleItemCount - 1)) / 2,
        }}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              s.wheelItem,
              { height: itemHeight },
              item.value === selectedValue && s.wheelItemSelected,
            ]}
            onPress={() => {
              onSelect(item.value);
              const index = items.findIndex(i => i.value === item.value);
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                  y: index * itemHeight,
                  animated: true,
                });
              }
            }}
          >
            <Text
              style={[
                s.wheelItemText,
                item.value === selectedValue && s.wheelItemTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
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
    paddingVertical: 20,
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  wheelPicker: {
    flex: 1,
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 44,
    marginTop: -22,
    backgroundColor: 'rgba(59, 125, 216, 0.1)',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemSelected: {
    // 选中项样式
  },
  wheelItemText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '500',
  },
  wheelItemTextSelected: {
    fontSize: 22,
    color: '#3B7DD8',
    fontWeight: '700',
  },
  colon: {
    fontSize: 24,
    color: '#333',
    fontWeight: '700',
    marginHorizontal: 8,
  },
});

export default DateTimePickerComponent;
