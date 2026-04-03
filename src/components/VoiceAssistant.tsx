import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../lib/audioUtils';
import { Mic, MicOff, Loader2, MessageSquare, Copy, CheckCircle2, Download, Send, Search } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface VoiceAssistantProps {
  excelData: Record<string, any[]>;
  isExcelAddin?: boolean;
  onUpdateExcelData?: (newData: Record<string, any[]>) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  isFinished: boolean;
}

interface FormulaConfig {
  formula: string;
  explanation: string;
  type: 'formula' | 'macro';
  didYouMean?: string;
}

const generateExcelFormulaDeclaration: FunctionDeclaration = {
  name: "generateExcelFormula",
  description: "Kullanıcı Excel formülü (DÜŞEYARA, ÇAPRAZARA, EĞER, İNDİS, KAÇINCI vb. 50+ formül) veya Makro/VBA/Office Script kodu istediğinde bu fonksiyonu çağır. Ayrıca kullanıcı hatalı veya belirsiz bir komut verirse 'didYouMean' (Bunu mu demek istediniz?) alanını doldurarak onu yönlendir.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      formula: {
        type: Type.STRING,
        description: "Oluşturulan Excel formülü (örneğin: =XLOOKUP(...)) veya VBA/Makro kodu.",
      },
      explanation: {
        type: Type.STRING,
        description: "Formülün veya makronun ne işe yaradığının ve nasıl kullanılacağının kısa, anlaşılır açıklaması",
      },
      type: {
        type: Type.STRING,
        description: "Üretilen kodun türü: 'formula' veya 'macro'",
      },
      didYouMean: {
        type: Type.STRING,
        description: "Eğer kullanıcının isteği tam anlaşılamadıysa veya hatalı bir formül adı söylediyse, ona önerilen doğru soru veya formül (Örn: 'Düşeyara yerine Çaprazara kullanmak ister misiniz?')",
      }
    },
    required: ["formula", "explanation", "type"]
  }
};

const searchExcelDataDeclaration: FunctionDeclaration = {
  name: "searchExcelData",
  description: "Tüm Excel sayfaları içinde arama yapmak veya belirli bir satırı getirmek için kullanılır. Sana verilen ilk 100 satırda olmayan verileri bulmak için KESİNLİKLE bu aracı kullan.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      searchTerm: {
        type: Type.STRING,
        description: "Aranacak kelime, isim, ID veya numara (ör: 'Ahmet', '21863649')",
      },
      sheetName: {
        type: Type.STRING,
        description: "Arama yapılacak sayfa adı (boş bırakılırsa tüm sayfalarda aranır)",
      },
      rowNumber: {
        type: Type.INTEGER,
        description: "Belirli bir satırı getirmek için satır numarası (1'den başlar).",
      }
    }
  }
};

const renderChartDeclaration: FunctionDeclaration = {
  name: "renderChart",
  description: "Kullanıcı verilerle ilgili bir grafik istediğinde veya 'fiyatları %10 artırırsak ne olur' gibi bir senaryo (what-if) simülasyonu istediğinde bu fonksiyonu çağır.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sheetName: {
        type: Type.STRING,
        description: "Verinin alınacağı Excel sayfasının adı",
      },
      chartType: {
        type: Type.STRING,
        description: "Grafik türü: 'bar' (çubuk), 'line' (çizgi) veya 'pie' (pasta)",
      },
      title: {
        type: Type.STRING,
        description: "Grafiğin başlığı",
      },
      xAxisColumn: {
        type: Type.STRING,
        description: "X ekseninde gruplanacak sütunun tam adı",
      },
      yAxisColumn: {
        type: Type.STRING,
        description: "Y ekseninde toplanacak/ortalaması alınacak sayısal sütunun tam adı",
      },
      aggregation: {
        type: Type.STRING,
        description: "Verilerin nasıl birleştirileceği: 'sum' (toplam), 'average' (ortalama), 'count' (sayı)",
      },
      filterableColumns: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Kullanıcının grafiği filtreleyebilmesi için uygun olan 1 veya 2 kategorik sütun adı (örneğin ['Bölge', 'Yıl']). İsteğe bağlıdır."
      },
      scenario: {
        type: Type.OBJECT,
        description: "Eğer kullanıcı 'fiyatları %10 artırırsak', 'satışlar 2 katına çıkarsa' gibi bir senaryo/tahmin istiyorsa bu objeyi doldur. İstemiyorsa boş bırak.",
        properties: {
          modifierType: { type: Type.STRING, description: "'multiply' (çarp), 'add' (ekle)" },
          modifierValue: { type: Type.NUMBER, description: "Değişim miktarı (örneğin %10 artış için multiply 1.10)" },
          scenarioName: { type: Type.STRING, description: "Senaryonun adı (ör: 'Tahmini Gelir', '%10 Zamlı')" }
        },
        required: ["modifierType", "modifierValue", "scenarioName"]
      }
    },
    required: ["sheetName", "chartType", "title", "xAxisColumn", "yAxisColumn", "aggregation"]
  }
};

