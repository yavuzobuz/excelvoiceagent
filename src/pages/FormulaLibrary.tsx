import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './LandingPage';
import { Search, Calculator, Type, Calendar, ArrowLeft, BookOpen, Sparkles, Code, FunctionSquare, Database, Sigma, Terminal, Copy, CheckCircle2, Globe, Info, User, LogIn } from 'lucide-react';
import { FormulaVoiceAssistant } from '../components/FormulaVoiceAssistant';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle } from '../firebase';

const formulas = [
  {
    category: "Makro & VBA (Otomasyon)",
    icon: Terminal,
    items: [
      { name: "Satır/Sütun Vurgulama", syntax: `Private Sub Worksheet_SelectionChange(ByVal Target As Range)\n  Cells.Interior.ColorIndex = xlNone\n  Target.EntireRow.Interior.Color = vbRed\n  Target.EntireColumn.Interior.Color = vbYellow\nEnd Sub`, desc: "Seçili olan hücrenin bulunduğu satırı kırmızı, sütunu sarı yapar. İlgili sayfanın kod bölümüne yapıştırılır." },
      { name: "Tüm Sayfaları Listele", syntax: `Sub SayfalariListele()\n  Dim i As Integer\n  For i = 1 To Sheets.Count\n    Cells(i, 1).Value = Sheets(i).Name\n  Next i\nEnd Sub`, desc: "Çalışma kitabındaki tüm sayfaların isimlerini A sütununa alt alta listeler." },
      { name: "Boş Satırları Sil", syntax: `Sub BosSatirlariSil()\n  Columns("A:A").SpecialCells(xlCellTypeBlanks).EntireRow.Delete\nEnd Sub`, desc: "A sütununda boş olan tüm satırları otomatik olarak siler." }
    ]
  },
  {
    category: "Finansal",
    icon: Calculator,
    items: [
      { name: "NPV", syntax: "=NPV(rate, value1, [value2], ...)", desc: "İskonto oranına ve gelecekteki ödemelere dayalı olarak bir yatırımın net bugünkü değerini hesaplar." },
      { name: "PMT", syntax: "=PMT(rate, nper, pv, [fv], [type])", desc: "Sabit ödemeler ve sabit faiz oranına dayalı olarak bir kredinin ödemesini hesaplar." },
      { name: "FV", syntax: "=FV(rate, nper, pmt, [pv], [type])", desc: "Sabit ödemeler ve sabit faiz oranına dayalı olarak bir yatırımın gelecekteki değerini hesaplar." },
      { name: "IRR", syntax: "=IRR(values, [guess])", desc: "Bir dizi nakit akışı için iç verim oranını hesaplar." },
      { name: "XIRR", syntax: "=XIRR(values, dates, [guess])", desc: "Düzenli olması gerekmeyen bir nakit akışı programı için iç verim oranını döndürür." }
    ]
  },
  {
    category: "Mantıksal",
    icon: Code,
    items: [
      { name: "IF (EĞER)", syntax: "=IF(logical_test, value_if_true, value_if_false)", desc: "Bir koşulun doğru olup olmadığını kontrol eder ve doğruysa bir değer, yanlışsa başka bir değer döndürür." },
      { name: "IFS (ÇOKEĞER)", syntax: "=IFS(logical_test1, value_if_true1, ...)", desc: "Birden çok koşulun karşılanıp karşılanmadığını kontrol eder ve ilk DOĞRU koşula karşılık gelen değeri döndürür." },
      { name: "AND (VE)", syntax: "=AND(logical1, [logical2], ...)", desc: "Tüm bağımsız değişkenleri DOĞRU ise DOĞRU döndürür." },
      { name: "OR (YADA)", syntax: "=OR(logical1, [logical2], ...)", desc: "Bağımsız değişkenlerden herhangi biri DOĞRU ise DOĞRU döndürür." },
      { name: "IFERROR (EĞERHATA)", syntax: "=IFERROR(value, value_if_error)", desc: "Formül hatalıysa belirttiğiniz bir değeri, aksi takdirde formülün sonucunu döndürür." }
    ]
  },
  {
    category: "Arama ve Referans",
    icon: Search,
    items: [
      { name: "VLOOKUP (DÜŞEYARA)", syntax: "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])", desc: "Bir tablonun ilk sütununda bir değer arar ve aynı satırda belirttiğiniz sütundaki değeri döndürür." },
      { name: "XLOOKUP (ÇAPRAZARA)", syntax: "=XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])", desc: "Bir dizide veya aralıkta bir değer arar ve ikinci bir diziden veya aralıktan karşılık gelen değeri döndürür." },
      { name: "INDEX (İNDİS)", syntax: "=INDEX(array, row_num, [column_num])", desc: "Belirli bir satır ve sütun kesişimindeki bir hücrenin değerini döndürür." },
      { name: "MATCH (KAÇINCI)", syntax: "=MATCH(lookup_value, lookup_array, [match_type])", desc: "Belirtilen bir aralıkta, belirtilen bir öğeyi arar ve o öğenin aralıktaki göreli konumunu döndürür." },
      { name: "FILTER (FİLTRE)", syntax: "=FILTER(array, include, [if_empty])", desc: "Tanımladığınız ölçütlere göre bir veri aralığını filtreler." }
    ]
  },
  {
    category: "Matematik ve İstatistik",
    icon: Sigma,
    items: [
      { name: "SUMIFS (ÇOKETOPLA)", syntax: "=SUMIFS(sum_range, criteria_range1, criteria1, ...)", desc: "Birden çok ölçütü karşılayan hücreleri toplar." },
      { name: "COUNTIFS (ÇOKEĞERSAY)", syntax: "=COUNTIFS(criteria_range1, criteria1, ...)", desc: "Birden çok ölçütü karşılayan hücrelerin sayısını verir." },
      { name: "AVERAGEIFS (ÇOKEĞERORTALAMA)", syntax: "=AVERAGEIFS(average_range, criteria_range1, criteria1, ...)", desc: "Birden çok ölçütü karşılayan hücrelerin ortalamasını (aritmetik ortalamasını) döndürür." },
      { name: "MAXIFS (ÇOKEĞERMAK)", syntax: "=MAXIFS(max_range, criteria_range1, criteria1, ...)", desc: "Belirli bir dizi koşul veya ölçüt tarafından belirtilen hücreler arasındaki en büyük değeri döndürür." },
      { name: "UNIQUE (BENZERSİZ)", syntax: "=UNIQUE(array, [by_col], [exactly_once])", desc: "Bir liste veya aralıktaki benzersiz değerlerin listesini döndürür." }
    ]
  },
  {
    category: "Metin",
    icon: Type,
    items: [
      { name: "CONCAT (BİRLEŞTİR)", syntax: "=CONCAT(text1, [text2], ...)", desc: "Birden çok metin dizesini tek bir metin dizesinde birleştirir." },
      { name: "TEXTJOIN (METİNBİRLEŞTİR)", syntax: "=TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)", desc: "Birden çok aralıktan ve/veya dizeden gelen metni birleştirir ve aralarına belirttiğiniz bir sınırlayıcı ekler." },
      { name: "LEFT (SOLDAN)", syntax: "=LEFT(text, [num_chars])", desc: "Bir metin dizesinin başından itibaren belirttiğiniz sayıda karakteri döndürür." },
      { name: "MID (PARÇAAL)", syntax: "=MID(text, start_num, num_chars)", desc: "Bir metin dizesinin ortasından, belirttiğiniz konumdan başlayarak belirli sayıda karakteri döndürür." },
      { name: "TRIM (KIRP)", syntax: "=TRIM(text)", desc: "Kelimeler arasındaki tek boşluklar dışındaki tüm boşlukları metinden kaldırır." }
    ]
  },
  {
    category: "Tarih ve Saat",
    icon: Calendar,
    items: [
      { name: "DATEDIF (ETARİHLİ)", syntax: "=DATEDIF(start_date, end_date, unit)", desc: "İki tarih arasındaki gün, ay veya yıl sayısını hesaplar." },
      { name: "NETWORKDAYS (TAMİŞGÜNÜ)", syntax: "=NETWORKDAYS(start_date, end_date, [holidays])", desc: "İki tarih arasındaki tam çalışma günlerinin sayısını döndürür." },
      { name: "EOMONTH (SERİAY)", syntax: "=EOMONTH(start_date, months)", desc: "Belirtilen ay sayısından önceki veya sonraki ayın son gününün seri numarasını döndürür." },
      { name: "TODAY (BUGÜN)", syntax: "=TODAY()", desc: "Geçerli tarihi döndürür." },
      { name: "WORKDAY (İŞGÜNÜ)", syntax: "=WORKDAY(start_date, days, [holidays])", desc: "Belirli bir çalışma günü sayısından önceki veya sonraki tarihin seri numarasını döndürür." }
    ]
  }
];

