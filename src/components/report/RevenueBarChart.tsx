import React from 'react';
import {View, Text, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';

export interface ChartDataItem {
  label: string;
  sales: number;
  lodging: number;
  gym: number;
}

interface RevenueBarChartProps {
  data: ChartDataItem[];
  displayMode: 'day' | 'week' | 'month';
  isDark?: boolean;
}

const LEGEND = [
  {key: 'sales' as const, labelKey: 'report.chart.sales', color: 'bg-blue-600'},
  {
    key: 'lodging' as const,
    labelKey: 'report.chart.lodging',
    color: 'bg-blue-300',
  },
  {key: 'gym' as const, labelKey: 'report.chart.gym', color: 'bg-blue-100'},
];

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({
  data,
  displayMode,
  isDark = false,
}) => {
  const {t} = useTranslation();

  const maxVal = Math.max(...data.flatMap(d => [d.sales, d.lodging, d.gym]));
  const roundedMax = Math.ceil(maxVal / 50) * 50; // Round up to nearest 50

  const barHeight = 160;
  const yAxisWidth = 45;

  // Y-axis labels (5 divisions)
  const yAxisSteps = 5;
  const yAxisLabels = Array.from({length: yAxisSteps + 1}, (_, i) => {
    const val = (roundedMax / yAxisSteps) * i;
    return val > 0 ? `${val.toFixed(0)}` : '0';
  }).reverse();

  return (
    <View>
      {/* Title + Legend */}
      <Text
        className={`text-sm font-semibold mb-3 ${
          isDark ? 'text-white' : 'text-gray-800'
        }`}>
        {t('report.chart.title')}
      </Text>
      <View className="flex-row items-center gap-4 mb-4">
        {LEGEND.map(l => (
          <View key={l.key} className="flex-row items-center gap-1.5">
            <View className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <Text
              className={`text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
              {t(l.labelKey)}
            </Text>
          </View>
        ))}
      </View>

      {/* Chart Container with Y-axis */}
      <View className="flex-row">
        {/* Y-axis */}
        <View style={{width: yAxisWidth}}>
          {yAxisLabels.map((label, index) => (
            <View
              key={index}
              style={{height: barHeight / yAxisSteps}}
              className="items-end pr-1 pb-1">
              <Text
                className={`text-xs text-right ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Bars */}
        <View className="flex-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View
              className="flex-row items-end gap-3 pb-1"
              style={{minWidth: '100%'}}>
              {data.map(item => (
                <View key={item.label} className="items-center gap-1">
                  {/* Bar Group */}
                  <View
                    className="flex-row items-end gap-0.5"
                    style={{height: barHeight}}>
                    {LEGEND.map(l => {
                      const value = item[l.key];
                      const h = Math.max(4, (value / roundedMax) * barHeight);
                      return (
                        <View
                          key={l.key}
                          className={`w-4 rounded-t-sm ${l.color}`}
                          style={{height: h}}
                        />
                      );
                    })}
                  </View>
                  {/* Label */}
                  <Text
                    className={`text-xs mt-1 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Display Mode Info */}
      <View className="mt-3 flex-row justify-center">
        <Text
          className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
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
