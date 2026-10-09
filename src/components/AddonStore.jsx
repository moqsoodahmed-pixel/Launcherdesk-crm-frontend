// src/components/AddonStore.jsx
// Customer-facing add-on store — now uses the global cart instead of
// triggering individual Razorpay checkouts per item.
// Users add addons to cart, then check out everything (plan + addons) together.

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Plus, Minus, ShoppingCart, CheckCircle2,
  AlertTriangle, Package, ShieldCheck, User, Mic,
  Globe, BarChart2, Share2,
} from "lucide-react";
import api from "../data/axiosConfig";
import { useCart } from "../context/CartContext";

const BILLING_SUFFIX = { monthly: "/mo", yearly: "/yr", one_time: "" };

const CATEGORY_BADGE = {
  resource: { label: "Resource",  cls: "bg-violet-50 text-violet-600" },
  feature:  { label: "Feature",   cls: "bg-violet-100 text-violet-600" },
  credit:   { label: "AI Minutes",cls: "bg-[amber-50] text-[amber-700]" },
};

const COMBINED_PACK_MINS = {
  transcription_summary_100mins:  100,
  transcription_summary_500mins:  500,
  transcription_summary_1000mins: 1000,
};

const ADDON_ICONS = {
  extra_admin:                    ShieldCheck,
  extra_users_5:                  User,
  transcription_summary_100mins:  Mic,
  transcription_summary_500mins:  Mic,
  transcription_summary_1000mins: Mic,
  transcriptions_5000mins:        Mic,
  transcriptions_20000mins:       Mic,
  summaries_5000mins:             Mic,
  summaries_20000mins:            Mic,
  extra_website:                  Globe,
  extra_google_account:           BarChart2,
  extra_meta_campaign:            Share2,
};

function AddonCard({ addon, onAddToCart, inCart }) {
  const [qty, setQty] = useState(1);
  const [autoRenew, setAutoRenew] = useState(addon.renewalMode === "required");

  const max    = Math.max(1, addon.maxQuantity || 1);
  const badge  = CATEGORY_BADGE[addon.category] || CATEGORY_BADGE.feature;
  const suffix = BILLING_SUFFIX[addon.billingPeriod] ?? "";
  const total  = (addon.price || 0) * qty;

  const isCombined  = !!COMBINED_PACK_MINS[addon.addonType];
  const minuteCount = isCombined ? COMBINED_PACK_MINS[addon.addonType] * qty : null;
  const pricePerMin = isCombined && addon.price > 0
    ? (addon.price / COMBINED_PACK_MINS[addon.addonType]).toFixed(2) : null;

  const showRenewalToggle = addon.renewalMode === "optional";
  const showRenewalBadge  = addon.renewalMode === "required";
  const effectiveAutoRenew = addon.renewalMode === "required" ? true
    : addon.renewalMode === "optional" ? autoRenew : false;

  const Icon = ADDON_ICONS[addon.addonType] || Package;

  return (
    <div className={`surface-card surface-card-hover p-5 flex flex-col transition ${
      inCart ? "!border-violet-400 dark:!border-violet-600 ring-2 ring-violet-200 dark:ring-violet-900" : ""
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-violet-600" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{addon.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {inCart && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">In cart</span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${badge.cls}`}>{badge.label}</span>
        </div>
      </div>

      <p className="text-[12px] text-slate-400 mb-3 flex-1">{addon.description}</p>

      {/* Combined pack pills */}
      {isCombined && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-bold">Transcription</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold">AI Summary</span>
          {pricePerMin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[amber-50] text-[amber-700] text-[10px] font-bold">₹{pricePerMin}/min</span>
          )}
        </div>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-[22px] font-bold text-slate-900 dark:text-white">
          ₹{(addon.price || 0).toLocaleString("en-IN")}
        </span>
        {suffix && <span className="text-[12px] text-slate-400">{suffix}</span>}
        {addon.billingPeriod === "one_time" && <span className="text-[11px] text-slate-400">one-time</span>}
        {minuteCount && <span className="ml-1 text-[11px] font-semibold text-slate-400">· {minuteCount} mins</span>}
      </div>

      {/* Renewal badge */}
      {showRenewalBadge && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200">
          <span className="text-[11px] font-bold text-violet-600">🔄 Auto-renews monthly</span>
        </div>
      )}

      {/* Renewal toggle */}
      {showRenewalToggle && (
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]">
            <div>
              <p className="text-[12px] font-semibold text-slate-900 dark:text-white">Monthly auto-renew</p>
              <p className="text-[10px] text-slate-400">
                {autoRenew ? "Renews each month automatically" : "One-time — re-buy when needed"}
              </p>
            </div>
            <button
              onClick={() => setAutoRenew(r => !r)}
              aria-pressed={autoRenew}
              className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${autoRenew ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoRenew ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      )}

      {/* Qty */}
      {max > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Qty</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:border-violet-600 hover:text-violet-600 transition">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-[13px] font-bold text-slate-900 dark:text-white">{qty}</span>
            <button onClick={() => setQty(q => Math.min(max, q + 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:border-violet-600 hover:text-violet-600 transition">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Add to cart / already in cart */}
      <button
        onClick={() => onAddToCart(addon, qty, effectiveAutoRenew)}
        className={`flex items-center justify-center gap-2 w-full mt-auto ${
          inCart
            ? "btn-secondary btn-md !border-2 !border-violet-400 dark:!border-violet-600 !text-violet-600 dark:!text-violet-400"
            : "btn-primary btn-md"
        }`}
      >
        {inCart ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
        {inCart
          ? `Update cart · ₹${total.toLocaleString("en-IN")}${suffix}`
          : effectiveAutoRenew
            ? `Add to cart · ₹${total.toLocaleString("en-IN")}/mo`
            : `Add to cart · ₹${total.toLocaleString("en-IN")}`}
      </button>
    </div>
  );
}

// ── AddonStore ────────────────────────────────────────────────────────────────
export default function AddonStore({ onCartOpen }) {
  const [addons,  setAddons]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const { addAddon, addonItems } = useCart();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/subscription/addons");
      setAddons(Array.isArray(data?.addons) ? data.addons : []);
    } catch {
      setError("Could not load add-ons. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddToCart = (addon, quantity, autoRenew) => {
    addAddon({
      type:          "addon",
      addonType:     addon.addonType,
      addonName:     addon.name,
      quantity,
      autoRenew,
      billingPeriod: addon.billingPeriod,
      price:         (addon.price || 0) * quantity,
      category:      addon.category,
      renewalMode:   addon.renewalMode,
      maxQuantity:   addon.maxQuantity || 1,
    });
    onCartOpen?.();   // open drawer when first item added
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-[13px] font-semibold text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {addonItems.length > 0 && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-800/40">
          <p className="text-[12px] font-semibold text-violet-700 dark:text-violet-400">
            {addonItems.length} add-on{addonItems.length !== 1 ? "s" : ""} in cart
          </p>
          <button
            onClick={() => onCartOpen?.()}
            className="text-[12px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> View cart
          </button>
        </div>
      )}

      {addons.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-[13px] text-slate-400">No add-ons are available for your plan right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {addons.map(a => (
            <AddonCard
              key={a.addonType}
              addon={a}
              onAddToCart={handleAddToCart}
              inCart={addonItems.some(i => i.addonType === a.addonType)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
