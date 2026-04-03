import React from 'react';
import { Github, Twitter, Linkedin, Mail, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full border-t border-emerald-100/50 bg-white/40 backdrop-blur-md mt-auto relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-800">
              <div className="p-1.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              Excel<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">AI</span>
            </Link>
            <p className="text-sm text-slate-500 font-medium text-center md:text-left leading-relaxed">
              Verilerinizle doğal dilde konuşun, <br className="hidden md:block" />
              analizleri saniyeler içinde tamamlayın.
            </p>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-6 md:gap-8 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-emerald-600 transition-colors">Hakkımızda</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Gizlilik</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Şartlar</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">İletişim</a>
          </div>

          {/* Socials */}
          <div className="flex justify-center md:justify-end gap-4">
            <a href="#" className="p-2.5 rounded-full bg-white border border-emerald-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm hover:shadow">
              <span className="sr-only">Twitter</span>
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="p-2.5 rounded-full bg-white border border-emerald-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm hover:shadow">
              <span className="sr-only">GitHub</span>
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="p-2.5 rounded-full bg-white border border-emerald-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm hover:shadow">
              <span className="sr-only">LinkedIn</span>
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="#" className="p-2.5 rounded-full bg-white border border-emerald-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm hover:shadow">
              <span className="sr-only">Email</span>
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-emerald-100/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} ExcelAI. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1">
            Yapay Zeka Destekli Veri Asistanı
          </p>
        </div>
      </div>
    </footer>
  );
}
