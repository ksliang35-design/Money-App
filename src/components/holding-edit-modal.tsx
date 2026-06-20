import { useEffect, useState } from 'react';
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

import { MC, MF, MR, MS } from '@/constants/money-theme';
import { type AssetType, type Holding } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export type HoldingModalMode =
  | { type: 'edit'; holding: Holding }
  | { type: 'add' }
  | null;

const ASSET_TYPES: AssetType[] = ['Stocks', 'ETF', 'Crypto', 'Gold', 'Cash', 'Other'];

interface Props {
  mode: HoldingModalMode;
  onClose: () => void;
}

export function HoldingEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addHolding, updateHolding, deleteHolding } = useAppData();
  const t = useT();

  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('Stocks');
  const [currentValue, setCurrentValue] = useState('');
  const [units, setUnits] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  useEffect(() => {
    if (!mode) return;
    if (mode.type === 'edit') {
      const h = mode.holding;
      setName(h.name);
      setAssetType(h.assetType);
      setCurrentValue(String(h.currentValue));
      setUnits(h.units != null ? String(h.units) : '');
      setBuyPrice(h.buyPrice != null ? String(h.buyPrice) : '');
    } else {
      setName('');
      setAssetType('Stocks');
      setCurrentValue('');
      setUnits('');
      setBuyPrice('');
    }
  }, [mode]);

  const parsedValue = parseFloat(currentValue);
  const parsedUnits = units.trim() ? parseFloat(units) : undefined;
  const parsedBuyPrice = buyPrice.trim() ? parseFloat(buyPrice) : undefined;

  const isValid =
    name.trim().length > 0 &&
    !isNaN(parsedValue) && parsedValue > 0 &&
    (parsedUnits === undefined || (!isNaN(parsedUnits) && parsedUnits > 0)) &&
    (parsedBuyPrice === undefined || (!isNaN(parsedBuyPrice) && parsedBuyPrice > 0));

  const handleSave = () => {
    if (!isValid) return;
    const payload: Omit<Holding, 'id'> = {
      name: name.trim(),
      assetType,
      currentValue: parsedValue,
      ...(parsedUnits !== undefined && { units: parsedUnits }),
      ...(parsedBuyPrice !== undefined && { buyPrice: parsedBuyPrice }),
    };
    if (mode?.type === 'edit') {
      updateHolding(mode.holding.id, payload);
    } else {
      addHolding(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteHolding(mode.holding.id);
    onClose();
  };

  const isEdit = mode?.type === 'edit';

  return (
    <Modal
      visible={!!mode}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + MS.lg }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? t('holdingModal.editTitle') : t('holdingModal.addTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t('holdingModal.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('holdingModal.placeholder')}
              placeholderTextColor={MC.muted}
              returnKeyType="next"
              autoFocus
            />

            <Text style={styles.fieldLabel}>{t('holdingModal.assetType')}</Text>
            <View style={styles.typeGrid}>
              {ASSET_TYPES.map((type) => (
                <Pressable
                  key={type}
                  style={[styles.typeBtn, assetType === type && styles.typeBtnActive]}
                  onPress={() => setAssetType(type)}>
                  <Text style={[styles.typeBtnText, assetType === type && styles.typeBtnTextActive]}>
                    {t(`portfolio.type${type}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('holdingModal.currentValue')}</Text>
            <TextInput
              style={styles.input}
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder="0.00"
              placeholderTextColor={MC.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('holdingModal.units')}</Text>
            <TextInput
              style={styles.input}
              value={units}
              onChangeText={setUnits}
              placeholder="0"
              placeholderTextColor={MC.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('holdingModal.buyPrice')}</Text>
            <TextInput
              style={styles.input}
              value={buyPrice}
              onChangeText={setBuyPrice}
              placeholder="0.00"
              placeholderTextColor={MC.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <View style={styles.actions}>
              {isEdit && (
                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteTxt}>{t('holdingModal.delete')}</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!isValid}>
                <Text style={styles.saveTxt}>{isEdit ? t('holdingModal.save') : t('holdingModal.add')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: MC.bg,
    borderTopLeftRadius: MR.xxl,
    borderTopRightRadius: MR.xxl,
    paddingHorizontal: MS.lg,
    paddingTop: MS.md,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: MC.line,
    alignSelf: 'center',
    marginBottom: MS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MS.lg,
  },
  title: { fontSize: 18, fontFamily: MF.bold, color: MC.ink },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: 13, color: MC.muted, fontFamily: MF.medium },

  fieldLabel: {
    fontSize: 11,
    fontFamily: MF.semiBold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: MS.xs,
  },
  input: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.lg,
    paddingHorizontal: MS.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: MF.medium,
    color: MC.ink,
    marginBottom: MS.md,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MS.sm,
    marginBottom: MS.md,
  },
  typeBtn: {
    paddingHorizontal: MS.md,
    paddingVertical: MS.sm,
    borderRadius: MR.lg,
    borderWidth: 1.5,
    borderColor: MC.line,
    backgroundColor: MC.card,
  },
  typeBtnActive: {
    borderColor: MC.emerald,
    backgroundColor: MC.emerald + '18',
  },
  typeBtnText: {
    fontSize: 13,
    fontFamily: MF.medium,
    color: MC.muted,
  },
  typeBtnTextActive: {
    color: MC.emerald,
    fontFamily: MF.semiBold,
  },

  actions: {
    flexDirection: 'row',
    gap: MS.sm,
    marginBottom: MS.sm,
  },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: MS.lg,
    borderRadius: MR.lg,
    borderWidth: 1.5,
    borderColor: MC.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTxt: { fontSize: 14, fontFamily: MF.semiBold, color: MC.clay },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: MR.lg,
    backgroundColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveTxt: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
});
