import { useRef, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { useT } from '@/i18n';
import { getAgentReply } from '@/lib/agents/agent-runtime';
import type { AgentConfig, ChatTurn } from '@/lib/agents/types';

type Message = { role: 'ai' | 'user'; text: string };

interface Props<TData, TOps> {
  config: AgentConfig<TData, TOps>;
  visible: boolean;
  onClose: () => void;
  data: TData;
  ops: TOps;
  userName: string;
}

export function TabAgentOverlay<TData, TOps>({ config, visible, onClose, data, ops, userName }: Props<TData, TOps>) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const QUICK_ACTIONS = config.quickActions.map((a) => ({ ...a, label: t(a.labelKey) }));

  const [messages, setMessages] = useState<Message[]>(() => [
    { role: 'ai', text: t(config.greetingKey, { name: userName }) },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [pendingToolConfirm, setPendingToolConfirm] = useState<{
    label: string;
    description: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  const STATUS_LABELS: Record<string, string> = Object.fromEntries(
    Object.entries(config.statusLabelKeys).map(([toolName, key]) => [toolName, t(key)]),
  );

  function confirmAction(label: string, description: string): Promise<boolean> {
    return new Promise((resolve) => setPendingToolConfirm({ label, description, resolve }));
  }

  function handleClose() {
    if (pendingToolConfirm) {
      pendingToolConfirm.resolve(false);
      setPendingToolConfirm(null);
    }
    onClose();
  }

  async function send(q: string) {
    if (!q.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setAgentStatus(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const history: ChatTurn[] = messages
        .slice(1)
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));

      const reply = await getAgentReply(config, q, userName, data, ops, history, {
        onStatus: (toolName) => setAgentStatus(STATUS_LABELS[toolName] ?? t('ai.common.statusThinking')),
        confirmAction,
      });

      setMessages((m) => [...m, { role: 'ai', text: reply.text }]);
    } catch (e: any) {
      const isNoKey = e?.message === 'NO_API_KEY';
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: isNoKey
            ? t('ai.common.noKey')
            : `${t('ai.common.errorPrefix')}${e?.message?.slice(0, 80) ?? ''}`,
        },
      ]);
    } finally {
      setLoading(false);
      setAgentStatus(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.glyph}>{config.glyph}</Text>
            <View>
              <Text style={styles.headerTitle}>{t(config.titleKey)}</Text>
              <Text style={styles.headerSub}>{t(config.subtitleKey)}</Text>
            </View>
          </View>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Chat */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 60}>
          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}>
            {messages.map((m, i) => (
              <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                {m.role === 'ai' && <Text style={styles.bubbleWho}>{config.glyph} {t(config.titleKey)}</Text>}
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>
                  {m.text}
                </Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.bubbleAI]}>
                <Text style={styles.bubbleWho}>{config.glyph} {t(config.titleKey)}</Text>
                <ActivityIndicator size="small" color={C.emerald} style={{ marginTop: 2 }} />
                {!!agentStatus && <Text style={styles.statusText}>{agentStatus}</Text>}
              </View>
            )}
          </ScrollView>

          {/* Quick actions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={styles.quickContent}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                style={[styles.quickChip, loading && styles.quickChipDisabled]}
                onPress={() => send(a.q)}
                disabled={loading}>
                <Text style={styles.quickChipText}>{a.icon} {a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputRow, { paddingBottom: insets.bottom || 12 }]}>
            <TextInput
              style={styles.input}
              placeholder={t(config.placeholderKey)}
              placeholderTextColor={C.muted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              multiline={false}
              editable={!loading}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}>
              <Text style={styles.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Tool-gate confirm dialog — shown before a mutating tool actually runs */}
        {pendingToolConfirm && (
          <View style={styles.confirmBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>
                {t('ai.common.confirmActionTitle', { action: pendingToolConfirm.label })}
              </Text>
              <Text style={styles.confirmDesc}>{pendingToolConfirm.description}</Text>
              <View style={styles.confirmBtns}>
                <Pressable
                  style={styles.confirmNot}
                  onPress={() => {
                    pendingToolConfirm.resolve(false);
                    setPendingToolConfirm(null);
                  }}>
                  <Text style={styles.confirmNotText}>{t('ai.common.deny')}</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmOk}
                  onPress={() => {
                    pendingToolConfirm.resolve(true);
                    setPendingToolConfirm(null);
                  }}>
                  <Text style={styles.confirmOkText}>{t('ai.common.allow')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: MS.lg,
      paddingVertical: MS.md,
      backgroundColor: C.emerald,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
    glyph: { fontSize: 28, color: '#fff' },
    headerTitle: { fontSize: 18, fontFamily: MF.bold, color: '#fff' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { color: '#fff', fontSize: 14, fontFamily: MF.bold },
    chat: { flex: 1 },
    chatContent: { padding: MS.lg, gap: MS.md, flexGrow: 1, justifyContent: 'flex-end' },
    bubble: { maxWidth: '86%', padding: MS.md, borderRadius: MR.lg },
    bubbleAI: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderBottomLeftRadius: 4,
      alignSelf: 'flex-start',
    },
    bubbleUser: {
      backgroundColor: C.emerald,
      borderBottomRightRadius: 4,
      alignSelf: 'flex-end',
    },
    bubbleWho: { fontSize: 10, fontFamily: MF.bold, color: C.emeraldDark, marginBottom: 3 },
    statusText: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 4, fontStyle: 'italic' },
    bubbleText: { fontSize: 13.5, fontFamily: MF.regular, color: C.ink, lineHeight: 20 },
    bubbleTextUser: { color: '#fff' },
    quickScroll: { flexShrink: 0 },
    quickContent: { paddingHorizontal: MS.lg, paddingVertical: MS.sm, gap: MS.sm, alignItems: 'center' },
    quickChip: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 999,
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
    },
    quickChipDisabled: { opacity: 0.4 },
    quickChipText: { fontSize: 12, fontFamily: MF.semiBold, color: C.emeraldDark },
    inputRow: {
      flexDirection: 'row',
      gap: MS.sm,
      paddingHorizontal: MS.lg,
      paddingTop: MS.sm,
      backgroundColor: C.bg,
    },
    input: {
      flex: 1,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 999,
      paddingHorizontal: MS.lg,
      paddingVertical: MS.md,
      fontSize: 14,
      fontFamily: MF.regular,
      color: C.ink,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: '#fff', fontSize: 18, fontFamily: MF.bold },
    confirmBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.backdrop,
      justifyContent: 'center',
      padding: MS.xxl,
    },
    confirmCard: {
      backgroundColor: C.card,
      borderRadius: MR.xl,
      padding: MS.xxl,
      gap: MS.md,
    },
    confirmTitle: { fontSize: 17, fontFamily: MF.bold, color: C.ink },
    confirmDesc: { fontSize: 14, fontFamily: MF.regular, color: C.muted, lineHeight: 21 },
    confirmBtns: { flexDirection: 'row', gap: MS.sm, marginTop: MS.sm },
    confirmNot: {
      flex: 1,
      paddingVertical: MS.md,
      borderRadius: MR.md,
      borderWidth: 1,
      borderColor: C.line,
      alignItems: 'center',
    },
    confirmNotText: { fontSize: 14, fontFamily: MF.semiBold, color: C.muted },
    confirmOk: {
      flex: 1,
      paddingVertical: MS.md,
      borderRadius: MR.md,
      backgroundColor: C.emerald,
      alignItems: 'center',
    },
    confirmOkText: { fontSize: 14, fontFamily: MF.semiBold, color: '#fff' },
  });
}
