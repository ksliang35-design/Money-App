import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { getCoachPlan, type CoachPlan } from '@/lib/coach';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

type Step = 1 | 2 | 3 | 'done';

interface Answers {
  age: string | null;
  incomeBracket: string | null;
  goal: string | null;
}

// Values sent to Gemini always stay in English
const AGE_OPTIONS = ['Under 25', '25–34', '35–44', '45–54', '55+'];

const INCOME_BRACKETS = [
  { label: 'Under RM 3,000', min: 0, max: 3000 },
  { label: 'RM 3,000–5,000', min: 3000, max: 5000 },
  { label: 'RM 5,000–8,000', min: 5000, max: 8000 },
  { label: 'RM 8,000–12,000', min: 8000, max: 12000 },
  { label: 'Over RM 12,000', min: 12000, max: Infinity },
];

// value = sent to Gemini (English), labelKey = translated display key
const GOAL_OPTIONS = [
  { value: 'Build savings', labelKey: 'coach.goalBuildSavings', icon: '🛡️' },
  { value: 'Clear debt', labelKey: 'coach.goalClearDebt', icon: '✂️' },
  { value: 'Start investing', labelKey: 'coach.goalStartInvesting', icon: '📈' },
  { value: 'Just get organized', labelKey: 'coach.goalGetOrganized', icon: '📋' },
];

