import React from 'react';
import {View, Text, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ApplyToGroup, RevenueChartPoint} from '../../screens/report/type';

export type ChartDataItem = RevenueChartPoint;

interface RevenueBarChartProps {
  data: ChartDataItem[];
  applyToGroups: ApplyToGroup[];
  displayMode: 'day' | 'week' | 'month';
  isDark?: boolean;
}

function formatShort(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return (Number.isInteger(m) ? m : m.toFixed(1)) + 'tr';
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return (Number.isInteger(k) ? k : k.toFixed(0)) + 'k';
  }
  return value.toString();
}

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({
  data,
  applyToGroups,
  displayMode,
  isDark = false,
}) => {
  const {t} = useTranslation();

  if (data.length === 0 || applyToGroups.length === 0) {
    return (
      <View>
        <Text
          className={`text-sm font-semibold mb-3 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
          {t('report.chart.title')}
        </Text>
        <View className="items-center justify-center py-10">
          <Text
            className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {t('report.noData')}
          </Text>
        </View>
      </View>
    );
  }

  // ===== DATA =====
  const allValues = data.flatMap(d =>
    applyToGroups.map(g => (d[g.key] as number) ?? 0),
  );

  const maxVal = Math.max(1, ...allValues);

  function getNiceMax(value: number) {
    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);

    let niceFraction;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * Math.pow(10, exponent);
  }

  const roundedMax = getNiceMax(maxVal);

  // ===== LAYOUT =====
  const BAR_HEIGHT = 160;
  const LABEL_SPACE = 20;
  const CHART_H = BAR_HEIGHT + LABEL_SPACE;
  const Y_WIDTH = 50;
  const Y_STEPS = 5;

  const yLabels = Array.from({length: Y_STEPS + 1}, (_, i) => {
    const val = (roundedMax / Y_STEPS) * (Y_STEPS - i);
    return formatShort(val);
  });

  return (
    <View>
      {/* Title */}
      <Text
        className={`text-sm font-semibold mb-3 ${
          isDark ? 'text-white' : 'text-gray-800'
        }`}>
        {t('report.chart.title')}
      </Text>

      {/* Legend */}
      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mb-4">
        {applyToGroups.map(g => (
          <View key={g.key} className="flex-row items-center gap-1.5">
            <View
              style={{backgroundColor: g.color}}
              className="w-2.5 h-2.5 rounded-full"
            />
            <Text
              className={`text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
              {g.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ===== CHART ===== */}
      <View className="flex-row">
        {/* Y-axis */}
        <View style={{width: Y_WIDTH, height: BAR_HEIGHT}}>
          {yLabels.map((label, idx) => (
            <View
              key={idx}
              style={{
                position: 'absolute',
                top: (idx / Y_STEPS) * BAR_HEIGHT - 8,
                right: 8,
              }}>
              <Text
                className={`text-xs ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Bars */}
        <View className="flex-1">
          {/* Grid */}
          <View
            style={{
              position: 'absolute',
              height: BAR_HEIGHT,
              left: 0,
              right: 0,
            }}>
            {yLabels.map((_, idx) => (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  top: (idx / Y_STEPS) * BAR_HEIGHT,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                }}
              />
            ))}
          </View>

          {/* BAR SCROLL */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
              className="flex-row items-end"
              style={{minWidth: '100%', gap: 12, height: BAR_HEIGHT}}>
              {data.map(item => {
                const total = applyToGroups.reduce(
                  (acc, g) => acc + ((item[g.key] as number) ?? 0),
                  0,
                );

                return (
                  <View key={String(item.label)} className="items-center">
                    {/* BARS */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-end',
                        height: BAR_HEIGHT,
                        gap: 2,
                      }}>
                      {applyToGroups.map(g => {
                        const value = (item[g.key] as number) ?? 0;

                        const barH =
                          value > 0
                            ? Math.max(6, (value / roundedMax) * BAR_HEIGHT)
                            : 0;

                        if (barH === 0)
                          return <View key={g.key} style={{width: 14}} />;

                        return (
                          <View key={g.key} style={{alignItems: 'center'}}>
                            <View
                              style={{
                                width: 14,
                                height: barH,
                                backgroundColor: g.color,
                                borderRadius: 3,
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* ===== X-AXIS  ===== */}
      <View style={{marginTop: 6}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingLeft: Y_WIDTH,
            }}>
            {data.map(item => (
              <View key={item.label} style={{width: 40, alignItems: 'center'}}>
                <Text
                  className={`text-xs ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                  {String(item.label)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Mode */}
      <View className="mt-2 flex-row justify-center">
        <Text
          className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
          {displayMode === 'day'
            ? t('report.displayMode.day')
            : displayMode === 'week'
            ? t('report.displayMode.week')
            : t('report.displayMode.month')}
        </Text>
      </View>
    </View>
  );
};
