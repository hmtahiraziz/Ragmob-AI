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
        body: {
          ...Typography.body,
          color: colors.text,
          lineHeight: 24,
        },
        paragraph: {
          marginTop: 0,
          marginBottom: Spacing.sm,
          lineHeight: 24,
        },
        heading1: {
          ...Typography.title,
          color: colors.text,
          marginTop: Spacing.md,
          marginBottom: Spacing.sm,
          lineHeight: 30,
        },
        heading2: {
          ...Typography.heading,
          color: colors.text,
          marginTop: Spacing.md,
          marginBottom: Spacing.xs,
          lineHeight: 26,
        },
        heading3: {
          ...Typography.heading,
          color: colors.text,
          marginTop: Spacing.sm,
          marginBottom: Spacing.xs,
          fontSize: 16,
          lineHeight: 22,
        },
        strong: { fontWeight: '700', color: colors.text },
        em: { fontStyle: 'italic' },
        link: { color: colors.primaryDark, textDecorationLine: 'underline' },
        bullet_list: { marginVertical: Spacing.xs, paddingLeft: 2 },
        ordered_list: { marginVertical: Spacing.xs, paddingLeft: 2 },
        list_item: { marginVertical: 4, flexDirection: 'row' },
        bullet_list_icon: { color: colors.primaryDark, marginTop: 3 },
        ordered_list_icon: { color: colors.primaryDark, marginTop: 2 },
        blockquote: {
          backgroundColor: colors.surface2,
          borderLeftColor: colors.primary,
          borderLeftWidth: 3,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          marginVertical: Spacing.sm,
        },
        code_inline: {
          ...Typography.caption,
          fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: colors.surface2,
          color: colors.text,
          borderRadius: Radius.sm,
          paddingHorizontal: 5,
          paddingVertical: 2,
        },
        code_block: {
          ...Typography.caption,
          fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: colors.surface2,
          color: colors.text,
          borderRadius: Radius.md,
          padding: Spacing.md,
          marginVertical: Spacing.sm,
          lineHeight: 20,
        },
        fence: {
          ...Typography.caption,
          fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
          backgroundColor: colors.surface2,
          color: colors.text,
          borderRadius: Radius.md,
          padding: Spacing.md,
          marginVertical: Spacing.sm,
          lineHeight: 20,
        },
        hr: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
        table: { borderColor: colors.border, borderRadius: Radius.sm, marginVertical: Spacing.sm },
        th: { padding: Spacing.sm, color: colors.text, fontWeight: '600' },
        td: { padding: Spacing.sm, color: colors.text, borderColor: colors.border },
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
