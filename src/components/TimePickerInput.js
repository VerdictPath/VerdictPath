import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform } from 'react-native';

const generateTimeSlots = (interval = 15) => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += interval) {
      const hour24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${hour12}:${String(m).padStart(2, '0')} ${period}`;
      slots.push({ value: hour24, label });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots(15);

const TimePickerInput = ({ value, onChange, placeholder = 'Select time', label, style }) => {
  const [showPicker, setShowPicker] = useState(false);
  const scrollRef = useRef(null);

  const displayValue = value
    ? (TIME_SLOTS.find(s => s.value === value)?.label || value)
    : '';

  useEffect(() => {
    if (showPicker && scrollRef.current && value) {
      const idx = TIME_SLOTS.findIndex(s => s.value === value);
      if (idx > 0) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: Math.max(0, idx * 44 - 88), animated: false });
        }, 100);
      }
    }
  }, [showPicker, value]);

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputButton} onPress={() => setShowPicker(true)}>
        <Text style={[styles.inputText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
        </Text>
        <Text style={styles.icon}>🕐</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.popupContainer}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>{label || 'Select Time'}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView ref={scrollRef} style={styles.timeList} nestedScrollEnabled>
                {TIME_SLOTS.map((slot) => (
                  <TouchableOpacity
                    key={slot.value}
                    style={[styles.timeSlot, value === slot.value && styles.timeSlotSelected]}
                    onPress={() => {
                      onChange(slot.value);
                      setShowPicker(false);
                    }}
                  >
                    <Text style={[styles.timeSlotText, value === slot.value && styles.timeSlotTextSelected]}>
                      {slot.label}
                    </Text>
                    {value === slot.value && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
    maxWidth: 340,
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
  timeList: {
    maxHeight: 300,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeSlotSelected: {
    backgroundColor: '#EBF5FB',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
  },
  timeSlotTextSelected: {
    color: '#1E3A5F',
    fontWeight: '700',
  },
  checkmark: {
    color: '#1E3A5F',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default TimePickerInput;
