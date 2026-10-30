"use client";

import Link from "next/link";
import { Sparkles, Bot, ShieldCheck, ShoppingBag, Search, ExternalLink } from "lucide-react";

interface NavbarProps {
  onOpenChat: (initialPrompt?: string) => void;
  onOpenTracker: () => void;
  sheetsConnected?: boolean;
}

export default function Navbar({ onOpenChat, onOpenTracker, sheetsConnected }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:shadow-indigo-200 transition-all">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
                ApexStore
              </span>
            </div>
          </Link>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            href="/"
            className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Storefront
          </Link>
          <button
            onClick={onOpenTracker}
            className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Order</span>
          </button>
          <Link
            href="/admin"
            className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>Admin Portal</span>
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* AI Support Button */}
          <button
            onClick={() => onOpenChat()}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium shadow-md shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Support</span>
          </button>
        </div>
      </div>
    </header>
  );
}
