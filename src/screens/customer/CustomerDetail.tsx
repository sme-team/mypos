import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../../hooks/useTheme';
import {useImagePicker} from '../../hooks/useImagePicker';

import {
  CustomerService,
  CustomerRecord,
  BillRecord,
  ContractRecord,
  BillStatus,
} from '../../services/database/customer/CustomerService';

// AddCustomer tái sử dụng ở mode='edit'
import AddCustomer from './AddCustomer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (amount: number, t: any) =>
  amount.toLocaleString('vi-VN') + (t('pos.currency_symbol') || 'đ');

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) {return '-';}
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${formatDate(dateStr)} • ${String(d.getHours()).padStart(
    2,
    '0',
  )}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatGender = (gender: string | null | undefined, t: any): string => {
  if (gender === 'male') {return t('gender.male');}
  if (gender === 'female') {return t('gender.female');}
  if (gender === 'other') {return t('gender.other');}
  return '-';
};

const formatNationality = (code: string | null | undefined, t: any): string => {
  if (code === 'VN') {return t('common.vietnam');}
  return code ?? '-';
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (
      parts[parts.length - 2][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
};

// ─── Bill status badge ────────────────────────────────────────────────────────

const BILL_STATUS_CONFIG: Record<
  BillStatus,
  {labelKey: string; defaultLabel: string; bg: string; text: string}
> = {
  paid: {labelKey: 'bill.status.paid', defaultLabel: '', bg: '#dcfce7', text: '#16a34a'},
  issued: {labelKey: 'bill.status.issued', defaultLabel: '', bg: '#fee2e2', text: '#dc2626'},
  partial: {labelKey: 'bill.status.partial', defaultLabel: '', bg: '#fef9c3', text: '#ca8a04'},
  overdue: {labelKey: 'bill.status.overdue', defaultLabel: '', bg: '#fee2e2', text: '#dc2626'},
  draft: {labelKey: 'bill.status.draft', defaultLabel: '', bg: '#f3f4f6', text: '#6b7280'},
  cancelled: {labelKey: 'bill.status.cancelled', defaultLabel: '', bg: '#f3f4f6', text: '#6b7280'},
  refunded: {labelKey: 'bill.status.refunded', defaultLabel: '', bg: '#ede9fe', text: '#7c3aed'},
};

const BillStatusBadge: React.FC<{status: BillStatus}> = ({status}) => {
  const {t} = useTranslation();
  const cfg = BILL_STATUS_CONFIG[status] ?? BILL_STATUS_CONFIG.draft;
  return (
    <View
      className="px-2 py-0.5 rounded-full"
      style={{backgroundColor: cfg.bg}}>
      <Text className="text-xs font-semibold" style={{color: cfg.text}}>
        {t(cfg.labelKey)}
      </Text>
    </View>
  );
};

// ─── Section / InfoRow ────────────────────────────────────────────────────────

const SectionHeader: React.FC<{title: string; right?: React.ReactNode}> = ({
  title,
  right,
}) => (
  <View className="flex-row items-center justify-between mb-3">
    <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
    {right}
  </View>
);

const InfoRow: React.FC<{label: string; value?: string}> = ({label, value}) => (
  <View className="mb-4">
    <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
    <Text className="text-[15px] font-semibold text-gray-800">
      {value?.trim() || '-'}
    </Text>
  </View>
);

// ─── Props ────────────────────────────────────────────────────────────────────

const MAX_BILLS_PREVIEW = 5;

interface CustomerDetailProps {
  customer: CustomerRecord;
  storeId: string;
  onBack: () => void;
  /** Callback khi customer được cập nhật để CustomerScreen sync state */
  onUpdateCustomer?: (updated: CustomerRecord) => void;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CustomerDetailScreen({
  customer: initialCustomer,
  storeId,
  onBack,
  onUpdateCustomer,
}: CustomerDetailProps) {
  const {t} = useTranslation();
  const {isDark} = useTheme();

  // Giữ bản local của customer để cập nhật ngay sau khi edit xong
  const [customer, setCustomer] = useState<CustomerRecord>(initialCustomer);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);

  const [bills, setBills] = useState<BillRecord[]>([]);
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // ── Load bills & contract khi mount ──────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [fetchedBills, fetchedContract] = await Promise.all([
        CustomerService.getBillsByCustomerId(customer.id),
        CustomerService.getActiveContractByCustomerId(customer.id),
      ]);
      setBills(fetchedBills);
      setContract(fetchedContract);
    } catch (err) {
      console.error('[CustomerDetail] loadData error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [customer.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Avatar update ─────────────────────────────────────────────────────────

  const {imageUri, chooseImage} = useImagePicker({
    initialUri: customer.imageUri ?? undefined,
    onImageSelected: async (uri: string) => {
      try {
        const updated = await CustomerService.updateAvatar(customer.id, uri);
        setCustomer(updated);
        onUpdateCustomer?.(updated);
      } catch (err) {
        console.error('[CustomerDetail] updateAvatar error:', err);
      }
    },
  });

  // ── Khi edit form lưu thành công ─────────────────────────────────────────

  const handleEditSaved = (updated: CustomerRecord) => {
    setCustomer(updated);
    onUpdateCustomer?.(updated);
    setShowEditForm(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasBills = bills.length > 0;
  const hasContract = !!contract && contract.status === 'active';
  const displayedBills = showAllBills
    ? bills
    : bills.slice(0, MAX_BILLS_PREVIEW);
  const hasMoreBills = bills.length > MAX_BILLS_PREVIEW;

  // ── Render edit form (tái sử dụng AddCustomer) ────────────────────────────

  if (showEditForm) {
    return (
      <AddCustomer
        storeId={storeId}
        mode="edit"
        initialData={customer}
        onCancel={() => setShowEditForm(false)}
        onSaved={handleEditSaved}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111827' : '#f9fafb'} />

      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 pt-3 pb-2 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center"
          onPress={onBack}>
          <Icon name="arrow-back" size={24} color={isDark ? '#e5e7eb' : '#374151'} />
        </TouchableOpacity>
        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {t('customer.detail.title')}
        </Text>
        {/* Nút Sửa → bật edit form */}
        <TouchableOpacity onPress={() => setShowEditForm(true)}>
          <Text className="text-blue-500 font-semibold text-[15px]">
            {t('customer.detail.edit')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Avatar & tên ── */}
        <View
          className={`mx-4 mt-3 mb-3 rounded-2xl px-6 py-6 items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <TouchableOpacity onPress={chooseImage} className="mb-3">
            <View className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 items-center justify-center">
              {imageUri ? (
                <Image source={{uri: imageUri}} className="w-24 h-24" />
              ) : (
                <Text style={{fontSize: 28, fontWeight: '700', color: '#fff'}}>
                  {getInitials(customer.full_name)}
                </Text>
              )}
            </View>
            {/* Camera overlay */}
            <View
              className={`absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-white'}`}
              style={{elevation: 2}}>
              <Icon name="camera-alt" size={15} color="#3b82f6" />
            </View>
          </TouchableOpacity>

          <Text className={`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {customer.full_name}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">{customer.phone}</Text>
        </View>

        {/* ── Thông tin cá nhân ── */}
        <View
          className={`mx-4 mb-3 rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <SectionHeader
            title={t('customer.detail.personal_info')}
          />
          <View className={`h-px mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
          <InfoRow
            label={t('customer.detail.id_number')}
            value={customer.id_number ?? undefined}
          />
          <InfoRow
            label={t('customer.detail.dob')}
            value={formatDate(customer.date_of_birth)}
          />
          <InfoRow
            label={t('customer.detail.gender')}
            value={formatGender(customer.gender, t)}
          />
          <InfoRow
            label={t('customer.detail.nationality')}
            value={formatNationality(customer.nationality, t)}
          />
          <InfoRow
            label={t('customer.detail.address')}
            value={customer.address ?? undefined}
          />
          <InfoRow
            label={t('customer.detail.notes')}
            value={customer.notes ?? undefined}
          />
        </View>

        {/* ── Giao dịch gần đây ── */}
        <View
          className={`mx-4 mb-3 rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <SectionHeader
            title={t('customer.detail.recent_bills')}
            right={
              hasMoreBills ? (
                <TouchableOpacity onPress={() => setShowAllBills(v => !v)}>
                  <Text className="text-blue-500 text-sm font-semibold">
                    {showAllBills
                      ? t('customer.detail.hide_bills')
                      : t('customer.detail.view_all')}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
          <View className={`h-px mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />

          {loadingData ? (
            <ActivityIndicator
              size="small"
              color="#3b82f6"
              style={{marginVertical: 16}}
            />
          ) : hasBills ? (
            displayedBills.map((bill, index) => (
              <View key={bill.id}>
                <View className="flex-row items-center py-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        bill.bill_status === 'paid' ? (isDark ? '#1e3a5f' : '#eff6ff') : (isDark ? '#451a1a' : '#fff1f2'),
                    }}>
                    <Icon
                      name={
                        bill.bill_status === 'paid' ? 'receipt' : 'receipt-long'
                      }
                      size={20}
                      color={
                        bill.bill_status === 'paid' ? '#3b82f6' : '#ef4444'
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-[14px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                      {bill.bill_number}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(bill.issued_at)}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className={`text-[14px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                      {formatPrice(bill.total_amount, t)}
                    </Text>
                    <BillStatusBadge status={bill.bill_status} />
                  </View>
                </View>
                {index < displayedBills.length - 1 && (
                  <View className={`h-px ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
                )}
              </View>
            ))
          ) : (
            <View className="items-center py-8">
              <Icon name="receipt-long" size={40} color={isDark ? '#374151' : '#d1d5db'} />
              <Text className="text-gray-400 text-sm mt-2">
                {t('customer.detail.no_bills')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Lưu trú hiện tại ── */}
        <View
          className={`mx-4 mb-6 rounded-2xl px-4 py-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <SectionHeader
            title={t('customer.detail.current_stay')}
          />
          <View className={`h-px mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />

          {loadingData ? (
            <ActivityIndicator
              size="small"
              color="#3b82f6"
              style={{marginVertical: 16}}
            />
          ) : hasContract ? (
            <View
              className="rounded-xl p-4"
              style={{
                backgroundColor: isDark ? '#0c4a6e' : '#f0f9ff',
                borderWidth: 1,
                borderColor: isDark ? '#075985' : '#bae6fd',
              }}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className={`text-xs font-bold tracking-wider uppercase ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
                  {contract!.room_type ?? contract!.contract_number}
                </Text>
                <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                  <Text className={`text-xs font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                    {t('customer.detail.staying')}
                  </Text>
                </View>
              </View>
              <Text className={`text-3xl font-black mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                {contract!.room_code ?? '-'}
              </Text>
              <View className="flex-row mb-1">
                <View className="flex-1">
                  <Text className="text-xs text-gray-400">
                    {t('customer.detail.checkin_date')}
                  </Text>
                  <Text className={`text-sm font-semibold mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatDate(contract!.start_date)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400">
                    {t('customer.detail.checkout_date')}
                  </Text>
                  <Text className={`text-sm font-semibold mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatDate(contract!.end_date)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className="mt-3 py-2.5 rounded-xl items-center bg-white"
                style={{borderWidth: 1, borderColor: '#bae6fd'}}>
                <Text className="text-blue-500 font-semibold text-sm">
                  {t('customer.detail.booking_detail')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-8">
              <Icon name="hotel" size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-2">
                {t('customer.detail.no_stay')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
