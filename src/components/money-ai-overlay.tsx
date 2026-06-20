import { useRef, useState } from 'react';
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

import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { useT } from '@/i18n';
import { getAIReply } from '@/lib/coach';
import { useAppData } from '@/store/AppDataProvider';

type Message = { role: 'ai' | 'user'; text: string; action?: PendingAction };
type PendingAction = { label: string; description: string };

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MoneyAIOverlay({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { data } = useAppData();
  const t = useT();

  const QUICK_ACTIONS = [
    { icon: '🔍', label: t('ai.weeklyCheck'), q: 'Give me a quick weekly financial check.' },
    { icon: '❤️', label: t('ai.healthCheck'), q: 'Am I financially healthy right now?' },
    { icon: '💡', label: t('ai.saveMore'),    q: 'Suggest 3 ways I could save more this month.' },
    { icon: '🎯', label: t('ai.goalPlan'),    q: 'How can I reach my emergency fund goal faster?' },
  ];

  const [messages, setMessages] = useState<Message[]>(() => [
    { role: 'ai', text: t('ai.greeting', { name: data.name }) },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);

  async function send(q: string) {
    if (!q.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const goalsText = data.goals.length
        ? data.goals
            .map(
              (g) =>
                `${g.label} (RM ${g.saved.toLocaleString('en-MY')} of RM ${g.target.toLocaleString('en-MY')}, ${Math.round((g.saved / g.target) * 100)}%)`,
            )
            .join(', ')
        : 'No goals set yet';

      // Pass previous conversation (skip greeting, last 8 msgs)
      const history = messages
        .slice(1)
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));

      const reply = await getAIReply(
        q,
        data.name,
        {
          income: data.income,
          expense: data.expense,
          net: data.net,
          savingsRate: data.savingsRate,
          byMethod: data.byMethod,
        },
        goalsText,
        history,
      );

      const aiMsg: Message = { role: 'ai', text: reply.text, action: reply.action ?? undefined };
      setMessages((m) => [...m, aiMsg]);
      if (reply.action) setTimeout(() => setConfirm(reply.action as PendingAction), 400);
    } catch (e: any) {
      const isNoKey = e?.message === 'NO_API_KEY';
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: isNoKey
            ? t('ai.noKey')
            : `${t('ai.errorPrefix')}${e?.message?.slice(0, 80) ?? ''}`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.horse}>♞</Text>
            <View>
              <Text style={styles.headerTitle}>{t('ai.title')}</Text>
              <Text style={styles.headerSub}>{t('ai.sub')}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
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
                {m.role === 'ai' && <Text style={styles.bubbleWho}>♞ Money AI</Text>}
                <Text style={[styles.bubbleText, m.role === 'user' && styles.bubbleTextUser]}>
                  {m.text}
                </Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.bubbleAI]}>
                <Text style={styles.bubbleWho}>♞ Money AI</Text>
                <ActivityIndicator size="small" color={MC.emerald} style={{ marginTop: 2 }} />
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
              placeholder={t('ai.placeholder')}
              placeholderTextColor={MC.muted}
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

        {/* Confirm dialog */}
        {confirm && (
          <View style={styles.confirmBackdrop}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>{confirm.label}</Text>
              <Text style={styles.confirmDesc}>{confirm.description}</Text>
              <View style={styles.confirmBtns}>
                <Pressable style={styles.confirmNot} onPress={() => setConfirm(null)}>
                  <Text style={styles.confirmNotText}>{t('common.notNow')}</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmOk}
                  onPress={() => {
                    setMessages((m) => [
                      ...m,
                      {
                        role: 'ai',
                        text: `Done! I've noted: "${confirm!.label}". Remember, I can only suggest — take action in the app to make it real.`,
                      },
                    ]);
                    setConfirm(null);
                  }}>
                  <Text style={styles.confirmOkText}>{t('common.confirm')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: MC.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MS.lg,
    paddingVertical: MS.md,
    backgroundColor: MC.emerald,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
  horse: { fontSize: 28, color: '#fff' },
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
  bubble: {
    maxWidth: '86%',
    padding: MS.md,
    borderRadius: MR.lg,
  },
  bubbleAI: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  bubbleUser: {
    backgroundColor: MC.emerald,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleWho: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.emeraldDark,
    marginBottom: 3,
  },
  bubbleText: {
    fontSize: 13.5,
    fontFamily: MF.regular,
    color: MC.ink,
    lineHeight: 20,
  },
  bubbleTextUser: { color: '#fff' },
  quickScroll: { flexShrink: 0 },
  quickContent: { paddingHorizontal: MS.lg, paddingVertical: MS.sm, gap: MS.sm, alignItems: 'center' },
  quickChip: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: 999,
    paddingHorizontal: MS.md,
    paddingVertical: MS.sm,
  },
  quickChipDisabled: { opacity: 0.4 },
  quickChipText: {
    fontSize: 12,
    fontFamily: MF.semiBold,
    color: MC.emeraldDark,
  },
  inputRow: {
    flexDirection: 'row',
    gap: MS.sm,
    paddingHorizontal: MS.lg,
    paddingTop: MS.sm,
    backgroundColor: MC.bg,
  },
  input: {
    flex: 1,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: 999,
    paddingHorizontal: MS.lg,
    paddingVertical: MS.md,
    fontSize: 14,
    fontFamily: MF.regular,
    color: MC.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MC.gold,
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
    backgroundColor: 'rgba(21,36,30,0.55)',
    justifyContent: 'center',
    padding: MS.xxl,
  },
  confirmCard: {
    backgroundColor: MC.card,
    borderRadius: MR.xl,
    padding: MS.xxl,
    gap: MS.md,
  },
  confirmTitle: { fontSize: 17, fontFamily: MF.bold, color: MC.ink },
  confirmDesc: { fontSize: 14, fontFamily: MF.regular, color: MC.muted, lineHeight: 21 },
  confirmBtns: { flexDirection: 'row', gap: MS.sm, marginTop: MS.sm },
  confirmNot: {
    flex: 1,
    paddingVertical: MS.md,
    borderRadius: MR.md,
    borderWidth: 1,
    borderColor: MC.line,
    alignItems: 'center',
  },
  confirmNotText: { fontSize: 14, fontFamily: MF.semiBold, color: MC.muted },
  confirmOk: {
    flex: 1,
    paddingVertical: MS.md,
    borderRadius: MR.md,
    backgroundColor: MC.emerald,
    alignItems: 'center',
  },
  confirmOkText: { fontSize: 14, fontFamily: MF.semiBold, color: '#fff' },
});
