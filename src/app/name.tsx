import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getAppData } from '@/data/app-data';
import { ADMIN_KEY, toMember, useMember } from '@/hooks/use-member';
import { useTheme } from '@/hooks/use-theme';

export default function NameScreen() {
  const { remember } = useMember();
  const theme = useTheme();
  const [typedName, setTypedName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const asksForPin = toMember(typedName)?.key === ADMIN_KEY;

  async function submit() {
    const member = toMember(typedName);
    if (!member) {
      setError('Please type your name.');
      return;
    }
    // The name admin is reserved for the Admin: it needs the right PIN.
    if (member.key === ADMIN_KEY) {
      if (!pin) {
        setError('Please type the Admin PIN.');
        return;
      }
      try {
        if (!(await getAppData().checkAdminPin(pin))) {
          setError('Wrong PIN. Please try again.');
          return;
        }
      } catch {
        setError("Couldn't check the PIN. Check your connection and try again.");
        return;
      }
    }
    remember(member);
    // Back to the Order screen if it is below us (switching name), else replace this screen.
    router.dismissTo('/');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="subtitle">What&apos;s your name?</ThemedText>

        <TextInput
          value={typedName}
          onChangeText={(text) => {
            setTypedName(text);
            setError(null);
          }}
          onSubmitEditing={submit}
          placeholder="Your name"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="done"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        {asksForPin && (
          <TextInput
            value={pin}
            onChangeText={(text) => {
              setPin(text);
              setError(null);
            }}
            onSubmitEditing={submit}
            placeholder="Admin PIN"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            returnKeyType="done"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        )}
        {error && (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        )}

        <Pressable onPress={submit} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.button}>
            <ThemedText type="smallBold">Continue</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