const modifyExcelDataDeclaration: FunctionDeclaration = {
  name: "modifyExcelData",
  description: "Kullanıcı Excel verilerini değiştirmek, iki sayfayı eşleştirmek (VLOOKUP/ÇAPRAZARA gibi), yeni bir sayfa oluşturmak, verileri filtreleyip yeni bir dosya indirmek veya grafikteki/analizdeki özet verileri yeni bir Excel'e kaydetmek istediğinde bu aracı kullan. Bu araç, verileri işleyecek bir JavaScript fonksiyon gövdesi (string olarak) alır. Kod, 'excelData' adında bir obje (Record<string, any[]>) alır ve güncellenmiş veya yeni sayfalar eklenmiş yeni bir 'excelData' objesi döndürmelidir.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      javascriptCode: {
        type: Type.STRING,
        description: "Verileri işleyecek JavaScript fonksiyon gövdesi. Örnek: `const sheet1 = excelData['Sayfa1'] || []; const sheet2 = excelData['Sayfa2'] || []; const sheet3 = sheet1.map(row => { const match = sheet2.find(r => r.Telefon === row.Telefon); return { ...row, Eslesen: match ? match.Deger : null }; }); return { ...excelData, 'Sayfa3': sheet3 };` veya analiz için: `const ozet = [{Kategori: 'A', Toplam: 100}, {Kategori: 'B', Toplam: 200}]; return { ...excelData, 'Analiz Sonucu': ozet };`",
      },
      explanation: {
        type: Type.STRING,
        description: "Kullanıcıya yapılacak işlemin ve sonucun kısa açıklaması.",
      }
    },
    required: ["javascriptCode", "explanation"]
  }
};

const calculateExcelDataDeclaration: FunctionDeclaration = {
  name: "calculateExcelData",
  description: "Kullanıcı Excel verileri üzerinde karmaşık matematiksel hesaplamalar, iki sayfa arasındaki farklar, toplamlar veya istatistiksel analizler istediğinde bu aracı kullan. JavaScript kodu 'excelData' objesini alır ve hesaplanan sonucu (sayı, metin veya obje) döndürür. Örneğin: 'Sayfa 1 A sütunu toplamı ile Sayfa 2 J sütunu toplamı farkı'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      javascriptCode: {
        type: Type.STRING,
        description: "Hesaplamayı yapacak JavaScript fonksiyon gövdesi. Örnek: `const s1 = excelData['Sayfa1']||[]; const s2 = excelData['Sayfa2']||[]; const sum1 = s1.reduce((acc, row) => acc + (Number(row['A'])||0), 0); const sum2 = s2.reduce((acc, row) => acc + (Number(row['J'])||0), 0); return sum1 - sum2;`",
      }
    },
    required: ["javascriptCode"]
  }
};

const writeToExcelDeclaration: FunctionDeclaration = {
  name: "writeToExcel",
  description: "YALNIZCA Excel eklentisi modunda çalışırken kullanılır. Belirli bir hücreye veya aralığa veri yazmak için kullanılır.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      address: {
        type: Type.STRING,
        description: "Hücre adresi (Örn: 'A1', 'B2:C5')",
      },
      values: {
        type: Type.ARRAY,
        items: { type: Type.ARRAY, items: { type: Type.STRING } },
        description: "Yazılacak değerler (2 boyutlu dizi)",
      }
    },
    required: ["address", "values"]
  }
};

const createExcelChartDeclaration: FunctionDeclaration = {
  name: "createExcelChart",
  description: "YALNIZCA Excel eklentisi modunda çalışırken kullanılır. Excel sayfasının içine doğrudan bir grafik eklemek için kullanılır.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      range: {
        type: Type.STRING,
        description: "Grafik verilerinin bulunduğu aralık (Örn: 'A1:B10')",
      },
      chartType: {
        type: Type.STRING,
        description: "Grafik türü (Örn: 'ColumnClustered', 'Line', 'Pie')",
      },
      title: {
        type: Type.STRING,
        description: "Grafik başlığı",
      }
    },
    required: ["range", "chartType"]
  }
};

