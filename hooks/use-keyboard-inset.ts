import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Extra bottom lift for docked composers when soft-input mode is `pan`.
 * (Chat uses KeyboardStickyView instead; this remains for other screens.)
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      setVisible(true);
      if (Platform.OS === 'ios') {
        Keyboard.scheduleLayoutAnimation(event);
      }
      setInset(Math.max(0, event.endCoordinates.height));
    };

    const onHide = () => {
      setVisible(false);
      setInset(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { inset, visible };
}
