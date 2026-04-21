import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomerCard, {Customer} from '../../components/customer/CustomerCard';
import CustomerDetail from './CustomerDetail';
import AddCustomer from './AddCustomer';
import type {CustomerDetail as CustomerDetailType, Bill, Contract} from './type';
import {useSelectionMode} from '../../hooks/useSelectionMode';
import {SelectionBar} from '../../components/common/SelectionBar';
import {ConfirmDeleteModal} from '../../components/common/ConfirmDeleteModal';

// ─── Types ───────────────────────────────────────────────────────────────────
type TabType = 'selling' | 'storage';
type FilterTab = 'all' | TabType;

// ─── Mock data ────────────────────────────────────────────────────────────────
// hasKey = true chỉ dành cho khách lưu trú (đang giữ chìa khóa phòng)
const MOCK_CUSTOMERS: Customer[] = [
  {id: '1', name: 'Nguyễn Văn Lộc', phone: '0901234567', type: 'selling'},
  {id: '2', name: 'Trần Minh Hiếu', phone: '0918889999', type: 'selling'},
  {
    id: '3',
    name: 'Phạm',
    phone: '0987654321',
    type: 'storage',
    hasKey: true,
  },
  {id: '4', name: 'Lê Hoàng Nam', phone: '0934445555', type: 'selling'},
  {
    id: '5',
    name: 'Võ Mạnh Dũng',
    phone: '0971112222',
    type: 'storage',
    hasKey: true,
    imageUri:
      'https://tse4.mm.bing.net/th/id/OIP.BLeREgByNXuncHDUim3eMAHaJ3?pid=Api&P=0&h=180',
  },
  {
    id: '6',
    name: 'Mai Thị Tuyết',
    phone: '0909990000',
    type: 'storage',
    hasKey: true,
  },
];

// Mapping bills/contract cho khách hàng cũ (đã từng dùng dịch vụ)
const MOCK_CUSTOMER_BILLS: Record<string, Bill[]> = {
  '3': [
    {
      id: 'bill-003',
      bill_number: 'HĐ #AZ-8812',
      customer_id: '3',
      bill_type: 'cycle',
      total_amount: 2100000,
      paid_amount: 2100000,
      remaining_amount: 0,
      bill_status: 'paid',
      issued_at: '2023-09-28T18:00:00',
    },
  ],
  '5': [
    {
      id: 'bill-005',
      bill_number: 'HĐ #AZ-9021',
      customer_id: '5',
      bill_type: 'cycle',
      total_amount: 1250000,
      paid_amount: 1250000,
      remaining_amount: 0,
      bill_status: 'paid',
      issued_at: '2023-10-12T14:30:00',
    },
  ],
  '6': [
    {
      id: 'bill-006',
      bill_number: 'HĐ #AZ-8944',
      customer_id: '6',
      bill_type: 'pos',
      total_amount: 450000,
      paid_amount: 0,
      remaining_amount: 450000,
      bill_status: 'issued',
      issued_at: '2023-10-05T09:15:00',
    },
  ],
};

const MOCK_CUSTOMER_CONTRACTS: Record<string, Contract> = {
  '3': {
    id: 'contract-003',
    contract_number: 'HD-2023-043',
    customer_id: '3',
    product_id: 'room-301',
    start_date: '2023-09-01',
    end_date: '2023-12-01',
    rent_amount: 2500000,
    deposit_amount: 5000000,
    status: 'active',
    room_name: 'Phòng Standard',
    room_code: '301',
    room_type: 'PHÒNG STANDARD',
  },
  '5': {
    id: 'contract-005',
    contract_number: 'HD-2023-045',
    customer_id: '5',
    product_id: 'room-402a',
    start_date: '2023-10-10',
    end_date: '2024-10-10',
    rent_amount: 3000000,
    deposit_amount: 6000000,
    status: 'active',
    room_name: 'Phòng Deluxe',
    room_code: '402-A',
    room_type: 'PHÒNG DELUXE',
  },
  '6': {
    id: 'contract-006',
    contract_number: 'HD-2023-046',
    customer_id: '6',
    product_id: 'room-303',
    start_date: '2023-09-15',
    end_date: '2023-11-15',
    rent_amount: 2000000,
    deposit_amount: 4000000,
    status: 'active',
    room_name: 'Phòng Standard',
    room_code: '303',
    room_type: 'PHÒNG STANDARD',
  },
};