export function VoiceAssistant({ excelData, isExcelAddin, onUpdateExcelData }: VoiceAssistantProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chartConfig, setChartConfig] = useState<any>(null);
  const [chartParams, setChartParams] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<{column: string, value: string} | null>(null);
  const [formulaConfig, setFormulaConfig] = useState<FormulaConfig | null>(null);
  const [modifiedExcelData, setModifiedExcelData] = useState<{data: Record<string, any[]>, explanation: string} | null>(null);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  
  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const availableSearchFilters = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return {};
    
    const filters: Record<string, Set<string>> = {
      sayfa: new Set(),
    };
    
    const keys = Object.keys(searchResults[0].veri).slice(0, 5);
    keys.forEach(k => filters[k] = new Set());

    searchResults.forEach(result => {
      filters.sayfa.add(String(result.sayfa));
      keys.forEach(k => {
        if (result.veri[k] !== undefined && result.veri[k] !== null) {
          filters[k].add(String(result.veri[k]));
        }
      });
    });

    const resultFilters: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v.size > 1 && v.size <= 15) {
        resultFilters[k] = Array.from(v).sort();
      }
    }
    return resultFilters;
  }, [searchResults]);

  const filteredSearchResults = useMemo(() => {
    if (!searchResults) return null;
    return searchResults.filter(result => {
      for (const [key, value] of Object.entries(searchFilters)) {
        if (key === 'sayfa') {
          if (String(result.sayfa) !== value) return false;
        } else {
          if (String(result.veri[key]) !== value) return false;
        }
      }
      return true;
    });
  }, [searchResults, searchFilters]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const connect = async (startMic = true, initialText?: string) => {
    setIsConnecting(true);
    setChartConfig(null);
    setFormulaConfig(null);
    setModifiedExcelData(null);
    setSearchResults(null);
    setSearchFilters({});
    setChatHistory([]);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      playerRef.current = new AudioPlayer();
      playerRef.current.init();

      let dataStr = "";
      Object.entries(excelData).forEach(([sheetName, data]) => {
        const headers = Object.keys(data[0] || {}).join(' | ');
        let rows = '';
        for (let i = 0; i < Math.min(data.length, 2500); i++) {
          rows += `${i + 1}. satır: ` + Object.values(data[i]).join(' | ') + '\n';
        }
        dataStr += `\n--- SAYFA: ${sheetName} ---\nSütunlar: ${headers}\nSatırlar:\n${rows}\n`;
      });

      const systemInstruction = `Sen bir Excel veri asistanısın. Görevin, kullanıcının yüklediği Excel verilerini sesli olarak okumak, soruları yanıtlamak, grafikler oluşturmak ve Excel formülleri/makroları yazmaktır.
      
Yüklenen Sayfalar ve Veriler:
${dataStr}

${isExcelAddin ? `
EXCEL EKLENTİSİ MODU AKTİF:
Şu anda doğrudan bir Excel dosyasının içinde çalışıyorsun. Bu modda şu ek yeteneklerin var:
1. 'writeToExcel' aracını kullanarak doğrudan hücrelere veri yazabilirsin.
2. 'createExcelChart' aracını kullanarak doğrudan Excel sayfasına grafik ekleyebilirsin.
3. Kullanıcı bir değişiklik istediğinde (Örn: "A1 hücresine 100 yaz"), bunu 'writeToExcel' ile yap.
4. Kullanıcı bir grafik istediğinde, hem 'renderChart' (web panelinde göstermek için) hem de 'createExcelChart' (Excel'e eklemek için) araçlarını kullanabilirsin.
` : `
STANDART MOD:
Doğrudan Excel dosyasına müdahale edemezsin. Değişiklikleri 'modifyExcelData' ile yapıp yeni dosya indirtmelisin.
`}

ÇOK ÖNEMLİ KURALLAR:
1. ASLA VERİ UYDURMA. Tabloda yazan rakamları birebir oku.
2. SAYILARI OKUMA KURALI (ÇOK KRİTİK): 5 haneden büyük sayıları, ID numaralarını, DT numaralarını veya barkodları (örneğin 21864996) okurken ASLA "iki yüz on sekiz bin" gibi gruplayarak veya yuvarlayarak okuma. Bu tür büyük sayıları HER ZAMAN rakam rakam, tane tane oku (örneğin: "iki, bir, sekiz, altı, dört, dokuz, dokuz, altı").
3. Kullanıcı belirli bir numara, ID veya değer aradığında tabloda doğrudan göremiyorsan hemen 'searchExcelData' fonksiyonunu kullanarak o değeri tam eşleşme ile ara.
4. GRAFİK OLUŞTURMA SINIRI: Kullanıcı grafik istediğinde 'renderChart' fonksiyonunu kullan. Grafikleri (görsel olarak) doğrudan Excel dosyasının içine EKLEYEMEZSİN. Ancak kullanıcı grafikteki veya analizdeki VERİLERİ yeni bir Excel dosyasına kaydetmek isterse, 'modifyExcelData' fonksiyonunu kullanarak bu özet/analiz verilerini içeren yeni bir sayfa (örneğin 'Analiz Sonucu') oluştur ve kullanıcının indirmesini sağla. "Grafiği görsel olarak ekleyemem ama verilerini yeni bir dosya olarak indirebilmeniz için hazırladım" diyerek yönlendir.
5. FORMÜL VE MAKRO ÇALIŞTIRMA SINIRI: Sen doğrudan Excel dosyasında formül hesaplayamaz veya VBA makrosu ÇALIŞTIRAMAZSIN. Sadece kodu üretip kullanıcıya kopyalaması için verebilirsin. Kullanıcı "formülü uygula" derse, 'modifyExcelData' ile veriyi JavaScript kullanarak değiştirebilirsin ama gerçek Excel formülü/makrosu çalıştıramazsın.
6. Kullanıcı "fiyatları %10 artırırsak ne olur", "satışlar 2 katına çıkarsa" gibi SENARYO veya TAHMİN (What-If) isterse, 'renderChart' fonksiyonundaki 'scenario' parametresini doldur.
7. Kullanıcı Excel formülü (DÜŞEYARA, ÇAPRAZARA vb.) veya Makro/VBA kodu istediğinde 'generateExcelFormula' fonksiyonunu çağır.
8. KESİNLİKLE DİKKAT: Kullanıcı makro oluşturmanı istediğinde veya bilmediğin/emin olmadığın bir konu/hesaplama olduğunda HER ZAMAN 'googleSearch' aracını kullanarak web araması yap ve en güncel, doğru bilgiyi bul.
9. Makro/VBA kodu ürettiğinde, kullanıcının bunu Excel'de NASIL çalıştıracağına dair (Örn: ALT+F11'e basın, Insert > Module deyin, kodu yapıştırın ve F5 ile çalıştırın) açıklayıcı bir geri dönüş yap.
10. KESİNLİKLE DİKKAT: Eğer kullanıcı hatalı, eksik veya mantıksız bir formül komutu verirse (örneğin "toplaçarpım" yerine "çarpıtopla" derse), 'generateExcelFormula' fonksiyonundaki 'didYouMean' parametresini DOLDURARAK "Bunu mu demek istediniz?" şeklinde yönlendirme yap.
11. Eğer kullanıcı "Sayfa 1'deki telefon numaralarıyla Sayfa 2'dekileri eşleştirip Sayfa 3'e yaz", "Verileri filtrele ve yeni dosya oluştur", "Analiz sonucunu/grafik verilerini yeni excele kaydet" gibi Excel dosyasının İÇİNDE doğrudan işlem yapılıp yeni dosya indirilmesini gerektiren bir şey isterse, KESİNLİKLE 'modifyExcelData' fonksiyonunu çağırarak JavaScript kodu üret ve yeni bir Excel objesi döndür. (Örn: return { ...excelData, 'Analiz Sonucu': [{Kategori: 'A', Toplam: 100}] };)
12. HESAPLAMA KURALI: Kullanıcı "Sayfa 1'deki A sütunu toplamı ile Sayfa 2'deki J sütunu toplamı arasındaki fark nedir?" gibi karmaşık matematiksel hesaplamalar, iki sayfa arası karşılaştırmalar veya istatistiksel analizler istediğinde KESİNLİKLE 'calculateExcelData' aracını kullan. Bu araç sayesinde JavaScript ile hatasız hesaplama yapıp sonucu kullanıcıya söyleyebilirsin.
13. Cevapların doğal ve akıcı olsun.`;

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [
            { functionDeclarations: [
              renderChartDeclaration, 
              searchExcelDataDeclaration, 
              generateExcelFormulaDeclaration, 
              modifyExcelDataDeclaration, 
              calculateExcelDataDeclaration,
              ...(isExcelAddin ? [writeToExcelDeclaration, createExcelChartDeclaration] : [])
            ] },
            { googleSearch: {} }
          ],
          toolConfig: { includeServerSideToolInvocations: true },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        } as any,
        callbacks: {
          onopen: () => {
            if (startMic) {
              recorderRef.current = new AudioRecorder((base64Data) => {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                });
              });
              recorderRef.current.start().catch(err => {
                console.error("Mic error:", err);
                setError("Mikrofon başlatılamadı.");
              });
            }
            setIsConnected(true);
            setIsConnecting(false);
            
            if (initialText) {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ text: initialText });
              });
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playerRef.current?.clearQueue();
            }
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playerRef.current?.play(base64Audio);
            }
            
            // Handle transcriptions
            if (message.serverContent?.inputTranscription) {
              const t = message.serverContent.inputTranscription;
              setChatHistory(prev => {
                const newHistory = [...prev];
                let lastUserIdx = -1;
                for (let i = newHistory.length - 1; i >= 0; i--) {
                  if (newHistory[i].role === 'user' && !newHistory[i].isFinished) {
                    lastUserIdx = i;
                    break;
                  }
                }
                if (lastUserIdx >= 0) {
                  if (t.text) newHistory[lastUserIdx].text += t.text;
                  if (t.finished) newHistory[lastUserIdx].isFinished = true;
                } else if (t.text) {
                  newHistory.push({ role: 'user', text: t.text, isFinished: !!t.finished });
                }
                return newHistory;
              });
            }

            if (message.serverContent?.outputTranscription) {
              const t = message.serverContent.outputTranscription;
              setChatHistory(prev => {
                const newHistory = [...prev];
                let lastAsstIdx = -1;
                for (let i = newHistory.length - 1; i >= 0; i--) {
                  if (newHistory[i].role === 'assistant' && !newHistory[i].isFinished) {
                    lastAsstIdx = i;
                    break;
                  }
                }
                if (lastAsstIdx >= 0) {
                  if (t.text) newHistory[lastAsstIdx].text += t.text;
                  if (t.finished) newHistory[lastAsstIdx].isFinished = true;
                } else if (t.text) {
                  newHistory.push({ role: 'assistant', text: t.text, isFinished: !!t.finished });
                }
                return newHistory;
              });
            }

            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                for (const call of functionCalls) {
                  if (call.name === 'renderChart') {
                    const args = call.args as any;
                    const { sheetName, xAxisColumn, yAxisColumn, aggregation, chartType, title, scenario, filterableColumns } = args;
                    
                    setChartParams({
                      sheetName, xAxisColumn, yAxisColumn, aggregation, chartType, title, scenario, filterableColumns
                    });
                    setActiveFilter(null);
                    
                    sessionPromise.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { 
                            result: "Grafik başarıyla hesaplandı ve ekranda gösterildi."
                          }
                        }]
                      });
                    });
                  } else if (call.name === 'searchExcelData') {
                    const args = call.args as any;
                    let results: any[] = [];
                    
                    const term = String(args.searchTerm || '').toLowerCase();
                    const targetSheetName = args.sheetName;
                    const rowNum = args.rowNumber;
                    
                    const sheetsToSearch = targetSheetName && excelData[targetSheetName] 
                      ? { [targetSheetName]: excelData[targetSheetName] } 
                      : excelData;
                      
                    Object.entries(sheetsToSearch).forEach(([sheetName, data]) => {
                      if (rowNum && rowNum > 0 && rowNum <= data.length) {
                        results.push({ sayfa: sheetName, satır: rowNum, veri: data[rowNum - 1] });
                      } else if (term) {
                        const matches = data
                          .map((row, idx) => ({ sayfa: sheetName, satır: idx + 1, veri: row }))
                          .filter(item => 
                            Object.values(item.veri).some(val => 
                              String(val).toLowerCase().includes(term)
                            )
                          );
                        results = [...results, ...matches];
                      }
                    });
                    
                    results = results.slice(0, 5); // Limit to top 5
                    setSearchResults(results);

                    sessionPromise.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { 
                            result: results.length > 0 ? "Kayıtlar bulundu ve ekranda gösterildi." : "Kayıt bulunamadı."
                          }
                        }]
                      });
                    });
                  } else if (call.name === 'generateExcelFormula') {
                    const args = call.args as any;
                    setFormulaConfig({
                      formula: args.formula,
                      explanation: args.explanation,
                      type: args.type || 'formula',
                      didYouMean: args.didYouMean
                    });
                    
                    sessionPromise.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { 
                            result: "Formül başarıyla ekranda gösterildi."
                          }
                        }]
                      });
                    });
                  } else if (call.name === 'modifyExcelData') {
                    const args = call.args as any;
                    try {
                      // Güvenli bir şekilde fonksiyonu oluştur ve çalıştır
                      const processData = new Function('excelData', args.javascriptCode);
                      const newData = processData(excelData);
                      
                      if (newData && typeof newData === 'object') {
                        setModifiedExcelData({
                          data: newData,
                          explanation: args.explanation
                        });
                        
                        if (onUpdateExcelData) {
                          onUpdateExcelData(newData);
                        }
                        
                        sessionPromise.then((session) => {
                          session.sendToolResponse({
                            functionResponses: [{
                              id: call.id,
                              name: call.name,
                              response: { 
                                result: "Veriler başarıyla işlendi, ekranda güncellendi ve indirme butonu gösterildi."
                              }
                            }]
                          });
                        });
                      } else {
                        throw new Error("Geçersiz veri formatı döndürüldü.");
                      }
                    } catch (err: any) {
                      console.error("modifyExcelData error:", err);
                      sessionPromise.then((session) => {
                        session.sendToolResponse({
                          functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { 
                              error: "JavaScript kodu çalıştırılırken hata oluştu: " + err.message
                            }
                          }]
                        });
                      });
                    }
                  } else if (call.name === 'calculateExcelData') {
                    const args = call.args as any;
                    try {
                      // Güvenli bir şekilde fonksiyonu oluştur ve çalıştır
                      const calculateData = new Function('excelData', args.javascriptCode);
                      const result = calculateData(excelData);
                      
                      sessionPromise.then((session) => {
                        session.sendToolResponse({
                          functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { 
                              result: result !== undefined ? result : "Hesaplama sonucu bulunamadı."
                            }
                          }]
                        });
                      });
                    } catch (err: any) {
                      console.error("calculateExcelData error:", err);
                      sessionPromise.then((session) => {
                        session.sendToolResponse({
                          functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { 
                              error: "Hesaplama kodu çalıştırılırken hata oluştu: " + err.message
                            }
                          }]
                        });
                      });
                    }
                  } else if (call.name === 'writeToExcel') {
                    const args = call.args as any;
                    if (typeof Excel !== 'undefined') {
                      try {
                        await Excel.run(async (context) => {
                          const sheet = context.workbook.worksheets.getActiveWorksheet();
                          const range = sheet.getRange(args.address);
                          range.values = args.values;
                          await context.sync();
                        });
                        
                        sessionPromise.then((session) => {
                          session.sendToolResponse({
                            functionResponses: [{
                              id: call.id,
                              name: call.name,
                              response: { result: "Veriler Excel'e başarıyla yazıldı." }
                            }]
                          });
                        });
                      } catch (err: any) {
                        sessionPromise.then((session) => {
                          session.sendToolResponse({
                            functionResponses: [{
                              id: call.id,
                              name: call.name,
                              response: { error: "Excel'e yazılırken hata oluştu: " + err.message }
                            }]
                          });
                        });
                      }
                    }
                  } else if (call.name === 'createExcelChart') {
                    const args = call.args as any;
                    if (typeof Excel !== 'undefined') {
                      try {
                        await Excel.run(async (context) => {
                          const sheet = context.workbook.worksheets.getActiveWorksheet();
                          const chart = sheet.charts.add(args.chartType || "ColumnClustered", sheet.getRange(args.range), "Auto");
                          if (args.title) {
                            chart.title.text = args.title;
                          }
                          await context.sync();
                        });
                        
                        sessionPromise.then((session) => {
                          session.sendToolResponse({
                            functionResponses: [{
                              id: call.id,
                              name: call.name,
                              response: { result: "Grafik Excel'e başarıyla eklendi." }
                            }]
                          });
                        });
                      } catch (err: any) {
                        sessionPromise.then((session) => {
                          session.sendToolResponse({
                            functionResponses: [{
                              id: call.id,
                              name: call.name,
                              response: { error: "Excel'e grafik eklenirken hata oluştu: " + err.message }
                            }]
                          });
                        });
                      }
                    }
                  }
                }
              }
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            let errorMessage = "Sesli asistana bağlanırken beklenmeyen bir hata oluştu.";
            
            if (err instanceof Error) {
              errorMessage = err.message;
            } else if (err?.message) {
              errorMessage = err.message;
            } else if (err?.error?.message) {
              errorMessage = err.error.message;
            } else if (typeof err === 'string') {
              errorMessage = err;
            } else if (err instanceof Event && err.type === 'error') {
              errorMessage = "Sunucuyla bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin veya ağınızın WebSocket bağlantılarına izin verdiğinden emin olun.";
            } else {
              errorMessage = "Bağlantı sırasında teknik bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.";
            }

            // Check for specific common errors
            if (errorMessage.toLowerCase().includes('payload too large') || errorMessage.includes('413')) {
              errorMessage = "Yüklediğiniz Excel dosyası sesli asistan için çok büyük. Lütfen daha az satır içeren bir dosya yükleyin veya gereksiz sütunları silin.";
            } else if (errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429')) {
              errorMessage = "Sistem şu anda çok yoğun (Kota aşıldı). Lütfen birkaç dakika bekleyip tekrar deneyin.";
            } else if (errorMessage.toLowerCase().includes('api key') || errorMessage.includes('403')) {
              errorMessage = "API anahtarı hatası veya yetkilendirme sorunu. Lütfen sistem yöneticisiyle iletişime geçin.";
            }

            setError(errorMessage);
            disconnect();
          }
        }
      });
      
      sessionPromise.catch((err) => {
        console.error("Live API Connection Error:", err);
        setError("Bağlantı kurulamadı: " + (err.message || "Bilinmeyen hata"));
        setIsConnecting(false);
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Connection failed:", err);
      let errorMessage = "Mikrofona erişilemedi veya bağlantı kurulamadı. Lütfen tarayıcınızın mikrofon izni verdiğinden emin olun.";
      
      if (err instanceof Error) {
        if (err.message.includes('Permission denied') || err.message.includes('NotAllowedError')) {
          errorMessage = "Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından mikrofon izni verin ve sayfayı yenileyin.";
        } else if (err.message.includes('Requested device not found') || err.message.includes('NotFoundError')) {
          errorMessage = "Bilgisayarınızda bağlı bir mikrofon bulunamadı. Lütfen mikrofonunuzu kontrol edin.";
        } else {
          errorMessage = `Bağlantı hatası: ${err.message}`;
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        try {
          session.close();
        } catch (e) {
          // Ignore close errors
        }
      });
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    if (!chartParams) {
      setChartConfig(null);
      return;
    }

    const { sheetName, xAxisColumn, yAxisColumn, aggregation, chartType, title, scenario, filterableColumns } = chartParams;
    let targetSheet = excelData[sheetName] || Object.values(excelData)[0];
    
    if (!targetSheet) return;

    // Apply active filter if any
    if (activeFilter) {
      targetSheet = targetSheet.filter(row => String(row[activeFilter.column]) === activeFilter.value);
    }

    let chartData: any[] = [];
    
    try {
      if (aggregation === 'none') {
        chartData = targetSheet.slice(0, 2500).map(row => ({
          label: String(row[xAxisColumn] || ''),
          value: parseFloat(String(row[yAxisColumn]).replace(/[^0-9.-]+/g,"")) || 0
        }));
      } else {
        const groupedData: Record<string, number[]> = {};
        
        targetSheet.forEach(row => {
          const xVal = String(row[xAxisColumn] || 'Bilinmeyen');
          let yStr = String(row[yAxisColumn] || '0');
          const cleanStr = yStr.replace(/[^0-9.,-]/g, '');
          let yVal = 0;
          if (cleanStr.includes(',') && cleanStr.includes('.')) {
            if (cleanStr.lastIndexOf(',') > cleanStr.lastIndexOf('.')) {
              yVal = parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
            } else {
              yVal = parseFloat(cleanStr.replace(/,/g, ''));
            }
          } else if (cleanStr.includes(',')) {
            yVal = parseFloat(cleanStr.replace(',', '.'));
          } else {
            yVal = parseFloat(cleanStr);
          }
          
          if (isNaN(yVal)) yVal = 0;
          
          if (!groupedData[xVal]) {
            groupedData[xVal] = [];
          }
          groupedData[xVal].push(yVal);
        });
        
        chartData = Object.entries(groupedData).map(([label, values]) => {
          let value = 0;
          if (aggregation === 'sum') {
            value = values.reduce((a, b) => a + b, 0);
          } else if (aggregation === 'average') {
            value = values.reduce((a, b) => a + b, 0) / values.length;
          } else if (aggregation === 'count') {
            value = values.length;
          }
          
          let simulatedValue = undefined;
          if (scenario) {
            if (scenario.modifierType === 'multiply') {
              simulatedValue = value * scenario.modifierValue;
            } else if (scenario.modifierType === 'add') {
              simulatedValue = value + scenario.modifierValue;
            }
            simulatedValue = Math.round(simulatedValue * 100) / 100;
          }
          
          return { 
            label, 
            value: Math.round(value * 100) / 100,
            ...(simulatedValue !== undefined && { simulatedValue })
          };
        });
        
        if (chartType === 'bar' || chartType === 'pie') {
          chartData.sort((a, b) => b.value - a.value);
        }
      }
      
      if (chartData.length > 30) {
        chartData = chartData.slice(0, 30);
      }
      
      // Extract unique values for filterable columns
      const availableFilters: Record<string, string[]> = {};
      if (filterableColumns && Array.isArray(filterableColumns)) {
        const baseSheet = excelData[sheetName] || Object.values(excelData)[0];
        filterableColumns.forEach(col => {
          const uniqueValues = Array.from(new Set(baseSheet.map(row => String(row[col] || '')))).filter(Boolean);
          if (uniqueValues.length > 0 && uniqueValues.length <= 15) { // Only show filters if there are a reasonable number of options
            availableFilters[col] = uniqueValues;
          }
        });
      }
      
      setChartConfig({
        chartType,
        title: activeFilter ? `${title} (${activeFilter.value})` : title,
        xAxisKey: xAxisColumn,
        yAxisKey: yAxisColumn,
        scenarioName: scenario?.scenarioName,
        data: chartData,
        availableFilters
      });
    } catch (err) {
      console.error("Chart rendering error:", err);
    }
  }, [chartParams, activeFilter, excelData]);

  const [copied, setCopied] = useState(false);

  const handleDownloadModified = () => {
    if (!modifiedExcelData) return;
    
    try {
      const wb = XLSX.utils.book_new();
      Object.entries(modifiedExcelData.data).forEach(([sheetName, sheetData]) => {
        const ws = XLSX.utils.json_to_sheet(sheetData as any[]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
      });
      XLSX.writeFile(wb, 'Guncellenmis_Excel.xlsx');
    } catch (err) {
      console.error("Excel indirme hatası:", err);
      alert("Excel dosyası oluşturulurken bir hata oluştu.");
    }
  };

  const handleCopyFormula = () => {
    if (formulaConfig) {
      navigator.clipboard.writeText(formulaConfig.formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isConnecting) return;
    
    const text = textInput.trim();
    setTextInput('');
    
    // Add to chat history immediately
    setChatHistory(prev => [...prev, { role: 'user', text, isFinished: true }]);
    
    if (!isConnected) {
      await connect(false, text);
    } else if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        session.sendRealtimeInput({ text });
      });
    }
  };

  // Get the last 10 messages (which corresponds to up to 5 questions and 5 answers)
  const displayHistory = chatHistory.slice(-10);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full">
      <div className="flex flex-col items-center p-6 sm:p-8 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-emerald-100/50 w-full">
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Sesli Asistan</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed px-2">
            Excel verilerinizle konuşmaya başlamak için mikrofona tıklayın. "3. satırdaki telefon numarası ne?" veya "Bunu grafikte göster" gibi sorular sorabilirsiniz.
          </p>
        </div>

        <button
          onClick={() => isConnected ? disconnect() : connect(true)}
          disabled={isConnecting}
          className={`relative flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-full transition-all duration-500 ${
            isConnected 
              ? 'bg-red-50 text-red-500 hover:bg-red-100 shadow-[0_0_0_8px_rgba(239,68,68,0.1)] sm:shadow-[0_0_0_12px_rgba(239,68,68,0.1)]' 
              : 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-600 shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:scale-105'
          }`}
        >
          {isConnecting ? (
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
          ) : isConnected ? (
            <MicOff className="w-8 h-8 sm:w-10 sm:h-10" />
          ) : (
            <Mic className="w-8 h-8 sm:w-10 sm:h-10" />
          )}
        </button>

        <div className="mt-10 text-xs font-semibold">
          {isConnecting ? (
            <span className="text-emerald-500 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Bağlanıyor...
            </span>
          ) : isConnected ? (
            <span className="text-emerald-600 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Sizi dinliyor
            </span>
          ) : (
            <span className="text-slate-400 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">Bağlantı Kapalı</span>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm text-center w-full max-w-sm animate-in fade-in slide-in-from-bottom-2">
            <p className="font-bold mb-1">Bağlantı Hatası</p>
            <p className="opacity-90">{error}</p>
            <p className="text-xs mt-2 opacity-75">Lütfen tekrar deneyin. Sorun devam ederse daha küçük bir dosya yüklemeyi deneyebilirsiniz.</p>
          </div>
        )}

        {formulaConfig && (
          <div className="mt-8 w-full bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            {formulaConfig.didYouMean && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                <span className="font-bold flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4" />
                  Bunu mu demek istediniz?
                </span>
                <p className="text-amber-200/80">{formulaConfig.didYouMean}</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-400">
                {formulaConfig.type === 'macro' ? 'Excel Makrosu (VBA)' : 'Excel Formülü'}
              </h3>
              <button 
                onClick={handleCopyFormula}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <div className="bg-black/50 p-4 rounded-xl font-mono text-sm text-emerald-300 overflow-x-auto mb-3 border border-slate-800/50 whitespace-pre">
              {formulaConfig.formula}
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {formulaConfig.explanation}
            </p>
          </div>
        )}

        {modifiedExcelData && (
          <div className="mt-8 w-full bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                İşlem Tamamlandı
              </h3>
              <button 
                onClick={handleDownloadModified}
                className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Yeni Excel'i İndir
              </button>
            </div>
            <p className="text-sm text-emerald-700 leading-relaxed">
              {modifiedExcelData.explanation}
            </p>
          </div>
        )}

        {searchResults && (
          <div className="mt-8 w-full bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              Arama Sonuçları
            </h3>
            
            {/* Search Filters */}
            {availableSearchFilters && Object.keys(availableSearchFilters).length > 0 && (
              <div className="mb-6 flex flex-col gap-3">
                {Object.entries(availableSearchFilters).map(([colName, values]: [string, any]) => (
                  <div key={colName} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">{colName} Filtresi:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const newFilters = { ...searchFilters };
                          delete newFilters[colName];
                          setSearchFilters(newFilters);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          !searchFilters[colName]
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tümü
                      </button>
                      {values.map((val: string) => (
                        <button
                          key={val}
                          onClick={() => setSearchFilters({ ...searchFilters, [colName]: val })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            searchFilters[colName] === val
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredSearchResults && filteredSearchResults.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Sayfa</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Satır</th>
                      {Object.keys(searchResults[0].veri).slice(0, 5).map(key => (
                        <th key={key} className="px-4 py-3 font-medium whitespace-nowrap">{key}</th>
                      ))}
                      {Object.keys(searchResults[0].veri).length > 5 && (
                        <th className="px-4 py-3 font-medium whitespace-nowrap">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSearchResults.map((result, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-emerald-700 whitespace-nowrap">{result.sayfa}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{result.satır}</td>
                        {Object.keys(result.veri).slice(0, 5).map(key => (
                          <td key={key} className="px-4 py-3 max-w-[250px] truncate" title={String(result.veri[key])}>
                            {String(result.veri[key])}
                          </td>
                        ))}
                        {Object.keys(result.veri).length > 5 && (
                          <td className="px-4 py-3 text-slate-400">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aradığınız kriterlere uygun kayıt bulunamadı.</p>
            )}
          </div>
        )}

        {chartConfig && (
          <div className="mt-8 w-full bg-white p-4 rounded-2xl border border-emerald-50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-base font-bold text-slate-800 mb-4 text-center">{chartConfig.title}</h3>
            
            {/* Interactive Filters */}
            {chartConfig.availableFilters && Object.keys(chartConfig.availableFilters).length > 0 && (
              <div className="mb-6 flex flex-col gap-3">
                {Object.entries(chartConfig.availableFilters).map(([colName, values]: [string, any]) => (
                  <div key={colName} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">{colName} Filtresi:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          !activeFilter || activeFilter.column !== colName
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tümü
                      </button>
                      {values.map((val: string) => (
                        <button
                          key={val}
                          onClick={() => setActiveFilter({ column: colName, value: val })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeFilter?.column === colName && activeFilter?.value === val
                              ? 'bg-emerald-500 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {chartConfig.scenarioName && (
              <div className="flex items-center justify-center gap-4 mb-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                  <span className="text-slate-600">Mevcut Durum</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                  <span className="text-slate-600">{chartConfig.scenarioName}</span>
                </div>
              </div>
            )}

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartConfig.chartType === 'line' ? (
                  <LineChart data={chartConfig.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="value" name="Mevcut" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    {chartConfig.scenarioName && (
                      <Line type="monotone" dataKey="simulatedValue" name={chartConfig.scenarioName} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                    )}
                  </LineChart>
                ) : chartConfig.chartType === 'pie' ? (
                  <PieChart>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Pie data={chartConfig.data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={60} fill="#10b981">
                      {chartConfig.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={chartConfig.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="value" name="Mevcut" fill="#10b981" radius={[4, 4, 0, 0]} />
                    {chartConfig.scenarioName && (
                      <Bar dataKey="simulatedValue" name={chartConfig.scenarioName} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    )}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Chat History Sidebar */}
      <div className="flex flex-col w-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-emerald-100/50 overflow-hidden h-[300px] sm:h-[400px]">
        <div className="p-4 border-b border-emerald-50 bg-white/50 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">Sohbet Geçmişi</h3>
        </div>
        
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {displayHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <MessageSquare className="w-8 h-8 opacity-20" />
              <p className="text-xs text-center">Henüz bir konuşma yok.<br/>Mikrofona tıklayarak veya yazarak başlayın.</p>
            </div>
          ) : (
            displayHistory.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  {msg.role === 'user' ? 'Siz' : 'Asistan'}
                </span>
                <div 
                  className={`px-3 py-2 rounded-2xl max-w-[90%] text-xs leading-relaxed break-words ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-tr-sm' 
                      : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                  {!msg.isFinished && (
                    <span className="inline-flex ml-1 animate-pulse">...</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50">
          <form 
            onSubmit={handleSendText}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isConnecting}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-4 py-3 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-50 transition-all"
            />
            <button
              type="submit"
              disabled={isConnecting || !textInput.trim()}
              className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-sm shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
