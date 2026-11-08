"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Truck,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Package,
  HeartHandshake,
  AlertCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";
import OrderTrackerModal from "@/components/OrderTrackerModal";

export default function PoliciesPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>(undefined);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function openChatWithPrompt(promptText: string) {
    setChatPrompt(promptText);
    setChatOpen(true);
  }

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        onOpenChat={() => {
          setChatPrompt(undefined);
          setChatOpen(true);
        }}
        onOpenTracker={() => setTrackerOpen(true)}
      />

      {/* Hero Header */}
      <section className="bg-white border-b border-slate-200 pt-12 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Returns & Refund Policy
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Everything you need to know about returns, exchanges, and warranty coverage at ApexStore.
          </p>
        </div>
      </section>

      {/* Main Document Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        
        {/* Policy Highlights (Callout Box) */}
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border border-indigo-100/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Policy Highlights</h2>
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

        {/* Clear Editorial Sections */}
        <div className="space-y-8 text-slate-700 text-sm sm:text-base leading-relaxed divide-y divide-slate-200/80">
          
          {/* Section 1 */}
          <div className="space-y-3 pt-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>1. Standard 30-Day Returns</span>
            </h3>
            <p>
              We want you to love what you bought. If you change your mind, you can return most items within <strong>30 calendar days</strong> from the date of delivery.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-sm">
              <li>Items must be in original condition with all cables, manuals, and accessories included.</li>
              <li>Please keep original packaging whenever possible.</li>
              <li><strong>Gold Tier Members:</strong> Enjoy an extended <strong>45-day</strong> return window automatically on all purchases.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-3 pt-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              <span>2. Damaged or Defective Items (DOA)</span>
            </h3>
            <p>
              If your package arrived damaged in transit or the item fails to turn on (Defective on Arrival), you are 100% covered.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-sm">
              <li>Contact us or report it via the Order Tracker within <strong>14 days</strong> of receiving your delivery.</li>
              <li>We will email you a prepaid return shipping label at zero cost to you.</li>
              <li>You can choose between a full 100% refund or an immediate expedited replacement.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-3 pt-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>3. Items That Cannot Be Returned</span>
            </h3>
            <p>
              To protect the health and safety of all customers, certain items are non-returnable once opened:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-sm">
              <li><strong>In-Ear Electronics:</strong> Earbuds and headphones with broken hygiene seals cannot be returned unless they have a manufacturing defect.</li>
              <li><strong>Digital Downloads & Gift Cards:</strong> Digital codes delivered electronically are final sale.</li>
              <li><strong>Physical Misuse:</strong> Products damaged by accidents, water spills, or drops are not eligible for refunds.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-3 pt-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>4. How Refunds & Fees Work</span>
            </h3>
            <p>
              Once your return is received and verified, we process your refund right away. 
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-slate-600 text-sm">
              <li><strong>Payment Method:</strong> Funds are returned directly to the credit card, debit card, or payment account you used when ordering.</li>
              <li><strong>Timeline:</strong> Most financial institutions post the refund within <strong>3 to 5 business days</strong>.</li>
              <li><strong>Restocking Fee:</strong> We charge a small <strong>$5 fee</strong> only on opened-box non-defective returns to inspect, sanitize, and repackage the product. Defective and unopened returns have zero fees.</li>
            </ul>
          </div>

        </div>

        {/* Simple Frequently Asked Questions */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <span>Frequently Asked Questions</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">Quick answers to common questions about orders and returns.</p>
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
                    className="w-full p-4 text-left flex items-center justify-between text-slate-900 hover:text-indigo-600 font-semibold text-sm transition-colors"
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

        {/* Bottom Help Banner */}
        <section className="p-7 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
          <div className="space-y-1.5 text-center sm:text-left">
            <h4 className="text-base sm:text-lg font-bold text-white">Need help with an existing order?</h4>
            <p className="text-xs sm:text-sm text-slate-300">
              Track your shipment in seconds or chat with our 24/7 AI support assistant.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <button
              onClick={() => setTrackerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-all flex items-center space-x-1.5"
            >
              <Truck className="w-4 h-4 text-indigo-300" />
              <span>Track Order</span>
            </button>

            <button
              onClick={() => {
                setChatPrompt(undefined);
                setChatOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </button>
          </div>
        </section>

      </main>

      {/* Floating Chat Bubble */}
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