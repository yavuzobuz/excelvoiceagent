import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';

interface ExcelUploaderProps {
  onDataLoaded: (data: Record<string, any[]>) => void;
}

export function ExcelUploader({ onDataLoaded }: ExcelUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setIsUploading(true);
    setIsProcessing(false);
    setProgress(0);
    setError(null);

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ['xlsx', 'xls', 'csv'].includes(extension || '');

    if (!validTypes.includes(file.type) && !isValidExtension) {
      setError('Lütfen geçerli bir Excel dosyası yükleyin (.xlsx, .xls veya .csv)');
      setIsUploading(false);
      return;
    }

    // Check file size (max 5MB to prevent browser crash)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError("Dosya boyutu çok büyük. Tarayıcının çökmesini önlemek için lütfen 5MB'dan küçük bir dosya yükleyin.");
      setIsUploading(false);
      return;
    }

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentLoaded = Math.round((event.loaded / event.total) * 100);
        setProgress(percentLoaded);
      }
    };

    reader.onload = (evt) => {
      setIsUploading(false);
      setIsProcessing(true);
      
      // Use setTimeout to allow UI to render the "Processing" state before synchronous heavy work
      setTimeout(() => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const data = new Uint8Array(arrayBuffer);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          
          if (!wb.SheetNames.length) {
            throw new Error('Excel dosyasında okunabilir bir sayfa bulunamadı. Lütfen dosyanın boş olmadığından emin olun.');
          }

          const allData: Record<string, any[]> = {};
          let totalRows = 0;
          
          wb.SheetNames.forEach(wsname => {
            const ws = wb.Sheets[wsname];
            if (!ws || !ws['!ref']) return;

            // Check row count BEFORE parsing to JSON to prevent memory crash
            const range = XLSX.utils.decode_range(ws['!ref']);
            const rowCount = range.e.r - range.s.r + 1;
            
            totalRows += rowCount;
            if (totalRows > 2500) {
              throw new Error('Analiz kalitesini yüksek tutmak ve tarayıcı çökmesini önlemek amacıyla sistem en fazla 2.500 satırlık dosyaları kabul etmektedir. Lütfen dosyanızı küçültüp tekrar deneyin.');
            }

            const rawData = XLSX.utils.sheet_to_json(ws, { raw: true, defval: '' });
            
            if (!rawData || rawData.length === 0) {
              return; // Skip empty sheets
            }
            
            const processedData = rawData.map((row: any) => {
              const newRow: any = {};
              for (const key in row) {
                let val = row[key];
                
                if (val instanceof Date) {
                  const day = String(val.getDate()).padStart(2, '0');
                  const month = String(val.getMonth() + 1).padStart(2, '0');
                  const year = val.getFullYear();
                  val = `${day}.${month}.${year}`;
                } else {
                  // Excel dates are typically between 30000 (1982) and 70000 (2091)
                  const isPotentialDateNumber = 
                    (typeof val === 'number' && val > 30000 && val < 70000) || 
                    (typeof val === 'string' && /^[3-6]\d{4}$/.test(val));
                    
                  if (isPotentialDateNumber) {
                    const numVal = typeof val === 'string' ? parseInt(val, 10) : val;
                    const upperKey = key.toUpperCase();
                    
                    // Genişletilmiş tarih anahtar kelimeleri
                    const dateKeywords = [
                      'TARİH', 'DATE', 'ZAMAN', 'TIME', 'VADE', 'TERMİN', 'DEADLINE', 
                      'DOĞUM', 'BAŞLANGIÇ', 'BİTİŞ', 'CREATED', 'UPDATED', 'DÖNEM', 
                      'GÜNCELLEME', 'KATILIM', 'AYRILIŞ', 'SON KULLANMA', 'SKT', '__EMPTY'
                    ];
                    
                    const isDateColumn = dateKeywords.some(keyword => upperKey.includes(keyword));
                    
                    if (isDateColumn) {
                      // Excel seri numarasını JS Date nesnesine dönüştür
                      const date = new Date(Math.round((numVal - 25569) * 86400 * 1000));
                      const day = String(date.getUTCDate()).padStart(2, '0');
                      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                      const year = date.getUTCFullYear();
                      val = `${day}.${month}.${year}`;
                    }
                  } else if (typeof val === 'string') {
                    // ISO veya standart string tarih formatlarını yakala
                    if (/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(val) || /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
                      const date = new Date(val);
                      if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        val = `${day}.${month}.${year}`;
                      }
                    } else if (/^\\d{2}\/\\d{2}\/\\d{4}$/.test(val)) {
                      // 12/31/2023 gibi formatları 12.31.2023 yap
                      val = val.replace(/\//g, '.');
                    }
                  }
                }
                newRow[key] = val;
              }
              return newRow;
            });
            
            allData[wsname] = processedData;
          });

          if (Object.keys(allData).length === 0) {
            throw new Error('Excel dosyası boş veya veriler tanınamadı. Lütfen ilk satırda sütun başlıkları olduğundan emin olun.');
          }

          onDataLoaded(allData);
        } catch (err: any) {
          console.error("Excel işleme hatası:", err);
          setError(err.message || 'Dosya işlenirken bir hata oluştu. Dosyanın şifreli olmadığından ve standart bir Excel formatında olduğundan emin olun.');
        } finally {
          setIsProcessing(false);
          // Reset file input so the same file can be selected again if needed
          e.target.value = '';
        }
      }, 50);
    };

    reader.onerror = () => {
      setError('Dosya okunurken tarayıcı kaynaklı bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.');
      setIsUploading(false);
      setIsProcessing(false);
      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  }, [onDataLoaded]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <label 
        htmlFor="dropzone-file" 
        className={`flex flex-col items-center justify-center w-full min-h-[14rem] sm:h-72 border-2 border-dashed rounded-[2rem] cursor-pointer bg-white/60 backdrop-blur-sm transition-all duration-300 group shadow-sm relative overflow-hidden
          ${error ? 'border-red-300 hover:bg-red-50/50' : 'border-emerald-200 hover:bg-emerald-50/80 hover:border-emerald-400'}
          ${(isUploading || isProcessing) ? 'pointer-events-none' : ''}
        `}
      >
        {/* Progress Bar Background */}
        {(isUploading || isProcessing) && (
          <div 
            className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${isProcessing ? 100 : progress}%` }}
          />
        )}

        <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10 px-4 text-center">
          {isProcessing ? (
            <>
              <div className="p-4 bg-emerald-100/50 rounded-full mb-4">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              </div>
              <p className="mb-2 text-lg font-semibold text-emerald-700">Veriler İşleniyor...</p>
              <p className="text-sm text-slate-500 font-medium">Lütfen bekleyin, büyük dosyalar biraz zaman alabilir.</p>
            </>
          ) : isUploading ? (
            <>
              <div className="p-4 bg-emerald-100/50 rounded-full mb-4">
                <UploadCloud className="w-10 h-10 text-emerald-600 animate-bounce" />
              </div>
              <p className="mb-2 text-lg font-semibold text-emerald-700">Dosya Yükleniyor... %{progress}</p>
              <p className="text-sm text-slate-500 font-medium">Okunuyor, lütfen bekleyin.</p>
            </>
          ) : error ? (
            <>
              <div className="p-4 bg-red-100/50 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <p className="mb-2 text-lg text-slate-700 font-medium">{error}</p>
              <p className="text-sm text-red-500 font-semibold mt-2">Tekrar denemek için tıklayın</p>
            </>
          ) : (
            <>
              <div className="p-4 bg-emerald-100/50 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-10 h-10 text-emerald-600" />
              </div>
              <p className="mb-2 text-lg text-slate-700"><span className="font-semibold text-emerald-700">Yüklemek için tıklayın</span> veya sürükleyip bırakın</p>
              <p className="text-sm text-slate-500 font-medium">XLSX, XLS, CSV (Maks. 2500 Satır)</p>
            </>
          )}
        </div>
        <input 
          id="dropzone-file" 
          type="file" 
          className="hidden" 
          accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv" 
          onChange={handleFileUpload} 
          disabled={isUploading || isProcessing}
        />
      </label>
    </div>
  );
}
