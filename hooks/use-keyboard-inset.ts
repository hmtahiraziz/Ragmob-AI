import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Returns how many px to lift bottom-docked UI (composer) above the keyboard.
 * Uses screenY on Android edge-to-edge for accurate overlap measurement.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      if (Platform.OS === 'ios') {
        Keyboard.scheduleLayoutAnimation(event);
      }
      const { height, screenY } = event.endCoordinates;
      const windowHeight = Dimensions.get('window').height;
      const overlap = Platform.OS === 'android' ? Math.max(height, windowHeight - screenY) : height;
      setInset(Math.max(0, overlap));
    };

    const onHide = () => setInset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}