interface CustomerProps {
  onOpenMenu: () => void;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CustomerScreen({onOpenMenu}: CustomerProps) {
  const {t} = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortAZ, setSortAZ] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const tabs: {key: FilterTab; label: string}[] = [
    {key: 'all', label: t('customer.tab.all', {defaultValue: 'Tất cả'})},
    {
      key: 'selling',
      label: t('customer.tab.sales', {defaultValue: 'Bán hàng'}),
    },
    {
      key: 'storage',
      label: t('customer.tab.storage', {defaultValue: 'Lưu trú'}),
    },
  ];

  const filtered = useMemo(() => {
    let list = customers;
    if (activeTab !== 'all') {
      list = list.filter(c => c.type === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
      );
    }
    if (sortAZ) {
      list = [...list].sort((a, b) => {
        const lastNameA = a.name.trim().split(' ').pop() ?? '';
        const lastNameB = b.name.trim().split(' ').pop() ?? '';
        return lastNameA.localeCompare(lastNameB, 'vi', {sensitivity: 'base'});
      });
    }
    return list;
  }, [search, activeTab, sortAZ, customers]);

  // Dùng flat list thay vì group để tránh conflict giữa selectedGroups và selectedItems
  // Mỗi customer là 1 group không có items con → toggleSelectGroup = toggle customer
  const flatGroups = useMemo(
    () => filtered.map(c => ({id: c.id, items: [] as {id: string}[]})),
    [filtered],
  );

  const {
    selectionMode,
    selectedGroups: selectedIds, // group.id = customer.id
    totalSelected,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectAll,
    toggleSelectGroup: toggleSelectCustomer,
  } = useSelectionMode(flatGroups);

  const isCustomerSelected = (customer: Customer): boolean =>
    selectedIds.has(customer.id);

  const handleConfirmDelete = () => {
    setCustomers(prev => prev.filter(c => !selectedIds.has(c.id)));
    setShowDeleteModal(false);
    exitSelectionMode();
  };

  const selectedCustomerCount = useMemo(
    () => filtered.filter(c => selectedIds.has(c.id)).length,
    [selectedIds, filtered],
  );

  const deleteTargetLabel =
    selectedCustomerCount === 1
      ? 'khách hàng đã chọn'
      : `${selectedCustomerCount} khách hàng đã chọn`;

  // Tạo detailedCustomer object nếu cần
  const detailedCustomer: CustomerDetailType | null = selectedCustomer
    ? {
        id: selectedCustomer.id,
        customer_code: 'KH-' + selectedCustomer.id,
        full_name: selectedCustomer.name,
        id_number: selectedCustomer.id_number || '',
        date_of_birth: selectedCustomer.date_of_birth || '',
        gender: selectedCustomer.gender || 'other',
        phone: selectedCustomer.phone,
        email: selectedCustomer.email || '',
        address: selectedCustomer.address || '',
        nationality: selectedCustomer.nationality || 'VN',
        customer_group: selectedCustomer.customer_group || 'regular',
        loyalty_points: 0,
        total_spent: 0,
        notes: selectedCustomer.notes || '',
        status: 'active',
        imageUri: selectedCustomer.imageUri,
        type: selectedCustomer.type || 'selling',
        hasKey: selectedCustomer.hasKey,
      }
    : null;

