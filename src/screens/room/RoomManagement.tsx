import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  RefreshControl,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import AddRoom, {AddRoomPayload, RoomDetailInitialData} from './AddRoom';
import {useTheme} from '../../hooks/useTheme';
import {
  RoomService,
  RoomType,
  RoomVariant,
  EMPTY_PRICE_MAP,
} from '../../services/database/room/RoomCategoryService';
import {useSelectionMode} from '../../hooks/useSelectionMode';
import {ConfirmDeleteModal} from '../../components/common/ConfirmDeleteModal';
import {SelectionBar} from '../../components/common/SelectionBar';
import {createModuleLogger, AppModules} from '../../logger';

const logger = createModuleLogger(AppModules.STORE_SERVICE);

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLET_BREAKPOINT = 600;

const ROOM_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#0ea5e9',
];

const colorForProduct = (productId: string): string => {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = productId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ROOM_COLORS[Math.abs(hash) % ROOM_COLORS.length];
};

const extractRoomNumber = (name: string): string => {
  const numMatch = name.match(/(\d+)\s*$/);
  if (numMatch) {
    return numMatch[1];
  }
  const lastWord = name.trim().split(/\s+/).pop() ?? '';
  return lastWord.slice(0, 4).toUpperCase();
};

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function RoomThumbnail({variant, isDark}: {variant: RoomVariant; isDark: boolean}) {
  const label = extractRoomNumber(variant.name);
  const fs =
    label.length > 4 ? 11 : label.length > 3 ? 14 : label.length > 2 ? 17 : 22;

  return (
    <View
      style={{
        width: 68,
        height: 68,
        borderRadius: 12,
        backgroundColor: isDark ? '#374151' : '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}>
      <View
        style={{
          position: 'absolute',
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
      <Text
        style={{
          fontSize: fs,
          fontWeight: '900',
          color: isDark ? '#f3f4f6' : '#374151',
          letterSpacing: 0.5,
        }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({
  variant,
  onPress,
  isDark,
  selectionMode,
  isSelected,
  onLongPress,
  t,
}: {
  variant: RoomVariant;
  onPress: () => void;
  isDark: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: () => void;
  t: any;
}) {
  const {floor, area, bed} = variant.attributes ?? {};
  const hasMeta = floor != null || area != null || bed != null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: isDark ? 0.3 : 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? '#3b82f6' : isDark ? '#374151' : '#f0f0f0',
      }}>
      {/* Selection checkbox */}
      {selectionMode && (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: isSelected
              ? '#3b82f6'
              : isDark
              ? '#4b5563'
              : '#d1d5db',
            backgroundColor: isSelected ? '#3b82f6' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          {isSelected && <Icon name="check" size={13} color="#fff" />}
        </View>
      )}

      <RoomThumbnail variant={variant} isDark={isDark} />

      <View style={{flex: 1, gap: 3}}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: isDark ? '#e5e7eb' : '#374151',
          }}
          numberOfLines={1}
          ellipsizeMode="tail">
          {variant.name}
        </Text>

        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: isDark ? '#6b7280' : '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
          numberOfLines={1}>
          {variant.productName}
        </Text>

        {hasMeta && (
          <View style={{flexDirection: 'row', gap: 10, marginTop: 2}}>
            {floor != null && floor !== '' && (
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
                <Icon
                  name="layers"
                  size={11}
                  color={isDark ? '#6b7280' : '#94a3b8'}
                />
                <Text
                  style={{fontSize: 11, color: isDark ? '#6b7280' : '#94a3b8'}}>
                  {t('room.floorLabel', {floor})}
                </Text>
              </View>
            )}
            {area != null && area !== '' && (
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
                <Icon
                  name="square-foot"
                  size={11}
                  color={isDark ? '#6b7280' : '#94a3b8'}
                />
                <Text
                  style={{fontSize: 11, color: isDark ? '#6b7280' : '#94a3b8'}}>
                  {area}m²
                </Text>
              </View>
            )}
            {bed != null && bed !== '' && (
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
                <Icon
                  name="bed"
                  size={11}
                  color={isDark ? '#6b7280' : '#94a3b8'}
                />
                <Text
                  style={{fontSize: 11, color: isDark ? '#6b7280' : '#94a3b8'}}>
                  {bed}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {!selectionMode && (
        <Icon
          name="chevron-right"
          size={20}
          color={isDark ? '#4b5563' : '#cbd5e1'}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

function RoomFAB({onAddRoom}: {onAddRoom: () => void}) {
  const [open, setOpen] = useState(false);
  const {t} = useTranslation();

  return (
    <>
      {open && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
      )}
      {open && (
        <View
          style={{
            position: 'absolute',
            bottom: 96,
            right: 24,
            alignItems: 'flex-end',
            gap: 14,
          }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setOpen(false);
              onAddRoom();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 18,
              marginBottom: 6,
            }}>
            <View
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 20,
                paddingHorizontal: 18,
                paddingVertical: 10,
              }}>
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                {t('room.addRoom')}
              </Text>
            </View>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#3b82f6',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 4,
              }}>
              <Icon name="bed" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 32,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: open ? '#ef4444' : '#3b82f6',
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 8,
          shadowColor: '#3b82f6',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: {width: 0, height: 4},
        }}
        onPress={() => setOpen(p => !p)}
        activeOpacity={0.85}>
        <Icon name={open ? 'close' : 'add'} size={30} color="#fff" />
      </TouchableOpacity>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  storeId: string;
}

function variantsToGroups(variants: RoomVariant[]) {
  return variants.map(v => ({id: v.id, items: [{id: v.id}]}));
}

export default function RoomManagement({storeId}: Props) {
  const {t} = useTranslation();
  const {isDark} = useTheme();
  const {width} = useWindowDimensions();

  logger.trace(`[RoomManagement] render, storeId=${storeId}`);

  const numColumns = width >= TABLET_BREAKPOINT ? 2 : 1;

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [variants, setVariants] = useState<RoomVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * selectedVariant      = phòng user vừa tap (để mở modal edit)
   * editInitialData      = dữ liệu form đã load giá từ DB (set bất đồng bộ)
   * loadingEditVariantId = id đang fetch giá → hiện loading indicator trên card
   */
  const [selectedVariant, setSelectedVariant] = useState<RoomVariant | null>(
    null,
  );
  const [editInitialData, setEditInitialData] =
    useState<RoomDetailInitialData | null>(null);
  const [loadingEditVariantId, setLoadingEditVariantId] = useState<
    string | null
  >(null);

  const textColor = isDark ? '#f9fafb' : '#111827';
  const inputBg = isDark ? '#374151' : '#e0e3e8';
  const borderColor = isDark ? '#4b5563' : '#e5e7eb';

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(
    async (isRefresh = false) => {
      logger.info(
        `[RoomManagement] loadData called, isRefresh=${isRefresh}, storeId=${storeId}`,
      );
      if (isRefresh) setRefreshing(true);
      else setIsLoading(true);

      setError(null);
      try {
        const [types, vars] = await Promise.all([
          RoomService.loadRoomTypes(storeId),
          RoomService.loadRoomVariants(storeId),
        ]);
        setRoomTypes(types);
        setVariants(vars);
        logger.info(
          `[RoomManagement] loadData success: ${types.length} types, ${vars.length} variants`,
        );

        // Create default "Phòng" room type if none exist
        if (types.length === 0 && !isRefresh) {
          logger.warn(
            '[RoomManagement] No room types found, creating default "Phòng" type',
          );
          try {
            const defaultRoomType = await RoomService.createRoomType({
              storeId,
              name: t('room.defaultType'),
              description: t('room.defaultTypeDesc'),
            });
            setRoomTypes([defaultRoomType]);
            logger.info(
              `[RoomManagement] Default room type created: id=${defaultRoomType.id}`,
            );
          } catch (err) {
            logger.error(
              '[RoomManagement] Failed to create default room type:',
              err,
            );
          }
        }
      } catch (e) {
        logger.error('[RoomManagement] loadData error:', e);
        setError(t('room.loadError'));
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [storeId, t],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (
      activeFilter !== 'all' &&
      !roomTypes.some(rt => rt.id === activeFilter)
    ) {
      logger.debug(
        `[RoomManagement] activeFilter "${activeFilter}" no longer valid, resetting to "all"`,
      );
      setActiveFilter('all');
    }
  }, [roomTypes, activeFilter]);

  const handleSaveRoom = useCallback(
    async (_payload: AddRoomPayload) => {
      logger.info('[RoomManagement] handleSaveRoom called, reloading data');
      setShowAddRoom(false);
      await loadData();
    },
    [loadData],
  );

  // ── Khi tạo mới loại phòng trong AddRoom → append vào state luôn ──────────

  const handleRoomTypeCreated = useCallback((newType: RoomType) => {
    logger.info(
      `[RoomManagement] handleRoomTypeCreated: id=${newType.id}, name="${newType.name}"`,
    );
    setRoomTypes(prev => [...prev, newType]);
  }, []);

  // ── Mở màn hình edit: fetch giá từ DB trước rồi mới hiển thị modal ────────

  const handleOpenEdit = useCallback(async (variant: RoomVariant) => {
    logger.info(
      `[RoomManagement] handleOpenEdit called, variantId=${variant.id}, name="${variant.name}"`,
    );
    setLoadingEditVariantId(variant.id);
    try {
      // Load giá theo unit_code từ DB
      const priceMap = await RoomService.loadVariantPriceMap(variant.id);
      logger.debug(
        `[RoomManagement] handleOpenEdit priceMap loaded: ${JSON.stringify(
          priceMap,
        )}`,
      );

      const initialData: RoomDetailInitialData = {
        variantId: variant.id,
        typeId: variant.productId,
        name: variant.name,
        floor: variant.attributes?.floor?.toString() ?? '',
        // Thứ tự: HOURFIRST → HOUR → DAY → MONTH
        priceHourFirst: priceMap.HOURFIRST,
        priceHour: priceMap.HOUR,
        priceListed: priceMap.DAY,
        priceMonth: priceMap.MONTH,
      };

      setSelectedVariant(variant);
      setEditInitialData(initialData);
      logger.info(
        `[RoomManagement] handleOpenEdit success, opening edit modal for variantId=${variant.id}`,
      );
    } catch (err) {
      logger.error('[RoomManagement] load prices error:', err);
      // Mở modal dù có lỗi, để user vẫn có thể thấy thông tin phòng
      logger.warn(
        `[RoomManagement] handleOpenEdit falling back to empty price data for variantId=${variant.id}`,
      );
      const fallback: RoomDetailInitialData = {
        variantId: variant.id,
        typeId: variant.productId,
        name: variant.name,
        floor: variant.attributes?.floor?.toString() ?? '',
        priceListed: '',
        priceHourFirst: '',
        priceHour: '',
        priceMonth: '',
      };
      setSelectedVariant(variant);
      setEditInitialData(fallback);
    } finally {
      setLoadingEditVariantId(null);
    }
  }, []);

  const handleCloseEdit = useCallback(() => {
    logger.debug('[RoomManagement] handleCloseEdit called');
    setSelectedVariant(null);
    setEditInitialData(null);
  }, []);

  // ── Filters ───────────────────────────────────────────────────────────────

  const filters = useMemo(() => {
    const typesWithRooms = new Set(variants.map(v => v.productId));
    const dynamic = roomTypes
      .filter(rt => typesWithRooms.has(rt.id))
      .map(rt => ({key: rt.id, label: rt.name}));
    return [{key: 'all', label: t('pos.all')}, ...dynamic];
  }, [roomTypes, variants]);

  const displayed = useMemo(() => {
    let result =
      activeFilter === 'all'
        ? variants
        : variants.filter(v => v.productId === activeFilter);

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        v =>
          v.name.toLowerCase().includes(q) ||
          v.productName.toLowerCase().includes(q) ||
          (v.attributes?.floor?.toString() ?? '').toLowerCase().includes(q),
      );
    }
    logger.trace(
      `[RoomManagement] displayed computed: ${result.length} items, filter="${activeFilter}", search="${searchText}"`,
    );
    return result;
  }, [variants, activeFilter, searchText]);

  // ── Selection ─────────────────────────────────────────────────────────────

  const selectionGroups = useMemo(
    () => variantsToGroups(displayed),
    [displayed],
  );

  const {
    selectionMode,
    selectedItems: selectedVariantIds,
    totalSelected,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectAll,
    toggleSelectItem,
  } = useSelectionMode(selectionGroups);

  const handleDeleteSelected = useCallback(async () => {
    logger.info(
      `[RoomManagement] handleDeleteSelected called, totalSelected=${totalSelected}`,
    );
    try {
      for (const variantId of selectedVariantIds) {
        logger.debug(`[RoomManagement] soft-deleting variantId=${variantId}`);
        await RoomService.softDeleteVariant(variantId);
      }
      logger.info(
        '[RoomManagement] handleDeleteSelected success, reloading data',
      );
      exitSelectionMode();
      setShowDeleteConfirm(false);
      await loadData();
    } catch (e) {
      logger.error('[RoomManagement] delete error:', e);
    }
  }, [selectedVariantIds, exitSelectionMode, loadData]);

  const deleteLabel = useMemo(() => {
    if (totalSelected === 1) {
      const variantId = [...selectedVariantIds][0];
      const variant = displayed.find(v => v.id === variantId);
      const name = variant?.name || '';
      return t('room.deleteSingleRoom', {name});
    }
    return t('room.deleteMultipleRooms', {count: totalSelected});
  }, [totalSelected, selectedVariantIds, displayed, t]);

  // ── Room detail save ──────────────────────────────────────────────────────

  const handleSaveDetail = useCallback(
    async (_payload: AddRoomPayload) => {
      logger.info(
        '[RoomManagement] handleSaveDetail called, closing edit and reloading',
      );
      handleCloseEdit();
      await loadData();
    },
    [handleCloseEdit, loadData],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{flex: 1, backgroundColor: isDark ? '#111827' : '#f5f7f8'}}>
      {/* ── Toolbar ── */}
      <View
        style={{
          flexShrink: 0,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
          backgroundColor: isDark ? '#111827' : '#f5f7f8',
        }}>
        {selectionMode ? (
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: textColor,
              flex: 1,
            }}>
            {totalSelected > 0
              ? t('room.selectedCount', {count: totalSelected})
              : t('room.selectToDelete')}
          </Text>
        ) : (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: inputBg,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 7,
              elevation: isDark ? 0 : 2,
              borderWidth: isDark ? 1 : 0,
              borderColor,
            }}>
            <TextInput
              placeholder={t('room.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
            />
            <Icon name="search" size={20} color="#9ca3af" />
          </View>
        )}

        <TouchableOpacity
          onPress={selectionMode ? toggleSelectAll : enterSelectionMode}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={{color: '#3b82f6', fontSize: 14, fontWeight: '600'}}>
            {selectionMode
              ? isAllSelected
                ? t('common.deselect_all')
                : t('common.select_all')
              : t('common.select')}
          </Text>
        </TouchableOpacity>

        {selectionMode && (
          <TouchableOpacity
            onPress={exitSelectionMode}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="close" size={22} color={textColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{flexShrink: 0, flexGrow: 0}}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 10,
          gap: 8,
          alignItems: 'center',
        }}>
        {filters.map(f => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                logger.debug(
                  `[RoomManagement] filter selected: key="${f.key}", label="${f.label}"`,
                );
                setActiveFilter(f.key);
              }}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isActive
                  ? '#0077ff'
                  : isDark
                  ? '#1f2937'
                  : '#fff',
                borderWidth: 1,
                borderColor: isActive
                  ? 'transparent'
                  : isDark
                  ? '#374151'
                  : '#e2e8f0',
                elevation: isActive ? 3 : 0,
                shadowColor: '#0077ff',
                shadowOpacity: isActive ? 0.25 : 0,
                shadowRadius: 6,
                shadowOffset: {width: 0, height: 2},
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? '#fff' : isDark ? '#9ca3af' : '#64748b',
                }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <ActivityIndicator size="large" color="#0077ff" />
          <Text style={{color: '#9ca3af', fontSize: 14, marginTop: 12}}>
            {t('room.loading')}
          </Text>
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}>
          <Icon
            name="error-outline"
            size={48}
            color={isDark ? '#374151' : '#e2e8f0'}
          />
          <Text
            style={{
              color: '#9ca3af',
              fontSize: 15,
              marginTop: 12,
              textAlign: 'center',
            }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => loadData()}
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 10,
              backgroundColor: '#3b82f6',
              borderRadius: 12,
            }}>
            <Text style={{color: '#fff', fontWeight: '600'}}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : displayed.length === 0 ? (
        <View style={{flex: 1, alignItems: 'center', paddingTop: 80}}>
          <Icon name="bed" size={56} color={isDark ? '#374151' : '#e2e8f0'} />
          <Text style={{color: '#9ca3af', fontSize: 15, marginTop: 12}}>
            {searchText.trim()
              ? t('room.noSearchResult')
              : variants.length === 0
              ? t('room.empty')
              : t('room.emptyFilter')}
          </Text>
        </View>
      ) : (
        <View style={{flex: 1}}>
          <FlatList
            key={`room-list-${numColumns}`}
            data={displayed}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            columnWrapperStyle={
              numColumns > 1 ? {gap: 12, paddingHorizontal: 16} : undefined
            }
            ItemSeparatorComponent={() => <View style={{height: 10}} />}
            contentContainerStyle={{
              paddingHorizontal: numColumns === 1 ? 16 : 0,
              paddingTop: 4,
              paddingBottom: selectionMode ? 140 : 120,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadData(true)}
                colors={['#0077ff']}
                tintColor="#0077ff"
              />
            }
            renderItem={({item}) => (
              <RoomCard
                variant={item}
                isDark={isDark}
                selectionMode={selectionMode}
                isSelected={selectedVariantIds.has(item.id)}
                t={t}
                onLongPress={() => {
                  if (!selectionMode) {
                    logger.debug(
                      `[RoomManagement] long press on variantId=${item.id}, entering selection mode`,
                    );
                    enterSelectionMode();
                    toggleSelectItem(item.id);
                  }
                }}
                onPress={() => {
                  if (selectionMode) {
                    toggleSelectItem(item.id);
                  } else {
                    handleOpenEdit(item);
                  }
                }}
              />
            )}
          />

          {/* Loading overlay khi đang fetch giá cho 1 phòng */}
          {loadingEditVariantId !== null && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  backgroundColor: isDark ? '#1f2937' : '#fff',
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                  gap: 12,
                  elevation: 8,
                }}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text
                  style={{
                    color: isDark ? '#9ca3af' : '#64748b',
                    fontSize: 13,
                    fontWeight: '600',
                  }}>
                  {t('room.loadingInfo')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* FAB */}
      {!selectionMode && <RoomFAB onAddRoom={() => setShowAddRoom(true)} />}

      {/* Selection bar */}
      {selectionMode && (
        <SelectionBar
          totalSelected={totalSelected}
          onDelete={() => setShowDeleteConfirm(true)}
          labelSelected={count => t('room.deleteSelectedLabel', {count})}
        />
      )}

      {/* Confirm delete modal */}
      <ConfirmDeleteModal
        visible={showDeleteConfirm}
        targetLabel={deleteLabel}
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Add room modal */}
      <Modal
        visible={showAddRoom}
        animationType="slide"
        onRequestClose={() => setShowAddRoom(false)}>
        <AddRoom
          storeId={storeId}
          onBack={() => setShowAddRoom(false)}
          onSave={handleSaveRoom}
          roomTypes={roomTypes}
          onRoomTypeCreated={handleRoomTypeCreated}
        />
      </Modal>

      {/* Room detail / edit modal – chỉ mount khi đã có editInitialData */}
      <Modal
        visible={selectedVariant !== null && editInitialData !== null}
        animationType="slide"
        onRequestClose={handleCloseEdit}>
        {selectedVariant && editInitialData && (
          <AddRoom
            storeId={storeId}
            onBack={handleCloseEdit}
            onSave={handleSaveDetail}
            roomTypes={roomTypes}
            onRoomTypeCreated={handleRoomTypeCreated}
            mode="edit"
            initialData={editInitialData}
          />
        )}
      </Modal>
    </View>
  );
}
