import { useRef, useState } from 'react';
import {
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
import { MOCK } from '@/constants/mock-data';

type Message = { role: 'ai' | 'user'; text: string; action?: PendingAction };
type PendingAction = { label: string; description: string };

const QUICK_ACTIONS = [
  { icon: '🔍', label: 'Weekly check', q: 'Give me a quick weekly financial check.' },
  { icon: '❤️', label: 'Health check', q: 'Am I financially healthy right now?' },
  { icon: '💡', label: 'Save more', q: 'Suggest 3 ways I could save more this month.' },
  { icon: '🎯', label: 'Goal plan', q: 'How can I reach my emergency fund goal faster?' },
];

function getMockReply(q: string): { text: string; action?: PendingAction } {
  const lower = q.toLowerCase();
  if (lower.includes('weekly') || lower.includes('check')) {
    return {
      text: `Weekly snapshot for ${MOCK.month}:\n\n• Income: ${fmt(MOCK.income)} ✅\n• Spent: ${fmt(MOCK.expense)} (${MOCK.savingsRate}% saved)\n• Leftover: ${fmt(MOCK.net)}\n\nYour rent + family support is ${fmt(1000 + 1200)} — your two biggest fixed costs. Everything else looks controlled. Keep it up!`,
    };
  }
  if (lower.includes('health')) {
    return {
      text: `Verdict: Healthy but with room to grow 💚\n\n✅ Saving ${MOCK.savingsRate}% — above the 20% baseline\n✅ Side income covers ${MOCK.sideShare}% of total\n⚠️ Emergency fund only 25% funded\n\nPriority: top up your emergency fund before anything else.`,
    };
  }
  if (lower.includes('save') || lower.includes('saving')) {
    return {
      text: `3 realistic moves to save more:\n\n1. Reduce shopping from ${fmt(213)} → ${fmt(150)} saves ~${fmt(63)}/mo\n2. Pack lunch twice a week, cuts food by ~${fmt(60)}/mo\n3. Review subscriptions — easy ${fmt(40)}+ save\n\nTotal potential: ~${fmt(163)}/mo extra`,
      action: {
        label: 'Set a spending alert',
        description: 'Add a RM150 soft cap on shopping this month?',
      },
    };
  }
  if (lower.includes('goal') || lower.includes('emergency') || lower.includes('fund')) {
    return {
      text: `Emergency fund: ${fmt(3000)} of ${fmt(12000)} (25%)\n\nAt your current pace (${fmt(MOCK.net)}/mo leftover), dedicating ${fmt(500)}/mo gets you there in ~18 months.\n\nSmall boost: redirect the ${fmt(80)} entertainment budget → emergency fund for 3 months.`,
      action: {
        label: 'Allocate RM500/mo to goal',
        description: 'Mark RM500 of this month\'s leftover toward Emergency Fund?',
      },
    };
  }
  if (lower.includes('invest')) {
    return {
      text: `With ${fmt(MOCK.net)} leftover, a simple split:\n\n• ${fmt(500)} → Emergency fund (priority)\n• ${fmt(300)} → ASB or fixed deposit\n• ${fmt(200)} → Business capital goal\n• Rest → buffer\n\nNote: I'm not a licensed advisor — consult one before any large commitment.`,
    };
  }
  return {
    text: `Based on your ${MOCK.month} numbers:\n• Income: ${fmt(MOCK.income)}\n• Expenses: ${fmt(MOCK.expense)}\n• Leftover: ${fmt(MOCK.net)}\n\nWhat would you like to explore? Try asking about your savings, goals, or spending habits.`,
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MoneyAIOverlay({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: `Hi ${MOCK.name}! I can see your finances for ${MOCK.month}. Ask me anything or tap a quick action below.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [confirm, setConfirm] = useState<PendingAction | null>(null);

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', text };
    const reply = getMockReply(text);
    const aiMsg: Message = { role: 'ai', text: reply.text, action: reply.action };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    if (reply.action) {
      setTimeout(() => setConfirm(reply.action!), 400);
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
              <Text style={styles.headerTitle}>Money AI</Text>
              <Text style={styles.headerSub}>mock responses · Claude API coming soon</Text>
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
          </ScrollView>

          {/* Quick actions */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickContent}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable key={a.label} style={styles.quickChip} onPress={() => send(a.q)}>
                <Text style={styles.quickChipText}>{a.icon} {a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputRow, { paddingBottom: insets.bottom || 12 }]}>
            <TextInput
              style={styles.input}
              placeholder="Ask about your finances…"
              placeholderTextColor={MC.muted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              multiline={false}
            />
            <Pressable
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim()}>
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
                  <Text style={styles.confirmNotText}>Not now</Text>
                </Pressable>
                <Pressable
                  style={styles.confirmOk}
                  onPress={() => {
                    setMessages((m) => [
                      ...m,
                      { role: 'ai', text: `Done! I've noted: "${confirm!.label}". Remember, I can only suggest — take action in the app to make it real.` },
                    ]);
                    setConfirm(null);
                  }}>
                  <Text style={styles.confirmOkText}>Confirm</Text>
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