  // Hiển thị AddCustomerScreen khi nhấn FAB
  if (showAddCustomer) {
    return (
      <AddCustomer
        onCancel={() => setShowAddCustomer(false)}
        onSave={form => {
          const newCustomer: Customer = {
            id: Date.now().toString(),
            name: form.full_name,
            phone: form.phone,
            type: form.type,
            imageUri: form.imageUri,
            // Các field từ CCCD
            id_number: form.id_number,
            date_of_birth: form.date_of_birth,
            gender: form.gender,
            address: form.address,
            nationality: form.nationality,
            email: form.email,
            notes: form.notes,
            customer_group: form.customer_group,
          };

          setCustomers(prev => [newCustomer, ...prev]);
          setShowAddCustomer(false);
        }}
      />
    );
  }

  // Hiển thị CustomerDetail nếu đang xem chi tiết
  if (detailedCustomer && selectedCustomer) {
    // Phân biệt khách hàng mới (id dạng timestamp) và khách hàng cũ (id ngắn)
    const isNewCustomer = selectedCustomer.id.length > 5;

    // Lấy bills/contract từ mapping cho khách hàng cũ, hoặc rỗng cho khách hàng mới
    const customerBills = isNewCustomer ? [] : MOCK_CUSTOMER_BILLS[selectedCustomer.id];
    const customerContract = isNewCustomer ? null : MOCK_CUSTOMER_CONTRACTS[selectedCustomer.id];

    return (
      <CustomerDetail
        customer={detailedCustomer}
        bills={customerBills || []}
        contract={customerContract || null}
        onBack={() => setSelectedCustomer(null)}
        onUpdateCustomer={updatedCustomer => {
          setCustomers(prev =>
            prev.map(c =>
              c.id === updatedCustomer.id
                ? {
                    ...c,
                    name: updatedCustomer.full_name,
                    phone: updatedCustomer.phone,
                    type: updatedCustomer.type,
                    hasKey: updatedCustomer.hasKey,
                    imageUri: updatedCustomer.imageUri,
                    // Các field từ CCCD
                    id_number: updatedCustomer.id_number,
                    date_of_birth: updatedCustomer.date_of_birth,
                    gender: updatedCustomer.gender,
                    address: updatedCustomer.address,
                    nationality: updatedCustomer.nationality,
                    email: updatedCustomer.email,
                    notes: updatedCustomer.notes,
                    customer_group: updatedCustomer.customer_group,
                  }
                : c,
            ),
          );
        }}
      />
    );
  }

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

            {/* Spacer giữ layout cân */}
            <View className="w-9 h-9" />
          </>
        ) : (
          <>
            <View className="flex-row item-center">
              <TouchableOpacity
                className="w-9 h-9 items-center justify-center"
                onPress={onOpenMenu}>
                <Icon name="menu" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-900 mt-1">
                {t('customer.hub.title', {defaultValue: 'Customer Hub'})}
              </Text>
            </View>

            <TouchableOpacity
              className="items-center  justify-center"
              onPress={enterSelectionMode}>
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
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
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

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: selectionMode ? 120 : 100,
        }}
        renderItem={({item}) => (
          <CustomerCard
            customer={item}
            selectionMode={selectionMode}
            isSelected={isCustomerSelected(item)}
            onToggleSelect={id => toggleSelectCustomer(id)}
            onPress={customer => setSelectedCustomer(customer)}
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
              {t('customer.empty', {defaultValue: 'Không tìm thấy khách hàng'})}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - ẩn khi selection mode */}
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

      {/* SelectionBar - hiện khi selection mode */}
      {selectionMode && (
        <SelectionBar
          totalSelected={totalSelected}
          onDelete={() => {
            if (totalSelected > 0) setShowDeleteModal(true);
          }}
          labelSelected={() =>
            t('customer.delete_selected', {
              defaultValue: `Xóa ${selectedCustomerCount} khách hàng đã chọn`,
              count: selectedCustomerCount,
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
