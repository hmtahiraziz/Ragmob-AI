import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  View,
  type ScrollView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView as KCScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

type KeyboardAwareScrollContextValue = {
  onInputFocus: (field: View) => void;
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(null);

/** Returns scroll-into-view helper when inside KeyboardAwareScrollView. */
export function useKeyboardAwareScroll() {
  return useContext(KeyboardAwareScrollContext);
}

type KeyboardAwareScrollViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space between the focused field and the keyboard top. */
  focusGap?: number;
  /** Additional padding below scroll content when keyboard is closed. */
  bottomInset?: number;
  scrollRef?: RefObject<ScrollView | null>;
};

/**
 * Auth/forms scroll view powered by react-native-keyboard-controller.
 */
export function KeyboardAwareScrollView({
  children,
  style,
  contentContainerStyle,
  focusGap = 36,
  bottomInset,
  scrollRef,
}: KeyboardAwareScrollViewProps) {
  const insets = useSafeAreaInsets();
  const focusedFieldRef = useRef<View | null>(null);

  const onInputFocus = useCallback((field: View) => {
    focusedFieldRef.current = field;
  }, []);

  return (
    <KeyboardAwareScrollContext.Provider value={{ onInputFocus }}>
      <KCScrollView
        ref={scrollRef as never}
        style={style}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={focusGap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraKeyboardSpace={bottomInset ?? insets.bottom + Spacing.xxl}>
        {children}
      </KCScrollView>
    </KeyboardAwareScrollContext.Provider>
  );
}
