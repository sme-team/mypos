import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {useCategory, TABS} from '../../hooks/category/useCategory';
import {CategorySection} from '../../components/category/index';
import {useResponsive} from '../../hooks/useResponsive';
import type {TabType} from './types';

interface CategoryProps {
  onOpenMenu: () => void;
  onBack: () => void;
}

export default function CategoryMangement({onOpenMenu, onBack}: CategoryProps) {
  const {t} = useTranslation();
  const {isTablet} = useResponsive();
  const {
    activeTab,
    setActiveTab,
    filteredGroups,
    toggleExpand,
    handleAddGroup,
    handleAddVariant: addVariantToHook,
    handleDeleteGroup,
    handleUpdateGroup,
    handleUpdateVariant,
  } = useCategory();

  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [showEditVariantModal, setShowEditVariantModal] = useState(false);

  // Add category states
  const [categoryName, setCategoryName] = useState('');
  const [categoryTabs, setCategoryTabs] = useState<TabType[]>([activeTab]);

  // Edit category states
  const [editingGroupId, setEditingGroupId] = useState<string>('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryTabs, setEditingCategoryTabs] = useState<TabType[]>([
    'selling',
  ]);

  // Add variant states
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantUnit, setVariantUnit] = useState('');

  // Edit variant states
  const [editingVariantId, setEditingVariantId] = useState<string>('');
  const [editingVariantItemId, setEditingVariantItemId] = useState<string>('');
  const [editingVariantName, setEditingVariantName] = useState('');
  const [editingVariantPrice, setEditingVariantPrice] = useState('');
  const [editingVariantUnit, setEditingVariantUnit] = useState('');

  // ---------- Handlers ----------

  const handleAddItemLocal = (groupId: string) =>
    console.log('add item', groupId);

  // Edit variant: mở modal, điền dữ liệu cũ vào
  const handleEditItem = (
    itemId: string,
    variantId: string,
    name: string,
    price: number,
    unit: string,
  ) => {
    setEditingVariantItemId(itemId);
    setEditingVariantId(variantId);
    setEditingVariantName(name);
    setEditingVariantPrice(String(price));
    setEditingVariantUnit(unit);
    setShowEditVariantModal(true);
  };

  const handleAddVariantClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowAddVariantModal(true);
  };

  const toggleCategoryTab = (tabValue: TabType) => {
    setCategoryTabs(prev =>
      prev.includes(tabValue)
        ? prev.filter(tab => tab !== tabValue)
        : [...prev, tabValue],
    );
  };

  const toggleEditingCategoryTab = (tabValue: TabType) => {
    setEditingCategoryTabs(prev =>
      prev.includes(tabValue)
        ? prev.filter(tab => tab !== tabValue)
        : [...prev, tabValue],
    );
  };

  const handleAddCategory = () => {
    setCategoryTabs([activeTab === 'selling' ? 'storage' : activeTab]);
    setShowAddCategoryModal(true);
  };

  const handleEditGroup = (groupId: string) => {
    const sourceGroup = filteredGroups.find(g => g.id === groupId);
    if (!sourceGroup) return;
    setEditingGroupId(groupId);
    setEditingCategoryName(sourceGroup.label);
    setEditingCategoryTabs(sourceGroup.tab);
    setShowEditCategoryModal(true);
  };

  const handleSaveEditCategory = () => {
    if (editingCategoryName.trim() && editingGroupId) {
      const targetTabs: TabType[] =
        editingCategoryTabs.length > 0
          ? editingCategoryTabs
          : (['selling'] as TabType[]);
      handleUpdateGroup(editingGroupId, editingCategoryName.trim(), targetTabs);
      setShowEditCategoryModal(false);
      setEditingGroupId('');
      setEditingCategoryName('');
      setEditingCategoryTabs(['selling']);
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập tên danh mục');
    }
  };

  const handleSaveCategory = () => {
    if (categoryName.trim()) {
      const targetTabs: TabType[] =
        categoryTabs.length > 0 ? categoryTabs : (['selling'] as TabType[]);
      handleAddGroup(categoryName.trim(), targetTabs);
      setCategoryName('');
      setCategoryTabs([activeTab]);
      setShowAddCategoryModal(false);
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
        );
        setVariantName('');
        setVariantPrice('');
        setVariantUnit('');
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
        setEditingVariantId('');
        setEditingVariantItemId('');
        setEditingVariantName('');
        setEditingVariantPrice('');
        setEditingVariantUnit('');
        setShowEditVariantModal(false);
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
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onOpenMenu}>
            <Icon name="menu" size={28} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            {t('category.title')}
          </Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center bg-blue-500 rounded-xl gap-1 pr-1 pb-1"
          onPress={handleAddCategory}>
          <Icon name="add" size={18} color="#fff" />
          {isTablet && (
            <Text className="text-white text-sm font-semibold">
              {t('category.addCategory')}
            </Text>
          )}
        </TouchableOpacity>
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
              onPress={() => setActiveTab(tab.key as TabType)}>
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
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}>
        {filteredGroups.map(group => (
          <CategorySection
            key={group.id}
            group={group}
            onDeleteGroup={handleDeleteGroup}
            onEditGroup={handleEditGroup}
            onAddItem={handleAddItemLocal}
            onToggleItem={toggleExpand}
            onEditItem={handleEditItem}
            onAddVariant={handleAddVariantClick}
          />
        ))}
        <View className="h-8" />
      </ScrollView>

      {/* ───────── Add Category Modal ───────── */}
      <Modal
        visible={showAddCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-t-2xl w-full p-6">
            {/* Header */}
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

            {/* Section label */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Thông tin cơ bản
            </Text>

            {/* Tên danh mục */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              {t('category.categoryName')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-6 text-gray-900"
              placeholder={t('category.categoryName')}
              value={categoryName}
              onChangeText={setCategoryName}
            />

            {/* Buttons */}
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

      {/* ───────── Edit Category Modal ───────── */}
      <Modal
        visible={showEditCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditCategoryModal(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-sm p-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Chỉnh sửa danh mục
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
              placeholder={t('category.categoryName')}
              value={editingCategoryName}
              onChangeText={setEditingCategoryName}
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-gray-200"
                onPress={() => {
                  setShowEditCategoryModal(false);
                  setEditingGroupId('');
                  setEditingCategoryName('');
                  setEditingCategoryTabs(['selling']);
                }}>
                <Text className="text-gray-700 font-medium">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-blue-500"
                onPress={handleSaveEditCategory}>
                <Text className="text-white font-medium">
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Add Variant Modal ───────── */}
      <Modal
        visible={showAddVariantModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddVariantModal(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-sm p-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              {t('category.addVariant')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
              placeholder={t('category.variantName')}
              value={variantName}
              onChangeText={setVariantName}
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
              placeholder={t('category.price')}
              value={variantPrice}
              onChangeText={setVariantPrice}
              keyboardType="numeric"
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-4"
              placeholder={t('category.unit')}
              value={variantUnit}
              onChangeText={setVariantUnit}
            />
            <View className="flex-row justify-end gap-2">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-gray-200"
                onPress={() => {
                  setShowAddVariantModal(false);
                  setVariantName('');
                  setVariantPrice('');
                  setVariantUnit('');
                }}>
                <Text className="text-gray-700 font-medium">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-blue-500"
                onPress={handleSaveVariant}>
                <Text className="text-white font-medium">
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ───────── Edit Variant Modal ───────── */}
      <Modal
        visible={showEditVariantModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseEditVariant}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-t-2xl w-full p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-bold text-gray-900">
                Chỉnh sửa sản phẩm
              </Text>
              <TouchableOpacity onPress={handleCloseEditVariant}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Ảnh placeholder */}
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Thông tin cơ bản
            </Text>
            <View className="flex-row items-center mb-5">
              <View className="w-20 h-20 bg-gray-100 rounded-xl items-center justify-center mr-4">
                <Icon name="image" size={32} color="#9ca3af" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-1">Ảnh sản phẩm</Text>
                <Text className="text-xs text-gray-400">Chưa có ảnh</Text>
              </View>
            </View>

            {/* Tên biến thể */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Tên biến thể
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-4 text-gray-900"
              placeholder="Nhập tên biến thể"
              value={editingVariantName}
              onChangeText={setEditingVariantName}
            />

            {/* Giá & Đơn vị */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Giá
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-3 py-3 text-gray-900"
                  placeholder="0"
                  value={editingVariantPrice}
                  onChangeText={setEditingVariantPrice}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Đơn vị
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-3 py-3 text-gray-900"
                  placeholder="cái, ly, phần..."
                  value={editingVariantUnit}
                  onChangeText={setEditingVariantUnit}
                />
              </View>
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center"
                onPress={handleCloseEditVariant}>
                <Text className="text-gray-700 font-semibold text-base">
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-blue-500 items-center"
                onPress={handleSaveEditVariant}>
                <Text className="text-white font-semibold text-base">
                  Lưu thay đổi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
