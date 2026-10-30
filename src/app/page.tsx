"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShoppingBag,
  Tag,
  Search,
  Truck,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Mail,
  Table,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";
import OrderTrackerModal from "@/components/OrderTrackerModal";
import { Product, INITIAL_PRODUCTS } from "@/lib/sampleData";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>(undefined);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, adminRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/admin"),
        ]);
        const prodData = await prodRes.json();
        const adminData = await adminRes.json();

        if (prodData.products && prodData.products.length > 0) {
          setProducts(prodData.products);
        }
        if (adminData.googleSheets?.connected) setSheetsConnected(true);
      } catch (err) {
        console.error("Failed to sync storefront data:", err);
      }
    }
    loadData();
  }, []);

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter(
    (p) => selectedCategory === "All" || p.category === selectedCategory
  );

  function openChatWithPrompt(promptText: string) {
    setChatPrompt(promptText);
    setChatOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        onOpenChat={() => {
          setChatPrompt(undefined);
          setChatOpen(true);
        }}
        onOpenTracker={() => setTrackerOpen(true)}
        sheetsConnected={sheetsConnected}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">


          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            AI Customer Support Agent{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              Grounded in Live Data
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Autonomous customer support powered by <strong>Google Sheets</strong> data, policy intelligence parsed from <strong>company_policies.docx</strong>, and automated refund confirmation emails.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => openChatWithPrompt("What are your current product discounts and special promotions?")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI About Deals</span>
            </button>

            <button
              onClick={() => setTrackerOpen(true)}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-md transition-all flex items-center space-x-2"
            >
              <Truck className="w-4 h-4 text-slate-300" />
              <span>Track Existing Order</span>
            </button>

            <Link
              href="/admin"
              className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium text-sm border border-slate-700 transition-all flex items-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Portal</span>
            </Link>
          </div>

          {/* Quick Architecture Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-8 text-left">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-indigo-400 text-xs font-semibold flex items-center space-x-1.5">
                <Table className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Live catalog & orders database</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-purple-400 text-xs font-semibold flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Mammoth policy extraction</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Human-in-the-Loop</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Admin approval toggle</div>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-pink-400 text-xs font-semibold flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Automated Email</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">HTML refund notifications</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-8">
        {/* Section Heading & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live inventory retrieved from Google Sheets. Inquire with our AI assistant for special member pricing.
            </p>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-slate-100 rounded-2xl p-5 h-64 border border-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const discountedPrice = p.price * (1 - p.discountPercent / 100);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">{p.id}</span>
                      {p.discountPercent > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          {p.discountPercent}% OFF
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {p.category}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-baseline space-x-2 pt-1">
                      <span className="text-lg font-bold text-slate-900">
                        ${discountedPrice.toFixed(2)}
                      </span>
                      {p.discountPercent > 0 && (
                        <span className="text-xs text-slate-400 line-through">
                          ${p.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className={p.stockQuantity > 10 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {p.stockQuantity > 0 ? `In Stock (${p.stockQuantity})` : "Out of Stock"}
                      </span>
                      <span className="text-slate-400">
                        {p.eligibleForRefund ? "30-Day Return" : "Final Sale"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => openChatWithPrompt(`Tell me more about ${p.name} (Price: $${discountedPrice.toFixed(2)}, discount: ${p.discountPercent}%) and return policy eligibility.`)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Ask AI About Product</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Highlights: The End-to-End Workflow */}
        <section className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100">
          <div className="max-w-3xl">
            <h3 className="text-xl font-bold text-slate-900">How the Support Agent Resolves Inquiries</h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Every customer query triggers intelligent reasoning that binds together structured database records and unstructured business policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Grounded Knowledge</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                The AI queries Google Sheets for inventory, exact order delivery dates, and customer loyalty tiers. Pricing and discounts are never hallucinated.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Policy Evaluation</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rules from <code>company_policies.docx</code> (30-day window, DOA full refunds, $5 restocking fees, final-sale exemptions) are cross-checked.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Refund & Email Action</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Refunds are drafted into Google Sheets with Human-in-the-Loop review. Upon approval, automated HTML confirmation receipts are emailed to the customer.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Chat Trigger Bubble */}
      {!chatOpen && (
        <button
          onClick={() => {
            setChatPrompt(undefined);
            setChatOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-sm shadow-xl shadow-indigo-500/30 flex items-center space-x-2.5 transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-1 -right-1 ring-2 ring-indigo-600 animate-ping" />
          </div>
          <span>Chat with Support</span>
        </button>
      )}

      {/* Chat Widget Drawer */}
      <ChatWidget
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        initialPrompt={chatPrompt}
      />

      {/* Order Tracker Modal */}
      <OrderTrackerModal
        isOpen={trackerOpen}
        onClose={() => setTrackerOpen(false)}
        onRequestRefund={(orderId, productName) => {
          openChatWithPrompt(
            `I would like to request a refund for Order #${orderId} (${productName}). The item arrived defective with audio issues.`
          );
        }}
      />
    </div>
  );
}
