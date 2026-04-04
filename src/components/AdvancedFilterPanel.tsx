import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Play, Filter, Bookmark } from 'lucide-react';

export type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'startsWith' | 'endsWith';

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface FilterGroup {
  id: string;
  name: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

interface AdvancedFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  columns: string[];
  onApply: (filter: FilterGroup | null) => void;
  savedFilters: FilterGroup[];
  onSaveFilter: (filter: FilterGroup) => void;
  onDeleteFilter: (id: string) => void;
  currentFilter: FilterGroup | null;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Eşittir' },
  { value: 'notEquals', label: 'Eşit Değildir' },
  { value: 'contains', label: 'İçerir' },
  { value: 'notContains', label: 'İçermez' },
  { value: 'greaterThan', label: 'Büyüktür (>)' },
  { value: 'lessThan', label: 'Küçüktür (<)' },
  { value: 'startsWith', label: 'İle Başlar' },
  { value: 'endsWith', label: 'İle Biter' },
];

export function AdvancedFilterPanel({
  isOpen,
  onClose,
  columns,
  onApply,
  savedFilters,
  onSaveFilter,
  onDeleteFilter,
  currentFilter
}: AdvancedFilterPanelProps) {
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [filterName, setFilterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleAddCondition() {
    setConditions((prevConditions) => [
      ...prevConditions,
      {
        id: Math.random().toString(36).substring(7),
        column: columns[0] || '',
        operator: 'contains',
        value: ''
      }
    ]);
  }

  useEffect(() => {
    if (currentFilter) {
      setLogic(currentFilter.logic);
      setConditions(currentFilter.conditions);
      setFilterName(currentFilter.name);
    } else if (conditions.length === 0 && columns.length > 0) {
      handleAddCondition();
    }
  }, [currentFilter, columns, isOpen]);

  if (!isOpen) return null;

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const handleConditionChange = (id: string, field: keyof FilterCondition, value: string) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleApply = () => {
    if (conditions.length === 0) {
      onApply(null);
    } else {
      onApply({
        id: currentFilter?.id || Math.random().toString(36).substring(7),
        name: filterName || 'Geçici Filtre',
        logic,
        conditions
      });
    }
    onClose();
  };

  const handleClear = () => {
    setConditions([]);
    setFilterName('');
    onApply(null);
  };

  const handleSave = () => {
    if (!filterName.trim()) {
      alert('Lütfen filtreye bir isim verin.');
      return;
    }
    if (conditions.length === 0) {
      alert('Lütfen en az bir koşul ekleyin.');
      return;
    }
    
    const newFilter: FilterGroup = {
      id: Math.random().toString(36).substring(7),
      name: filterName,
      logic,
      conditions
    };
    
    onSaveFilter(newFilter);
    setIsSaving(false);
  };

  const handleLoadFilter = (filter: FilterGroup) => {
    setLogic(filter.logic);
    setConditions(filter.conditions);
    setFilterName(filter.name);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-600" />
            Gelişmiş Filtreleme
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Saved Filters Sidebar */}
          <div className="w-full md:w-64 border-r border-slate-100 bg-slate-50/50 p-4 overflow-y-auto">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5" />
              Kayıtlı Filtreler
            </h4>
            
            {savedFilters.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Henüz kayıtlı filtre yok.</p>
            ) : (
              <div className="space-y-2">
                {savedFilters.map(filter => (
                  <div key={filter.id} className="flex items-center justify-between group p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
                    <button 
                      onClick={() => handleLoadFilter(filter)}
                      className="text-sm text-slate-700 font-medium truncate flex-1 text-left"
                    >
                      {filter.name}
                    </button>
                    <button 
                      onClick={() => onDeleteFilter(filter.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter Builder */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-slate-700">Koşul Mantığı:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setLogic('AND')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${logic === 'AND' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  VE (Tümü eşleşmeli)
                </button>
                <button
                  onClick={() => setLogic('OR')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${logic === 'OR' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  VEYA (Herhangi biri eşleşmeli)
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {conditions.map((condition, index) => (
                <div key={condition.id} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-medium text-slate-400 w-6 text-center hidden sm:block">
                    {index > 0 ? (logic === 'AND' ? 'VE' : 'VEYA') : ''}
                  </span>
                  
                  <select
                    value={condition.column}
                    onChange={(e) => handleConditionChange(condition.id, 'column', e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>

                  <select
                    value={condition.operator}
                    onChange={(e) => handleConditionChange(condition.id, 'operator', e.target.value)}
                    className="w-full sm:w-1/4 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => handleConditionChange(condition.id, 'value', e.target.value)}
                    placeholder="Değer..."
                    className="w-full sm:flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />

                  <button
                    onClick={() => handleRemoveCondition(condition.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full sm:w-auto flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddCondition}
              className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Koşul Ekle
            </button>

            {isSaving && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filtre Adı (Örn: Yüksek Maaşlılar)"
                  className="flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Kaydet
                </button>
                <button
                  onClick={() => setIsSaving(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-sm font-medium rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Temizle
            </button>
            {!isSaving && conditions.length > 0 && (
              <button
                onClick={() => setIsSaving(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Filtreyi Kaydet
              </button>
            )}
          </div>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Play className="w-4 h-4" />
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
