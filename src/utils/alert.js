import { Alert, Platform } from 'react-native';

const webAlert = (title, description, options = []) => {
  if (!options || options.length === 0) {
    window.alert([title, description].filter(Boolean).join('\n'));
    return;
  }

  const message = [title, description].filter(Boolean).join('\n\n');
  
  if (options.length === 1) {
    window.alert(message);
    const onPress = options[0].onPress;
    if (onPress) setTimeout(onPress, 0);
    return;
  }

  const nonCancelOptions = options.filter(opt => opt.style !== 'cancel');
  const cancelOption = options.find(opt => opt.style === 'cancel');
  
  if (nonCancelOptions.length === 1) {
    const confirmed = window.confirm(message);
    
    if (confirmed) {
      const onPress = nonCancelOptions[0].onPress;
      if (onPress) setTimeout(onPress, 0);
    } else if (cancelOption) {
      const onPress = cancelOption.onPress;
      if (onPress) setTimeout(onPress, 0);
    }
  } else {
    const buttonLabels = nonCancelOptions.map(opt => opt.text).join(' / ');
    const fullMessage = `${message}\n\nOptions: ${buttonLabels}`;
    
    let selectedIndex = 0;
    while (selectedIndex < nonCancelOptions.length) {
      const currentOption = nonCancelOptions[selectedIndex];
      const nextOption = nonCancelOptions[selectedIndex + 1];
      
      if (!nextOption) {
        const proceed = window.confirm(`${message}\n\n${currentOption.text}?`);
        if (proceed) {
          const onPress = currentOption.onPress;
          if (onPress) setTimeout(onPress, 0);
          return;
        } else if (cancelOption) {
          const onPress = cancelOption.onPress;
          if (onPress) setTimeout(onPress, 0);
          return;
        }
        return;
      }
      
      const choice = window.confirm(`${message}\n\n${currentOption.text}?\n(Cancel for ${nextOption.text})`);
      if (choice) {
        const onPress = currentOption.onPress;
        if (onPress) setTimeout(onPress, 0);
        return;
      }
      selectedIndex++;
    }
    
    if (cancelOption) {
      const onPress = cancelOption.onPress;
      if (onPress) setTimeout(onPress, 0);
    }
  }
};

export const alert = (title, description, options) => {
  if (Platform.OS === 'web') {
    webAlert(title, description, options);
  } else {
    Alert.alert(title, description, options);
  }
};

export default alert;
