import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

import CustomerCard, {Customer} from '../../components/customer/CustomerCard';
import CustomerDetail from './CustomerDetail';
import AddCustomer from './AddCustomer';
import {useSelectionMode} from '../../hooks/useSelectionMode';
import {SelectionBar} from '../../components/common/SelectionBar';
import {ConfirmDeleteModal} from '../../components/common/ConfirmDeleteModal';

import {
  CustomerService,
  CustomerRecord,
} from '../../services/database/customer/CustomerService';

import {BaseService} from '../../services/BaseService';

// ─── Constants ────────────────────────────────────────────────────────────────

// TODO: lấy từ auth context / store context thực tế
const CURRENT_STORE_ID = 'store-001';

/** Số khách hàng hiển thị mỗi trang */
const PAGE_SIZE = 20;

// ─── DAO phụ để truy vấn bảng residents ──────────────────────────────────────

class ResidentDAO extends BaseService {
  constructor() {
    super('pos', 'residents');
  }
}

const residentDAO = new ResidentDAO();

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'selling' | 'storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map CustomerRecord (DB) → Customer (UI Card component) */
function toCardCustomer(r: CustomerRecord): Customer {
  return {
    id: r.id,
    name: r.full_name,
    phone: r.phone,
    hasKey: r.metadata?.hasKey ?? false,
    imageUri: r.imageUri ?? undefined,
  };
}

