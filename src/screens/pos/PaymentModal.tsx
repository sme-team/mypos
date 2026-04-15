import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {PaymentService} from '../../services/database/payment/PaymentService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cartItems: any[];
  selectedCustomer?: {id: string; name: string} | null;
}

const formatPrice = (n: number) => n.toLocaleString('vi-VN') + 'đ';

export default function PaymentModal({
  visible,
  onClose,
  onSuccess,
  cartItems,
  selectedCustomer,
}: Props) {
  const {t} = useTranslation();
  const [cash, setCash] = useState(0); // số thật
  const [cashText, setCashText] = useState(''); // text hiển thị
  const [expand, setExpand] = useState(false);

  const total = useMemo(() => {
    return cartItems.reduce((sum, i) => {
      const price = i.selectedVariant?.price ?? i.product.price;
      return sum + price * i.quantity;
    }, 0);
  }, [cartItems]);

  const isEmptyCart = cartItems.length === 0;

  const change = Math.max(0, cash - total);

  const addQuickCash = (amount: number) => {
    setCash(amount);
    setCashText(amount.toLocaleString('vi-VN'));
  };
  useEffect(() => {
    setCash(total);
    setCashText(total.toLocaleString('vi-VN'));
  }, [total]);

  const handleConfirm = async () => {
    // ❗ 1. Check giỏ hàng
    if (isEmptyCart) {
      Alert.alert('Lỗi', 'Chưa có sản phẩm để thanh toán');
      return;
    }
    try {
      await PaymentService.createOrder({
        cartItems,
        total,
        cash,
        storeId: 'store-001',
        customerId: selectedCustomer?.id || null,
      });

      // 3. Thông báo + xử lý
      Alert.alert('Thành công', 'Thanh toán thành công', [
        {
          text: 'OK',
          onPress: () => {
            onClose(); // đóng modal
            onSuccess(); // clear cart
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', 'Thanh toán thất bại');
    }
  };
  return (
    <Modal visible={visible} animationType="slide">
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
        {/* HEADER */}
        <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <TouchableOpacity onPress={onClose}>
            <Icon name="arrow-back" size={24} />
          </TouchableOpacity>

          <Text className="text-lg font-bold">{t('payment.title')}</Text>

          <View className="w-6" />
        </View>

        {/* CONTENT */}
        <ScrollView className="flex-1 px-6 py-4">
          {/* ORDER SUMMARY */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Icon name="receipt-long" size={20} color="#3b82f6" />
              <Text className="ml-2 font-bold text-base">
                {t('payment.order_detail')}
              </Text>
            </View>

            <View className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
              {/* COLLAPSE */}
              <TouchableOpacity
                onPress={() => setExpand(!expand)}
                className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-500">
                  {t('payment.products')} ({cartItems.length})
                </Text>

                <View className="flex-row items-center">
                  <Text className="font-semibold mr-2">
                    {formatPrice(total)}
                  </Text>
                  <Icon
                    name="expand-more"
                    size={20}
                    style={{
                      transform: [{rotate: expand ? '180deg' : '0deg'}],
                    }}
                  />
                </View>
              </TouchableOpacity>

              {/* ITEMS */}
              {expand && (
                <View className="mt-4 border-t pt-4 space-y-3">
                  {cartItems.map(item => (
                    <View key={item.product.id}>
                      <View className="flex-row justify-between">
                        <Text className="font-semibold text-sm">
                          {item.product.name}
                        </Text>
                        <Text className="font-semibold text-sm">
                          {formatPrice(
                            item.selectedVariant?.price ?? item.product.price,
                          )}
                        </Text>
                      </View>

                      <View className="flex-row justify-between text-xs text-gray-500">
                        <Text>
                          {item.selectedVariant?.name || 'Mặc định'} • x
                          {item.quantity}
                        </Text>
                        <Text>
                          {formatPrice(
                            (item.selectedVariant?.price ??
                              item.product.price) * item.quantity,
                          )}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* TOTAL */}
              <View className="flex-row justify-between mt-4 pt-4 border-t">
                <Text className="font-bold">{t('payment.total')}</Text>
                <Text className="text-blue-500 font-bold text-lg">
                  {formatPrice(total)}
                </Text>
              </View>
            </View>
          </View>

          {/* CASH INPUT */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Icon name="payments" size={20} color="#3b82f6" />
              <Text className="ml-2 font-bold">{t('payment.cash')}</Text>
            </View>

            <View className="relative">
              <TextInput
                value={cashText}
                onChangeText={text => {
                  const raw = text.replace(/\D/g, '');
                  const number = Number(raw);

                  setCash(number);
                  setCashText(number ? number.toLocaleString('vi-VN') : '');
                }}
                keyboardType="numeric"
                className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-4 text-right text-xl font-bold pr-8"
                placeholder="0"
              />
              <Text className="absolute right-4 mt-5 -translate-y-1/2 text-gray-900">
                đ
              </Text>
            </View>

            {/* QUICK BUTTON */}
            <View className="flex-row flex-wrap gap-2">
              {[50000, 100000, 200000, 500000].map(v => (
                <TouchableOpacity
                  key={v}
                  onPress={() => addQuickCash(v)}
                  className="flex-1 min-w-[22%] border border-blue-500 rounded-lg py-2 items-center">
                  <Text className="text-blue-500 font-bold">{v / 1000}k</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CHANGE */}
            <View className="flex-row justify-between mt-6">
              <Text className="text-gray-500">{t('payment.change')}</Text>
              <Text className="text-green-500 font-bold text-lg">
                {formatPrice(change)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* FOOTER */}
        <View className="flex-row p-4 border-t gap-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <TouchableOpacity className="flex-1 bg-gray-200 rounded-xl py-4 items-center">
            <Text className="font-bold">{t('payment.print')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={cash < total}
            className={`flex-[1.5] rounded-xl py-4 items-center ${
              cash >= total ? 'bg-blue-500' : 'bg-gray-300'
            }`}>
            <Text className="text-white font-bold">{t('payment.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
