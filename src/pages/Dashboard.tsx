import React, { useState, useMemo, useEffect } from 'react';
import { ExcelUploader } from '../components/ExcelUploader';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { Table, Sparkles, User, FileSpreadsheet, FunctionSquare, Terminal, LogIn, Settings2, X, Filter, Download, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../firebase';
import { AdvancedFilterPanel, FilterGroup } from '../components/AdvancedFilterPanel';
import { downloadAddinFiles, isRunningInExcel } from '../lib/excelAddin';

ModuleRegistry.registerModules([AllCommunityModule]);

type ColumnConfig = {
  visible: boolean;
  newName: string;
};

export function Dashboard() {
  const { user, isAuthReady } = useAuth();
  const [excelData, setExcelData] = useState<Record<string, any[]> | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetConfigs, setSheetConfigs] = useState<Record<string, Record<string, ColumnConfig>>>({});
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<FilterGroup[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterGroup | null>(null);
  const [isExcelAddin, setIsExcelAddin] = useState(false);

  useEffect(() => {
    // Check if running in Excel
    const checkExcel = () => {
      if (window.location.search.includes('addin=true')) {
        // Poll for Office to be loaded since it's injected dynamically
        const interval = setInterval(() => {
          if (typeof Office !== 'undefined' && typeof Office.onReady === 'function') {
            clearInterval(interval);
            Office.onReady((info) => {
              if (info && info.host === Office.HostType.Excel) {
                setIsExcelAddin(true);
                loadDataFromExcel();
              }
            });
          }
        }, 100);
        
        // Stop polling after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);
      }
    };
    checkExcel();
  }, []);

  const loadDataFromExcel = async () => {
    if (typeof Excel === 'undefined') return;

    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getUsedRange();
        range.load("values");
        await context.sync();

        const values = range.values;
        if (values.length > 0) {
          const headers = values[0];
          const data = values.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

          const sheetName = sheet.name || 'Sayfa1';
          handleDataLoaded({ [sheetName]: data });
        }
      });
    } catch (error) {
      console.error("Excel veri yukleme hatasi:", error);
    }
  };

  const handleDataLoaded = (data: Record<string, any[]>) => {
    setExcelData(data);
    setActiveSheet(Object.keys(data)[0]);
    
    const newConfigs: Record<string, Record<string, ColumnConfig>> = {};
    Object.keys(data).forEach(sheet => {
      newConfigs[sheet] = {};
      if (data[sheet].length > 0) {
        Object.keys(data[sheet][0]).forEach(col => {
          newConfigs[sheet][col] = { visible: true, newName: col };
        });
      }
    });
    setSheetConfigs(newConfigs);
  };

  const configuredExcelData = useMemo(() => {
    if (!excelData) return null;
    const newData: Record<string, any[]> = {};
    Object.keys(excelData).forEach(sheet => {
      const config = sheetConfigs[sheet];
      if (!config) {
        newData[sheet] = excelData[sheet];
        return;
      }
      newData[sheet] = excelData[sheet].map(row => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          if (config[key]?.visible) {
            newRow[config[key].newName || key] = row[key];
          } else if (!config[key]) {
             newRow[key] = row[key];
          }
        });
        return newRow;
      });
    });
    return newData;
  }, [excelData, sheetConfigs]);

  const currentSheetData = configuredExcelData && activeSheet ? configuredExcelData[activeSheet] : [];

  const filteredSheetData = useMemo(() => {
    if (!currentSheetData || currentSheetData.length === 0) return [];
    if (!currentFilter || currentFilter.conditions.length === 0) return currentSheetData;

    return currentSheetData.filter(row => {
      const matchResults = currentFilter.conditions.map(condition => {
        const cellValue = String(row[condition.column] || '').toLowerCase();
        const filterValue = String(condition.value || '').toLowerCase();

        switch (condition.operator) {
          case 'equals': return cellValue === filterValue;
          case 'notEquals': return cellValue !== filterValue;
          case 'contains': return cellValue.includes(filterValue);
          case 'notContains': return !cellValue.includes(filterValue);
          case 'startsWith': return cellValue.startsWith(filterValue);
          case 'endsWith': return cellValue.endsWith(filterValue);
          case 'greaterThan': 
            const numCellGt = parseFloat(cellValue);
            const numFilterGt = parseFloat(filterValue);
            if (!isNaN(numCellGt) && !isNaN(numFilterGt)) return numCellGt > numFilterGt;
            return cellValue > filterValue;
          case 'lessThan':
            const numCellLt = parseFloat(cellValue);
            const numFilterLt = parseFloat(filterValue);
            if (!isNaN(numCellLt) && !isNaN(numFilterLt)) return numCellLt < numFilterLt;
            return cellValue < filterValue;
          default: return true;
        }
      });

      if (currentFilter.logic === 'AND') {
        return matchResults.every(Boolean);
      } else {
        return matchResults.some(Boolean);
      }
    });
  }, [currentSheetData, currentFilter]);

  const columnDefs = useMemo(() => {
    if (!currentSheetData || currentSheetData.length === 0) return [];
    
    const keys = Object.keys(currentSheetData[0] || {});
    
    return [
      {
        headerName: '',
        valueGetter: 'node.rowIndex + 1',
        width: 60,
        pinned: 'left',
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
        cellStyle: { backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'center', borderRight: '1px solid #e2e8f0' }
      },
      ...keys.map(key => ({
        field: key,
        headerName: key,
        sortable: true,
        filter: true,
        resizable: true,
        editable: true,
        minWidth: 120,
      }))
    ];
  }, [currentSheetData]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
  }), []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f9f5] text-slate-800 font-sans selection:bg-emerald-200">
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/macro-builder" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
              <Terminal className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-sm font-medium">Makro Oluşturucu</span>
            </Link>
            <Link to="/formulas" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
              <FunctionSquare className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-sm font-medium">Formül Kütüphanesi</span>
            </Link>
            <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>
            {isAuthReady ? (
              user ? (
                <Link to="/profile" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profil" className="w-6 h-6 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium">Profil</span>
                </Link>
              ) : (
                <Link to="/profile" className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-sm font-medium shadow-sm sm:ml-1">
                  <LogIn className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Giriş Yap</span>
                </Link>
              )
            ) : (
              <div className="flex items-center justify-center p-2 sm:px-4 sm:py-2 w-10 sm:w-[100px]">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full">
        {!excelData ? (
          <div className="max-w-3xl mx-auto mt-4 lg:mt-12">
            <div className="text-center mb-8 lg:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 text-emerald-700 text-xs sm:text-sm font-medium mb-6 border border-emerald-200/50">
                <Sparkles className="w-4 h-4" />
                <span>Yapay Zeka Destekli</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 px-4">
                Verilerinizle <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">Konuşun</span>
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl mx-auto px-4">
                Excel dosyanızı yükleyin ve verileriniz hakkında doğal dilde sesli sorular sorun. "Sırasıyla oku", "3. satırdaki isim ne?" gibi komutlarla tablolarınızı yönetin.
              </p>
            </div>
            <ExcelUploader onDataLoaded={handleDataLoaded} />
            
            <div className="mt-12 p-6 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-3xl shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <Monitor className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Excel Eklentisi Olarak Kullan</h3>
                  <p className="text-sm text-slate-500">Bu sistemi doğrudan Excel'in içinde bir panel olarak çalıştırın.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">1. Dosyaları İndirin</h4>
                  <p className="text-xs text-slate-500 mb-4">Manifest ve yükleyici (.bat) dosyalarını bilgisayarınıza kaydedin.</p>
                  <button 
                    onClick={downloadAddinFiles}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Eklenti Dosyalarını İndir
                  </button>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">2. Kurulumu Yapın</h4>
                  <p className="text-xs text-slate-500 mb-4">İndirdiğiniz 'install-addin.bat' dosyasını çalıştırın ve Excel'i açın.</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <Sparkles className="w-4 h-4" />
                    Doğrudan Excel'e müdahale edin!
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-4 order-2 lg:order-1">
              <div className="lg:sticky lg:top-28">
                <VoiceAssistant 
                  excelData={configuredExcelData || {}} 
                  isExcelAddin={isExcelAddin}
                  onUpdateExcelData={(newData) => {
                    setExcelData(newData);
                    
                    // If in Excel, we might want to write back to the sheet
                    if (isExcelAddin) {
                      // Logic for writing back to Excel can be added here or inside VoiceAssistant
                    }

                    // Update configs for new columns
                    setSheetConfigs(prev => {
                      const newConfigs = { ...prev };
                      Object.keys(newData).forEach(sheet => {
                        if (!newConfigs[sheet]) newConfigs[sheet] = {};
                        if (newData[sheet].length > 0) {
                          Object.keys(newData[sheet][0]).forEach(col => {
                            if (!newConfigs[sheet][col]) {
                              newConfigs[sheet][col] = { visible: true, newName: col };
                            }
                          });
                        }
                      });
                      return newConfigs;
                    });
                    
                    // Check if a new sheet was added
                    const oldSheets = Object.keys(excelData || {});
                    const newSheets = Object.keys(newData);
                    const addedSheet = newSheets.find(s => !oldSheets.includes(s));
                    
                    if (addedSheet) {
                      setActiveSheet(addedSheet);
                    } else if (!newData[activeSheet]) {
                      // If the active sheet was deleted, switch to the first available sheet
                      setActiveSheet(newSheets[0]);
                    }
                  }}
                />
                
                {!isExcelAddin && (
                  <button 
                    onClick={() => setExcelData(null)}
                    className="mt-6 w-full py-4 px-4 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-2xl text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all duration-300 shadow-sm"
                  >
                    Yeni Dosya Yükle
                  </button>
                )}
              </div>
            </div>
            
            <div className="lg:col-span-8 order-1 lg:order-2">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-emerald-100/50 overflow-hidden flex flex-col h-[500px] lg:h-[750px]">
                <div className="px-4 sm:px-6 py-4 border-b border-emerald-50 flex flex-col gap-4 bg-white/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-xl">
                        <Table className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-800">Veri Önizleme</h3>
                      <span className="text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-full border border-emerald-200/50">
                        {filteredSheetData.length} Satır
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsFilterPanelOpen(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          currentFilter 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Filter className="w-4 h-4" />
                        {currentFilter ? 'Filtre Aktif' : 'Gelişmiş Filtre'}
                      </button>
                      <button
                        onClick={() => setIsConfigOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Settings2 className="w-4 h-4" />
                        Sütun Ayarları
                      </button>
                      <button
                        onClick={() => {
                          import('xlsx').then(XLSX => {
                            const wb = XLSX.utils.book_new();
                            Object.entries(configuredExcelData || {}).forEach(([sheetName, sheetData]) => {
                              const ws = XLSX.utils.json_to_sheet(sheetData as any[]);
                              XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
                            });
                            XLSX.writeFile(wb, 'Duzenlenmis_Veri.xlsx');
                          });
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel Olarak İndir
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 w-full h-full">
                  <AgGridReact
                    theme={themeQuartz.withParams({
                      accentColor: '#10b981',
                      selectedRowBackgroundColor: '#ecfdf5'
                    })}
                    rowData={filteredSheetData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowSelection={{ mode: 'multiRow', enableClickSelection: false }}
                    animateRows={true}
                    enableCellTextSelection={true}
                    pagination={true}
                    paginationPageSize={100}
                    paginationPageSizeSelector={[50, 100, 200, 500]}
                  />
                </div>

                {/* Excel-like Sheet Tabs at the bottom */}
                <div className="bg-[#f3f4f6] border-t border-slate-300 flex items-end px-2 pt-2 overflow-x-auto custom-scrollbar">
                  {Object.keys(excelData).map(sheetName => (
                    <button
                      key={sheetName}
                      onClick={() => setActiveSheet(sheetName)}
                      className={`flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap border border-b-0 rounded-t-md transition-colors ${
                        activeSheet === sheetName 
                          ? 'bg-white text-emerald-700 border-slate-300 z-10 relative -mb-[1px] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]' 
                          : 'bg-[#e5e7eb] text-slate-600 border-transparent hover:bg-[#d1d5db]'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      {sheetName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-emerald-600" />
                Sütun Ayarları ({activeSheet})
              </h3>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-3">
                {Object.keys(sheetConfigs[activeSheet] || {}).map(colKey => (
                  <div key={colKey} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <input 
                      type="checkbox" 
                      checked={sheetConfigs[activeSheet][colKey].visible}
                      onChange={(e) => {
                        setSheetConfigs(prev => ({
                          ...prev,
                          [activeSheet]: {
                            ...prev[activeSheet],
                            [colKey]: { ...prev[activeSheet][colKey], visible: e.target.checked }
                          }
                        }));
                      }}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Orijinal: {colKey}</p>
                      <input 
                        type="text"
                        value={sheetConfigs[activeSheet][colKey].newName}
                        onChange={(e) => {
                          setSheetConfigs(prev => ({
                            ...prev,
                            [activeSheet]: {
                              ...prev[activeSheet],
                              [colKey]: { ...prev[activeSheet][colKey], newName: e.target.value }
                            }
                          }));
                        }}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="Yeni sütun adı"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      <AdvancedFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        columns={Object.keys(currentSheetData[0] || {}).map(key => sheetConfigs[activeSheet]?.[key]?.newName || key)}
        onApply={(filter) => setCurrentFilter(filter)}
        savedFilters={savedFilters}
        onSaveFilter={(filter) => setSavedFilters(prev => [...prev.filter(f => f.id !== filter.id), filter])}
        onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
        currentFilter={currentFilter}
      />

      <Footer />
    </div>
  );
}
