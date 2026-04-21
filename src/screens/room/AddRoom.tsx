/**
 * AddRoom.tsx
 *
 * Fixes:
 *  1. Card màu trắng (light mode)
 *  2. Keyboard không bị tắt khi chỉnh sửa — SectionCard và FieldLabel được
 *     khai báo ngoài component (hoặc dùng memo) để React không unmount TextInput.
 *  3. Category picker hiển thị tối đa 3-4 item rồi scroll
 *  4. Lưu giá vào bảng prices qua RoomService.saveVariantPrices
 *  5. Cho phép tạo mới Danh mục phòng (RoomType) ngay trong form
 */
import React, {useState, useCallback, memo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {
  RoomService,
  RoomType,
  RoomPriceInput,
} from '../../services/database/room/RoomCategoryService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddRoomPayload {
  category: string;
  name: string;
  floor: string;
  priceListed: string;
  priceHourFirst: string;
  priceHour: string;
  priceMonth: string;
}

export interface RoomDetailInitialData {
  variantId?: string; // để update giá khi edit
  typeId: string;
  name: string;
  floor: string;
  priceListed: string;
  priceHourFirst: string;
  priceHour: string;
  priceMonth: string;
}

interface Props {
  storeId: string;
  onBack: () => void;
  onSave: (payload: AddRoomPayload) => void;
  roomTypes?: RoomType[];
  /** Gọi khi người dùng tạo mới loại phòng thành công — RoomManagement reload */
  onRoomTypeCreated?: (newType: RoomType) => void;
  mode?: 'add' | 'edit';
  initialData?: RoomDetailInitialData;
}

// ─── Sub-components (khai báo NGOÀI component chính để tránh re-mount) ────────

interface SectionCardProps {
  icon: string;
  title: string;
  children: React.ReactNode;
  cardBg: string;
  subTextColor: string;
  borderColor: string;
  isDark: boolean;
}

const SectionCard = memo(
  ({
    icon,
    title,
    children,
    cardBg,
    subTextColor,
    borderColor,
    isDark,
  }: SectionCardProps) => (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: isDark ? '#374151' : '#f8fafc',
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
        }}>
        <Icon name={icon} size={18} color="#0077ff" />
        <Text
          style={{
            fontSize: 10,
            fontWeight: '900',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: subTextColor,
          }}>
          {title}
        </Text>
      </View>
      <View style={{padding: 20}}>{children}</View>
    </View>
  ),
);

interface FieldLabelProps {
  children: string;
  subTextColor: string;
}

