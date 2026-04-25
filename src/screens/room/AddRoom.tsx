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
 *  6. Giá hiển thị đúng thứ tự: Giờ đầu (HOURFIRST) → Theo giờ (HOUR) → Qua ngày (DAY) → Một tháng (MONTH)
 *     và điền sẵn khi mở màn hình edit
 */
import React, {useState, useCallback, memo, useEffect} from 'react';
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
import {createModuleLogger, AppModules} from '../../logger';

const logger = createModuleLogger(AppModules.STORE_SERVICE);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddRoomPayload {
  category: string;
  name: string;
  floor: string;
  /** Giá qua ngày (DAY) */
  priceListed: string;
  /** Giá giờ đầu (HOURFIRST) */
  priceHourFirst: string;
  /** Giá theo giờ (HOUR) */
  priceHour: string;
  /** Giá một tháng (MONTH) */
  priceMonth: string;
}

export interface RoomDetailInitialData {
  variantId?: string;
  typeId: string;
  name: string;
  floor: string;
  /** Giá qua ngày – unit_code = DAY */
  priceListed: string;
  priceListedId?: string; // id của row prices.DAY — dùng để UPDATE trực tiếp
  /** Giá giờ đầu – unit_code = HOURFIRST */
  priceHourFirst: string;
  priceHourFirstId?: string; // id của row prices.HOURFIRST
  /** Giá theo giờ – unit_code = HOUR */
  priceHour: string;
  priceHourId?: string; // id của row prices.HOUR
  /** Giá một tháng – unit_code = MONTH */
  priceMonth: string;
  priceMonthId?: string; // id của row prices.MONTH
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

// ─── PriceField – 1 ô nhập giá với badge unit_code ───────────────────────────

interface PriceFieldProps {
  label: string;
  unitCode: string;
  value: string;
  onChange: (v: string) => void;
  inputBg: string;
  textColor: string;
  borderColor: string;
  isDark: boolean;
  subTextColor: string;
}

const PriceField = memo(
  ({
    label,
    value,
    onChange,
    inputBg,
    borderColor,
    isDark,
    subTextColor,
  }: PriceFieldProps) => (
    <View>
      <FieldLabel subTextColor={subTextColor}>{label}</FieldLabel>
      <View style={{position: 'relative'}}>
        {/* Badge unit_code bên trái */}
        <TextInput
          style={{
            width: '100%',
            backgroundColor: inputBg,
            borderRadius: 12,
            paddingLeft: 18, // chừa chỗ cho badge bên trái
            paddingRight: 52, // chừa chỗ cho "VND" bên phải
            paddingVertical: 12,
            fontSize: 14,
            fontWeight: '700',
            color: '#3b82f6',
            borderWidth: isDark ? 1 : 0,
            borderColor,
          }}
          keyboardType="numeric"
          value={value}
          onChangeText={onChange}
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
          VNĐ
        </Text>
      </View>
    </View>
  ),
);

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

  logger.trace(`[AddRoom] render, mode=${mode}, storeId=${storeId}`);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const bgColor = isDark ? '#111827' : '#f5f7fa';
  const headerBg = isDark ? '#1f2937' : '#f5f7fa';
  const cardBg = isDark ? '#1f2937' : '#ffffff';
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

  // Giá – thứ tự chuẩn: HOURFIRST → HOUR → DAY → MONTH
  const [priceHourFirst, setPriceHourFirst] = useState(
    initialData?.priceHourFirst ?? '',
  );
  const [priceHour, setPriceHour] = useState(initialData?.priceHour ?? '');
  const [priceListed, setPriceListed] = useState(
    initialData?.priceListed ?? '',
  );
  const [priceMonth, setPriceMonth] = useState(initialData?.priceMonth ?? '');

