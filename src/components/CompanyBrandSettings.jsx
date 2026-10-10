// src/components/CompanyBrandSettings.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SuperAdmin panel: set company name + logo that appear in the Sidebar navbar
// across ALL interfaces.
//
// Backend expected:
//   GET  /admin/company/brand         → { name, logoUrl }
//   PUT  /admin/company/brand         → body: FormData (name, logo file)
//   DELETE /admin/company/brand/logo  → removes the logo
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import api from "../data/axiosConfig";
import { Palette, Upload, X, ImageOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function CompanyBrandSettings() {
  const [brand,      setBrand]      = useState({ name: "", logoUrl: "" });
  const [nameInput,  setNameInput]  = useState("");
  const [preview,    setPreview]    = useState(null);
  const [file,       setFile]       = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");
  const fileRef = useRef();

  useEffect(() => {
    api.get("/admin/company/brand")
      .then((res) => {
        setBrand(res.data || {});
        setNameInput(res.data?.name || "");
      })
      .catch(() => {});
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please upload an image file (PNG, JPG, SVG)"); return; }
    if (f.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const form = new FormData();
      form.append("name", nameInput.trim());
      if (file) form.append("logo", file);
      // Do NOT set Content-Type manually — axios must auto-generate it with the
      // correct multipart boundary. Setting it manually drops the boundary and
      // the server cannot parse the uploaded file.
      const res = await api.put("/admin/company/brand", form);
      // Stamp a timestamp so the header img cache-busts on every save
      const brandWithTs = { ...res.data, _ts: Date.now() };
      setBrand(brandWithTs);
      localStorage.setItem("company_brand", JSON.stringify(brandWithTs));
      // Notify header bar to re-render with new logo
      window.dispatchEvent(new Event("company_brand_updated"));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm("Remove the company logo?")) return;
    try {
      await api.delete("/admin/company/brand/logo");
      const updatedBrand = { ...brand, logoUrl: "", _ts: Date.now() };
      setBrand(updatedBrand);
      setPreview(null);
      setFile(null);
      localStorage.setItem("company_brand", JSON.stringify(updatedBrand));
      window.dispatchEvent(new Event("company_brand_updated"));
    } catch {
      setError("Failed to remove logo");
    }
  };

  const currentLogo = preview || brand.logoUrl;

  return (
    <div className="min-h-screen ld-canvas">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">

        {/* Page header */}
        <div className="ld-hero rounded-3xl px-5 sm:px-7 py-5 sm:py-6 text-white flex items-center gap-3 mb-5 flex-wrap">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white">Brand Settings</h1>
            <p className="text-xs text-white/75">Logo and name shown in the navbar across all interfaces.</p>
          </div>
        </div>

        <div className="surface-card p-6">
          {/* Company Name */}
          <div className="mb-5">
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="input-field px-3 py-2.5"
              maxLength={40}
            />
            <p className="text-[11px] text-slate-500 mt-1.5">Displayed next to the logo in the sidebar header</p>
          </div>

          {/* Logo Upload */}
          <div className="mb-6">
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Company Logo
            </label>
            <div className="flex items-center gap-4">
              {currentLogo ? (
                <div className="relative">
                  <img
                    src={currentLogo}
                    alt="logo preview"
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-auto max-w-[130px] object-contain rounded-xl border border-slate-200 dark:border-white/10 bg-white p-1.5 shadow-xs"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition shadow-xs"
                    title="Remove logo"
                  >
                    <X className="w-3 h-3" strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <ImageOff className="w-6 h-6" />
                </div>
              )}
              <div>
                <button onClick={() => fileRef.current?.click()} className="btn-secondary btn-sm">
                  <Upload className="w-3.5 h-3.5" />
                  {currentLogo ? "Change Logo" : "Upload Logo"}
                </button>
                <p className="text-[11px] text-slate-500 mt-1.5">PNG, JPG or SVG · max 2 MB</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-[12.5px] text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[12.5px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Branding saved! The sidebar will update immediately.
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="btn-primary btn-md w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save Branding"}
          </button>
        </div>
      </div>
    </div>
  );
}