const FieldLabel = memo(({children, subTextColor}: FieldLabelProps) => (
  <Text
    style={{
      fontSize: 10,
      fontWeight: '700',
      color: subTextColor,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    }}>
    {children}
  </Text>
));

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AddRoom({
  storeId,
  onBack,
  onSave,
  roomTypes = [],
  onRoomTypeCreated,
  mode = 'add',
  initialData,
}: Props) {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  // ── Theme ──────────────────────────────────────────────────────────────────
  const bgColor = isDark ? '#111827' : '#f5f7fa';
  const headerBg = isDark ? '#1f2937' : '#f5f7fa';
  const cardBg = isDark ? '#1f2937' : '#ffffff'; // ← trắng ở light mode
  const textColor = isDark ? '#f9fafb' : '#111827';
  const subTextColor = isDark ? '#9ca3af' : '#374151';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const inputBg = isDark ? '#374151' : '#f1f5f9';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    initialData?.typeId ?? roomTypes[0]?.id ?? '',
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [name, setName] = useState(initialData?.name ?? '');
  const [floor, setFloor] = useState(initialData?.floor ?? '');
  const [priceListed, setPriceListed] = useState(
    initialData?.priceListed ?? '',
  );
  const [priceHourFirst, setPriceHourFirst] = useState(
    initialData?.priceHourFirst ?? '',
  );
  const [priceHour, setPriceHour] = useState(initialData?.priceHour ?? '');
  const [priceMonth, setPriceMonth] = useState(initialData?.priceMonth ?? '');
  const [saving, setSaving] = useState(false);

  // ── Create new category modal state ────────────────────────────────────────
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const isEdit = mode === 'edit';
  const selectedType = roomTypes.find(rt => rt.id === selectedTypeId);

  // ── Build price inputs từ form values ───────────────────────────────────────
  const buildPriceInputs = useCallback((): RoomPriceInput[] => {
    const entries: Array<{unitCode: string; value: string}> = [
      {unitCode: 'DAY', value: priceListed},
      {unitCode: 'HOURFIRST', value: priceHourFirst},
      {unitCode: 'HOUR', value: priceHour},
      {unitCode: 'MONTH', value: priceMonth},
    ];
    return entries
      .filter(e => e.value.trim() !== '' && !isNaN(Number(e.value)))
      .map(e => ({unitCode: e.unitCode, price: Number(e.value)}));
  }, [priceListed, priceHourFirst, priceHour, priceMonth]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(
        t('common.missingInfo', 'Thiếu thông tin'),
        t('room.nameRequired', 'Vui lòng nhập tên phòng.'),
      );
      return;
    }
    if (!selectedTypeId) {
      Alert.alert(
        t('common.missingInfo', 'Thiếu thông tin'),
        t('room.categoryRequired', 'Vui lòng chọn hạng mục phòng.'),
      );
      return;
    }

    setSaving(true);
    try {
      const priceInputs = buildPriceInputs();

      if (isEdit && initialData?.variantId) {
        // Cập nhật giá nếu có unitIds
        if (priceInputs.length > 0) {
          await RoomService.updateVariantPrices(
            initialData.variantId,
            storeId,
            priceInputs,
          );
        }
        // TODO: update variant name/floor nếu cần
      } else {
        // Tạo mới phòng + giá
        await RoomService.createRoomVariant(
          {
            storeId,
            productId: selectedTypeId,
            name: name.trim(),
            floor: floor.trim() || undefined,
          },
          priceInputs,
        );
      }

      onSave({
        category: selectedType?.name ?? '',
        name,
        floor,
        priceListed,
        priceHourFirst,
        priceHour,
        priceMonth,
      });
    } catch (err) {
      console.error('[AddRoom] save error:', err);
      Alert.alert(
        t('common.error', 'Lỗi'),
        t('room.saveError', 'Không thể lưu phòng.'),
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Create new category ────────────────────────────────────────────────────
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên hạng mục phòng.');
      return;
    }
    setCreatingCategory(true);
    try {
      const newType = await RoomService.createRoomType({
        storeId,
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim() || undefined,
      });
      setShowNewCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      setSelectedTypeId(newType.id);
      onRoomTypeCreated?.(newType);
    } catch (err) {
      console.error('[AddRoom] createCategory error:', err);
      Alert.alert('Lỗi', 'Không thể tạo hạng mục phòng.');
    } finally {
      setCreatingCategory(false);
    }
  };

  // ── Shared input style builder (stable reference) ──────────────────────────
  const inputStyle = {
    width: '100%' as const,
    backgroundColor: inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500' as const,
    color: textColor,
    borderWidth: isDark ? 1 : 0,
    borderColor,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: bgColor}}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View
        style={{
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
          }}>
          <TouchableOpacity onPress={onBack} style={{padding: 4}}>
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={{fontSize: 20, fontWeight: '700', color: textColor}}>
            {isEdit
              ? t('room.roomDetail', 'Chi tiết phòng')
              : t('room.addRoom', 'Thêm phòng mới')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* ── Section 1: Hạng mục phòng ── */}
        <SectionCard
          icon="category"
          title={t('room.classification', 'Phân loại')}
          cardBg={cardBg}
          subTextColor={subTextColor}
          borderColor={borderColor}
          isDark={isDark}>
          <FieldLabel subTextColor={subTextColor}>
            {t('room.roomCategory', 'Hạng mục phòng')}
          </FieldLabel>

          {/* Trigger button */}
          <TouchableOpacity
            onPress={() => setShowCategoryPicker(p => !p)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: inputBg,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 13,
              borderWidth: isDark ? 1 : 0,
              borderColor,
            }}>
            <Text style={{fontSize: 14, fontWeight: '500', color: textColor}}>
              {selectedType?.name ?? t('room.selectCategory', 'Chọn hạng mục')}
            </Text>
            <Icon
              name={
                showCategoryPicker ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
              }
              size={22}
              color="#9ca3af"
            />
          </TouchableOpacity>

          {/* Dropdown: tối đa 4 items rồi scroll, + nút "Tạo mới" */}
          {showCategoryPicker && (
            <View
              style={{
                marginTop: 8,
                backgroundColor: isDark ? '#374151' : '#f8fafc',
                borderRadius: 12,
                borderWidth: 1,
                borderColor,
                overflow: 'hidden',
              }}>
              {/* Danh sách cuộn — max-height = 4 × ~50px = 200 */}
              <ScrollView
                style={{maxHeight: 200}}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={roomTypes.length > 4}>
                {roomTypes.length === 0 ? (
                  <View style={{padding: 16, alignItems: 'center'}}>
                    <Text style={{fontSize: 13, color: '#9ca3af'}}>
                      Chưa có hạng mục phòng nào
                    </Text>
                  </View>
                ) : (
                  roomTypes.map((rt, idx) => (
                    <TouchableOpacity
                      key={rt.id}
                      onPress={() => {
                        setSelectedTypeId(rt.id);
                        setShowCategoryPicker(false);
                      }}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        borderBottomWidth: idx < roomTypes.length - 1 ? 1 : 0,
                        borderBottomColor: borderColor,
                        backgroundColor:
                          selectedTypeId === rt.id
                            ? isDark
                              ? 'rgba(59,130,246,0.15)'
                              : '#eff6ff'
                            : 'transparent',
                      }}>
                      <View style={{flex: 1}}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color:
                              selectedTypeId === rt.id ? '#3b82f6' : textColor,
                          }}>
                          {rt.name}
                        </Text>
                        {rt.description ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: '#9ca3af',
                              marginTop: 2,
                            }}
                            numberOfLines={1}>
                            {rt.description}
                          </Text>
                        ) : null}
                      </View>
                      {selectedTypeId === rt.id && (
                        <Icon name="check" size={18} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Divider + nút tạo mới */}
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryPicker(false);
                  setShowNewCategoryModal(true);
                }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderTopWidth: 1,
                  borderTopColor: borderColor,
                  backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
                }}>
                <Icon name="add-circle-outline" size={18} color="#3b82f6" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#3b82f6',
                  }}>
                  Tạo hạng mục mới...
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SectionCard>

        {/* ── Section 2: Thông tin phòng ── */}
        <SectionCard
          icon="info"
          title={t('room.roomInfo', 'Thông tin phòng')}
          cardBg={cardBg}
          subTextColor={subTextColor}
          borderColor={borderColor}
          isDark={isDark}>
          <View style={{gap: 20}}>
            <View style={{flexDirection: 'row', gap: 12}}>
              <View style={{flex: 1}}>
                <FieldLabel subTextColor={subTextColor}>
                  {t('room.floor', 'Tầng')}
                </FieldLabel>
                <TextInput
                  style={inputStyle}
                  value={floor}
                  onChangeText={setFloor}
                  placeholder="3"
                  keyboardType="number-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={{flex: 2}}>
                <FieldLabel subTextColor={subTextColor}>
                  {t('room.roomName', 'Tên phòng')}
                </FieldLabel>
                <TextInput
                  style={inputStyle}
                  value={name}
                  onChangeText={setName}
                  placeholder="VD: Room 301"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>
        </SectionCard>

        {/* ── Section 3: Giá ── */}
        <SectionCard
          icon="payments"
          title={t('room.initialPricing', 'Giá khởi tạo')}
          cardBg={cardBg}
          subTextColor={subTextColor}
          borderColor={borderColor}
          isDark={isDark}>
          <View style={{gap: 16}}>
            {[
              {
                label: t('room.priceListed', 'Giá niêm yết (VNĐ)'),
                value: priceListed,
                set: setPriceListed,
              },
              {
                label: t('room.priceHourFirst', 'Giá giờ đầu (VNĐ)'),
                value: priceHourFirst,
                set: setPriceHourFirst,
              },
              {
                label: t('room.priceHour', 'Giá một giờ (VNĐ)'),
                value: priceHour,
                set: setPriceHour,
              },
              {
                label: t('room.priceMonth', 'Giá một tháng (VNĐ)'),
                value: priceMonth,
                set: setPriceMonth,
              },
            ].map(f => (
              <View key={f.label}>
                <FieldLabel subTextColor={subTextColor}>{f.label}</FieldLabel>
                <View>
                  <TextInput
                    style={{
                      width: '100%',
                      backgroundColor: inputBg,
                      borderRadius: 12,
                      paddingLeft: 16,
                      paddingRight: 56,
                      paddingVertical: 12,
                      fontSize: 14,
                      fontWeight: '700',
                      color: '#3b82f6',
                      borderWidth: isDark ? 1 : 0,
                      borderColor,
                    }}
                    keyboardType="numeric"
                    value={f.value}
                    onChangeText={f.set}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 14,
                      fontSize: 9,
                      fontWeight: '900',
                      color: '#94a3b8',
                    }}>
                    VND
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 16,
          backgroundColor: isDark
            ? 'rgba(31,41,55,0.95)'
            : 'rgba(255,255,255,0.95)',
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.8}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: isDark ? '#374151' : '#f1f5f9',
          }}>
          <Text style={{fontSize: 14, fontWeight: '700', color: subTextColor}}>
            {t('common.cancel', 'Hủy')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            flex: 2,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: '#3b82f6',
            opacity: saving ? 0.7 : 1,
            elevation: 4,
            shadowColor: '#3b82f6',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: {width: 0, height: 4},
          }}>
          <Text style={{fontSize: 14, fontWeight: '700', color: '#fff'}}>
            {saving
              ? t('common.saving', 'Đang lưu...')
              : isEdit
              ? t('common.saveChanges', 'Lưu thay đổi')
              : t('common.save', 'Lưu thông tin')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Tạo hạng mục phòng mới ── */}
      <Modal
        visible={showNewCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewCategoryModal(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
          activeOpacity={1}
          onPress={() => setShowNewCategoryModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              borderRadius: 20,
              padding: 24,
              elevation: 10,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: {width: 0, height: 8},
            }}>
            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
                gap: 10,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#eff6ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name="category" size={18} color="#3b82f6" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: textColor,
                  flex: 1,
                }}>
                Tạo hạng mục phòng mới
              </Text>
              <TouchableOpacity onPress={() => setShowNewCategoryModal(false)}>
                <Icon name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Tên hạng mục */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: subTextColor,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}>
              Tên hạng mục *
            </Text>
            <TextInput
              style={{
                ...inputStyle,
                marginBottom: 16,
              }}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="VD: Phòng Luxury, Phòng VIP..."
              placeholderTextColor="#9ca3af"
              autoFocus
            />

            {/* Mô tả */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: subTextColor,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}>
              Mô tả (tùy chọn)
            </Text>
            <TextInput
              style={{
                ...inputStyle,
                marginBottom: 24,
                height: 72,
                textAlignVertical: 'top',
              }}
              value={newCategoryDesc}
              onChangeText={setNewCategoryDesc}
              placeholder="Mô tả ngắn về hạng mục này..."
              placeholderTextColor="#9ca3af"
              multiline
            />

            {/* Actions */}
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                onPress={() => setShowNewCategoryModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: isDark ? '#374151' : '#f1f5f9',
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: subTextColor,
                  }}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateCategory}
                disabled={creatingCategory}
                style={{
                  flex: 2,
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: '#3b82f6',
                  opacity: creatingCategory ? 0.7 : 1,
                }}>
                {creatingCategory ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={{fontSize: 14, fontWeight: '700', color: '#fff'}}>
                    Tạo hạng mục
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
