import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export function RoomHistoryView({
  room,
  details,
  setView,
  themedColors: c,
  t,
}: any) {
  const getNextBillDate = (billingDay: number) => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    if (today.getDate() >= billingDay) {
      month++;
      if (month > 11) { month = 0; year++; }
    }
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const targetDay = Math.min(billingDay, lastDayOfMonth);
    return new Date(year, month, targetDay).toLocaleDateString('vi-VN');
  };
  const fmt = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return { color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle' };
      case 'overdue': return { color: '#DC2626', bg: '#FEE2E2', icon: 'error' };
      case 'partial': return { color: '#EA580C', bg: '#FFEDD5', icon: 'pending' };
      default: return { color: '#2563EB', bg: '#EFF6FF', icon: 'receipt' };
    }
  };

  const historyBills = details?.history_bills || [];
  const processedItems = historyBills.map((bill: any) => {
    const status = getStatusColor(bill.bill_status);
    const period = `${bill.cycle_period_from} - ${bill.cycle_period_to}`;

    return {
      type: 'bill',
      title: `Hóa đơn ${bill.bill_number}`,
      date: `Kỳ: ${period}`,
      badge: bill.bill_status === 'overdue' ? t('roomDetail.debt.overdue').toUpperCase() : null,
      amount: fmt(bill.total_amount),
      icon: status.icon,
      color: status.color,
      bg: status.bg,
      status: bill.bill_status,
    };
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[s.header, { backgroundColor: c.surface, borderBottomWidth: 0 }]}>
        <TouchableOpacity onPress={() => setView('detail')} style={s.iconBtn}>
          <Icon name="arrow-back" size={22} color={c.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.textSecondary }]}>{t('roomDetail.historyTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Tiêu đề phòng */}
        <Text style={[s.roomTitle, { color: c.text }]}>Phòng {room.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
          <Icon name="person" size={16} color={c.textSecondary} />
          <Text style={[s.tenantName, { color: c.textSecondary, marginLeft: 6 }]}>{details?.customer_name || '---'}</Text>
        </View>

        {details?.billing_day && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Icon name="event-repeat" size={16} color={c.primary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.primary, marginLeft: 6 }}>
              {t('roomDetail.next_bill_date', { date: getNextBillDate(details.billing_day) })}
            </Text>
          </View>
        )}

        {/* Nút Xuất PDF / Gia hạn */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
            <Text style={[s.actionBtnText, { color: c.text }]}>{t('roomDetail.exportPDF')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { flex: 1, backgroundColor: '#007AFF' }]}>
            <Text style={[s.actionBtnText, { color: '#fff' }]}>{t('roomDetail.extend')}</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Cards Summary */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <SummaryCard label={t('roomDetail.debt.payable')} value={fmt(details?.total_payable)} color="#007AFF" c={c} />
          <SummaryCard label={t('roomDetail.debt.paid')} value={fmt(details?.total_paid)} color="#34C759" c={c} />
          <SummaryCard label={t('roomDetail.debt.balance')} value={fmt(details?.balance)} color="#FF3B30" valueColor={details?.balance > 0 ? '#FF3B30' : c.text} c={c} />
          <SummaryCard label={t('roomDetail.debt.overdue')} value={`${historyBills.filter((b:any) => b.bill_status === 'overdue').length} ${t('roomDetail.other')}`} color="#FF3B30" valueColor="#FF3B30" c={c} />
        </View>

        {/* Timeline */}
        <View style={[s.timelineContainer]}>
          {processedItems.map((item: any, index: number) => (
            <View key={index} style={s.timelineItem}>
              {/* Cột Timeline */}
              <View style={s.timelineLeft}>
                <View style={[s.timelineDot, { backgroundColor: item.bg }]}>
                  <Icon name={item.icon} size={16} color={item.color} />
                </View>
                {index < processedItems.length - 1 && <View style={[s.timelineLine, { backgroundColor: c.border }]} />}
              </View>

              {/* Nội dung Card */}
              <View style={[s.timelineCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                 {/* Left Accent border */}
                 <View style={[s.leftAccent, { backgroundColor: item.color }]} />
                 <View style={s.cardContent}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                     <Text style={[s.itemTitle, { color: c.text }]}>{item.title}</Text>
                   </View>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Text style={[s.itemDate, { color: c.textSecondary }]}>{item.date}</Text>
                     {item.badge && (
                       <View style={[s.badge, { backgroundColor: '#FEE2E2', marginLeft: 8 }]}>
                         <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>{item.badge}</Text>
                       </View>
                     )}
                   </View>
                   {item.amount && (
                     <Text style={[s.itemAmount, { color: item.color, marginTop: 8 }]}>{item.amount}</Text>
                   )}
                 </View>
              </View>
            </View>
          ))}
          {processedItems.length === 0 && (
            <Text style={{ textAlign: 'center', color: c.textSecondary, marginTop: 20 }}>Chưa có lịch sử giao dịch</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, color, valueColor, c }: any) {
  return (
    <View style={[s.summaryCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[s.summaryLeftAccent, { backgroundColor: color }]} />
      <Text style={[s.summaryLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[s.summaryValue, { color: valueColor || c.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  roomTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  tenantName: { fontSize: 16, fontWeight: '600' },

  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 15, fontWeight: '700' },

  summaryCard: { flex: 1, minWidth: '45%', padding: 18, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  summaryLeftAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  summaryLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  summaryValue: { fontSize: 16, fontWeight: '800' },

  timelineContainer: { marginTop: 8, paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineLeft: { width: 36, alignItems: 'center', marginRight: 16 },
  timelineDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { position: 'absolute', top: 36, bottom: -28, width: 2, zIndex: 1 },

  timelineCard: { flex: 1, borderRadius: 14, borderWidth: 1, overflow: 'hidden', minHeight: 80, justifyContent: 'center' },
  leftAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  cardContent: { padding: 16, paddingLeft: 20 },

  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemDate: { fontSize: 12, fontWeight: '500' },
  itemAmount: { fontSize: 18, fontWeight: '900' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
});
