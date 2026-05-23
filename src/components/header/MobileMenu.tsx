"use client";
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Menu, X, Stethoscope, GraduationCap, Building2, Phone, ArrowRight, Info, FileText } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  isActive: (path: string) => boolean;
  isMBBSIndiaRoute?: boolean;
  isScrolled?: boolean;
}

const MobileMenu = ({ isOpen, onToggle, isActive }: MobileMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on route change handled by Header component

  return (
    <>
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="p-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-fade-in transition-opacity" />
      )}

      {/* Drawer */}
      <div 
        ref={menuRef}
        className={cn(
          "fixed top-0 right-0 h-[100dvh] w-[80vw] max-w-sm bg-white z-[110] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <span className="font-black text-lg text-slate-900 tracking-tight">Navigation</span>
          <button 
            onClick={onToggle}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto py-6 px-4 space-y-8">
          
          {/* Group 1: Core Admissions */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3 mb-3">Programs</h4>
            
            <Link 
              href="/mbbs-india" 
              onClick={onToggle}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                isActive('/mbbs-india') ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <div className={cn("p-2 rounded-lg", isActive('/mbbs-india') ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="font-bold text-[15px]">MBBS India</div>
            </Link>

            <Link 
              href="/md-ms-india" 
              onClick={onToggle}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                isActive('/md-ms-india') ? "bg-purple-50 text-purple-700" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <div className={cn("p-2 rounded-lg", isActive('/md-ms-india') ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500")}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="font-bold text-[15px]">PG – MD/MS</div>
            </Link>
          </div>

          {/* Group 2: Institutions */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3 mb-3">Institutions</h4>
            
            <Link 
              href="/mbbs-india/deemed-universities" 
              onClick={onToggle}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-colors",
                isActive('/mbbs-india/deemed-universities') ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <div className={cn("p-2 rounded-lg", isActive('/mbbs-india/deemed-universities') ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="font-bold text-[15px]">Deemed Universities</div>
            </Link>
          </div>

          {/* Group 3: Company */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-3 mb-3">Company</h4>
            
            <Link href="/services" onClick={onToggle} className="flex items-center gap-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50">
              <Info className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-[15px]">Services</span>
            </Link>
            
            <Link href="/know-us" onClick={onToggle} className="flex items-center gap-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50">
              <FileText className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-[15px]">Know Us</span>
            </Link>

            <Link href="/contact" onClick={onToggle} className="flex items-center gap-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50">
              <Phone className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-[15px]">Contact</span>
            </Link>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <Link
            href="/contact"
            onClick={() => {
              trackEvent('cta_click', { location: 'mobile_menu' });
              onToggle();
            }}
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
          >
            <span>Get Counseling</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
