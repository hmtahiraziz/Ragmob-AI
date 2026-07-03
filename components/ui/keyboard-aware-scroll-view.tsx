import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';

type KeyboardAwareScrollContextValue = {
  onInputFocus: (field: View) => void;
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(null);

/** Returns scroll-into-view helper when inside KeyboardAwareScrollView. */
export function useKeyboardAwareScroll() {
  return useContext(KeyboardAwareScrollContext);
}

type KeyboardAwareScrollViewProps = Omit<ScrollViewProps, 'contentContainerStyle'> & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space between the focused field and the keyboard top. */
  focusGap?: number;
  /** Additional padding below scroll content when keyboard is closed. */
  bottomInset?: number;
  scrollRef?: RefObject<ScrollView | null>;
};

/**
 * ScrollView that pads for the keyboard (Android edge-to-edge safe) and scrolls
 * focused inputs into view — standard pattern for form screens.
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  focusGap = 24,
  bottomInset,
  scrollRef: externalRef,
  onScroll,
  ...rest
}: KeyboardAwareScrollViewProps) {
  const internalRef = useRef<ScrollView>(null);
  const scrollRef = externalRef ?? internalRef;
  const scrollY = useRef(0);
  const focusedFieldRef = useRef<View | null>(null);
  const keyboardInset = useKeyboardInset();
  const insets = useSafeAreaInsets();

  const paddingBottom =
    keyboardInset + (bottomInset ?? insets.bottom + Spacing.xl);

  const scrollFieldIntoView = useCallback(
    (field: View) => {
      requestAnimationFrame(() => {
        field.measureInWindow((_x, y, _w, height) => {
          const windowHeight = Dimensions.get('window').height;
          const visibleBottom = windowHeight - keyboardInset - focusGap;
          const fieldBottom = y + height;
          const overflow = fieldBottom - visibleBottom;
          if (overflow > 0) {
            scrollRef.current?.scrollTo({
              y: scrollY.current + overflow,
              animated: true,
            });
          }
        });
      });
    },
    [focusGap, keyboardInset, scrollRef],
  );

  const onInputFocus = useCallback(
    (field: View) => {
      focusedFieldRef.current = field;
      scrollFieldIntoView(field);
    },
    [scrollFieldIntoView],
  );

  useEffect(() => {
    if (keyboardInset > 0 && focusedFieldRef.current) {
      const delay = Platform.OS === 'android' ? 80 : 40;
      const timer = setTimeout(() => {
        if (focusedFieldRef.current) {
          scrollFieldIntoView(focusedFieldRef.current);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [keyboardInset, scrollFieldIntoView]);

  return (
    <KeyboardAwareScrollContext.Provider value={{ onInputFocus }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={[contentContainerStyle, { paddingBottom }]}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        {...rest}>
        {children}
      </ScrollView>
    </KeyboardAwareScrollContext.Provider>
  );
}
