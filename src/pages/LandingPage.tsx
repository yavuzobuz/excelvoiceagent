import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Mic, BarChart3, ArrowRight, Sparkles, Shield, Zap, Play, Search, Calculator, TrendingUp, Menu, X, PieChart, LineChart, LogIn, User } from 'lucide-react';
import { Footer } from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogle, logout } from '../firebase';

export const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
      <FileSpreadsheet className="w-6 h-6 text-white" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
        <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
      </div>
    </div>
    <span className="text-xl font-bold tracking-tight text-slate-800">ExcelAI</span>
  </div>
);

export function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user, isAuthReady } = useAuth();
  
  const words = ["Sesli Komutlarla", "Yapay Zeka ile", "Otomatik Grafiklerle", "Akıllı Formüllerle", "Saniyeler İçinde"];
  const slides = [
    {
      src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop",
      overlay1: {
        title: "Siz",
        icon: Mic,
        text: '"Geçen ayın en yüksek satışını gösterir misin?"'
      },
      overlay2: {
        title: "Sesli Asistan",
        icon: Sparkles,
        text: "En yüksek satış 245.000 TL ile Kasım ayında gerçekleşmiştir. Ekranda grafiğini görebilirsiniz.",
        formula: "=MAX(IFS(A:A, \">=2023-11-01\", A:A, \"<=2023-11-30\", B:B))"
      }
    },
    {
      src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop",
      overlay1: {
        title: "Siz",
        icon: Mic,
        text: '"Müşteri yaş dağılımı nasıl?"'
      },
      overlay2: {
        title: "Sesli Asistan",
        icon: Sparkles,
        text: "Yeni kullanıcıların %45'i 25-34 yaş aralığında. Genç kitleye yönelik kampanyalar önerebilirim.",
        formula: "=COUNTIFS(Yas, \">=25\", Yas, \"<=34\") / COUNTA(Yas)"
      }
    },
    {
      src: "https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=2070&auto=format&fit=crop",
      overlay1: {
        title: "Siz",
        icon: Mic,
        text: '"Yıl sonu kar tahmini nedir?"'
      },
      overlay2: {
        title: "Sesli Asistan",
        icon: Sparkles,
        text: "Mevcut büyüme trendiyle 3. çeyrek hedeflerine %15 daha erken ulaşılacak.",
        formula: "=FORECAST.LINEAR(Q4_Hedef, Mevcut_Buyume, Gecmis_Veri)"
      }
    },
    {
      src: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=2076&auto=format&fit=crop",
      overlay1: {
        title: "Siz",
        icon: Mic,
        text: '"Sistem performansı ne durumda?"'
      },
      overlay2: {
        title: "Sesli Asistan",
        icon: Sparkles,
        text: "Sistem yanıt süreleri %30 iyileşti. Veritabanı sorguları optimize edildi.",
        formula: "=AVERAGE(Yakit_Suresi) * 0.70"
      }
    }
  ];

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    
    return () => {
      clearInterval(wordInterval);
      clearInterval(imageInterval);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f9f5] text-slate-800 font-sans selection:bg-emerald-200 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] opacity-40 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-200/50 to-transparent blur-[100px] rounded-full mix-blend-multiply" />
      </div>

      <header className="relative z-50 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between w-full bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm sticky top-0">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-emerald-600 transition-colors">Özellikler</a>
          <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">Nasıl Çalışır</a>
          <Link to="/formulas" className="hover:text-emerald-600 transition-colors">Formül Kütüphanesi</Link>
          <Link to="/macro-builder" className="hover:text-emerald-600 transition-colors">Makro Oluşturucu</Link>
          <a href="#security" className="hover:text-emerald-600 transition-colors">Güvenlik</a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthReady ? (
            user ? (
              <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profil" className="w-6 h-6 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-sm font-medium">Profil</span>
              </Link>
            ) : (
              <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all text-sm font-medium">
                <LogIn className="w-4 h-4" />
                Giriş Yap
              </Link>
            )
          ) : (
            <div className="hidden sm:flex items-center justify-center px-3 py-2 w-[100px]">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>
          <Link to="/app" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-sm font-medium shadow-sm ml-1">
            Uygulamaya Git
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-emerald-600 transition-colors z-50 relative rounded-lg hover:bg-slate-100"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-md lg:hidden flex flex-col items-center justify-center gap-8 animate-in fade-in duration-200">
          <nav className="flex flex-col items-center gap-6 text-lg font-bold text-slate-800">
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Özellikler</a>
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Nasıl Çalışır</a>
            <Link to="/formulas" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Formül Kütüphanesi</Link>
            <Link to="/macro-builder" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Makro Oluşturucu</Link>
            <a href="#security" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Güvenlik</a>
          </nav>
          <Link 
            to="/app" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-8 py-3 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg"
          >
            Uygulamaya Git
          </Link>
        </div>
      )}

      <main className="flex-1 relative z-10 max-w-7xl mx-auto px-6 pt-8 lg:pt-16 pb-20 lg:pb-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Hero Content */}
          <div className="max-w-2xl text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100/50 border border-emerald-200/50 text-emerald-700 text-[10px] sm:text-xs font-bold tracking-wide uppercase mb-6 lg:mb-8 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Geleceğin Veri Analizi</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 lg:mb-8 text-slate-900">
              Excel Verilerinizi <br className="hidden sm:block" />
              <span 
                key={wordIndex}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 animate-text-shine animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                {words[wordIndex]}
              </span> Analiz Edin.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 lg:mb-10 max-w-xl">
              Excel tablolarınızı yükleyin ve yapay zeka destekli sesli asistanımızla verilerinizi analiz edin. Sadece mikrofonunuza konuşun, o size sesli yanıt versin ve grafikleri hazırlasın.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link to="/app" className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 group shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:-translate-y-0.5">
                Hemen Başla
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#demo" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-slate-700 font-bold hover:bg-slate-50 border border-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow">
                <Play className="w-4 h-4 fill-current" />
                Demoyu İzle
              </a>
            </div>

            <div className="mt-12 lg:mt-16 flex items-center justify-center lg:justify-start gap-6 sm:gap-8 border-t border-emerald-100 pt-8 w-full">
              <div className="flex flex-col gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">10x</span>
                <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-bold">Daha Hızlı Analiz</span>
              </div>
              <div className="w-px h-12 bg-emerald-100" />
              <div className="flex flex-col gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">%100</span>
                <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-bold">Doğal Dil Desteği</span>
              </div>
            </div>
          </div>

          {/* Premium Image Mockup */}
          <div className="relative h-auto lg:h-[600px] flex items-center justify-center mt-12 lg:mt-0">
            {/* Glow behind mockup */}
            <div className="absolute inset-0 bg-emerald-400/20 blur-[60px] lg:blur-[100px] rounded-full" />
            
            {/* Mockup Container */}
            <div className="relative w-full max-w-2xl bg-white rounded-[1.5rem] lg:rounded-[2rem] border border-emerald-100 shadow-2xl shadow-emerald-900/10 overflow-hidden transform lg:rotate-[2deg] hover:rotate-0 transition-transform duration-700">
              {/* Browser Chrome */}
              <div className="h-10 lg:h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 lg:w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 lg:w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 lg:w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="mx-auto bg-white border border-slate-200 rounded-md px-8 sm:px-16 lg:px-32 py-0.5 lg:py-1 text-[10px] lg:text-xs text-slate-400 font-medium truncate">
                  excelai.app
                </div>
              </div>
              
              {/* Mockup Image */}
              <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                {slides.map((slide, idx) => (
                  <img 
                    key={slide.src}
                    src={slide.src} 
                    alt={`Dashboard Analytics ${idx + 1}`} 
                    className={`absolute inset-0 w-full h-full object-cover mix-blend-multiply transition-opacity duration-1000 ${
                      idx === currentImageIndex ? 'opacity-90' : 'opacity-0'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ))}
                
                {/* Overlay UI Elements to make it look like our app */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent flex flex-col justify-end p-8 pb-24">
                  <div className="relative w-full h-full">
                    {slides.map((slide, idx) => {
                      const Icon1 = slide.overlay1.icon;
                      const Icon2 = slide.overlay2.icon;
                      
                      return (
                        <div 
                          key={`overlays-${idx}`}
                          className={`absolute inset-0 flex flex-col justify-end transition-all duration-1000 ${
                            idx === currentImageIndex 
                              ? 'opacity-100 z-10' 
                              : 'opacity-0 pointer-events-none z-0'
                          }`}
                        >
                          <div className={`bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-emerald-50 max-w-sm ml-auto mb-4 transform transition-transform duration-1000 ${idx === currentImageIndex ? 'translate-x-0' : 'translate-x-4'}`}>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Icon1 className="w-4 h-4 text-emerald-600" />
                              </div>
                              <span className="text-sm font-bold text-slate-800">{slide.overlay1.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium italic leading-relaxed">
                              {slide.overlay1.text}
                            </p>
                          </div>

                          <div className={`bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-emerald-50 max-w-sm mr-auto mb-8 transform transition-transform duration-1000 delay-300 ${idx === currentImageIndex ? 'translate-x-0' : '-translate-x-4'}`}>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Icon2 className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-bold text-slate-800">{slide.overlay2.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed mb-3">
                              {slide.overlay2.text}
                            </p>
                            {slide.overlay2.formula && (
                              <div className="bg-slate-900 rounded-lg p-2.5 flex items-center gap-2 overflow-hidden border border-slate-700">
                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                  <span className="text-[8px] font-bold text-emerald-400">fx</span>
                                </div>
                                <code className="text-[10px] sm:text-xs text-emerald-300 font-mono truncate">
                                  {slide.overlay2.formula}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Voice Control Indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
                  <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75 duration-1000"></div>
                    <Mic className="w-6 h-6 relative z-10" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white/90 px-3 py-1 rounded-full shadow-sm backdrop-blur-md">
                    Sizi Dinliyor...
                  </span>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute top-10 lg:top-20 -right-4 lg:-right-8 bg-white border border-emerald-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-xl animate-bounce z-20" style={{ animationDuration: '3s' }}>
              <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
            </div>
            <div className="absolute bottom-20 lg:bottom-32 -left-4 lg:-left-8 bg-white border border-emerald-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-xl animate-bounce z-20" style={{ animationDuration: '4s', animationDelay: '1s' }}>
              <Mic className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
            </div>
            <div className="absolute top-1/2 -right-12 bg-white border border-emerald-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl shadow-xl animate-pulse z-20 hidden xl:block">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Formül</span>
              </div>
              <code className="text-[10px] text-emerald-600 font-mono">=VLOOKUP(A2; 'Data'!A:B; 2; 0)</code>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 bg-white border-t border-emerald-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">Neden ExcelAI?</h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">Geleneksel veri analizi yöntemlerini unutun. Sadece konuşarak saniyeler içinde içgörüler elde edin.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Mic, title: "Sesli Komutlar", desc: "Verilerinize doğal dilde sorular sorun, anında sesli yanıtlar alın." },
              { icon: BarChart3, title: "Anında Görselleştirme", desc: "İstediğiniz veriyi saniyeler içinde çubuk, çizgi veya pasta grafiklere dönüştürün." },
              { icon: Calculator, title: "Formül Asistanı", desc: "Düşeyara'dan Çaprazara'ya tüm Excel formüllerini AI ile anında oluşturun ve kopyalayın." },
              { icon: TrendingUp, title: "Senaryo Analizi", desc: "'Fiyatlar %10 artarsa ne olur?' gibi what-if senaryolarını anında simüle edin." },
              { icon: Search, title: "Akıllı Veri Arama", desc: "Binlerce satır arasından aradığınız veriyi saniyeler içinde sesinizle bulun." },
              { icon: Shield, title: "Güvenli Analiz", desc: "Verileriniz tarayıcınızda işlenir, güvenli ve gizli kalır." }
            ].map((feature, idx) => (
              <div key={idx} className="bg-[#f4f9f5] border border-emerald-100/50 p-6 lg:p-8 rounded-2xl lg:rounded-3xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors">
                  <feature.icon className="w-6 h-6 lg:w-7 lg:h-7 text-emerald-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-sm lg:text-base text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 bg-[#f4f9f5] py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">Nasıl Çalışır?</h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">Sadece 3 basit adımda verilerinizle konuşmaya başlayın.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] h-0.5 bg-emerald-200 -translate-y-1/2 z-0" />
            
            {[
              { step: "1", title: "Dosyanızı Yükleyin", desc: "Excel (.xlsx, .xls) veya CSV dosyanızı güvenle sisteme yükleyin." },
              { step: "2", title: "Sorunuzu Sorun", desc: "Mikrofona tıklayın ve verileriniz hakkında doğal dilde sorular sorun." },
              { step: "3", title: "Anında Yanıt Alın", desc: "Yapay zeka verilerinizi analiz etsin ve size sesli/görsel yanıtlar sunsun." }
            ].map((item, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center text-center bg-white p-8 rounded-3xl shadow-sm border border-emerald-100">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white text-2xl font-bold flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-10 bg-slate-900 text-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-8">
                <Shield className="w-4 h-4" />
                <span>Maksimum Güvenlik</span>
              </div>
              <h2 className="text-3xl lg:text-5xl font-extrabold mb-6">Verileriniz Güvende.</h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                ExcelAI, verilerinizin gizliliğini en üst düzeyde tutar. Yüklediğiniz dosyalar sadece sizin tarayıcınızda işlenir ve analiz edilir.
              </p>
              <ul className="space-y-4">
                {[
                  "Uçtan uca şifreleme",
                  "Sunucuda veri tutulmaz",
                  "KVKK ve GDPR uyumlu",
                  "İstediğiniz an verileri silme"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
              <div className="relative bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl">
                <Shield className="w-24 h-24 text-emerald-400 mx-auto mb-8 opacity-80" />
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">Kurumsal Düzeyde Koruma</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Tüm analiz işlemleri güvenli bir ortamda gerçekleşir. Hassas finansal veya kişisel verileriniz asla üçüncü şahıslarla paylaşılmaz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
