import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MF, MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { sendMessage, subscribeToMessages, type ChatMessage } from '@/lib/chat';
import { type Advisor } from '@/lib/advisors';

const USER_ID_KEY = 'money-hub-user-id';

function generateUserId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface Props {
  advisor: Advisor;
  onClose: () => void;
}

export function ChatScreen({ advisor, onClose }: Props) {
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem(USER_ID_KEY).then((id) => {
      if (id) {
        setUserId(id);
      } else {
        const newId = generateUserId();
        AsyncStorage.setItem(USER_ID_KEY, newId);
        setUserId(newId);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setConnecting(true);
    const unsub = subscribeToMessages(advisor.id, userId, (msgs) => {
      setMessages(msgs);
      setConnecting(false);
    });
    return unsub;
  }, [userId, advisor.id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!userId || !inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(advisor.id, userId, text);
    } catch {
      setSendError('Could not send. Check your connection.');
    } finally {
      setSending(false);
    }
  };

  const canSend = !!inputText.trim() && !sending;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.backTxt}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerAvatar}>{advisor.avatar}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{advisor.name}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{advisor.title}</Text>
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerTxt}>
          Not financial advice. Verify credentials before acting on recommendations.
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled">

        {connecting && (
          <View style={styles.centerState}>
            <ActivityIndicator color={C.indigo} />
          </View>
        )}

        {!connecting && messages.length === 0 && (
          <View style={styles.centerState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyHint}>{advisor.name} will reply shortly.</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubbleWrap, msg.sender === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapAdvisor]}>
            {msg.sender === 'advisor' && (
              <Text style={styles.bubbleAvatar}>{advisor.avatar}</Text>
            )}
            <View style={[styles.bubble, msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAdvisor]}>
              <Text style={[styles.bubbleTxt, msg.sender === 'user' ? styles.bubbleTxtUser : styles.bubbleTxtAdvisor]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Error */}
      {sendError && (
        <Text style={styles.sendErrorTxt}>{sendError}</Text>
      )}

      {/* Input row */}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, MS.sm) }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message…"
          placeholderTextColor={C.muted}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [styles.sendBtn, !canSend && styles.sendBtnDisabled, pressed && { opacity: 0.7 }]}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: MS.sm,
      paddingHorizontal: MS.md,
      paddingBottom: MS.md,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
      backgroundColor: C.card,
    },
    backBtn: { paddingRight: MS.xs },
    backTxt: { fontSize: 16, fontFamily: MF.semiBold, color: C.indigo },
    headerAvatar: { fontSize: 28 },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 15, fontFamily: MF.bold, color: C.ink },
    headerTitle: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 1 },

    disclaimerBar: {
      backgroundColor: C.goldLight,
      borderBottomWidth: 1,
      borderBottomColor: C.goldBorder,
      paddingHorizontal: MS.lg,
      paddingVertical: MS.xs,
    },
    disclaimerTxt: {
      fontSize: 10,
      fontFamily: MF.regular,
      color: C.goldText,
      textAlign: 'center',
      lineHeight: 15,
    },

    messageList: { flex: 1 },
    messageContent: { padding: MS.md, gap: MS.sm, flexGrow: 1 },

    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: MS.sm, paddingVertical: MS.xxl },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 15, fontFamily: MF.semiBold, color: C.ink },
    emptyHint: { fontSize: 13, fontFamily: MF.regular, color: C.muted },

    bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: MS.xs },
    bubbleWrapUser: { justifyContent: 'flex-end' },
    bubbleWrapAdvisor: { justifyContent: 'flex-start' },
    bubbleAvatar: { fontSize: 20, marginBottom: 2 },
    bubble: {
      maxWidth: '75%',
      borderRadius: MR.lg,
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
    },
    bubbleUser: {
      backgroundColor: C.indigo,
      borderBottomRightRadius: 4,
    },
    bubbleAdvisor: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderBottomLeftRadius: 4,
    },
    bubbleTxt: { fontSize: 14, fontFamily: MF.regular, lineHeight: 21 },
    bubbleTxtUser: { color: '#fff' },
    bubbleTxtAdvisor: { color: C.ink },

    sendErrorTxt: {
      fontSize: 11,
      fontFamily: MF.regular,
      color: C.clay,
      textAlign: 'center',
      paddingVertical: MS.xs,
    },

    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: MS.sm,
      paddingHorizontal: MS.md,
      paddingTop: MS.sm,
      borderTopWidth: 1,
      borderTopColor: C.line,
      backgroundColor: C.card,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      backgroundColor: C.bg,
      borderWidth: 1.5,
      borderColor: C.line,
      borderRadius: MR.lg,
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
      fontSize: 14,
      fontFamily: MF.regular,
      color: C.ink,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.indigo,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: C.muted + '50' },
    sendIcon: { fontSize: 16, color: '#fff' },
  });
}
