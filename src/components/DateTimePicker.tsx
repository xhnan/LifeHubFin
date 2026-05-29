import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

const THEME = '#3B7DD8';

interface DateTimePickerProps {
  visible: boolean;
  value: string;
  onConfirm: (dateTimeString: string) => void;
  onCancel: () => void;
  mode?: 'date' | 'datetime';
}

const parseDateTime = (value: string): Date => {
  const parts = value.replace(' ', 'T').split(/[-T:]/).map(Number);
  const now = new Date();

  return new Date(
    parts[0] || now.getFullYear(),
    (parts[1] || now.getMonth() + 1) - 1,
    parts[2] || now.getDate(),
    parts[3] ?? now.getHours(),
    parts[4] ?? now.getMinutes(),
    0,
    0,
  );
};

const formatDate = (date: Date): string => {
  const pad = (input: number) => String(input).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDateTime = (date: Date): string => {
  const pad = (input: number) => String(input).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join(' ');
};

const DateTimePickerComponent: React.FC<DateTimePickerProps> = ({
  visible,
  value,
  onConfirm,
  onCancel,
  mode = 'datetime',
}) => {
  const initialDate = useMemo(() => parseDateTime(value), [value]);
  const [draftDate, setDraftDate] = useState(initialDate);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraftDate(parseDateTime(value));
  }, [value, visible]);

  const confirmValue = (date: Date) => {
    onConfirm(mode === 'date' ? formatDate(date) : formatDateTime(date));
  };

  const handleAndroidChange = (
    event: DateTimePickerEvent,
    selectedValue?: Date,
  ) => {
    if (event.type === 'dismissed') {
      onCancel();
      return;
    }

    if (!selectedValue) {
      onCancel();
      return;
    }

    confirmValue(selectedValue);
  };

  if (!visible) {
    return null;
  }

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={draftDate}
        mode={mode}
        is24Hour={mode === 'datetime'}
        display="default"
        onChange={handleAndroidChange}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === 'date' ? '选择日期' : '选择时间'}
            </Text>
            <TouchableOpacity
              onPress={() => confirmValue(draftDate)}
              style={styles.headerButton}>
              <Text style={styles.confirmText}>确定</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={draftDate}
              mode={mode}
              display="spinner"
              is24Hour={mode === 'datetime'}
              locale="zh-CN"
              onChange={(_, selectedValue) => {
                if (selectedValue) {
                  setDraftDate(selectedValue);
                }
              }}
              style={styles.iosPicker}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  headerButton: {
    minWidth: 56,
    paddingVertical: 6,
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
  pickerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iosPicker: {
    width: '100%',
    height: 220,
  },
});

export default DateTimePickerComponent;
