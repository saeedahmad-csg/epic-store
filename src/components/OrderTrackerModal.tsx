"use client";

import { useState } from "react";
import { X, Search, PackageCheck, Clock, Truck, ShieldAlert, ArrowRight, CornerDownRight } from "lucide-react";
import { Order } from "@/lib/sampleData";

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestRefund: (orderId: string, productName: string) => void;
}

export default function OrderTrackerModal({
  isOpen,
  onClose,
  onRequestRefund,
}: OrderTrackerModalProps) {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(`/api/orders?orderId=${encodeURIComponent(searchId.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Order not found. Please try ORD-1001, ORD-1002, ORD-1003.");
      } else {
        setOrder(data.order);
      }
    } catch (err: any) {
      setError("Failed to fetch order details.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickSelect(id: string) {
    setSearchId(id);
    // Automatically trigger fetch
    setLoading(true);
    setError(null);
    setOrder(null);
    fetch(`/api/orders?orderId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        else setError("Order not found");
      })
      .catch(() => setError("Failed to fetch order"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Track Your Order</h3>
              <p className="text-xs text-slate-500">Live order lookup powered by Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Order ID (e.g. ORD-1001, ORD-1002)..."
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <button
              type="submit"
              disabled={loading || !searchId.trim()}
              className="absolute right-1.5 top-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              {loading ? "Searching..." : "Track"}
            </button>
          </form>

          {/* Sample quick picks */}
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Quick try:</span>
            {["ORD-1001", "ORD-1002", "ORD-1003", "ORD-1004"].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => handleQuickSelect(id)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono text-[11px] transition-colors"
              >
                {id}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Details Display */}
          {order && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{order.orderId}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        order.orderStatus === "Delivered"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.orderStatus === "Shipped"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 text-base">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Item:</span>
                    <span className="font-medium text-slate-800">{order.productName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Customer:</span>
                    <span className="font-medium text-slate-800">{order.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ordered On:</span>
                    <span className="font-medium text-slate-800">{order.orderDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Delivered On:</span>
                    <span className="font-medium text-slate-800">{order.deliveryDate}</span>
                  </div>
                </div>
              </div>

              {/* Action: Ask AI for Refund */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-indigo-950">Issue with this order?</h4>
                  <p className="text-[11px] text-indigo-700">
                    Eren can verify policy eligibility & process your refund.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onRequestRefund(order.orderId, order.productName);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  <span>Request Refund</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
