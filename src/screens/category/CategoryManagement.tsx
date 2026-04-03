import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useCategory, TABS} from '../../hooks/category/useCategory';
import {useSelectionMode} from '../../hooks/useSelectionMode';
import {CategorySection} from '../../components/category/index';
import {SelectionBar} from '../../components/common/SelectionBar';
import {ConfirmDeleteModal} from '../../components/common/ConfirmDeleteModal';
import type {TabType} from './types';
import {useImagePicker} from '../../hooks/useImagePicker';

// ─── Debounce hook ───
function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

interface CategoryProps {
  onOpenMenu: () => void;
  storeId: string;
}

export default function CategoryManagement({
  onOpenMenu,
  storeId,
}: CategoryProps) {
  const {t} = useTranslation();
  const {
    activeTab,
    setActiveTab,
    filteredGroups,
    isLoading,
    error,
    toggleExpand,
    handleAddGroup,
    handleAddItem,
    handleAddVariant: addVariantToHook,
    handleDeleteGroup,
    handleDeleteItem,
    handleUpdateGroup,
    handleUpdateVariant,
    reload,
  } = useCategory(storeId);

  // ─── Selection mode ───
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

  // ─── FAB speed dial ───
  const [fabOpen, setFabOpen] = useState(false);

  // ─── Đơn vị tính (sau này lấy từ DB local) ───
  const UNIT_OPTIONS = [
    'Cái / Chiếc',
    'Gói',
    'Hộp',
    'Ly',
    'Phần',
    'Ổ',
    'Kg',
    'Set',
  ];

  // ─── Unit picker modal (dùng chung) ───
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  // 'add' | 'edit' để biết đang pick cho modal nào
  const [unitPickerTarget, setUnitPickerTarget] = useState<
    'add' | 'editVariant' | 'editProduct'
  >('add');

  const openUnitPicker = (target: 'add' | 'editVariant' | 'editProduct') => {
    setUnitPickerTarget(target);
    setShowUnitPicker(true);
  };

  // ─── Edit product (item) modal ───
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemGroupId, setEditingItemGroupId] = useState('');
  const [editingItemGroupSearch, setEditingItemGroupSearch] = useState('');
  const [showEditItemGroupSuggestions, setShowEditItemGroupSuggestions] =
    useState(false);

  const filteredEditItemGroupSuggestions = useMemo(
    () =>
      filteredGroups.filter(g =>
        g.label.toLowerCase().includes(editingItemGroupSearch.toLowerCase()),
      ),
    [filteredGroups, editingItemGroupSearch],
  );

  // Item đang chỉnh sửa (để hiện danh sách variants trong modal)
  const editingItemData = useMemo(
    () =>
      filteredGroups.flatMap(g => g.items).find(i => i.id === editingItemId),
    [filteredGroups, editingItemId],
  );

  const handleOpenEditProduct = (itemId: string) => {
    const group = filteredGroups.find(g => g.items.some(i => i.id === itemId));
    const item = group?.items.find(i => i.id === itemId);
    if (!item || !group) return;
    setEditingItemId(itemId);
    setEditingItemName(item.name);
    setEditingItemGroupId(group.id);
    setEditingItemGroupSearch(group.label);
    setShowEditProductModal(true);
  };

  const handleSaveEditProduct = () => {
    if (!editingItemName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
      return;
    }
    // TODO: gọi handleUpdateItem khi có API
    setShowEditProductModal(false);
  };

  const handleCloseEditProduct = () => {
    setShowEditProductModal(false);
    setEditingItemId('');
    setEditingItemName('');
    setEditingItemGroupId('');
    setEditingItemGroupSearch('');
    setShowEditItemGroupSuggestions(false);
  };

  // ─── Variant detail modal (tap vào variant từ bất kỳ đâu) ───
  const [showVariantDetailModal, setShowVariantDetailModal] = useState(false);
  const [detailVariantItemId, setDetailVariantItemId] = useState('');
  const [detailVariantId, setDetailVariantId] = useState('');
  const [detailVariantName, setDetailVariantName] = useState('');
  const [detailVariantPrice, setDetailVariantPrice] = useState('');
  const [detailVariantUnit, setDetailVariantUnit] = useState('');
  const {
    imageUri: detailVariantImageUri,
    chooseImage: chooseDetailVariantImage,
  } = useImagePicker();

  const handleOpenVariantDetail = (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => {
    setDetailVariantItemId(itemId);
    setDetailVariantId(variantId);
    setDetailVariantName(name);
    setDetailVariantPrice(String(price));
    setDetailVariantUnit(unit);
    setShowVariantDetailModal(true);
  };

  const handleSaveVariantDetail = () => {
    if (
      !detailVariantName.trim() ||
      !detailVariantPrice.trim() ||
      !detailVariantUnit.trim()
    ) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    const price = parseFloat(detailVariantPrice);
    if (isNaN(price)) {
      Alert.alert('Lỗi', 'Giá phải là số hợp lệ');
      return;
    }
    handleUpdateVariant(
      detailVariantItemId,
      detailVariantId,
      detailVariantName.trim(),
      price,
      detailVariantUnit.trim(),
      detailVariantImageUri,
    );
    setShowVariantDetailModal(false);
  };

  const handleCloseVariantDetail = () => {
    setShowVariantDetailModal(false);
    setDetailVariantItemId('');
    setDetailVariantId('');
    setDetailVariantName('');
    setDetailVariantPrice('');
    setDetailVariantUnit('');
  };
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [productCategorySearch, setProductCategorySearch] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [showProductCategorySuggestions, setShowProductCategorySuggestions] =
    useState(false);

  const debouncedCategorySearch = useDebounce(productCategorySearch, 300);

  const filteredCategorySuggestions = useMemo(
    () =>
      filteredGroups.filter(g =>
        g.label.toLowerCase().includes(debouncedCategorySearch.toLowerCase()),
      ),
    [filteredGroups, debouncedCategorySearch],
  );

  // ─── Add variant modal — extra state ───
  const [variantProductSearch, setVariantProductSearch] = useState('');
  const [variantProductId, setVariantProductId] = useState('');
  const [showVariantProductSuggestions, setShowVariantProductSuggestions] =
    useState(false);

  const debouncedVariantSearch = useDebounce(variantProductSearch, 300);

  // Flatten all items for variant product search
  const allItems = useMemo(() => {
    return filteredGroups.flatMap(g => g.items);
  }, [filteredGroups]);

  const filteredProductSuggestions = useMemo(() => {
    const keyword = debouncedVariantSearch.toLowerCase();
    return allItems
      .filter(item => item.name.toLowerCase().includes(keyword))
      .slice(0, 50);
  }, [allItems, debouncedVariantSearch]);

  // Image picker for add variant modal
  const {imageUri: variantImageUri, chooseImage: chooseVariantImage} =
    useImagePicker();

  // ─── Delete confirm modal ───
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  // xóa đơn 1 group qua nút 🗑️ trong section header
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = useState<
    string | null
  >(null);

  // ─── Add category modal ───
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  // ─── Edit category modal ───
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // ─── Add variant modal ───
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantUnit, setVariantUnit] = useState('');
  const [showAddUnitDropdown, setShowAddUnitDropdown] = useState(false);

  // ─── Edit variant modal (legacy — kept for backward compat) ───
  const [showEditVariantModal, setShowEditVariantModal] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState('');
  const [editingVariantItemId, setEditingVariantItemId] = useState('');
  const [editingVariantName, setEditingVariantName] = useState('');
  const [editingVariantPrice, setEditingVariantPrice] = useState('');
  const [editingVariantUnit, setEditingVariantUnit] = useState('');

  // ─── Delete handlers ───

  // Nút 🗑️ trong section header → lưu groupId, mở modal xác nhận
  const handleDeleteGroupClick = (groupId: string) => {
    setPendingDeleteGroupId(groupId);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteGroupId) {
      // Xóa đơn 1 group qua nút 🗑️
      handleDeleteGroup(pendingDeleteGroupId);
      setPendingDeleteGroupId(null);
    } else {
      // Xóa từ selection mode
      selectedGroups.forEach(groupId => handleDeleteGroup(groupId));
      const deletedGroupItemIds = new Set(
        filteredGroups
          .filter(g => selectedGroups.has(g.id))
          .flatMap(g => g.items.map(i => i.id)),
      );
      selectedItems.forEach(itemId => {
        if (!deletedGroupItemIds.has(itemId)) {
          const group = filteredGroups.find(g =>
            g.items.some(i => i.id === itemId),
          );
          if (group) handleDeleteItem(group.id, itemId);
        }
      });
      exitSelectionMode();
    }
    setShowDeleteConfirmModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setPendingDeleteGroupId(null);
  };

  // Label mô tả thứ sắp bị xóa, truyền vào ConfirmDeleteModal
  const deleteLabel = (): string => {
    if (pendingDeleteGroupId) {
      const group = filteredGroups.find(g => g.id === pendingDeleteGroupId);
      return `danh mục "${group?.label ?? ''}"`;
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
    return parts.join(' và ');
  };

  // ─── Other handlers ───

  const handleEditItem = (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => {
    // Tap variant row → Chi tiết biến thể
    handleOpenVariantDetail(itemId, variantId, name, price, unit);
  };

  const handleAddVariantClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowAddVariantModal(true);
  };

  const handleEditGroup = (groupId: string) => {
    const sourceGroup = filteredGroups.find(g => g.id === groupId);
    if (!sourceGroup) return;
    setEditingGroupId(groupId);
    setEditingCategoryName(sourceGroup.label);
    setShowEditCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (categoryName.trim()) {
      handleAddGroup(categoryName.trim(), [activeTab] as TabType[]);
      setCategoryName('');
      setShowAddCategoryModal(false);
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
    }
  };

  const handleSaveEditCategory = () => {
    if (editingCategoryName.trim() && editingGroupId) {
      const group = filteredGroups.find(g => g.id === editingGroupId);
      handleUpdateGroup(
        editingGroupId,
        editingCategoryName.trim(),
        group?.tab ?? ['selling'],
      );
      setShowEditCategoryModal(false);
      setEditingGroupId('');
      setEditingCategoryName('');
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
    }
  };

  const handleSaveVariant = () => {
    if (variantName.trim() && variantPrice.trim() && variantUnit.trim()) {
      const price = parseFloat(variantPrice);
      if (!isNaN(price)) {
        addVariantToHook(
          selectedItemId,
          variantName.trim(),
          price,
          variantUnit.trim(),
          variantImageUri,
        );
        setVariantName('');
        setVariantPrice('');
        setVariantUnit('');
        setVariantProductSearch('');
        setVariantProductId('');
        setShowAddUnitDropdown(false);
        setShowAddVariantModal(false);
      } else {
        Alert.alert('Lỗi', 'Giá phải là số hợp lệ');
      }
    } else {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleSaveEditVariant = () => {
    if (
      editingVariantName.trim() &&
      editingVariantPrice.trim() &&
      editingVariantUnit.trim()
    ) {
      const price = parseFloat(editingVariantPrice);
      if (!isNaN(price)) {
        handleUpdateVariant(
          editingVariantItemId,
          editingVariantId,
          editingVariantName.trim(),
          price,
          editingVariantUnit.trim(),
        );
        setShowEditVariantModal(false);
        setEditingVariantId('');
        setEditingVariantItemId('');
        setEditingVariantName('');
        setEditingVariantPrice('');
        setEditingVariantUnit('');
      } else {
        Alert.alert('Lỗi', 'Giá phải là số hợp lệ');
      }
    } else {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
    }
  };

  const handleCloseEditVariant = () => {
    setShowEditVariantModal(false);
    setEditingVariantId('');
    setEditingVariantItemId('');
    setEditingVariantName('');
    setEditingVariantPrice('');
    setEditingVariantUnit('');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center gap-3">
          {selectionMode ? (
            <TouchableOpacity
              onPress={exitSelectionMode}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Icon name="close" size={26} color="#111827" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onOpenMenu}>
              <Icon name="menu" size={28} color="#111827" />
            </TouchableOpacity>
          )}
          <Text className="text-2xl font-bold text-gray-900">
            {selectionMode
              ? totalSelected > 0
                ? `Đã chọn ${totalSelected}`
                : 'Chọn để xóa'
              : t('category.title')}
          </Text>
        </View>

        {selectionMode ? (
          <TouchableOpacity
            onPress={toggleSelectAll}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={{color: '#3b82f6', fontSize: 14, fontWeight: '600'}}>
              {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={enterSelectionMode}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Text style={{color: '#3b82f6', fontSize: 14, fontWeight: '600'}}>
              Chọn
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 px-4">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              className={`mr-6 pb-3 border-b-2 ${
                isActive ? 'border-blue-500' : 'border-transparent'
              }`}
              onPress={() => {
                setActiveTab(tab.key as TabType);
                if (selectionMode) exitSelectionMode();
              }}>
              <Text
                className={`text-base font-medium ${
                  isActive ? 'text-blue-500' : 'text-gray-500'
                }`}>
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-400 text-sm mt-3">
            Đang tải danh mục...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Icon name="error-outline" size={48} color="#e5e7eb" />
          <Text className="text-gray-400 text-base mt-3 text-center">
            {error}
          </Text>
          <TouchableOpacity
            className="mt-4 px-6 py-2 bg-blue-500 rounded-xl"
            onPress={reload}>
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}>
          {filteredGroups.length === 0 ? (
            <View className="flex-1 items-center justify-center pt-20">
              <Icon name="inbox" size={48} color="#e5e7eb" />
              <Text className="text-gray-400 text-base mt-3">
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
                onDeleteGroup={handleDeleteGroupClick}
                onEditGroup={handleEditGroup}
                onToggleItem={toggleExpand}
                onEditItem={handleEditItem}
                onEditProduct={handleOpenEditProduct}
                onAddVariant={handleAddVariantClick}
                onToggleSelectGroup={toggleSelectGroup}
                onToggleSelectItem={toggleSelectItem}
              />
            ))
          )}
          <View className="h-32" />
        </ScrollView>
      )}

      {/* ───────── FAB Speed Dial ───────── */}
      {!selectionMode && (
        <>
          {/* Backdrop để đóng khi tap ngoài */}
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

          {/* Speed dial items */}
          {fabOpen && (
            <View
              style={{
                position: 'absolute',
                bottom: 96,
                right: 24,
                alignItems: 'flex-end',
                gap: 14,
              }}>
              {/* Danh mục */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setFabOpen(false);
                  setShowAddCategoryModal(true);
                }}
                style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 20,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                  }}>
                  <Text
                    style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                    Danh mục
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
                  <Icon name="folder-open" size={22} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Sản phẩm */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setFabOpen(false);
                  setShowAddProductModal(true);
                }}
                style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 20,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                  }}>
                  <Text
                    style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                    Sản phẩm
                  </Text>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#f97316',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                  }}>
                  <Icon name="inventory-2" size={22} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Biến thể */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setFabOpen(false);
                  setSelectedItemId('');
                  setShowAddVariantModal(true);
                }}
                style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 20,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                  }}>
                  <Text
                    style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                    Biến thể
                  </Text>
                </View>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#10b981',
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                  }}>
                  <Icon name="layers" size={22} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Main FAB button */}
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

      {/* Bottom delete bar */}
      {selectionMode && (
        <SelectionBar
          totalSelected={totalSelected}
          onDelete={() => setShowDeleteConfirmModal(true)}
        />
      )}

      {/* ───────── Delete Confirm Modal ───────── */}
      <ConfirmDeleteModal
        visible={showDeleteConfirmModal}
        targetLabel={deleteLabel()}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* ───────── Add Category Modal ───────── */}
      <Modal
        visible={showAddCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCategoryModal(false)}>
        <View className="flex-1 bg-black/50 justify-center">
          <View className="bg-white rounded-t-2xl w-full p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-bold text-gray-900">
                {t('category.addCategory')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddCategoryModal(false);
                  setCategoryName('');
                }}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Thông tin cơ bản
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-1">
              {t('category.categoryName')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-6 text-gray-900"
              placeholder={t('category.categoryName')}
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                onPress={() => {
                  setShowAddCategoryModal(false);
                  setCategoryName('');
                }}>
                <Text className="text-gray-700 font-semibold text-base">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-blue-500 items-center"
                onPress={handleSaveCategory}>
                <Text className="text-white font-semibold text-base">
                  Lưu thay đổi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Add Product Modal ───────── */}
      <Modal
        visible={showAddProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddProductModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/50 justify-center">
          <View className="bg-white rounded-t-2xl w-full p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-bold text-gray-900">
                Thêm sản phẩm
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddProductModal(false);
                  setProductName('');
                  setProductCategorySearch('');
                  setProductCategoryId('');
                  setShowProductCategorySuggestions(false);
                }}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Thông tin cơ bản
            </Text>

            {/* Tên sản phẩm */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Tên sản phẩm
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-4 text-gray-900"
              placeholder="Nhập tên sản phẩm"
              value={productName}
              onChangeText={setProductName}
            />

            {/* Thuộc danh mục */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Thuộc danh mục
            </Text>
            <View style={{position: 'relative', marginBottom: 24}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: productCategoryId ? '#3b82f6' : '#d1d5db',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: productCategoryId ? '#eff6ff' : '#fff',
                }}>
                <Icon
                  name="search"
                  size={18}
                  color={productCategoryId ? '#3b82f6' : '#9ca3af'}
                  style={{marginRight: 6}}
                />
                <TextInput
                  style={{flex: 1, paddingVertical: 12, color: '#111827'}}
                  placeholder="Tìm danh mục..."
                  placeholderTextColor="#9ca3af"
                  value={productCategorySearch}
                  onChangeText={text => {
                    setProductCategorySearch(text);
                    setProductCategoryId('');
                    setShowProductCategorySuggestions(text.length > 0);
                  }}
                  onFocus={() =>
                    setShowProductCategorySuggestions(
                      productCategorySearch.length > 0,
                    )
                  }
                />
                {productCategoryId ? (
                  <TouchableOpacity
                    onPress={() => {
                      setProductCategorySearch('');
                      setProductCategoryId('');
                      setShowProductCategorySuggestions(false);
                    }}>
                    <Icon name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Suggestions dropdown */}
              {showProductCategorySuggestions && (
                <View
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    zIndex: 999,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: {width: 0, height: 4},
                    maxHeight: 180,
                    overflow: 'hidden',
                  }}>
                  {filteredCategorySuggestions.length === 0 ? (
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        alignItems: 'center',
                      }}>
                      <Text style={{color: '#9ca3af', fontSize: 13}}>
                        Không tìm thấy danh mục
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      style={{maxHeight: 180}}>
                      {filteredCategorySuggestions.map((g, idx) => (
                        <TouchableOpacity
                          key={g.id}
                          onPress={() => {
                            setProductCategoryId(g.id);
                            setProductCategorySearch(g.label);
                            setShowProductCategorySuggestions(false);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderBottomWidth:
                              idx < filteredCategorySuggestions.length - 1
                                ? 1
                                : 0,
                            borderBottomColor: '#f3f4f6',
                          }}>
                          <Icon
                            name="folder-open"
                            size={16}
                            color="#3b82f6"
                            style={{marginRight: 8}}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              color: '#111827',
                              fontWeight: '500',
                            }}>
                            {g.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                onPress={() => {
                  setShowAddProductModal(false);
                  setProductName('');
                  setProductCategorySearch('');
                  setProductCategoryId('');
                  setShowProductCategorySuggestions(false);
                }}>
                <Text className="text-gray-700 font-semibold text-base">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-orange-500 items-center"
                onPress={() => {
                  if (!productName.trim()) {
                    Alert.alert('Lỗi', 'Vui lòng nhập tên sản phẩm');
                    return;
                  }
                  if (!productCategoryId) {
                    Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
                    return;
                  }
                  handleAddItem(productCategoryId, productName.trim());
                  setProductName('');
                  setProductCategorySearch('');
                  setProductCategoryId('');
                  setShowAddProductModal(false);
                }}>
                <Text className="text-white font-semibold text-base">
                  Thêm sản phẩm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ───────── Edit Category Modal ───────── */}
      <Modal
        visible={showEditCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditCategoryModal(false)}>
        <View className="flex-1 bg-black/50 justify-between">
          <View className="bg-white rounded-t-2xl w-full p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-bold text-gray-900">
                Chỉnh sửa danh mục
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditCategoryModal(false);
                  setEditingGroupId('');
                  setEditingCategoryName('');
                }}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">
              {t('category.categoryName')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-6 text-gray-900"
              placeholder={t('category.categoryName')}
              value={editingCategoryName}
              onChangeText={setEditingCategoryName}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                onPress={() => {
                  setShowEditCategoryModal(false);
                  setEditingGroupId('');
                  setEditingCategoryName('');
                }}>
                <Text className="text-gray-700 font-semibold text-base">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-blue-500 items-center"
                onPress={handleSaveEditCategory}>
                <Text className="text-white font-semibold text-base">
                  Lưu thay đổi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Add Variant Modal ───────── */}
      <Modal
        visible={showAddVariantModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddVariantModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-black/50 justify-center">
          <View className="bg-white rounded-t-2xl w-full p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-bold text-gray-900">
                {t('category.addVariant')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddVariantModal(false);
                  setVariantName('');
                  setVariantPrice('');
                  setVariantUnit('');
                  setVariantProductSearch('');
                  setVariantProductId('');
                  setShowVariantProductSuggestions(false);
                }}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Thông tin cơ bản
            </Text>

            {/* ── Ảnh biến thể ── */}
            <TouchableOpacity
              onPress={chooseVariantImage}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
                backgroundColor: '#f9fafb',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                padding: 12,
              }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  backgroundColor: '#e8d5b0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  overflow: 'hidden',
                }}>
                {variantImageUri ? (
                  <Image
                    source={{uri: variantImageUri}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="add-photo-alternate" size={28} color="#b8975a" />
                )}
              </View>
              <View style={{flex: 1}}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: 2,
                  }}>
                  {variantImageUri ? 'Đổi ảnh' : 'Thêm ảnh biến thể'}
                </Text>
                <Text style={{fontSize: 12, color: '#9ca3af'}}>
                  Chụp ảnh hoặc chọn từ thư viện
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#d1d5db" />
            </TouchableOpacity>

            {/* ── Thuộc sản phẩm (search + suggestion) ── */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Thuộc sản phẩm
            </Text>
            <View style={{position: 'relative', marginBottom: 16}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: variantProductId ? '#10b981' : '#d1d5db',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: variantProductId ? '#f0fdf4' : '#fff',
                }}>
                <Icon
                  name="search"
                  size={18}
                  color={variantProductId ? '#10b981' : '#9ca3af'}
                  style={{marginRight: 6}}
                />
                <TextInput
                  style={{flex: 1, paddingVertical: 12, color: '#111827'}}
                  placeholder="Tìm sản phẩm..."
                  placeholderTextColor="#9ca3af"
                  value={variantProductSearch}
                  onChangeText={text => {
                    setVariantProductSearch(text);
                    setVariantProductId('');
                    setShowVariantProductSuggestions(text.length > 0);
                  }}
                  onFocus={() =>
                    setShowVariantProductSuggestions(
                      variantProductSearch.length > 0,
                    )
                  }
                />
                {variantProductId ? (
                  <TouchableOpacity
                    onPress={() => {
                      setVariantProductSearch('');
                      setVariantProductId('');
                      setShowVariantProductSuggestions(false);
                    }}>
                    <Icon name="close" size={18} color="#6b7280" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Suggestions dropdown */}
              {showVariantProductSuggestions && (
                <View
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    zIndex: 999,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: {width: 0, height: 4},
                    maxHeight: 160,
                    overflow: 'hidden',
                  }}>
                  {filteredProductSuggestions.length === 0 ? (
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        alignItems: 'center',
                      }}>
                      <Text style={{color: '#9ca3af', fontSize: 13}}>
                        Không tìm thấy sản phẩm
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredProductSuggestions}
                      keyExtractor={item => item.id}
                      keyboardShouldPersistTaps="handled"
                      style={{maxHeight: 160}}
                      initialNumToRender={6}
                      maxToRenderPerBatch={6}
                      windowSize={5}
                      renderItem={({item, index}) => (
                        <TouchableOpacity
                          onPress={() => {
                            setVariantProductId(item.id);
                            setSelectedItemId(item.id);
                            setVariantProductSearch(item.name);
                            setShowVariantProductSuggestions(false);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderBottomWidth:
                              index < filteredProductSuggestions.length - 1
                                ? 1
                                : 0,
                            borderBottomColor: '#f3f4f6',
                          }}>
                          <Icon
                            name="inventory-2"
                            size={16}
                            color="#f97316"
                            style={{marginRight: 8}}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              color: '#111827',
                              fontWeight: '500',
                            }}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              )}
            </View>

            {/* ── Tên biến thể ── */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              {t('category.variantName')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-4 text-gray-900"
              placeholder={t('category.variantName')}
              value={variantName}
              onChangeText={setVariantName}
            />

            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Giá bán
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                  }}>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      color: '#3b82f6',
                      fontWeight: '700',
                      fontSize: 15,
                    }}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={variantPrice}
                    onChangeText={setVariantPrice}
                    keyboardType="numeric"
                  />
                  <Text style={{color: '#6b7280', fontSize: 14}}>đ</Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Đơn vị tính
                </Text>
                <TouchableOpacity
                  onPress={() => openUnitPicker('add')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    backgroundColor: '#fff',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: variantUnit ? '#111827' : '#9ca3af',
                    }}>
                    {variantUnit || 'Chọn đơn vị'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                onPress={() => {
                  setShowAddVariantModal(false);
                  setVariantName('');
                  setVariantPrice('');
                  setVariantUnit('');
                  setVariantProductSearch('');
                  setVariantProductId('');
                  setShowVariantProductSuggestions(false);
                }}>
                <Text className="text-gray-700 font-semibold text-base">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-emerald-500 items-center"
                onPress={handleSaveVariant}>
                <Text className="text-white font-semibold text-base">
                  Lưu thay đổi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ───────── Unit Picker Modal (dùng chung) ───────── */}
      <Modal
        visible={showUnitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnitPicker(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setShowUnitPicker(false)}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 32,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
              }}>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#111827'}}>
                Chọn đơn vị tính
              </Text>
              <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                <Icon name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {UNIT_OPTIONS.map((unit, idx) => {
              const currentVal =
                unitPickerTarget === 'add'
                  ? variantUnit
                  : unitPickerTarget === 'editVariant'
                  ? detailVariantUnit
                  : '';
              const isSelected = currentVal === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  onPress={() => {
                    if (unitPickerTarget === 'add') setVariantUnit(unit);
                    else if (unitPickerTarget === 'editVariant')
                      setDetailVariantUnit(unit);
                    setShowUnitPicker(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: idx < UNIT_OPTIONS.length - 1 ? 1 : 0,
                    borderBottomColor: '#f9fafb',
                    backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: isSelected ? '#3b82f6' : '#374151',
                      fontWeight: isSelected ? '600' : '400',
                    }}>
                    {unit}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={18} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ───────── Edit Product Modal ───────── */}
      <Modal
        visible={showEditProductModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditProduct}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              maxHeight: '90%',
            }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#111827'}}>
                Chỉnh sửa sản phẩm
              </Text>
              <TouchableOpacity onPress={handleCloseEditProduct}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#9ca3af',
                letterSpacing: 1.2,
                marginBottom: 16,
              }}>
              THÔNG TIN CƠ BẢN
            </Text>

            {/* Tên sản phẩm */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 6,
              }}>
              Tên sản phẩm
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: '#111827',
                backgroundColor: '#f9fafb',
                marginBottom: 14,
              }}
              placeholder="Nhập tên sản phẩm"
              value={editingItemName}
              onChangeText={setEditingItemName}
            />

            {/* Danh mục — dropdown search */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 6,
              }}>
              Danh mục
            </Text>
            <View style={{position: 'relative', marginBottom: 20, zIndex: 10}}>
              <TouchableOpacity
                onPress={() => setShowEditItemGroupSuggestions(prev => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: editingItemGroupId ? '#3b82f6' : '#e5e7eb',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  backgroundColor: editingItemGroupId ? '#eff6ff' : '#f9fafb',
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: editingItemGroupId ? '#1d4ed8' : '#374151',
                    fontWeight: editingItemGroupId ? '600' : '400',
                  }}>
                  {editingItemGroupSearch || 'Chọn danh mục'}
                </Text>
                <Icon
                  name="keyboard-arrow-down"
                  size={20}
                  color={editingItemGroupId ? '#3b82f6' : '#6b7280'}
                />
              </TouchableOpacity>

              {showEditItemGroupSuggestions && (
                <View
                  style={{
                    position: 'absolute',
                    top: 52,
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    zIndex: 999,
                    elevation: 10,
                    maxHeight: 180,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: {width: 0, height: 4},
                  }}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={{maxHeight: 180}}>
                    {filteredEditItemGroupSuggestions.map((g, idx) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => {
                          setEditingItemGroupId(g.id);
                          setEditingItemGroupSearch(g.label);
                          setShowEditItemGroupSuggestions(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderBottomWidth:
                            idx < filteredEditItemGroupSuggestions.length - 1
                              ? 1
                              : 0,
                          borderBottomColor: '#f3f4f6',
                          backgroundColor:
                            g.id === editingItemGroupId ? '#eff6ff' : '#fff',
                        }}>
                        <Icon
                          name="folder-open"
                          size={16}
                          color="#3b82f6"
                          style={{marginRight: 8}}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            color: '#111827',
                            fontWeight: '500',
                            flex: 1,
                          }}>
                          {g.label}
                        </Text>
                        {g.id === editingItemGroupId && (
                          <Icon name="check" size={16} color="#3b82f6" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Quản lý biến thể */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#9ca3af',
                  letterSpacing: 1.2,
                }}>
                QUẢN LÝ BIẾN THỂ
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditProductModal(false);
                  setSelectedItemId(editingItemId);
                  // Pre-fill product search
                  setVariantProductSearch(editingItemName);
                  setVariantProductId(editingItemId);
                  setShowAddVariantModal(true);
                }}
                style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Icon name="add-circle-outline" size={18} color="#3b82f6" />
                <Text
                  style={{fontSize: 13, fontWeight: '600', color: '#3b82f6'}}>
                  Thêm mới
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{maxHeight: 200}}
              showsVerticalScrollIndicator={false}>
              {editingItemData?.variants.map(v => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => {
                    handleCloseEditProduct();
                    handleOpenVariantDetail(
                      editingItemId,
                      v.id,
                      v.name,
                      v.price,
                      v.unit,
                    );
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f9fafb',
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 8,
                  }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      backgroundColor: '#e8d5b0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      overflow: 'hidden',
                    }}>
                    {v.imageUri ? (
                      <Image
                        source={{uri: v.imageUri}}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <Icon name="receipt-long" size={22} color="#b8975a" />
                    )}
                  </View>
                  <View style={{flex: 1}}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: 2,
                      }}>
                      {v.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: '#3b82f6',
                        fontWeight: '700',
                      }}>
                      {v.price.toLocaleString('vi-VN')}đ / {v.unit}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Buttons */}
            <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                }}
                onPress={handleCloseEditProduct}>
                <Text
                  style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                }}
                onPress={handleSaveEditProduct}>
                <Text style={{color: '#fff', fontWeight: '600', fontSize: 15}}>
                  Lưu thay đổi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ───────── Variant Detail Modal ───────── */}
      <Modal
        visible={showVariantDetailModal}
        transparent={false}
        animationType="slide"
        onRequestClose={handleCloseVariantDetail}>
        <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
            }}>
            <TouchableOpacity
              onPress={handleCloseVariantDetail}
              style={{marginRight: 12}}>
              <Icon name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#111827',
                flex: 1,
              }}>
              Chi tiết biến thể
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{padding: 24}}
            keyboardShouldPersistTaps="handled">
            {/* Ảnh biến thể — lớn, căn giữa */}
            <TouchableOpacity
              onPress={chooseDetailVariantImage}
              activeOpacity={0.85}
              style={{alignItems: 'center', marginBottom: 28}}>
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 20,
                  backgroundColor: '#e8d5b0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: '#ddd',
                  borderStyle: 'dashed',
                }}>
                {detailVariantImageUri ? (
                  <Image
                    source={{uri: detailVariantImageUri}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="add-photo-alternate" size={40} color="#b8975a" />
                )}
              </View>
              <Text style={{marginTop: 8, fontSize: 12, color: '#9ca3af'}}>
                {detailVariantImageUri ? 'Nhấn để đổi ảnh' : 'Nhấn để thêm ảnh'}
              </Text>
            </TouchableOpacity>

            {/* Tên biến thể */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#374151',
                marginBottom: 6,
              }}>
              Tên biến thể
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 15,
                fontWeight: '600',
                color: '#111827',
                backgroundColor: '#f9fafb',
                marginBottom: 20,
              }}
              placeholder="Nhập tên biến thể"
              value={detailVariantName}
              onChangeText={setDetailVariantName}
            />

            {/* Giá + Đơn vị */}
            <View style={{flexDirection: 'row', gap: 12, marginBottom: 32}}>
              <View style={{flex: 1}}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: 6,
                  }}>
                  Giá bán
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    backgroundColor: '#f9fafb',
                  }}>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 13,
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#3b82f6',
                    }}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={detailVariantPrice}
                    onChangeText={setDetailVariantPrice}
                    keyboardType="numeric"
                  />
                  <Text
                    style={{fontSize: 14, color: '#6b7280', fontWeight: '500'}}>
                    đ
                  </Text>
                </View>
              </View>

              <View style={{flex: 1}}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: 6,
                  }}>
                  Đơn vị tính
                </Text>
                <TouchableOpacity
                  onPress={() => openUnitPicker('editVariant')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    backgroundColor: '#f9fafb',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: detailVariantUnit ? '#111827' : '#9ca3af',
                      fontWeight: detailVariantUnit ? '500' : '400',
                    }}>
                    {detailVariantUnit || 'Chọn'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Bottom buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 24,
              paddingBottom: 24,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
            }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
              }}
              onPress={handleCloseVariantDetail}>
              <Text style={{color: '#374151', fontWeight: '600', fontSize: 15}}>
                Hủy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: '#3b82f6',
                alignItems: 'center',
              }}
              onPress={handleSaveVariantDetail}>
              <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>
                Áp dụng
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
