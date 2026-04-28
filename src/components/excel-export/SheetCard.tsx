import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import {DateInput} from '../DateInput';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type ReportType = 'sales' | 'accommodation';

export interface ReportTemplate {
  value: string;
  label: string;
}

export const REPORT_TYPE_OPTIONS: {value: ReportType; label: string}[] = [
  {value: 'sales', label: 'dashboard.pos'},
  {value: 'accommodation', label: 'dashboard.hotel'},
];

export const REPORT_TEMPLATES: Record<ReportType, ReportTemplate[]> = {
  sales: [
    {value: 's1a_hkd', label: 'excel.s1aHkd'},
    {value: 's2a_hkd', label: 'excel.s2aHkd'},
  ],
  accommodation: [
    {value: 's1a_hkd', label: 'excel.s1aHkd'},
    {value: 's2a_hkd', label: 'excel.s2aHkd'},
  ],
};

// ─── Dropdown Component ────────────────────────────────────────────────────────
interface DropdownProps {
  label: string;
  value: string;
  options: {value: string; label: string}[];
  onSelect: (value: string) => void;
  placeholder?: string;
  isDark?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const effectivePlaceholder = placeholder || t('common.select', 'Chọn...');

  return (
    <View className="mb-4">
      <Text
        className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(v => !v)}
        className={`flex-row items-center border rounded-xl px-3 py-3 ${
          isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
        }`}>
        <Text
          className={`flex-1 text-sm ${
            selected
              ? isDark
                ? 'text-gray-200'
                : 'text-gray-800'
              : isDark
              ? 'text-gray-500'
              : 'text-gray-400'
          }`}>
          {selected ? selected.label : effectivePlaceholder}
        </Text>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={isDark ? '#9ca3af' : '#9CA3AF'}
        />
      </TouchableOpacity>

      {open && (
        <View
          className={`border rounded-xl mt-1 overflow-hidden shadow-sm z-10 ${
            isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          }`}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`px-4 py-3 flex-row items-center justify-between ${
                idx < options.length - 1
                  ? isDark
                    ? 'border-b border-gray-700'
                    : 'border-b border-gray-100'
                  : ''
              } ${
                value === opt.value
                  ? isDark
                    ? 'bg-blue-900/50'
                    : 'bg-blue-50'
                  : isDark
                  ? 'bg-gray-800'
                  : 'bg-white'
              }`}>
              <Text
                className={`text-sm ${
                  value === opt.value
                    ? 'text-blue-600 font-semibold'
                    : isDark
                    ? 'text-gray-300'
                    : 'text-gray-700'
                }`}>
                {opt.label}
              </Text>
              {value === opt.value && (
                <Icon name="check" size={16} color="#3B82F6" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ─── SheetCard Component ───────────────────────────────────────────────────────
export interface SheetConfig {
  id: string;
  reportType: ReportType | '';
  template: string;
  fromDate: Date;
  toDate: Date;
}

interface SheetCardProps {
  sheet: SheetConfig;
  onUpdate: (updated: SheetConfig) => void;
  onRemove: (id: string) => void;
  isDark?: boolean;
}

export const SheetCard: React.FC<SheetCardProps> = ({
  sheet,
  onUpdate,
  onRemove,
  isDark = false,
}) => {
  const {t} = useTranslation();

  const reportTypeOptions = REPORT_TYPE_OPTIONS.map(opt => ({
    ...opt,
    label: t(opt.label),
  }));

  const handleReportTypeChange = (val: string) => {
    onUpdate({...sheet, reportType: val as ReportType, template: ''});
  };

  const handleTemplateChange = (val: string) => {
    onUpdate({...sheet, template: val});
  };

  const templates = sheet.reportType
    ? REPORT_TEMPLATES[sheet.reportType as ReportType]
    : [];

  const translatedTemplates = templates.map(tmpl => ({
    ...tmpl,
    label: t(tmpl.label),
  }));

  return (
    <View
      className={`border rounded-2xl mb-4 overflow-visible ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
      {/* Header Row */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <View className="flex-1 ">
          <Dropdown
            label=""
            value={sheet.reportType}
            options={reportTypeOptions}
            onSelect={handleReportTypeChange}
            placeholder={t('excel.select')}
            isDark={isDark}
          />
        </View>
        <TouchableOpacity
          onPress={() => onRemove(sheet.id)}
          className={`w-10 h-10 mt-4 items-center justify-center rounded-lg ml-3 mb-3 ${
            isDark ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
          <Icon
            name="delete-outline"
            size={20}
            color={isDark ? '#9ca3af' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>

      <View className="px-4 pb-2">
        {/* Date Range */}
        <DateInput
          fromDate={sheet.fromDate}
          toDate={sheet.toDate}
          onFromDateChange={date => onUpdate({...sheet, fromDate: date})}
          onToDateChange={date => onUpdate({...sheet, toDate: date})}
          isDark={isDark}
        />

        {/* Template Dropdown */}
        <View className="mt-4">
          <Dropdown
            label={t('report.export.templateexport')}
            value={sheet.template}
            options={translatedTemplates}
            onSelect={handleTemplateChange}
            placeholder={
              sheet.reportType
                ? t('excel.select_template')
                : t('excel.select_before')
            }
            isDark={isDark}
          />
        </View>
      </View>
    </View>
  );
};