  const [saving, setSaving] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // ── Load giá từ DB khi mở edit (initialData chưa có giá điền sẵn) ─────────
  useEffect(() => {
    if (mode !== 'edit' || !initialData?.variantId) return;

    // Nếu initialData đã có giá rồi thì không cần fetch lại
    const hasPrefilledPrice =
      initialData.priceHourFirst ||
      initialData.priceHour ||
      initialData.priceListed ||
      initialData.priceMonth;
    if (hasPrefilledPrice) return;

    let cancelled = false;
    const fetchPrices = async () => {
      logger.debug(
        `[AddRoom] useEffect: fetching prices for variantId=${initialData.variantId}`,
      );
      setLoadingPrices(true);
      try {
        const priceMap = await RoomService.loadVariantPriceMap(
          initialData.variantId!,
        );
        if (cancelled) return;
        logger.info(
          `[AddRoom] useEffect: prices loaded: ${JSON.stringify(priceMap)}`,
        );
        if (priceMap.HOURFIRST) setPriceHourFirst(priceMap.HOURFIRST);
        if (priceMap.HOUR) setPriceHour(priceMap.HOUR);
        if (priceMap.DAY) setPriceListed(priceMap.DAY);
        if (priceMap.MONTH) setPriceMonth(priceMap.MONTH);
      } catch (err) {
        logger.error('[AddRoom] useEffect: failed to load prices', err);
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    };

    fetchPrices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData?.variantId]);

  // ── Create new category modal state ────────────────────────────────────────
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const isEdit = mode === 'edit';
  const selectedType = roomTypes.find(rt => rt.id === selectedTypeId);

  // ── Build price inputs từ form values ────────────────────────────────────
  const buildPriceInputs = useCallback((): RoomPriceInput[] => {
    const entries: Array<{unitCode: string; value: string; priceId?: string}> =
      [
        {
          unitCode: 'HOURFIRST',
          value: priceHourFirst,
          priceId: initialData?.priceHourFirstId,
        },
        {unitCode: 'HOUR', value: priceHour, priceId: initialData?.priceHourId},
        {
          unitCode: 'DAY',
          value: priceListed,
          priceId: initialData?.priceListedId,
        },
        {
          unitCode: 'MONTH',
          value: priceMonth,
          priceId: initialData?.priceMonthId,
        },
      ];

    logger.debug(
      `[AddRoom] buildPriceInputs: HOURFIRST="${priceHourFirst}"(id=${initialData?.priceHourFirstId}), ` +
        `HOUR="${priceHour}"(id=${initialData?.priceHourId}), ` +
        `DAY="${priceListed}"(id=${initialData?.priceListedId}), ` +
        `MONTH="${priceMonth}"(id=${initialData?.priceMonthId})`,
    );

    const result = entries
      .filter(e => e.value.trim() !== '' && !isNaN(Number(e.value)))
      .map(e => ({
        unitCode: e.unitCode,
        price: Number(e.value),
        priceId: e.priceId, // truyền thẳng id → saveVariantPrices UPDATE đúng row
      }));

    logger.debug(
      `[AddRoom] buildPriceInputs: ${result.length} valid entries - ${result
        .map(r => `${r.unitCode}=${r.price}(id=${r.priceId ?? 'new'})`)
        .join(', ')}`,
    );
    return result;
  }, [priceHourFirst, priceHour, priceListed, priceMonth, initialData]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    logger.info(
      `[AddRoom] handleSave called, mode=${mode}, name="${name}", selectedTypeId=${selectedTypeId}`,
    );
    if (!name.trim()) {
      logger.warn('[AddRoom] handleSave validation failed: name is empty');
      Alert.alert(
        t('common.missingInfo', 'Thiếu thông tin'),
        t('room.nameRequired', 'Vui lòng nhập tên phòng.'),
      );
      return;
    }
    if (!selectedTypeId) {
      logger.warn(
        '[AddRoom] handleSave validation failed: selectedTypeId is empty',
      );
      Alert.alert(
        t('common.missingInfo', 'Thiếu thông tin'),
        t('room.categoryRequired', 'Vui lòng chọn hạng mục phòng.'),
      );
      return;
    }

    setSaving(true);
    try {
      const priceInputs = buildPriceInputs();
      logger.info(
        `[AddRoom] handleSave proceeding with ${priceInputs.length} price inputs`,
      );

      if (isEdit && initialData?.variantId) {
        logger.info(
          `[AddRoom] handleSave: updating variant prices, variantId=${initialData.variantId}, ${priceInputs.length} prices`,
        );
        // Cập nhật giá
        if (priceInputs.length > 0) {
          await RoomService.updateVariantPrices(
            initialData.variantId,
            storeId,
            priceInputs,
          );
        } else {
          logger.warn(
            `[AddRoom] handleSave: No prices provided in edit mode for variantId=${initialData.variantId}`,
          );
        }
        // TODO: update variant name/floor nếu cần
      } else {
        logger.info(
          `[AddRoom] handleSave: creating new room variant, productId=${selectedTypeId}, name="${name.trim()}", with ${
            priceInputs.length
          } prices`,
        );
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

      logger.info('[AddRoom] handleSave success, calling onSave callback');
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
      logger.error('[AddRoom] save error:', err);
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
    logger.info(
      `[AddRoom] handleCreateCategory called, name="${newCategoryName.trim()}"`,
    );
    if (!newCategoryName.trim()) {
      logger.warn(
        '[AddRoom] handleCreateCategory validation failed: name is empty',
      );
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
      logger.info(
        `[AddRoom] handleCreateCategory success, newType.id=${newType.id}, name="${newType.name}"`,
      );
      setShowNewCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      setSelectedTypeId(newType.id);
      onRoomTypeCreated?.(newType);
    } catch (err) {
      logger.error('[AddRoom] createCategory error:', err);
      Alert.alert('Lỗi', 'Không thể tạo hạng mục phòng.');
    } finally {
      setCreatingCategory(false);
    }
  };

  // ── Shared input style ──────────────────────────────────────────────────────
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

          {/* Dropdown */}
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
                        logger.debug(
                          `[AddRoom] category selected: id=${rt.id}, name="${rt.name}"`,
                        );
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

              {/* Nút tạo mới hạng mục */}
              <TouchableOpacity
                onPress={() => {
                  logger.debug('[AddRoom] open new category modal');
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

        {/* ── Section 3: Giá khởi tạo ── */}
        {/* Thứ tự cố định: Giờ đầu → Theo giờ → Qua ngày → Một tháng */}
        <SectionCard
          icon="payments"
          title={t('room.initialPricing', 'Giá khởi tạo')}
          cardBg={cardBg}
          subTextColor={subTextColor}
          borderColor={borderColor}
          isDark={isDark}>
          {loadingPrices ? (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 32,
                gap: 10,
              }}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={{fontSize: 12, color: '#9ca3af'}}>
                Đang tải giá...
              </Text>
            </View>
          ) : (
            <View style={{gap: 16}}>
              {/* 1. Giá giờ đầu – HOURFIRST */}
              <PriceField
                label={t('room.priceHourFirst', 'Giá giờ đầu')}
                unitCode="HOURFIRST"
                value={priceHourFirst}
                onChange={setPriceHourFirst}
                inputBg={inputBg}
                textColor={textColor}
                borderColor={borderColor}
                isDark={isDark}
                subTextColor={subTextColor}
              />

              {/* 2. Giá theo giờ – HOUR */}
              <PriceField
                label={t('room.priceHour', 'Giá theo giờ')}
                unitCode="HOUR"
                value={priceHour}
                onChange={setPriceHour}
                inputBg={inputBg}
                textColor={textColor}
                borderColor={borderColor}
                isDark={isDark}
                subTextColor={subTextColor}
              />

              {/* 3. Giá qua ngày – DAY */}
              <PriceField
                label={t('room.priceListed', 'Giá qua ngày')}
                unitCode="DAY"
                value={priceListed}
                onChange={setPriceListed}
                inputBg={inputBg}
                textColor={textColor}
                borderColor={borderColor}
                isDark={isDark}
                subTextColor={subTextColor}
              />

              {/* 4. Giá một tháng – MONTH */}
              <PriceField
                label={t('room.priceMonth', 'Giá một tháng')}
                unitCode="MONTH"
                value={priceMonth}
                onChange={setPriceMonth}
                inputBg={inputBg}
                textColor={textColor}
                borderColor={borderColor}
                isDark={isDark}
                subTextColor={subTextColor}
              />
            </View>
          )}
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
