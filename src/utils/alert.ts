import { Alert, Platform } from 'react-native';

export const showAlert = (
  title: string,
  message?: string,
  buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[]
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      if (confirmed) {
        const okBtn = buttons.find((b) => b.style !== 'cancel');
        okBtn?.onPress?.();
      } else {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        cancelBtn?.onPress?.();
      }
    } else {
      window.alert(`${title}\n\n${message || ''}`);
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
