import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';

const DatePickerInput = ({ value, onChange, placeholder = 'Select date', label, minDate, maxDate, style }) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const displayValue = value ? moment(value, ['YYYY-MM-DD', 'MM/DD/YYYY']).format('MMM D, YYYY') : '';
  const calendarValue = value ? moment(value, ['YYYY-MM-DD', 'MM/DD/YYYY']).format('YYYY-MM-DD') : '';

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputButton} onPress={() => setShowCalendar(true)}>
        <Text style={[styles.inputText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <View style={styles.popupContainer}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>{label || 'Select Date'}</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Calendar
                current={calendarValue || undefined}
                onDayPress={(day) => {
                  onChange(day.dateString);
                  setShowCalendar(false);
                }}
                markedDates={{
                  [calendarValue]: { selected: true, selectedColor: '#1E3A5F' }
                }}
                minDate={minDate}
                maxDate={maxDate}
                theme={{
                  backgroundColor: '#FFFFFF',
                  calendarBackground: '#FFFFFF',
                  todayTextColor: '#1E3A5F',
                  selectedDayBackgroundColor: '#1E3A5F',
                  selectedDayTextColor: '#ffffff',
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  arrowColor: '#1E3A5F',
                  monthTextColor: '#1E3A5F',
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 14
                }}
              />
              <TouchableOpacity style={styles.todayButton} onPress={() => {
                const today = moment().format('YYYY-MM-DD');
                onChange(today);
                setShowCalendar(false);
              }}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
  icon: {
    fontSize: 18,
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
      default: { elevation: 10 },
    }),
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1E3A5F',
  },
  popupTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    padding: 4,
  },
  todayButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  todayButtonText: {
    color: '#1E3A5F',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DatePickerInput;
