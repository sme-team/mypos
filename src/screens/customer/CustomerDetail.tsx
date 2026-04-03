import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

import type {CustomerDetail, Bill, BillStatus, Contract} from './type';
import {MOCK_CUSTOMER_DETAIL, MOCK_BILLS, MOCK_CONTRACT} from './type';
import {useImagePicker} from '../../hooks/useImagePicker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string =>
  amount.toLocaleString('vi-VN') + ' đ';

const formatDate = (dateStr: string): string => {
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

const formatGender = (gender: string): string => {
  if (gender === 'male') return 'Nam';
  if (gender === 'female') return 'Nữ';
  return 'Khác';
};

const formatNationality = (code: string): string => {
  if (code === 'VN') return 'Việt Nam';
  return code;
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
  {label: string; bg: string; text: string}
> = {
  paid: {label: 'Đã thanh toán', bg: '#dcfce7', text: '#16a34a'},
  issued: {label: 'Còn nợ', bg: '#fee2e2', text: '#dc2626'},
  partial: {label: 'Một phần', bg: '#fef9c3', text: '#ca8a04'},
  overdue: {label: 'Quá hạn', bg: '#fee2e2', text: '#dc2626'},
  draft: {label: 'Nháp', bg: '#f3f4f6', text: '#6b7280'},
  cancelled: {label: 'Đã huỷ', bg: '#f3f4f6', text: '#6b7280'},
  refunded: {label: 'Hoàn tiền', bg: '#ede9fe', text: '#7c3aed'},
};

const BillStatusBadge: React.FC<{status: BillStatus}> = ({status}) => {
  const cfg = BILL_STATUS_CONFIG[status] ?? BILL_STATUS_CONFIG.draft;
  return (
    <View
      className="px-2 py-0.5 rounded-full"
      style={{backgroundColor: cfg.bg}}>
      <Text className="text-xs font-semibold" style={{color: cfg.text}}>
        {cfg.label}
      </Text>
    </View>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  title: string;
  right?: React.ReactNode;
}> = ({title, right}) => (
  <View className="flex-row items-center justify-between mb-3">
    <Text className="text-xs font-bold tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
    {right}
  </View>
);

// ─── Info row ─────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{label: string; value?: string}> = ({label, value}) => (
  <View className="mb-4">
    <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
    <Text className="text-[15px] font-semibold text-gray-800">
      {value || '-'}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface CustomerDetailProps {
  customer?: CustomerDetail;
  bills?: Bill[];
  contract?: Contract | null;
  onBack?: () => void;
  onEdit?: () => void;
  onUpdateCustomer?: (customer: CustomerDetail) => void;
}

export default function CustomerDetailScreen({
  customer = MOCK_CUSTOMER_DETAIL,
  bills = MOCK_BILLS,
  contract = MOCK_CONTRACT,
  onBack,
  onEdit,
  onUpdateCustomer,
}: CustomerDetailProps) {
  const {t} = useTranslation();

  const {imageUri, chooseImage} = useImagePicker({
    initialUri: customer.imageUri,
    onImageSelected: uri => onUpdateCustomer?.({...customer, imageUri: uri}),
  });

  const hasBills = bills.length > 0;
  const hasContract = !!contract && contract.status === 'active';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2 bg-gray-50">
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center"
          onPress={onBack}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-800">
          {t('customer.detail.title', {defaultValue: 'Khách hàng'})}
        </Text>
        <TouchableOpacity onPress={onEdit}>
          <Text className="text-blue-500 font-semibold text-[15px]">
            {t('customer.detail.edit', {defaultValue: 'Sửa'})}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Avatar & tên ── */}
        <View
          className="bg-white mx-4 mt-3 mb-3 rounded-2xl px-6 py-6 items-center"
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.05,
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
            {/* Camera badge */}
            <View
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-500 items-center justify-center"
              style={{borderWidth: 2, borderColor: '#fff'}}>
              <Icon name="camera-alt" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-900 mb-1">
            {customer.full_name}
          </Text>
          <Text className="text-gray-400 text-sm">{customer.phone}</Text>
        </View>

        {/* ── Thông tin cá nhân ── */}
        <View
          className="bg-white mx-4 mb-3 rounded-2xl px-4 py-4"
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <SectionHeader
            title={t('customer.detail.personal_info', {
              defaultValue: 'Thông tin cá nhân',
            })}
            right={
              <TouchableOpacity className="flex-row items-center gap-1">
                <Icon name="qr-code-scanner" size={16} color="#3b82f6" />
                <Text className="text-blue-500 text-sm font-semibold">
                  {t('customer.detail.scan_cccd', {defaultValue: 'Quét CCCD'})}
                </Text>
              </TouchableOpacity>
            }
          />
          <View className="h-px bg-gray-100 mb-4" />
          <InfoRow
            label={t('customer.detail.id_number', {defaultValue: 'Số CCCD'})}
            value={customer.id_number}
          />
          <InfoRow
            label={t('customer.detail.dob', {defaultValue: 'Ngày sinh'})}
            value={formatDate(customer.date_of_birth)}
          />
          <InfoRow
            label={t('customer.detail.gender', {defaultValue: 'Giới tính'})}
            value={formatGender(customer.gender)}
          />
          <InfoRow
            label={t('customer.detail.nationality', {
              defaultValue: 'Quốc tịch',
            })}
            value={formatNationality(customer.nationality)}
          />
          <InfoRow
            label={t('customer.detail.address', {defaultValue: 'Địa chỉ'})}
            value={customer.address}
          />
          <InfoRow
            label={t('customer.detail.notes', {defaultValue: 'Ghi chú'})}
            value={customer.notes}
          />
        </View>

        {/* ── Giao dịch gần đây ── */}
        <View
          className="bg-white mx-4 mb-3 rounded-2xl px-4 py-4"
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <SectionHeader
            title={t('customer.detail.recent_bills', {
              defaultValue: 'Giao dịch gần đây',
            })}
            right={
              hasBills ? (
                <TouchableOpacity>
                  <Text className="text-blue-500 text-sm font-semibold">
                    {t('customer.detail.view_all', {
                      defaultValue: 'Xem tất cả',
                    })}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
          <View className="h-px bg-gray-100 mb-3" />
          {hasBills ? (
            bills.map((bill, index) => (
              <View key={bill.id}>
                <View className="flex-row items-center py-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        bill.bill_status === 'paid' ? '#eff6ff' : '#fff1f2',
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
                    <Text className="text-[14px] font-bold text-gray-800">
                      {bill.bill_number}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(bill.issued_at)}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-[14px] font-bold text-gray-800">
                      {formatCurrency(bill.total_amount)}
                    </Text>
                    <BillStatusBadge status={bill.bill_status} />
                  </View>
                </View>
                {index < bills.length - 1 && (
                  <View className="h-px bg-gray-100" />
                )}
              </View>
            ))
          ) : (
            <View className="items-center py-8">
              <Icon name="receipt-long" size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-2">
                {t('customer.detail.no_bills', {
                  defaultValue: 'Không có giao dịch nào gần đây',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* ── Lưu trú hiện tại ── */}
        <View
          className="bg-white mx-4 mb-6 rounded-2xl px-4 py-4"
          style={{
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 1},
          }}>
          <SectionHeader
            title={t('customer.detail.current_stay', {
              defaultValue: 'Lưu trú hiện tại',
            })}
          />
          <View className="h-px bg-gray-100 mb-3" />
          {hasContract ? (
            <View
              className="rounded-xl p-4"
              style={{
                backgroundColor: '#f0f9ff',
                borderWidth: 1,
                borderColor: '#bae6fd',
              }}>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-bold text-blue-500 tracking-wider uppercase">
                  {contract!.room_type}
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-blue-100">
                  <Text className="text-xs font-bold text-blue-600">
                    {t('customer.detail.staying', {defaultValue: 'ĐANG Ở'})}
                  </Text>
                </View>
              </View>
              <Text className="text-3xl font-black text-gray-800 mb-3">
                {contract!.room_code}
              </Text>
              <View className="flex-row mb-1">
                <View className="flex-1">
                  <Text className="text-xs text-gray-400">
                    {t('customer.detail.checkin_date', {
                      defaultValue: 'Ngày nhận phòng',
                    })}
                  </Text>
                  <Text className="text-sm font-semibold text-gray-700 mt-0.5">
                    {formatDate(contract!.start_date)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400">
                    {t('customer.detail.checkout_date', {
                      defaultValue: 'Dự kiến trả',
                    })}
                  </Text>
                  <Text className="text-sm font-semibold text-gray-700 mt-0.5">
                    {contract!.end_date ? formatDate(contract!.end_date) : '-'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                className="mt-3 py-2.5 rounded-xl items-center bg-white"
                style={{borderWidth: 1, borderColor: '#bae6fd'}}>
                <Text className="text-blue-500 font-semibold text-sm">
                  {t('customer.detail.booking_detail', {
                    defaultValue: 'Chi tiết đặt phòng',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-8">
              <Icon name="hotel" size={40} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-2">
                {t('customer.detail.no_stay', {
                  defaultValue: 'Không có lưu trú nào gần đây',
                })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
