import { useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MarkdownMessageProps = {
  content: string;
};

/** Renders assistant content as themed Markdown (code, lists, links, etc.). */
export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const { colors } = useTheme();

  const markdownStyles = useMemo(
    () =>
      StyleSheet.create({
        body: { ...Typography.body, color: colors.text },
        heading1: { ...Typography.title, color: colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
        heading2: { ...Typography.heading, color: colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
        heading3: { ...Typography.heading, color: colors.text, marginTop: Spacing.xs, marginBottom: Spacing.xs },
        strong: { fontWeight: '700', color: colors.text },
        em: { fontStyle: 'italic' },
        link: { color: colors.primary, textDecorationLine: 'underline' },
        bullet_list: { marginVertical: Spacing.xs },
        ordered_list: { marginVertical: Spacing.xs },
        list_item: { marginVertical: 2 },
        bullet_list_icon: { color: colors.primary },
        ordered_list_icon: { color: colors.primary },
        blockquote: {
          backgroundColor: colors.surface2,
          borderLeftColor: colors.primary,
          borderLeftWidth: 3,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.xs,
          marginVertical: Spacing.xs,
        },
        code_inline: {
          ...Typography.caption,
          fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: colors.surface2,
          color: colors.text,
          borderRadius: Radius.sm,
          paddingHorizontal: 4,
          paddingVertical: 1,
        },
        code_block: {
          ...Typography.caption,
          fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: colors.surface2,
          color: colors.text,
          borderRadius: Radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: Spacing.md,
          marginVertical: Spacing.xs,
        },
        fence: {
          ...Typography.caption,
          fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: colors.surface2,
          color: colors.text,
          borderRadius: Radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: Spacing.md,
          marginVertical: Spacing.xs,
        },
        hr: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginVertical: Spacing.sm },
        table: { borderColor: colors.border, borderRadius: Radius.sm },
        th: { padding: Spacing.xs, color: colors.text },
        td: { padding: Spacing.xs, color: colors.text, borderColor: colors.border },
      }),
    [colors],
  );

  return (
    <Markdown
      style={markdownStyles}
      onLinkPress={(url) => {
        void Linking.openURL(url);
        return false;
      }}>
      {content}
    </Markdown>
  );
}