function incomeToBracket(income: number): string {
  const match = INCOME_BRACKETS.find((b) => income >= b.min && income < b.max);
  return match?.label ?? INCOME_BRACKETS[INCOME_BRACKETS.length - 1].label;
}

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { data, saveCoachResult, clearCoachResult } = useAppData();
  const t = useT();

  const [step, setStep] = useState<Step>(data.coachPlan ? 'done' : 1);
  const [answers, setAnswers] = useState<Answers>(
    data.coachProfile ?? { age: null, incomeBracket: null, goal: null },
  );
  const [plan, setPlan] = useState<CoachPlan | null>(data.coachPlan ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedBracket = incomeToBracket(data.income);

  const fetchPlan = async (a: { age: string; incomeBracket: string; goal: string }) => {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const result = await getCoachPlan(
        { age: a.age, incomeBracket: a.incomeBracket, goal: a.goal },
        {
          income: data.income,
          expense: data.expense,
          net: data.net,
          savingsRate: data.savingsRate,
          byMethod: data.byMethod,
          byCategory: data.byCategory,
        },
      );
      setPlan(result);
      saveCoachResult({ age: a.age, incomeBracket: a.incomeBracket, goal: a.goal }, result);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoal = (value: string) => {
    const finalAnswers = { age: answers.age!, incomeBracket: answers.incomeBracket!, goal: value };
    setAnswers((a) => ({ ...a, goal: value }));
    setStep('done');
    fetchPlan(finalAnswers);
  };

  const handleRetry = () => {
    if (!answers.age || !answers.incomeBracket || !answers.goal) return;
    fetchPlan({ age: answers.age, incomeBracket: answers.incomeBracket, goal: answers.goal });
  };

  const handleRestart = () => {
    setStep(1);
    setAnswers({ age: null, incomeBracket: null, goal: null });
    setPlan(null);
    setError(null);
    setLoading(false);
    clearCoachResult();
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.screenTitle}>{t('coach.title')}</Text>
        <Text style={styles.screenSub}>{t('coach.sub')}</Text>

        {/* Step progress bar */}
        {step !== 'done' && (
          <View style={styles.progressRow}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={[styles.progressSeg, (step as number) >= n && styles.progressSegActive]}
              />
            ))}
          </View>
        )}

        {/* Q1: Age range */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.stepBadge}>{t('coach.q1badge')}</Text>
            <Text style={styles.question}>{t('coach.q1')}</Text>
            <Text style={styles.questionSub}>{t('coach.q1sub')}</Text>
            <View style={styles.optList}>
              {AGE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [styles.optBtn, pressed && styles.optBtnPressed]}
                  onPress={() => {
                    setAnswers((a) => ({ ...a, age: opt }));
                    setStep(2);
                  }}>
                  <View style={styles.optLabelWrap}>
                    <Text style={styles.optLabel}>{opt}</Text>
                  </View>
                  <Text style={styles.optChevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Q2: Income bracket */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.stepBadge}>{t('coach.q2badge')}</Text>
            <Text style={styles.question}>{t('coach.q2')}</Text>
            <Text style={styles.questionSub}>{t('coach.q2sub')}</Text>
            <View style={styles.optList}>
              {INCOME_BRACKETS.map((b) => {
                const active = b.label === suggestedBracket;
                return (
                  <Pressable
                    key={b.label}
                    style={({ pressed }) => [
                      styles.optBtn,
                      active && styles.optBtnActive,
                      pressed && styles.optBtnPressed,
                    ]}
                    onPress={() => {
                      setAnswers((a) => ({ ...a, incomeBracket: b.label }));
                      setStep(3);
                    }}>
                    <View style={styles.optLabelWrap}>
                      <Text style={[styles.optLabel, active && styles.optLabelActive]}>
                        {b.label}
                      </Text>
                      {active && <Text style={styles.optTag}>{t('coach.currentTotal')}</Text>}
                    </View>
                    <Text style={[styles.optChevron, active && styles.optChevronActive]}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Q3: Main goal */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.stepBadge}>{t('coach.q3badge')}</Text>
            <Text style={styles.question}>{t('coach.q3')}</Text>
            <Text style={styles.questionSub}>{t('coach.q3sub')}</Text>
            <View style={styles.optList}>
              {GOAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [styles.optBtn, pressed && styles.optBtnPressed]}
                  onPress={() => handleGoal(opt.value)}>
                  <Text style={styles.optIcon}>{opt.icon}</Text>
                  <View style={styles.optLabelWrap}>
                    <Text style={styles.optLabel}>{t(opt.labelKey)}</Text>
                  </View>
                  <Text style={styles.optChevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Done state */}
        {step === 'done' && (
          <>
            {/* Answers recap */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('coach.yourProfile')}</Text>
              {[
                { key: t('coach.ageRange'), val: answers.age },
                { key: t('coach.incomeBracket'), val: answers.incomeBracket },
                { key: t('coach.mainGoal'), val: answers.goal },
              ].map((row) => (
                <View key={row.key} style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>{row.key}</Text>
                  <Text style={styles.summaryVal}>{row.val}</Text>
                </View>
              ))}
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={MC.indigo} />
                <Text style={styles.loadingText}>{t('coach.loading')}</Text>
              </View>
            )}

            {/* Error */}
            {!loading && error === 'NO_API_KEY' && (
              <View style={styles.noKeyCard}>
                <Text style={styles.noKeyIcon}>🔑</Text>
                <Text style={styles.noKeyTitle}>{t('coach.noKeyTitle')}</Text>
                <Text style={styles.noKeyMsg}>{t('coach.noKeyMsg')}</Text>
              </View>
            )}
            {!loading && error && error !== 'NO_API_KEY' && (
              <View style={styles.errorCard}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>{t('coach.errorTitle')}</Text>
                <Text style={styles.errorMsg}>{error}</Text>
                <Pressable
                  style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
                  onPress={handleRetry}>
                  <Text style={styles.retryTxt}>{t('common.tryAgain')}</Text>
                </Pressable>
              </View>
            )}

            {/* Plan result */}
            {!loading && !error && plan && (
              <>
                {/* Model name + why */}
                <LinearGradient
                  colors={[MC.indigo, '#4848C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modelCard}>
                  <Text style={styles.modelName}>{plan.model}</Text>
                  <Text style={styles.modelSubLabel}>{t('coach.recBudgetModel')}</Text>
                  <View style={styles.modelDivider} />
                  <Text style={styles.modelWhy}>{plan.why}</Text>
                </LinearGradient>

                {/* Budget breakdown */}
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>{t('coach.budgetBreakdown')}</Text>
                  {plan.buckets.map((bucket, i) => {
                    const pct =
                      bucket.targetRM > 0
                        ? Math.min(100, Math.round((bucket.actualRM / bucket.targetRM) * 100))
                        : 0;
                    const over = bucket.actualRM > bucket.targetRM;
                    const fillColor = over ? MC.clay : MC.emerald;
                    return (
                      <View
                        key={bucket.label}
                        style={[
                          styles.bucketRow,
                          i < plan.buckets.length - 1 && styles.bucketRowBorder,
                        ]}>
                        <View style={styles.bucketHeader}>
                          <Text style={styles.bucketLabel}>{bucket.label}</Text>
                          <Text style={[styles.bucketStatus, { color: fillColor }]}>
                            {over ? t('coach.overBudget') : t('coach.onTrack')}
                          </Text>
                        </View>
                        <View style={styles.meterBg}>
                          <View
                            style={[
                              styles.meterFill,
                              { width: `${pct}%` as any, backgroundColor: fillColor },
                            ]}
                          />
                        </View>
                        <View style={styles.bucketNums}>
                          <Text style={styles.bucketNum}>
                            {t('coach.actual')}{' '}
                            <Text style={{ color: fillColor, fontFamily: MF.bold }}>
                              {fmt(bucket.actualRM)}
                            </Text>
                          </Text>
                          <Text style={styles.bucketNum}>{t('coach.target2')} {fmt(bucket.targetRM)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Next action */}
                <View style={[styles.card, styles.actionCard]}>
                  <Text style={styles.actionBadge}>{t('coach.thisWeek')}</Text>
                  <Text style={styles.actionText}>{plan.nextAction}</Text>
                </View>

                {/* Encouragement */}
                <View style={styles.encourageCard}>
                  <Text style={styles.encourageText}>"{plan.encouragement}"</Text>
                </View>

                <Text style={styles.disclaimer}>{t('coach.disclaimer')}</Text>
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.restartBtn, pressed && { opacity: 0.6 }]}
              onPress={handleRestart}>
              <Text style={styles.restartTxt}>{t('coach.startOver')}</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: MS.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },
  scroll: { flex: 1 },
  content: { padding: MS.lg, gap: MS.md },

  screenTitle: { fontSize: 26, fontFamily: MF.bold, color: MC.ink },
  screenSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, marginTop: -MS.sm },

  progressRow: { flexDirection: 'row', gap: MS.sm },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: MC.line },
  progressSegActive: { backgroundColor: MC.emerald },

  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.sm,
  },

  stepBadge: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  question: { fontSize: 20, fontFamily: MF.bold, color: MC.ink, lineHeight: 28 },
  questionSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, lineHeight: 20 },

  optList: { gap: MS.sm, marginTop: MS.xs },
  optBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.sm,
    backgroundColor: MC.bg,
    borderWidth: 1.5,
    borderColor: MC.line,
    borderRadius: MR.lg,
    paddingHorizontal: MS.md,
    paddingVertical: 14,
  },
  optBtnActive: { borderColor: MC.emerald, backgroundColor: MC.emerald + '10' },
  optBtnPressed: { opacity: 0.55 },
  optLabelWrap: { flex: 1, gap: 2 },
  optLabel: { fontSize: 15, fontFamily: MF.semiBold, color: MC.ink },
  optLabelActive: { color: MC.emeraldDark },
  optTag: { fontSize: 11, fontFamily: MF.medium, color: MC.emerald },
  optIcon: { fontSize: 18 },
  optChevron: { fontSize: 20, color: MC.muted },
  optChevronActive: { color: MC.emerald },

  summaryCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.xs,
  },
  summaryTitle: {
    fontSize: 11,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: MS.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: MS.sm,
    borderTopWidth: 1,
    borderTopColor: MC.line,
  },
  summaryKey: { fontSize: 13, fontFamily: MF.regular, color: MC.muted },
  summaryVal: { fontSize: 13, fontFamily: MF.semiBold, color: MC.ink },

  // Loading
  loadingCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.xl,
    alignItems: 'center',
    gap: MS.md,
  },
  loadingText: { fontSize: 14, fontFamily: MF.medium, color: MC.muted },

  // No API key
  noKeyCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.xl,
    alignItems: 'center',
    gap: MS.sm,
  },
  noKeyIcon: { fontSize: 32 },
  noKeyTitle: { fontSize: 16, fontFamily: MF.bold, color: MC.ink },
  noKeyMsg: {
    fontSize: 13,
    fontFamily: MF.regular,
    color: MC.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  noKeyCode: { fontFamily: MF.semiBold, color: MC.ink },

  // Error
  errorCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.clay + '50',
    borderRadius: MR.xl,
    padding: MS.xl,
    alignItems: 'center',
    gap: MS.sm,
  },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: 16, fontFamily: MF.bold, color: MC.ink },
  errorMsg: {
    fontSize: 13,
    fontFamily: MF.regular,
    color: MC.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: MS.sm,
    paddingVertical: MS.sm,
    paddingHorizontal: MS.xl,
    borderRadius: 999,
    backgroundColor: MC.emerald,
  },
  retryTxt: { fontSize: 14, fontFamily: MF.semiBold, color: '#fff' },

  // Model card
  modelCard: {
    borderRadius: MR.xxl,
    padding: MS.xl,
    gap: MS.sm,
    shadowColor: MC.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  modelName: { fontSize: 32, fontFamily: MF.bold, color: '#fff' },
  modelSubLabel: {
    fontSize: 11,
    fontFamily: MF.medium,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modelDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: MS.xs },
  modelWhy: {
    fontSize: 14,
    fontFamily: MF.regular,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },

  // Bucket breakdown
  sectionLabel: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bucketRow: { gap: MS.sm, paddingVertical: MS.md },
  bucketRowBorder: { borderBottomWidth: 1, borderBottomColor: MC.line },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketLabel: { fontSize: 14, fontFamily: MF.semiBold, color: MC.ink },
  bucketStatus: { fontSize: 11, fontFamily: MF.medium },
  meterBg: { height: 10, backgroundColor: MC.line, borderRadius: 6, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 6 },
  bucketNums: { flexDirection: 'row', justifyContent: 'space-between' },
  bucketNum: { fontSize: 12, fontFamily: MF.regular, color: MC.muted },

  // Next action
  actionCard: { backgroundColor: MC.goldLight, borderColor: MC.goldBorder, gap: MS.sm },
  actionBadge: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: '#8A6D1E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionText: { fontSize: 15, fontFamily: MF.semiBold, color: MC.ink, lineHeight: 23 },

  // Encouragement
  encourageCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
  },
  encourageText: {
    fontSize: 14,
    fontFamily: MF.regular,
    color: MC.muted,
    lineHeight: 22,
    fontStyle: 'italic',
  },

  disclaimer: {
    fontSize: 11,
    fontFamily: MF.regular,
    color: MC.muted,
    textAlign: 'center',
    opacity: 0.65,
    lineHeight: 17,
    paddingHorizontal: MS.md,
  },

  restartBtn: { alignSelf: 'center', paddingVertical: MS.sm, paddingHorizontal: MS.lg },
  restartTxt: { fontSize: 13, fontFamily: MF.medium, color: MC.muted },
});
