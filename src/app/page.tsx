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
  Package,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MapPin,
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I start a return or refund?",
      a: "It only takes a minute. Click 'Track Order' at the top of the page, enter your Order ID (like ORD-1001), and tap 'Request Refund'. You can also chat directly with our assistant Eren at any time to process it for you.",
    },
    {
      q: "When will I see the money back in my account?",
      a: "Once approved, refunds are processed immediately. Depending on your bank or credit card provider, the funds typically appear in your account within 3 to 5 business days.",
    },
    {
      q: "What if my item arrived broken or defective?",
      a: "If an item arrives damaged or doesn't work out of the box, you are covered 100%. We provide a free prepaid return label and issue a full refund or an immediate replacement—no restocking fees ever.",
    },
    {
      q: "Can I return opened earbuds or headphones?",
      a: "For health and sanitary reasons, opened in-ear audio products (such as wireless earbuds) cannot be returned once the protective seal is broken, unless the device arrived defective or has a hardware issue.",
    },
    {
      q: "Is there a restocking fee?",
      a: "Defective items and unopened returns have zero fees. A standard $5 restocking fee only applies if a non-defective product has been opened and its packaging unsealed.",
    },
  ];

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

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
        onScrollToProducts={() => scrollToSection("products")}
        onScrollToPolicies={() => scrollToSection("policies")}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-900 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            ApexStore{" "}
            <span className="block text-2xl sm:text-3xl lg:text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-purple-200 to-pink-300 mt-2 pb-2 leading-normal">
              Engineered for Performance. Designed for Life.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            We believe premium technology should be built to last, priced honestly, and supported with total transparency. Explore audio, wearables, and computing essentials crafted to elevate your daily flow.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => scrollToSection("products")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Collection</span>
            </button>

            <button
              onClick={() => setTrackerOpen(true)}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-md transition-all flex items-center space-x-2"
            >
              <Truck className="w-4 h-4 text-slate-300" />
              <span>Track Your Order</span>
            </button>

            <button
              onClick={() => scrollToSection("policies")}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-md transition-all flex items-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-slate-300" />
              <span>Store Policies</span>
            </button>
          </div>

          {/* Store Guarantees */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-8 text-left">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-indigo-300 text-xs font-semibold flex items-center space-x-1.5">
                <Truck className="w-4 h-4" />
                <span>Express Delivery</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Real-time package tracking with fast dispatch</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-purple-300 text-xs font-semibold flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>2-Year Warranty</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Full hardware protection & defect guarantee</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-emerald-300 text-xs font-semibold flex items-center space-x-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>30-Day Returns</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Hassle-free exchanges and prompt refunds</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-pink-300 text-xs font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>24/7 Concierge</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Instant support, product advice, and lookup</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Content */}
      <main id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full space-y-8">
        {/* Section Heading & Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Explore our latest collection of premium audio, wearables, and computing essentials.
            </p>
          </div>

          {/* Categories */}
          <div className="relative max-w-full overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pr-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-slate-50 to-transparent" />
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
                    {/* Visual Product Illustration Box */}
                    <div className="w-full h-48 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center overflow-hidden group-hover:scale-[1.02] transition-transform relative">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-indigo-400/80" />
                      )}
                    </div>

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

        {/* Customer-Facing Policies & Returns Section */}
        <section id="policies" className="pt-16 pb-6 border-t border-slate-200 space-y-10 scroll-mt-20">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Returns & Refund Policy
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Everything you need to know about returns, exchanges, and warranty coverage at ApexStore.
            </p>
          </div>

          {/* Policy Highlights Box */}
          <div className="max-w-4xl mx-auto p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border border-indigo-100/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Policy Highlights</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm text-slate-700">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>30 Days to Return:</strong> You have 30 days from delivery to return items you don't want.</span>
              </div>

              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>100% Free if Defective:</strong> If it arrives broken, we replace it or refund you completely with free shipping.</span>
              </div>

              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Opened Earbuds:</strong> For sanitary reasons, opened in-ear headphones cannot be returned unless defective.</span>
              </div>

              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Fast Payouts:</strong> Refunds typically show back on your payment card within 3 to 5 business days.</span>
              </div>
            </div>
          </div>

          {/* Detailed Plain-English Sections */}
          <div className="max-w-4xl mx-auto space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed divide-y divide-slate-200/80">
            {/* Section 1 */}
            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <span>1. Standard 30-Day Returns</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                We want you to love what you bought. If you change your mind, you can return most items within <strong>30 calendar days</strong> from the date of delivery.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-xs sm:text-sm">
                <li>Items must be in original condition with all cables, manuals, and accessories included.</li>
                <li>Please keep original packaging whenever possible.</li>
                <li><strong>Gold Tier Members:</strong> Enjoy an extended <strong>45-day</strong> return window automatically on all purchases.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-3 pt-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
                <span>2. Damaged or Defective Items (DOA)</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                If your package arrived damaged in transit or the item fails to turn on (Defective on Arrival), you are 100% covered.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-xs sm:text-sm">
                <li>Report it via the Order Tracker within <strong>14 days</strong> of receiving delivery.</li>
                <li>We provide a prepaid return shipping label at zero cost to you.</li>
                <li>You can choose between a full 100% refund or an immediate expedited replacement.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3 pt-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>3. Items That Cannot Be Returned</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                To protect the health and safety of all customers, certain items are non-returnable once opened:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-xs sm:text-sm">
                <li><strong>In-Ear Electronics:</strong> Earbuds and headphones with broken hygiene seals cannot be returned unless defective.</li>
                <li><strong>Digital Downloads & Gift Cards:</strong> Digital codes delivered electronically are final sale.</li>
                <li><strong>Physical Misuse:</strong> Products damaged by accidents, water spills, or drops are not eligible for refunds.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3 pt-8">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>4. How Refunds & Fees Work</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Once your return is received and verified, we process your refund right away.
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-xs sm:text-sm">
                <li><strong>Payment Method:</strong> Funds are returned directly to your original payment card.</li>
                <li><strong>Timeline:</strong> Financial institutions typically post the refund within <strong>3 to 5 business days</strong>.</li>
                <li><strong>Restocking Fee:</strong> A small <strong>$5 fee</strong> applies only on opened-box non-defective returns. Defective and unopened returns have zero fees.</li>
              </ul>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="max-w-4xl mx-auto space-y-4 pt-6 border-t border-slate-200">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <span>Frequently Asked Questions</span>
              </h3>
              <p className="text-xs text-slate-500">Quick answers to common questions about orders and returns.</p>
            </div>

            <div className="space-y-2.5">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all shadow-xs"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between text-slate-900 hover:text-indigo-600 font-semibold text-xs sm:text-sm transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Demo Customer Support & Contact Section */}
        <section id="contact" className="mt-16 pt-10 border-t border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Need Help? Contact Customer Support</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Have questions about a product, shipping, or returns? We are here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2">
            {/* Card 1: Email */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Email Support</h4>
              <p className="text-xs text-slate-600 font-mono">support@apexstore.com</p>
              <p className="text-[11px] text-slate-400">Response within 24 business hours</p>
            </div>

            {/* Card 2: Live Concierge */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Live AI Concierge</h4>
              <p className="text-xs text-slate-600">
                Click the chat bubble in the bottom right to talk with <strong>Eren</strong>.
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">Instant 24/7 assistance</p>
            </div>

            {/* Card 3: Store Hours & HQ */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Support Hours</h4>
              <p className="text-xs text-slate-600">Monday – Friday: 9:00 AM – 6:00 PM EST</p>
              <p className="text-[11px] text-slate-400">ApexStore Demo Operations</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>&copy; 2026 ApexStore Inc. All rights reserved. E-Commerce Concierge Demo.</p>
      </footer>

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