// ─── Sub-component: Pagination ────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  /**
   * Tính danh sách trang hiển thị (tối đa 5 trang xung quanh trang hiện tại)
   * Giống ảnh mẫu: 1 2 3 4 5  /  3 4 [5] 6 7
   */
  const getPageNumbers = (): number[] => {
    const delta = 2; // số trang hiển thị mỗi bên
    const range: number[] = [];
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);
    for (let i = left; i <= right; i++) {
      range.push(i);
    }
    return range;
  };

  const pages = getPageNumbers();
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  return (
    <View
      className="flex-row items-center justify-center py-4 px-2"
      style={{gap: 4}}>
      {/* Trước */}
      <TouchableOpacity
        onPress={() => !isFirst && onPageChange(currentPage - 1)}
        disabled={isFirst}
        className="px-3 py-2 rounded-lg"
        style={{opacity: isFirst ? 0.35 : 1}}>
        <Text className="text-gray-500 text-sm font-medium">‹ Trước</Text>
      </TouchableOpacity>

      {/* Số trang */}
      {pages.map(page => {
        const isActive = page === currentPage;
        return (
          <TouchableOpacity
            key={page}
            onPress={() => onPageChange(page)}
            className="w-9 h-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: isActive ? 'transparent' : 'transparent',
              borderBottomWidth: isActive ? 2 : 0,
              borderBottomColor: isActive ? '#1d4ed8' : 'transparent',
            }}>
            <Text
              className="text-sm font-semibold"
              style={{color: isActive ? '#1d4ed8' : '#6b7280'}}>
              {page}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Tiếp theo */}
      <TouchableOpacity
        onPress={() => !isLast && onPageChange(currentPage + 1)}
        disabled={isLast}
        className="px-3 py-2 rounded-lg"
        style={{opacity: isLast ? 0.35 : 1}}>
        <Text className="text-gray-500 text-sm font-medium">Tiếp theo ›</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerScreenProps {
  onOpenMenu: () => void;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomerScreen({onOpenMenu}: CustomerScreenProps) {
  const {t} = useTranslation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  /**
   * Set customer_id của những khách hàng có bản ghi trong bảng residents.
   * Tab "Lưu trú" = customer CÓ trong set này.
   * Tab "Bán hàng" = customer KHÔNG có trong set này.
   */
  const [residentIds, setResidentIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortAZ, setSortAZ] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerRecord | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  /** Trang hiện tại – reset về 1 khi đổi tab / search */
  const [currentPage, setCurrentPage] = useState(1);

  // ── Load danh sách ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load song song customers + residents
      const [customerList, residentList] = await Promise.all([
        CustomerService.getAll({
          store_id: CURRENT_STORE_ID,
          status: 'active',
        }),
        residentDAO.findAll(
          {store_id: CURRENT_STORE_ID},
          {columns: ['customer_id']},
        ),
      ]);

      setAllCustomers(customerList);
      setResidentIds(new Set(residentList.map((r: any) => r.customer_id)));
    } catch (err) {
      console.error('[CustomerScreen] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Reset trang khi thay đổi tab / search ─────────────────────────────────

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, sortAZ]);

  // ── Filter / sort (toàn bộ danh sách đã lọc) ──────────────────────────────

  const filtered = useMemo(() => {
    let list: CustomerRecord[];

    if (activeTab === 'all') {
      list = [...allCustomers];
    } else if (activeTab === 'storage') {
      // Lưu trú: khách hàng CÓ trong bảng residents
      list = allCustomers.filter(c => residentIds.has(c.id));
    } else {
      // Bán hàng: khách hàng KHÔNG có trong bảng residents
      list = allCustomers.filter(c => !residentIds.has(c.id));
    }

    // Tìm kiếm
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        c =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
      );
    }

    // Sắp xếp A-Z theo tên cuối
    if (sortAZ) {
      list = [...list].sort((a, b) => {
        const lastA = a.full_name.trim().split(' ').pop() ?? '';
        const lastB = b.full_name.trim().split(' ').pop() ?? '';
        return lastA.localeCompare(lastB, 'vi', {sensitivity: 'base'});
      });
    }

    return list;
  }, [allCustomers, residentIds, activeTab, search, sortAZ]);

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /** Danh sách đã phân trang – đây là data thực sự render ra FlatList */
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // ── Selection mode ─────────────────────────────────────────────────────────

  const flatGroups = useMemo(
    () => filtered.map(c => ({id: c.id, items: [] as {id: string}[]})),
    [filtered],
  );

  const {
    selectionMode,
    selectedGroups: selectedIds,
    totalSelected,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectAll,
    toggleSelectGroup: toggleSelectCustomer,
  } = useSelectionMode(flatGroups);

  const isSelected = (c: CustomerRecord) => selectedIds.has(c.id);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    try {
      const ids = [...selectedIds];
      const {success} = await CustomerService.bulkSoftDelete(ids);
      setAllCustomers(prev => prev.filter(c => !success.includes(c.id)));
    } catch (err) {
      console.error('[CustomerScreen] bulkSoftDelete error:', err);
    } finally {
      setShowDeleteModal(false);
      exitSelectionMode();
    }
  };

  const selectedCount = useMemo(
    () => filtered.filter(c => selectedIds.has(c.id)).length,
    [selectedIds, filtered],
  );

  const deleteTargetLabel =
    selectedCount === 1
      ? 'khách hàng đã chọn'
      : `${selectedCount} khách hàng đã chọn`;

  // ── Add customer ───────────────────────────────────────────────────────────

  const handleSaveNewCustomer = (created: CustomerRecord) => {
    setAllCustomers(prev => [created, ...prev]);
    setShowAddCustomer(false);
  };

  // ── Update customer (từ CustomerDetail) ───────────────────────────────────

  const handleUpdateCustomer = (updated: CustomerRecord) => {
    setAllCustomers(prev => prev.map(c => (c.id === updated.id ? updated : c)));
    if (selectedCustomer?.id === updated.id) {
      setSelectedCustomer(updated);
    }
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: {key: FilterTab; label: string}[] = [
    {
      key: 'all',
      label: t('customer.tab.all', {defaultValue: 'Tất cả'}),
    },
    {
      key: 'selling',
      label: t('customer.tab.sales', {defaultValue: 'Bán hàng'}),
    },
    {
      key: 'storage',
      label: t('customer.tab.storage', {defaultValue: 'Lưu trú'}),
    },
  ];

  // ── Sub-screens ────────────────────────────────────────────────────────────

  if (showAddCustomer) {
    return (
      <AddCustomer
        storeId={CURRENT_STORE_ID}
        onCancel={() => setShowAddCustomer(false)}
        onSaved={handleSaveNewCustomer}
      />
    );
  }

  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        storeId={CURRENT_STORE_ID}
        onBack={() => setSelectedCustomer(null)}
        onUpdateCustomer={handleUpdateCustomer}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        {selectionMode ? (
          <>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center"
              onPress={exitSelectionMode}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSelectAll}>
              <Text className="text-blue-500 font-semibold text-[15px]">
                {isAllSelected
                  ? t('customer.deselect_all', {defaultValue: 'Bỏ chọn tất cả'})
                  : t('customer.select_all', {defaultValue: 'Chọn tất cả'})}
              </Text>
            </TouchableOpacity>
            <View className="w-9 h-9" />
          </>
        ) : (
          <>
            <View className="flex-row items-center">
              <TouchableOpacity
                className="w-9 h-9 items-center justify-center"
                onPress={onOpenMenu}>
                <Icon name="menu" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-900 mt-1">
                {t('customer.hub.title')}
              </Text>
            </View>
            <TouchableOpacity onPress={enterSelectionMode}>
              <Text className="text-blue-500 font-bold">Chọn</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Search */}
      <View className="mx-4 mb-4">
        <View
          className="flex-row items-center bg-white rounded-2xl px-3 py-1"
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 3,
          }}>
          <Icon name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-700 text-[14px]"
            placeholder={t('customer.search.placeholder', {
              defaultValue: 'Tìm tên hoặc số điện thoại...',
            })}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row mb-4 px-4 space-x-2">
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-full ${
              activeTab === tab.key ? 'bg-blue-500' : 'bg-white'
            }`}
            style={
              activeTab !== tab.key
                ? {elevation: 1, shadowColor: '#000', shadowOpacity: 0.05}
                : undefined
            }>
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key ? 'text-white' : 'text-gray-600'
              }`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Đếm tổng kết quả */}
      {!loading && filtered.length > 0 && (
        <View className="px-4 mb-2 flex-row items-center justify-between">
          <Text className="text-gray-400 text-xs">
            {filtered.length} khách hàng
            {totalPages > 1 ? ` · Trang ${currentPage}/${totalPages}` : ''}
          </Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={paginatedList}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: selectionMode ? 120 : 16,
          }}
          renderItem={({item}) => (
            <CustomerCard
              customer={toCardCustomer(item)}
              selectionMode={selectionMode}
              isSelected={isSelected(item)}
              onToggleSelect={id => toggleSelectCustomer(id)}
              onPress={() => setSelectedCustomer(item)}
              onLongPress={() => {
                if (!selectionMode) {
                  enterSelectionMode();
                  toggleSelectCustomer(item.id);
                }
              }}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Icon name="person-search" size={48} color="#d1d5db" />
              <Text className="text-gray-400 mt-3 text-sm">
                {t('customer.empty', {
                  defaultValue: 'Không tìm thấy khách hàng',
                })}
              </Text>
            </View>
          }
          ListFooterComponent={
            !selectionMode ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={page => {
                  setCurrentPage(page);
                }}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      {!selectionMode && (
        <TouchableOpacity
          className="absolute bottom-8 right-5 w-14 h-14 bg-blue-500 rounded-full items-center justify-center"
          style={{
            shadowColor: '#3b82f6',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={() => setShowAddCustomer(true)}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* SelectionBar */}
      {selectionMode && (
        <SelectionBar
          totalSelected={totalSelected}
          onDelete={() => {
            if (totalSelected > 0) setShowDeleteModal(true);
          }}
          labelSelected={() =>
            t('customer.delete_selected', {
              defaultValue: `Xóa ${selectedCount} khách hàng đã chọn`,
              count: selectedCount,
            })
          }
          labelEmpty={t('customer.select_hint', {
            defaultValue: 'Chưa chọn khách hàng nào',
          })}
        />
      )}

      {/* ConfirmDeleteModal */}
      <ConfirmDeleteModal
        visible={showDeleteModal}
        targetLabel={deleteTargetLabel}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}
