import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';
import {CategoryService} from '../../services/database/category/CategoryService';
import {useSelectionMode} from '../../hooks/useSelectionMode';
import {CategorySection} from '../../components/category/index';
import {SelectionBar} from '../../components/common/SelectionBar';
import {ConfirmDeleteModal} from '../../components/common/ConfirmDeleteModal';
import {AddCategoryModal} from './modals/AddCategoryModal';
import {EditCategoryModal} from './modals/EditCategoryModal';
import {AddProductModal} from './modals/AddProductModal';
import {AddVariantModal} from './modals/AddVariantModal';
import {EditProductModal} from './modals/EditProductModal';
import {VariantDetailModal} from './modals/VariantDetailModal';
import type {CategoryGroup} from './types';

interface Props {
  storeId: string;
}

export default function PosCategoryScreen({storeId}: Props) {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  const textColor = isDark ? '#f9fafb' : '#111827';
  const inputBg = isDark ? '#374151' : '#fff';
  const borderColor = isDark ? '#4b5563' : '#e5e7eb';

  // ── Data ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState<CategoryGroup[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [groups, unitNames] = await Promise.all([
        CategoryService.loadAllGroups(storeId),
        CategoryService.loadUnits(storeId),
      ]);
      setData(groups);
      setUnits(unitNames);
    } catch {
      setError('Không thể tải danh mục');
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const filteredGroups = useMemo(
    () =>
      data
        .filter(g => g.tab.includes('selling'))
        .map(g => ({
          ...g,
          items: g.items.map(item => ({
            ...item,
            isExpanded: expandedIds.has(item.id),
          })),
        })),
    [data, expandedIds],
  );

  const allItems = useMemo(
    () => filteredGroups.flatMap(g => g.items),
    [filteredGroups],
  );

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const handleAddGroup = async (name: string) => {
    try {
      await CategoryService.createGroup(storeId, name, ['selling']);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateGroup = async (groupId: string, name: string) => {
    try {
      const group = filteredGroups.find(g => g.id === groupId);
      await CategoryService.updateGroup(
        groupId,
        name,
        group?.tab ?? ['selling'],
      );
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await CategoryService.softDeleteGroup(groupId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = async (categoryId: string, name: string) => {
    try {
      await CategoryService.createProduct(storeId, categoryId, name);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (_groupId: string, itemId: string) => {
    try {
      await CategoryService.softDeleteProduct(itemId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddVariant = async (
    itemId: string,
    name: string,
    price: number,
    unit: string,
    imageUri?: string,
  ) => {
    try {
      await CategoryService.createVariant(
        storeId,
        itemId,
        name,
        price,
        unit,
        imageUri,
      );
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateVariant = async (
    _itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
    imageUri?: string,
  ) => {
    try {
      await CategoryService.updateVariant(
        storeId,
        variantId,
        name,
        price,
        unit,
        imageUri,
      );
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      await CategoryService.softDeleteVariant(variantId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Selection mode ────────────────────────────────────────────────────────
  const {
    selectionMode,
    selectedGroups,
    selectedItems,
    totalSelected,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectAll,
    toggleSelectGroup,
    toggleSelectItem,
  } = useSelectionMode(filteredGroups);

  // selectedVariants: Set<variantId> — độc lập, không phụ thuộc useSelectionMode
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set(),
  );

  // Reset selectedVariants khi thoát selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedVariants(new Set());
    }
  }, [selectionMode]);

  const handleToggleSelectAll = useCallback(() => {
    toggleSelectAll();
    const willSelectAll = !isAllSelected;
    setSelectedVariants(() => {
      if (willSelectAll) {
        return new Set(allItems.flatMap(i => i.variants.map(v => v.id)));
      }
      return new Set();
    });
  }, [toggleSelectAll, isAllSelected, allItems]);
  const toggleSelectVariant = useCallback((variantId: string) => {
    setSelectedVariants(prev => {
      const next = new Set(prev);
      next.has(variantId) ? next.delete(variantId) : next.add(variantId);
      return next;
    });
  }, []);

  // Toggle item: đồng bộ chọn/bỏ tất cả variants của item đó
  const handleToggleSelectItem = useCallback(
    (itemId: string) => {
      toggleSelectItem(itemId);
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;
      const variantIds = item.variants.map(v => v.id);
      const willSelect = !selectedItems.has(itemId); // trạng thái SAU khi toggle
      setSelectedVariants(prev => {
        const next = new Set(prev);
        if (willSelect) {
          variantIds.forEach(id => next.add(id));
        } else {
          variantIds.forEach(id => next.delete(id));
        }
        return next;
      });
    },
    [toggleSelectItem, allItems, selectedItems],
  );

  // Toggle group: đồng bộ chọn/bỏ tất cả variants của mọi item trong group
  const handleToggleSelectGroup = useCallback(
    (groupId: string) => {
      toggleSelectGroup(groupId);
      const group = filteredGroups.find(g => g.id === groupId);
      if (!group) return;
      const variantIds = group.items.flatMap(i => i.variants.map(v => v.id));
      const willSelect = !selectedGroups.has(groupId);
      setSelectedVariants(prev => {
        const next = new Set(prev);
        if (willSelect) {
          variantIds.forEach(id => next.add(id));
        } else {
          variantIds.forEach(id => next.delete(id));
        }
        return next;
      });
    },
    [toggleSelectGroup, filteredGroups, selectedGroups],
  );

  // ── Modal state ───────────────────────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [addVariantItemId, setAddVariantItemId] = useState<
    string | undefined
  >();
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [showVariantDetail, setShowVariantDetail] = useState(false);
  const [variantDetail, setVariantDetail] = useState({
    itemId: '',
    variantId: '',
    name: '',
    price: 0,
    unit: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<
    string | null
  >(null);

  // ── Delete helpers ────────────────────────────────────────────────────────
  const deleteLabel = (): string => {
    if (pendingDeleteGroupId) {
      return `danh mục "${
        filteredGroups.find(g => g.id === pendingDeleteGroupId)?.label ?? ''
      }"`;
    }
    const parts: string[] = [];
    if (selectedGroups.size > 0) parts.push(`${selectedGroups.size} danh mục`);

    const standaloneItems = [...selectedItems].filter(itemId => {
      const group = filteredGroups.find(g =>
        g.items.some(i => i.id === itemId),
      );
      return group && !selectedGroups.has(group.id);
    });
    if (standaloneItems.length > 0)
      parts.push(`${standaloneItems.length} sản phẩm`);

    // Variants không thuộc item/group đã chọn
    const standaloneVariants = [...selectedVariants].filter(variantId => {
      const item = allItems.find(i => i.variants.some(v => v.id === variantId));
      if (!item) return false;
      if (selectedItems.has(item.id)) return false;
      const group = filteredGroups.find(g =>
        g.items.some(i => i.id === item.id),
      );
      return !(group && selectedGroups.has(group.id));
    });
    if (standaloneVariants.length > 0)
      parts.push(`${standaloneVariants.length} biến thể`);

    return parts.join(' và ');
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteGroupId) {
      handleDeleteGroup(pendingDeleteGroupId);
      setPendingDeleteGroupId(null);
    } else {
      // Xóa groups
      selectedGroups.forEach(id => handleDeleteGroup(id));

      // Ids của items thuộc các group đã bị xóa (không cần xóa riêng)
      const deletedGroupItemIds = new Set(
        filteredGroups
          .filter(g => selectedGroups.has(g.id))
          .flatMap(g => g.items.map(i => i.id)),
      );

      // Xóa items độc lập (không thuộc group đã chọn)
      selectedItems.forEach(itemId => {
        if (!deletedGroupItemIds.has(itemId)) {
          const group = filteredGroups.find(g =>
            g.items.some(i => i.id === itemId),
          );
          if (group) handleDeleteItem(group.id, itemId);
        }
      });

      // Ids của variants thuộc items/groups đã bị xóa (không cần xóa riêng)
      const deletedItemVariantIds = new Set(
        allItems
          .filter(i => selectedItems.has(i.id) || deletedGroupItemIds.has(i.id))
          .flatMap(i => i.variants.map(v => v.id)),
      );

      // Xóa variants độc lập
      selectedVariants.forEach(variantId => {
        if (!deletedItemVariantIds.has(variantId)) {
          handleDeleteVariant(variantId);
        }
      });

      setSelectedVariants(new Set());
      exitSelectionMode();
    }
    setShowDeleteConfirm(false);
  };

  // totalSelected bao gồm cả variants đã chọn
  const totalSelectedWithVariants = totalSelected + selectedVariants.size;

  // ── FAB actions ───────────────────────────────────────────────────────────
  const fabActions = [
    {
      label: 'Thêm danh mục sản phẩm ',
      icon: 'folder-open',
      color: '#3b82f6',
      onPress: () => {
        setFabOpen(false);
        setShowAddCategory(true);
      },
    },
    {
      label: 'Thêm sản phẩm',
      icon: 'inventory-2',
      color: '#f97316',
      onPress: () => {
        setFabOpen(false);
        setShowAddProduct(true);
      },
    },
    {
      label: 'Thêm loại ',
      icon: 'layers',
      color: '#10b981',
      onPress: () => {
        setFabOpen(false);
        setAddVariantItemId(undefined);
        setShowAddVariant(true);
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{flex: 1}}>
      {/* POS-only toolbar: search + select */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
          backgroundColor: isDark ? '#111827' : '#f5f7fa',
        }}>
        {selectionMode ? (
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: textColor,
              flex: 1,
            }}>
            {totalSelectedWithVariants > 0
              ? `Đã chọn ${totalSelectedWithVariants}`
              : 'Chọn để xóa'}
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
              placeholder={t('category.searchPlaceholder', 'Tìm danh mục...')}
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
              style={{flex: 1, fontSize: 13, color: textColor, padding: 0}}
            />
            <Icon name="search" size={20} color="#9ca3af" />
          </View>
        )}

        <TouchableOpacity
          onPress={selectionMode ? handleToggleSelectAll : enterSelectionMode}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Text style={{color: '#3b82f6', fontSize: 14, fontWeight: '600'}}>
            {selectionMode
              ? isAllSelected
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'
              : 'Chọn'}
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

      {/* Content */}
      {isLoading ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{color: '#9ca3af', fontSize: 14, marginTop: 12}}>
            Đang tải danh mục...
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
          <Icon name="error-outline" size={48} color="#e5e7eb" />
          <Text
            style={{
              color: '#9ca3af',
              fontSize: 16,
              marginTop: 12,
              textAlign: 'center',
            }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 10,
              backgroundColor: '#3b82f6',
              borderRadius: 12,
            }}
            onPress={loadData}>
            <Text style={{color: '#fff', fontWeight: '600'}}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{flex: 1, paddingHorizontal: 16, paddingTop: 16}}
          showsVerticalScrollIndicator={false}>
          {filteredGroups.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 80,
              }}>
              <Icon name="inbox" size={48} color="#e5e7eb" />
              <Text style={{color: '#9ca3af', fontSize: 16, marginTop: 12}}>
                Chưa có danh mục nào
              </Text>
            </View>
          ) : (
            filteredGroups.map(group => (
              <CategorySection
                key={group.id}
                group={group}
                selectionMode={selectionMode}
                isGroupSelected={selectedGroups.has(group.id)}
                selectedItems={selectedItems}
                selectedVariants={selectedVariants}
                onDeleteGroup={id => {
                  setPendingDeleteGroupId(id);
                  setShowDeleteConfirm(true);
                }}
                onEditGroup={id => {
                  const g = filteredGroups.find(x => x.id === id);
                  if (g) {
                    setEditingGroup({id, name: g.label});
                    setShowEditCategory(true);
                  }
                }}
                onToggleItem={toggleExpand}
                onEditItem={(itemId, variantId, name, price, unit) => {
                  setVariantDetail({itemId, variantId, name, price, unit});
                  setShowVariantDetail(true);
                }}
                onEditProduct={id => {
                  setEditingItemId(id);
                  setShowEditProduct(true);
                }}
                onAddVariant={id => {
                  setAddVariantItemId(id);
                  setShowAddVariant(true);
                }}
                onToggleSelectGroup={handleToggleSelectGroup}
                onToggleSelectItem={handleToggleSelectItem}
                onToggleSelectVariant={toggleSelectVariant}
              />
            ))
          )}
          <View style={{height: 128}} />
        </ScrollView>
      )}

      {/* FAB */}
      {!selectionMode && (
        <>
          {fabOpen && (
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
              onPress={() => setFabOpen(false)}
            />
          )}
          {fabOpen && (
            <View
              style={{
                position: 'absolute',
                bottom: 96,
                right: 24,
                alignItems: 'flex-end',
                gap: 14,
              }}>
              {fabActions.map(action => (
                <TouchableOpacity
                  key={action.label}
                  activeOpacity={0.85}
                  onPress={action.onPress}
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
                    <Text
                      style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                      {action.label}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: action.color,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 4,
                    }}>
                    <Icon name={action.icon} size={22} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
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
              backgroundColor: fabOpen ? '#ef4444' : '#3b82f6',
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 8,
            }}
            onPress={() => setFabOpen(prev => !prev)}
            activeOpacity={0.85}>
            <Icon name={fabOpen ? 'close' : 'add'} size={30} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {selectionMode && (
        <SelectionBar
          totalSelected={totalSelectedWithVariants}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* ── Modals ── */}
      <ConfirmDeleteModal
        visible={showDeleteConfirm}
        targetLabel={deleteLabel()}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteGroupId(null);
        }}
      />
      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={handleAddGroup}
      />
      <EditCategoryModal
        visible={showEditCategory}
        initialName={editingGroup?.name ?? ''}
        onClose={() => {
          setShowEditCategory(false);
          setEditingGroup(null);
        }}
        onSave={name => {
          if (editingGroup) handleUpdateGroup(editingGroup.id, name);
          setShowEditCategory(false);
        }}
      />
      <AddProductModal
        visible={showAddProduct}
        groups={filteredGroups}
        onClose={() => setShowAddProduct(false)}
        onSave={handleAddItem}
      />
      <AddVariantModal
        visible={showAddVariant}
        initialItemId={addVariantItemId}
        allItems={allItems}
        units={units}
        onClose={() => {
          setShowAddVariant(false);
          setAddVariantItemId(undefined);
        }}
        onSave={handleAddVariant}
      />
      <EditProductModal
        visible={showEditProduct}
        itemId={editingItemId}
        groups={filteredGroups}
        onClose={() => setShowEditProduct(false)}
        onSave={(_itemId, _name, _groupId) => {
          /* TODO */
        }}
        onAddVariant={id => {
          setShowEditProduct(false);
          setAddVariantItemId(id);
          setShowAddVariant(true);
        }}
        onEditVariant={(itemId, variantId, name, price, unit) => {
          setShowEditProduct(false);
          setVariantDetail({itemId, variantId, name, price, unit});
          setShowVariantDetail(true);
        }}
      />
      <VariantDetailModal
        visible={showVariantDetail}
        itemId={variantDetail.itemId}
        variantId={variantDetail.variantId}
        initialName={variantDetail.name}
        initialPrice={variantDetail.price}
        initialUnit={variantDetail.unit}
        units={units}
        onClose={() => setShowVariantDetail(false)}
        onSave={handleUpdateVariant}
        onDelete={handleDeleteVariant}
      />
    </View>
  );
}