export function FormulaLibrary() {
  const { user, isAuthReady } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleCopy = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(name);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const filteredFormulas = formulas.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

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
            <Link to="/app" className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline text-sm font-medium">Uygulamaya Dön</span>
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

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 text-emerald-700 text-xs sm:text-sm font-medium mb-6 border border-emerald-200/50">
            <FunctionSquare className="w-4 h-4" />
            <span>ExcelAI Formül Kütüphanesi</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            Yapay Zekanın Kullandığı <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">Formülleri ve Makroları Keşfedin</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            ExcelAI, verilerinizi analiz ederken arka planda dünyanın en güçlü Excel formüllerini ve VBA makrolarını kullanır. Sesli komutlarınızın hangi kodlara dönüştüğünü buradan inceleyebilirsiniz.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-1">Canlı Web Arama Desteği</h3>
            <p className="text-blue-700/80 text-sm leading-relaxed">
              ExcelAI, karmaşık makro senaryoları ve en yeni formüller için anlık olarak <strong>web araması</strong> yapar. İhtiyacınız olan kodu burada bulamazsanız, sesli asistana sormanız yeterlidir; sizin için internetteki en güncel çözümü bulup getirecektir.
            </p>
          </div>
        </div>

        <FormulaVoiceAssistant />

        <div className="relative max-w-2xl mx-auto mb-16">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Formül, makro veya açıklama ara... (Örn: VLOOKUP, toplama, satır vurgulama)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-emerald-100 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Info className="w-6 h-6 text-emerald-600" />
            Makro (VBA) Nasıl Çalıştırılır?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 font-bold">1</div>
              <h3 className="font-bold text-slate-800 mb-2">Geliştiriciyi Açın</h3>
              <p className="text-sm text-slate-600">Excel'de klavyenizden <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs font-mono">ALT + F11</kbd> tuşlarına basarak VBA editörünü açın.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 font-bold">2</div>
              <h3 className="font-bold text-slate-800 mb-2">Modül Ekleyin</h3>
              <p className="text-sm text-slate-600">Üst menüden <strong>Insert &gt; Module</strong> seçeneğine tıklayarak yeni bir kod alanı oluşturun.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 font-bold">3</div>
              <h3 className="font-bold text-slate-800 mb-2">Kodu Yapıştırın</h3>
              <p className="text-sm text-slate-600">Buradan kopyaladığınız makro kodunu açılan beyaz pencereye yapıştırın.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 font-bold">4</div>
              <h3 className="font-bold text-slate-800 mb-2">Çalıştırın</h3>
              <p className="text-sm text-slate-600">Kodu çalıştırmak için <kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs font-mono">F5</kbd> tuşuna basın veya yeşil oynat butonuna tıklayın.</p>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {filteredFormulas.length > 0 ? (
            filteredFormulas.map((category, idx) => {
              const Icon = category.icon;
              return (
                <div key={idx} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{category.category} Formülleri</h2>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="bg-white rounded-2xl p-6 border border-emerald-50 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-emerald-700">{item.name}</h3>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <button
                              onClick={() => handleCopy(item.syntax, item.name)}
                              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-100 hover:border-emerald-200"
                            >
                              {copiedItem === item.name ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedItem === item.name ? 'Kopyalandı' : 'Kopyala'}
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3 mb-4 overflow-x-auto custom-scrollbar">
                          <code className="text-xs text-emerald-300 font-mono whitespace-pre">
                            {item.syntax}
                          </code>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-emerald-50 shadow-sm">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">Sonuç Bulunamadı</h3>
              <p className="text-slate-500">Aramanızla eşleşen bir formül bulunamadı. Lütfen başka bir terim deneyin.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
