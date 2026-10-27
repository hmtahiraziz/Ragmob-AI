import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { Spacing, Typography } from '@/constants/theme';
import { captureException } from '@/lib/monitoring/sentry';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Last-resort UI when a render throws. Reports to Sentry when configured.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error, { componentStack: info.componentStack });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.screen} accessibilityRole="alert">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. You can try again — if it keeps happening, restart the
          app.
        </Text>
        <Button title="Try again" onPress={this.handleRetry} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: '#F7F5F2',
  },
  title: {
    ...Typography.heading,
    fontSize: 22,
    color: '#121212',
  },
  body: {
    ...Typography.body,
    color: '#5C5C5C',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
});
