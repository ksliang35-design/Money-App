import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import {
  getCoachPlan,
  getModelOptions,
  type CoachPlan,
  type ModelOption,
  type ModelOptions,
} from '@/lib/coach';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

type Step = 1 | 2 | 3 | 'pick' | 'done';

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

// Maps Gemini bucket labels → i18n guide keys. Covers all 9 models from the system prompt.
const BUCKET_GUIDE_KEY: Record<string, string> = {
  'Needs':                 'coach.guideNeeds',
  'Wants':                 'coach.guideWants',
  'Savings':               'coach.guideSavings',
  'Living':                'coach.guideLiving',
  'Debt & Giving':         'coach.guideGiving',
  'Housing':               'coach.guideHousing',
  'Lifestyle':             'coach.guideLifestyle',
  'Savings & Investments': 'coach.guideWealthBuilding',
  'Giving':                'coach.guideGiving',
  'Debt Repayment':        'coach.guideDebt',
  'Emergency Buffer':      'coach.guideEmergency',
  'Necessities':           'coach.guideNecessities',
  'Long-term Savings':     'coach.guideLongTermSavings',
  'Education':             'coach.guideEducation',
  'Play':                  'coach.guidePlay',
  'Financial Freedom':     'coach.guideFinancialFreedom',
  'Give':                  'coach.guideGiving',
  'Save First':            'coach.guideSaveFirst',
  'Fixed Commitments':     'coach.guideFixedCommitments',
  'Discretionary':         'coach.guideDiscretionary',
};

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
  const [options, setOptions] = useState<ModelOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // editSplit: bucket label → user-adjusted percentage
  const [editSplit, setEditSplit] = useState<Record<string, number>>({});
  const [splitSaved, setSplitSaved] = useState(false);

  const suggestedBracket = incomeToBracket(data.income);

  // Derive split from plan buckets whenever plan loads or model changes.
  // Prefer stored split; fall back to deriving from Gemini's targetRM values.
  useEffect(() => {
    if (!plan || plan.buckets.length === 0) return;
    if (plan.split && Object.keys(plan.split).length > 0) {
      setEditSplit(plan.split);
    } else {
      const bucketTotal = plan.buckets.reduce((s, b) => s + b.targetRM, 0);
      const denom = bucketTotal > 0 ? bucketTotal : data.income || 1;
      const derived = Object.fromEntries(
        plan.buckets.map((b) => [b.label, Math.round((b.targetRM / denom) * 100)]),
      );
      setEditSplit(derived);
    }
  }, [plan?.model, plan?.buckets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const splitTotal = Object.values(editSplit).reduce((s, v) => s + v, 0);
  const isSplitValid = splitTotal === 100;

  const fetchOptions = async (a: { age: string; incomeBracket: string; goal: string }) => {
    setLoading(true);
    setError(null);
    setOptions(null);
    setStep('pick');
    try {
      const result = await getModelOptions(
        { age: a.age, incomeBracket: a.incomeBracket, goal: a.goal },
        {
          income: data.income,
          expense: data.expense,
          net: data.net,
          savingsRate: data.savingsRate,
          byMethod: data.byMethod,
          byCategory: data.byCategory,
        },
        data.language ?? 'en',
      );
      setOptions(result);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoal = (value: string) => {
    const finalAnswers = { age: answers.age!, incomeBracket: answers.incomeBracket!, goal: value };
    setAnswers((a) => ({ ...a, goal: value }));
    fetchOptions(finalAnswers);
  };

  const fetchPlan = async (chosenModel: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCoachPlan(
        { age: answers.age!, incomeBracket: answers.incomeBracket!, goal: answers.goal! },
        {
          income: data.income,
          expense: data.expense,
          net: data.net,
          savingsRate: data.savingsRate,
          byMethod: data.byMethod,
          byCategory: data.byCategory,
        },
        chosenModel,
      );
      setPlan(result);
      saveCoachResult(
        { age: answers.age!, incomeBracket: answers.incomeBracket!, goal: answers.goal! },
        result,
      );
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModel = (opt: ModelOption) => {
    // Store the model's original split so the editor can show percentages before Gemini responds
    const chosen: CoachPlan = {
      model: opt.model,
      why: opt.why,
      buckets: [],
      nextAction: '',
      encouragement: '',
      split: opt.split,
    };
    setEditSplit(opt.split);
    setPlan(chosen);
    saveCoachResult(
      { age: answers.age!, incomeBracket: answers.incomeBracket!, goal: answers.goal! },
      chosen,
    );
    setStep('done');
    fetchPlan(opt.model);
  };

  const handleSaveSplit = () => {
    if (!plan || !answers.age || !answers.incomeBracket || !answers.goal) return;
    const updatedBuckets = plan.buckets.map((b) => ({
      ...b,
      targetRM: Math.round(((editSplit[b.label] ?? 0) / 100) * data.income),
    }));
    const updatedPlan: CoachPlan = { ...plan, buckets: updatedBuckets, split: editSplit };
    setPlan(updatedPlan);
    saveCoachResult(
      { age: answers.age, incomeBracket: answers.incomeBracket, goal: answers.goal },
      updatedPlan,
    );
    setSplitSaved(true);
    setTimeout(() => setSplitSaved(false), 2000);
  };

  const handleNormalize = () => {
    const labels = Object.keys(editSplit);
    if (labels.length === 0) return;
    const total = Object.values(editSplit).reduce((s, v) => s + v, 0);
    if (total === 0) return;
    let allocated = 0;
    const normalized: Record<string, number> = {};
    labels.forEach((l, i) => {
      if (i === labels.length - 1) {
        normalized[l] = 100 - allocated;
      } else {
        const v = Math.round((editSplit[l] / total) * 100);
        normalized[l] = v;
        allocated += v;
      }
    });
    setEditSplit(normalized);
  };

  const handleRetry = () => {
    if (step === 'done' && plan) {
      fetchPlan(plan.model);
    } else if (answers.age && answers.incomeBracket && answers.goal) {
      fetchOptions({ age: answers.age, incomeBracket: answers.incomeBracket, goal: answers.goal });
    }
  };

  const handleRestart = () => {
    setStep(1);
    setAnswers({ age: null, incomeBracket: null, goal: null });
    setPlan(null);
    setOptions(null);
    setError(null);
    setLoading(false);
    setEditSplit({});
    setSplitSaved(false);
    clearCoachResult();
  };

  const profileRecap = (
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
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.screenTitle}>{t('coach.title')}</Text>
        <Text style={styles.screenSub}>{t('coach.sub')}</Text>

        {/* Step progress bar */}
        {(step === 1 || step === 2 || step === 3) && (
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

        {/* Pick step: Gemini returns options, user selects one */}
        {step === 'pick' && (
          <>
            {profileRecap}

            {loading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={MC.indigo} />
                <Text style={styles.loadingText}>{t('coach.loading')}</Text>
              </View>
            )}

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

            {!loading && !error && options && (
              <>
                <Text style={styles.pickTitle}>{t('coach.pickTitle')}</Text>
                {options.options.map((opt) => {
                  const isRec = opt.model === options.recommended;
                  const splitText = Object.entries(opt.split)
                    .map(([k, v]) => `${v}% ${k}`)
                    .join(' · ');
                  return (
                    <Pressable
                      key={opt.model}
                      onPress={() => handleSelectModel(opt)}
                      style={({ pressed }) => [
                        styles.optionCard,
                        isRec && styles.optionCardRec,
                        pressed && styles.optionCardPressed,
                      ]}>
                      {isRec && (
                        <View style={styles.recBadge}>
                          <Text style={styles.recBadgeText}>{t('coach.recommended')}</Text>
                        </View>
                      )}
                      <View style={styles.optionHeader}>
                        <Text style={[styles.optionModelName, isRec && styles.optionModelNameRec]}>
                          {opt.model}
                        </Text>
                        <Text style={styles.optionChevron}>›</Text>
                      </View>
                      <Text style={styles.optionSplit} numberOfLines={2}>{splitText}</Text>
                      <View style={styles.optionDivider} />
                      <Text style={styles.optionBestForLabel}>{t('coach.bestFor')}</Text>
                      <Text style={styles.optionBestFor}>{opt.bestFor}</Text>
                      <Text style={styles.optionWhy}>{opt.why}</Text>
                    </Pressable>
                  );
                })}
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

        {/* Done state */}
        {step === 'done' && (
          <>
            {profileRecap}

            {/* Chosen model header */}
            {plan && (
              <View style={styles.chosenCard}>
                <Text style={styles.chosenCheck}>✓</Text>
                <View style={styles.chosenTextWrap}>
                  <Text style={styles.chosenModel}>{plan.model}</Text>
                  <Text style={styles.chosenLabel}>{t('coach.modelChosen')}</Text>
                </View>
              </View>
            )}

            {/* Loading breakdown */}
            {loading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={MC.indigo} />
                <Text style={styles.loadingText}>{t('coach.loading')}</Text>
              </View>
            )}

            {/* Errors */}
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

            {/* ── Editable budget breakdown ── */}
            {!loading && !error && plan && plan.buckets.length > 0 && (
              <>
                <View style={styles.card}>
                  {/* Header row with save button */}
                  <View style={styles.editHeader}>
                    <Text style={styles.sectionLabel}>{t('coach.editSplit')}</Text>
                    <Pressable
                      onPress={handleSaveSplit}
                      style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}>
                      <Text style={styles.saveBtnTxt}>
                        {splitSaved ? `✓ ${t('coach.saveSplit')}` : t('coach.saveSplit')}
                      </Text>
                    </Pressable>
                  </View>

                  {plan.buckets.map((bucket, i) => {
                    const pct = editSplit[bucket.label] ?? 0;
                    const targetRM = Math.round((pct / 100) * data.income);
                    const fillPct =
                      targetRM > 0
                        ? Math.min(100, Math.round((bucket.actualRM / targetRM) * 100))
                        : 0;
                    const over = bucket.actualRM > targetRM;
                    const fillColor = over ? MC.clay : MC.emerald;
                    const guideKey = BUCKET_GUIDE_KEY[bucket.label] ?? 'coach.guideGeneral';

                    return (
                      <View
                        key={bucket.label}
                        style={[
                          styles.bucketRow,
                          i < plan.buckets.length - 1 && styles.bucketRowBorder,
                        ]}>
                        {/* Label + category guide */}
                        <Text style={styles.bucketLabel}>{bucket.label}</Text>
                        <Text style={styles.bucketGuide}>{t(guideKey)}</Text>

                        {/* +/- controls + live RM */}
                        <View style={styles.splitRow}>
                          <Pressable
                            onPress={() =>
                              setEditSplit((s) => ({
                                ...s,
                                [bucket.label]: Math.max(0, (s[bucket.label] ?? 0) - 1),
                              }))
                            }
                            style={({ pressed }) => [styles.adjBtn, pressed && { opacity: 0.55 }]}>
                            <Text style={styles.adjBtnTxt}>−</Text>
                          </Pressable>
                          <Text style={styles.pctDisplay}>{pct}%</Text>
                          <Pressable
                            onPress={() =>
                              setEditSplit((s) => ({
                                ...s,
                                [bucket.label]: Math.min(100, (s[bucket.label] ?? 0) + 1),
                              }))
                            }
                            style={({ pressed }) => [styles.adjBtn, pressed && { opacity: 0.55 }]}>
                            <Text style={styles.adjBtnTxt}>+</Text>
                          </Pressable>
                          <Text style={styles.rmTarget}>{fmt(targetRM)}</Text>
                        </View>

                        {/* Progress bar — actual vs adjusted target */}
                        <View style={styles.meterBg}>
                          <View
                            style={[
                              styles.meterFill,
                              { width: `${fillPct}%` as any, backgroundColor: fillColor },
                            ]}
                          />
                        </View>

                        {/* Actual vs target numbers */}
                        <View style={styles.bucketNums}>
                          <Text style={styles.bucketNum}>
                            {t('coach.actual')}{' '}
                            <Text style={{ color: fillColor, fontFamily: MF.bold }}>
                              {fmt(bucket.actualRM)}
                            </Text>
                          </Text>
                          <Text style={[styles.bucketStatus, { color: fillColor }]}>
                            {over ? t('coach.overBudget') : t('coach.onTrack')}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Total row */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t('coach.totalPct')}</Text>
                    <Text style={[styles.totalPct, !isSplitValid && styles.totalPctWarn]}>
                      {splitTotal}%{isSplitValid ? ' ✓' : ' ⚠'}
                    </Text>
                  </View>

                  {/* Warning + normalize */}
                  {!isSplitValid && (
                    <View style={styles.warnRow}>
                      <Text style={styles.warnText}>{t('coach.warnTotal')}</Text>
                      <Pressable
                        onPress={handleNormalize}
                        style={({ pressed }) => [styles.normalizeBtn, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.normalizeTxt}>{t('coach.normalize')}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {!!plan.nextAction && (
                  <View style={[styles.card, styles.actionCard]}>
                    <Text style={styles.actionBadge}>{t('coach.thisWeek')}</Text>
                    <Text style={styles.actionText}>{plan.nextAction}</Text>
                  </View>
                )}

                {!!plan.encouragement && (
                  <View style={styles.encourageCard}>
                    <Text style={styles.encourageText}>"{plan.encouragement}"</Text>
                  </View>
                )}
              </>
            )}

            {/* Placeholder: model chosen but breakdown not yet arrived */}
            {!loading && !error && plan && plan.buckets.length === 0 && (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderText}>{t('coach.breakdownSoon')}</Text>
                {!!plan.why && <Text style={styles.placeholderWhy}>{plan.why}</Text>}
              </View>
            )}

            {!loading && <Text style={styles.disclaimer}>{t('coach.disclaimer')}</Text>}

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

  // Pick step
  pickTitle: {
    fontSize: 15,
    fontFamily: MF.semiBold,
    color: MC.ink,
    marginBottom: -MS.xs,
  },
  recBadge: {
    alignSelf: 'flex-start',
    backgroundColor: MC.emerald + '20',
    borderWidth: 1,
    borderColor: MC.emerald,
    borderRadius: 999,
    paddingHorizontal: MS.sm,
    paddingVertical: 3,
    marginBottom: MS.xs,
  },
  recBadgeText: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.emeraldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionCard: {
    backgroundColor: MC.card,
    borderWidth: 1.5,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.sm,
  },
  optionCardRec: { borderColor: MC.emerald, borderWidth: 2 },
  optionCardPressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionModelName: { fontSize: 22, fontFamily: MF.bold, color: MC.ink },
  optionModelNameRec: { color: MC.emeraldDark },
  optionChevron: { fontSize: 24, color: MC.muted },
  optionSplit: { fontSize: 12, fontFamily: MF.medium, color: MC.muted, lineHeight: 18 },
  optionDivider: { height: 1, backgroundColor: MC.line, marginVertical: MS.xs },
  optionBestForLabel: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optionBestFor: { fontSize: 13, fontFamily: MF.semiBold, color: MC.ink },
  optionWhy: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, lineHeight: 20 },

  // Chosen model confirmation
  chosenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.md,
    backgroundColor: MC.emerald + '15',
    borderWidth: 1.5,
    borderColor: MC.emerald,
    borderRadius: MR.xl,
    padding: MS.lg,
  },
  chosenCheck: { fontSize: 28, color: MC.emeraldDark },
  chosenTextWrap: { flex: 1 },
  chosenModel: { fontSize: 22, fontFamily: MF.bold, color: MC.emeraldDark },
  chosenLabel: { fontSize: 12, fontFamily: MF.medium, color: MC.muted, marginTop: 2 },

  // Placeholder
  placeholderCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.sm,
  },
  placeholderText: { fontSize: 14, fontFamily: MF.medium, color: MC.muted },
  placeholderWhy: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, lineHeight: 20 },

  // Editable breakdown
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  saveBtn: {
    backgroundColor: MC.emerald,
    borderRadius: 999,
    paddingHorizontal: MS.md,
    paddingVertical: 6,
  },
  saveBtnTxt: { fontSize: 12, fontFamily: MF.semiBold, color: '#fff' },

  bucketRow: { gap: 6, paddingVertical: MS.md },
  bucketRowBorder: { borderBottomWidth: 1, borderBottomColor: MC.line },
  bucketLabel: { fontSize: 14, fontFamily: MF.semiBold, color: MC.ink },
  bucketGuide: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, lineHeight: 16 },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.sm,
    marginTop: 2,
  },
  adjBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjBtnTxt: { fontSize: 18, fontFamily: MF.bold, color: MC.ink, lineHeight: 22 },
  pctDisplay: {
    fontSize: 16,
    fontFamily: MF.bold,
    color: MC.ink,
    minWidth: 44,
    textAlign: 'center',
  },
  rmTarget: { fontSize: 13, fontFamily: MF.semiBold, color: MC.emeraldDark, marginLeft: MS.xs },

  meterBg: { height: 10, backgroundColor: MC.line, borderRadius: 6, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 6 },

  bucketNums: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bucketNum: { fontSize: 12, fontFamily: MF.regular, color: MC.muted },
  bucketStatus: { fontSize: 11, fontFamily: MF.medium },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: MS.sm,
    borderTopWidth: 1,
    borderTopColor: MC.line,
    marginTop: MS.xs,
  },
  totalLabel: { fontSize: 12, fontFamily: MF.semiBold, color: MC.muted },
  totalPct: { fontSize: 15, fontFamily: MF.bold, color: MC.emeraldDark },
  totalPctWarn: { color: MC.clay },

  warnRow: { gap: MS.sm },
  warnText: { fontSize: 12, fontFamily: MF.regular, color: MC.clay },
  normalizeBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: MC.clay,
    borderRadius: 999,
    paddingHorizontal: MS.md,
    paddingVertical: 6,
  },
  normalizeTxt: { fontSize: 12, fontFamily: MF.semiBold, color: MC.clay },

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
