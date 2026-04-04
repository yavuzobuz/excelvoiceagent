import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { VoiceAssistant } from '../components/VoiceAssistant';

type LoadState = 'booting' | 'waiting-office' | 'loading-sheet' | 'ready' | 'error';

export function ExcelAddinPage() {
  const [loadState, setLoadState] = useState<LoadState>('booting');
  const [statusText, setStatusText] = useState('Excel eklentisi baslatiliyor...');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<Record<string, any[]> | null>(null);

  const mapRangeToRows = (values: any[][] = [], texts: string[][] = []) => {
    const rawValues = values.map((row, rowIndex) =>
      row.map((cell, columnIndex) => {
        const textValue = texts?.[rowIndex]?.[columnIndex];
        if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
          return cell;
        }
        return textValue ?? '';
      })
    );

    const nonEmptyRows = rawValues.filter((row) =>
      row.some((cell) => String(cell ?? '').trim() !== '')
    );

    if (nonEmptyRows.length === 0) {
      return [];
    }

    const maxColumnCount = nonEmptyRows.reduce((max, row) => {
      const lastFilledIndex = row.reduce((lastIndex, cell, index) => {
        return String(cell ?? '').trim() !== '' ? index : lastIndex;
      }, -1);
      return Math.max(max, lastFilledIndex + 1);
    }, 0);

    if (maxColumnCount === 0) {
      return [];
    }

    const normalizedValues = nonEmptyRows.map((row) =>
      Array.from({ length: maxColumnCount }, (_, index) => row[index] ?? '')
    );

    const firstRow = normalizedValues[0] || [];
    const hasHeaderRow = firstRow.some((cell) => String(cell ?? '').trim() !== '');
    const headers = firstRow.map((cell, index) => {
      const raw = String(cell ?? '').trim();
      return raw || `Kolon ${index + 1}`;
    });

    const dataRowsSource =
      normalizedValues.length > 1
        ? normalizedValues.slice(1)
        : [normalizedValues[0].map((cell) => cell ?? '')];

    const finalHeaders =
      normalizedValues.length > 1 && hasHeaderRow
        ? headers
        : headers.map((_, index) => `Kolon ${index + 1}`);

    return dataRowsSource.map((row) => {
      const item: Record<string, any> = {};
      finalHeaders.forEach((header, index) => {
        item[header] = row[index] ?? '';
      });
      return item;
    });
  };

  const loadDataFromExcel = async () => {
    if (typeof Excel === 'undefined') {
      setLoadState('error');
      setErrorText('Excel JavaScript API bulunamadi. Excel icinden actiginizdan emin olun.');
      return;
    }

    setLoadState('loading-sheet');
    setStatusText('Calisma kitabindaki sayfalar okunuyor...');
    setErrorText(null);

    try {
      await Excel.run(async (context) => {
        const worksheets = context.workbook.worksheets;
        worksheets.load('items/name');
        await context.sync();

        const sheetRanges = worksheets.items.map((sheet) => {
          const range = sheet.getUsedRangeOrNullObject(true);
          range.load(['isNullObject', 'values', 'text']);
          return { sheet, range };
        });

        await context.sync();

        const workbookData: Record<string, any[]> = {};

        sheetRanges.forEach(({ sheet, range }) => {
          if (range.isNullObject) {
            return;
          }

          const rows = mapRangeToRows((range.values as any[][]) || [], (range.text as string[][]) || []);
          if (rows.length > 0) {
            workbookData[sheet.name || `Sayfa${Object.keys(workbookData).length + 1}`] = rows;
          }
        });

        if (Object.keys(workbookData).length === 0) {
          throw new Error('Calisma kitabinda okunabilir veri bulunamadi.');
        }

        setExcelData(workbookData);
      });

      setLoadState('ready');
      setStatusText('Calisma kitabi verisi basariyla yuklendi.');
    } catch (error) {
      console.error('Excel veri yukleme hatasi:', error);
      setLoadState('error');
      setErrorText(error instanceof Error ? error.message : 'Excel verisi okunurken bilinmeyen bir hata olustu.');
    }
  };

  useEffect(() => {
    let pollTimer: number | undefined;
    let timeoutTimer: number | undefined;
    let cancelled = false;

    const waitForOffice = () => {
      setLoadState('waiting-office');
      setStatusText('Office ortami bekleniyor...');

      pollTimer = window.setInterval(() => {
        if (typeof Office !== 'undefined' && typeof Office.onReady === 'function') {
          window.clearInterval(pollTimer);
          if (timeoutTimer) {
            window.clearTimeout(timeoutTimer);
          }

          Office.onReady((info) => {
            if (cancelled) return;
            if (info?.host === Office.HostType.Excel) {
              loadDataFromExcel();
            } else {
              setLoadState('error');
              setErrorText('Bu sayfa Excel icinde acilmadi.');
            }
          });
        }
      }, 150);

      timeoutTimer = window.setTimeout(() => {
        if (pollTimer) {
          window.clearInterval(pollTimer);
        }
        setLoadState('error');
        setErrorText('Office.onReady zaman asimina ugradi. Excel ve WebView2 guncel olmayabilir.');
      }, 12000);
    };

    waitForOffice();

    return () => {
      cancelled = true;
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
      if (timeoutTimer) {
        window.clearTimeout(timeoutTimer);
      }
    };
  }, []);

  const currentSheetName = useMemo(() => Object.keys(excelData || {})[0] || '', [excelData]);
  const previewRows = useMemo(() => {
    if (!excelData || !currentSheetName) return [];
    return excelData[currentSheetName].slice(0, 8);
  }, [excelData, currentSheetName]);

  const summaryText = useMemo(() => {
    if (!excelData || !currentSheetName) return '';
    const sheetCount = Object.keys(excelData).length;
    const rowCount = excelData[currentSheetName].length;
    const colCount = Object.keys(excelData[currentSheetName][0] || {}).length;
    return `${sheetCount} sayfa yuklendi. Ilk sayfa olan ${currentSheetName} icin ${rowCount} satir ve ${colCount} sutun hazir.`;
  }, [excelData, currentSheetName]);

  return (
    <div className="min-h-screen bg-[#f4f9f5] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-4">
        <div className="rounded-[1.75rem] border border-emerald-100/70 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">AI Excel Assistant</h1>
                <p className="text-sm text-slate-500">Excel taskpane tanilama ve veri yukleme modu</p>
              </div>
            </div>

            <button
              onClick={loadDataFromExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <RefreshCw className="h-4 w-4" />
              Veriyi Yeniden Oku
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-emerald-100/70 bg-white/90 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            {loadState === 'error' ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            ) : loadState === 'ready' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-emerald-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{statusText}</p>
              {errorText && <p className="mt-2 text-sm text-red-600">{errorText}</p>}
              {!errorText && summaryText && <p className="mt-2 text-sm text-slate-600">{summaryText}</p>}
            </div>
          </div>
        </div>

        {previewRows.length > 0 && (
          <div className="rounded-[1.75rem] border border-emerald-100/70 bg-white/90 p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">Veri Onizleme</h2>
            <div className="overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {Object.keys(previewRows[0]).map((key) => (
                      <th key={key} className="border-b border-slate-200 px-3 py-2 font-semibold">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/60">
                      {Object.entries(row).map(([key, value]) => (
                        <td key={`${rowIndex}-${key}`} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {excelData && (
          <VoiceAssistant
            excelData={excelData}
            isExcelAddin={true}
            onUpdateExcelData={(newData) => {
              setExcelData(newData);
            }}
          />
        )}
      </div>
    </div>
  );
}
