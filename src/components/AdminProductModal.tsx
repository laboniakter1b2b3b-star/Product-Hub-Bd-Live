import React, { useState, useMemo } from 'react';
import { X, Upload, ArrowLeft, ArrowRight, Plus, Trash2, Video, ExternalLink } from 'lucide-react';
import type { Category, Product, ProductColor, ProductSpec } from '../types.ts';
import { apiFetch, uploadImageFile, uploadVideoFile } from '../lib/api.ts';

interface Props {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  toast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function AdminProductModal({ product, categories, onClose, onSaved, toast }: Props) {
  const [name, setName] = useState(product?.name || '');
  const [productCode, setProductCode] = useState(
    product?.product_code || `PHB-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [sku, setSku] = useState(product?.sku || `PHB-SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [brand, setBrand] = useState(product?.brand || 'Atelier Dhaka');
  const [category, setCategory] = useState(product?.category || categories[0]?.name || 'Apparel');
  const [subcategory, setSubcategory] = useState(product?.subcategory || '');
  const [productType, setProductType] = useState<'direct' | 'aliexpress_affiliate'>(
    product?.product_type === 'aliexpress_affiliate' ? 'aliexpress_affiliate' : 'direct'
  );
  const [affiliateUrl, setAffiliateUrl] = useState(product?.affiliate_url || '');
  const [affiliateCommissionRate, setAffiliateCommissionRate] = useState(
    product?.affiliate_commission_rate !== null && product?.affiliate_commission_rate !== undefined
      ? String(product.affiliate_commission_rate)
      : ''
  );
  const [affiliateReportedOrders, setAffiliateReportedOrders] = useState(
    String(product?.affiliate_reported_orders ?? 0)
  );
  const [affiliateReportedCommission, setAffiliateReportedCommission] = useState(
    String(product?.affiliate_reported_commission ?? 0)
  );
  const [status, setStatus] = useState(product?.status || 'Active');

  const [regularPrice, setRegularPrice] = useState(String(product?.regular_price ?? 2500));
  const [salePrice, setSalePrice] = useState(product?.sale_price ? String(product.sale_price) : '');
  const [costPrice, setCostPrice] = useState(String(product?.cost_price ?? 1200));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.low_stock_threshold ?? 5));

  const [piecesInfo, setPiecesInfo] = useState(product?.pieces_info || '1 Piece');
  const [weight, setWeight] = useState(product?.weight || '450g');
  const [material, setMaterial] = useState(product?.material || '');
  const [warrantyInfo, setWarrantyInfo] = useState(product?.warranty_info || '7-Day Exchange Guarantee');
  const [shortDesc, setShortDesc] = useState(product?.short_description || '');
  const [description, setDescription] = useState(product?.description || '');
  const [videoUrl, setVideoUrl] = useState(product?.video_url || '');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [searchKeywords, setSearchKeywords] = useState(product?.search_keywords || '');
  const [tagsInput, setTagsInput] = useState((product?.tags || []).join(', '));

  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isBestseller, setIsBestseller] = useState(product?.is_bestseller ?? false);
  const [isSpecialOffer, setIsSpecialOffer] = useState(product?.is_special_offer ?? false);

  const [images, setImages] = useState<string[]>(
    product?.images?.length ? product.images : ['/src/assets/images/product_oxford_shirt_1795097543187.jpg']
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  const [sizes, setSizes] = useState<string[]>(product ? product.sizes : ['S', 'M', 'L', 'XL']);
  const [customSize, setCustomSize] = useState('');

  const [colors, setColors] = useState<ProductColor[]>(
    product ? product.colors : [{ name: 'Charcoal', hex: '#2F3337' }]
  );
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#14B8A6');

  const [variantStock, setVariantStock] = useState<Record<string, number>>(() => {
    if (product?.variant_stock && Object.keys(product.variant_stock).length > 0) {
      return { ...product.variant_stock };
    }
    if (product) return {};
    return { 'S|Charcoal': 5, 'M|Charcoal': 8, 'L|Charcoal': 8, 'XL|Charcoal': 5 };
  });
  const [directStock, setDirectStock] = useState(String(product?.stock_quantity ?? 20));
  const [quickFillQty, setQuickFillQty] = useState('10');

  const [specs, setSpecs] = useState<ProductSpec[]>(
    product?.specifications?.length ? product.specifications : [{ label: 'Origin', value: 'Dhaka, Bangladesh' }]
  );
  const [features, setFeatures] = useState<string[]>(
    product?.features?.length ? product.features : ['Quality inspected prior to dispatch']
  );

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const activeCategorySubcategories = useMemo(() => {
    return categories.find((c) => c.name === category)?.subcategories || [];
  }, [categories, category]);

  const hasVariants = sizes.length > 0 && colors.length > 0;

  const totalStock = useMemo(() => {
    if (!hasVariants) return Math.max(0, Math.floor(Number(directStock) || 0));
    let sum = 0;
    for (const s of sizes) {
      for (const c of colors) {
        sum += Math.max(0, Number(variantStock[`${s}|${c.name}`] ?? 0));
      }
    }
    return sum;
  }, [hasVariants, directStock, sizes, colors, variantStock]);

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setUploadingImg(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImageFile(file, 'product');
        uploadedUrls.push(url);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
      toast(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingVideo(true);
      const url = await uploadVideoFile(file, 'product-video');
      setVideoUrl(url);
      toast('Product video uploaded.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Video upload failed', 'error');
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    setImages(copy);
  };

  const toggleSize = (sz: string) => {
    setSizes((prev) => (prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]));
  };

  const addColor = () => {
    if (!newColorName.trim()) return;
    if (colors.some((c) => c.name.toLowerCase() === newColorName.trim().toLowerCase())) return;
    setColors((prev) => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
  };

  const handleQuickFillMatrix = () => {
    const qty = Math.max(0, Math.floor(Number(quickFillQty) || 0));
    const next: Record<string, number> = { ...variantStock };
    for (const s of sizes) {
      for (const c of colors) {
        next[`${s}|${c.name}`] = qty;
      }
    }
    setVariantStock(next);
    toast(`Set all ${sizes.length * colors.length} variants to ${qty} units.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Product Name is required.');
      return;
    }
    if (!sku.trim() || !productCode.trim()) {
      setFormError('Product ID and SKU are required.');
      return;
    }
    const regNum = Number(regularPrice);
    if (!Number.isFinite(regNum) || regNum <= 0) {
      setFormError('Regular Price must be greater than 0.');
      return;
    }
    const saleNum = salePrice.trim() ? Number(salePrice) : null;
    if (saleNum !== null && (!Number.isFinite(saleNum) || saleNum < 0 || saleNum >= regNum)) {
      setFormError('Discount Price must be less than Regular Price.');
      return;
    }
    if (images.length === 0) {
      setFormError('Please add or upload at least one product image.');
      return;
    }
    const isAffiliate = productType === 'aliexpress_affiliate';
    if (isAffiliate) {
      if (!affiliateUrl.trim() || !/^https?:\/\//i.test(affiliateUrl.trim())) {
        setFormError('Please enter a valid AliExpress Affiliate Product URL starting with https://');
        return;
      }
    }

    const cleanedMatrix: Record<string, number> = {};
    if (!isAffiliate && hasVariants) {
      for (const s of sizes) {
        for (const c of colors) {
          const key = `${s}|${c.name}`;
          cleanedMatrix[key] = Math.max(0, Math.floor(Number(variantStock[key] ?? 0)));
        }
      }
    }

    const commRateNum =
      affiliateCommissionRate.trim() !== '' && Number.isFinite(Number(affiliateCommissionRate))
        ? Math.max(0, Number(affiliateCommissionRate))
        : null;

    const payload = {
      product_code: productCode.trim(),
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      brand: brand.trim(),
      category: category.trim(),
      subcategory: subcategory.trim(),
      product_type: productType,
      affiliate_url: isAffiliate ? affiliateUrl.trim() : '',
      affiliate_commission_rate: isAffiliate ? commRateNum : null,
      affiliate_reported_orders: isAffiliate ? Math.max(0, Math.floor(Number(affiliateReportedOrders) || 0)) : 0,
      affiliate_reported_commission: isAffiliate ? Math.max(0, Number(affiliateReportedCommission) || 0) : 0,
      status: isAffiliate && status === 'Out of Stock' ? 'Active' : status,
      regular_price: regNum,
      sale_price: saleNum,
      cost_price: isAffiliate ? 0 : Math.max(0, Number(costPrice) || 0),
      low_stock_threshold: isAffiliate ? 0 : Math.max(0, Math.floor(Number(lowStockThreshold) || 0)),
      pieces_info: piecesInfo.trim(),
      weight: weight.trim(),
      material: material.trim(),
      warranty_info: warrantyInfo.trim(),
      short_description: shortDesc.trim() || name.trim(),
      description: description.trim() || shortDesc.trim() || name.trim(),
      video_url: videoUrl.trim(),
      search_keywords: searchKeywords.trim(),
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      is_featured: isFeatured,
      is_bestseller: isBestseller,
      is_special_offer: isSpecialOffer,
      images,
      sizes: isAffiliate ? [] : sizes,
      colors: isAffiliate ? [] : colors,
      variant_stock: cleanedMatrix,
      stock_quantity: isAffiliate ? 0 : totalStock,
      specifications: specs.filter((s) => s.label.trim() && s.value.trim()),
      features: features.map((f) => f.trim()).filter(Boolean),
    };

    try {
      setSaving(true);
      if (product) {
        await apiFetch(`/api/admin/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast(`"${name.trim()}" updated successfully.`);
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast(`"${name.trim()}" created and published.`);
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setFormError(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#14171D] border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <div className="sticky top-0 z-10 px-6 py-4 bg-white dark:bg-[#14171D] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-950 dark:text-white">
              {product ? `Edit Product — ${product.product_code}` : 'Add New Product'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Changes sync immediately to the live customer storefront.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 font-medium">
              {formError}
            </div>
          )}

          {/* 0. Business Model Selector */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Selling Business Model *
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProductType('direct')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  productType === 'direct'
                    ? 'border-[#0F6E56] dark:border-[#14B8A6] bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <p className="font-semibold text-zinc-950 dark:text-white">Direct Store Product</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Own inventory, Add to Cart, Cash on Delivery / bKash / Nagad checkout &amp; direct delivery.
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductType('aliexpress_affiliate');
                  if (status === 'Out of Stock') setStatus('Active');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  productType === 'aliexpress_affiliate'
                    ? 'border-[#0F6E56] dark:border-[#14B8A6] bg-[#0F6E56]/10 dark:bg-[#14B8A6]/15'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <p className="font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <span>AliExpress Affiliate Product</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0F6E56] dark:text-[#14B8A6]" />
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Redirects Buy Now directly to your single AliExpress affiliate link &amp; tracks clicks separately.
                </p>
              </button>
            </div>

            {productType === 'aliexpress_affiliate' && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-500 mb-1">Official AliExpress Affiliate Product URL *</label>
                  <input
                    type="url"
                    required
                    value={affiliateUrl}
                    onChange={(e) => setAffiliateUrl(e.target.value)}
                    placeholder="https://s.click.aliexpress.com/e/... or https://www.aliexpress.com/item/..."
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Portal Commission Rate % (Optional)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={affiliateCommissionRate}
                    onChange={(e) => setAffiliateCommissionRate(e.target.value)}
                    placeholder="Uses default account rate if empty"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-500 mb-1">Confirmed Orders</label>
                    <input
                      type="number"
                      min={0}
                      value={affiliateReportedOrders}
                      onChange={(e) => setAffiliateReportedOrders(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Confirmed Commission (৳)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={affiliateReportedCommission}
                      onChange={(e) => setAffiliateReportedCommission(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
                <p className="sm:col-span-2 text-[11px] text-zinc-500">
                  Note: Only enter confirmed order/commission totals verified inside your AliExpress Portals dashboard. Local delivery addresses and cart checkout are never used for affiliate items.
                </p>
              </div>
            )}
          </div>

          {/* 1. Core Identity & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs text-zinc-500 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dhaka Loom Charcoal Overshirt"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Product ID *</label>
              <input
                type="text"
                required
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Subcategory</label>
              <input
                type="text"
                list="modal-subcategories"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g. Overshirts"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
              <datalist id="modal-subcategories">
                {activeCategorySubcategories.map((sub) => (
                  <option key={sub} value={sub} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Regular Price (৳) *</label>
              <input
                type="number"
                required
                min={1}
                value={regularPrice}
                onChange={(e) => setRegularPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Discount Price (৳)</label>
              <input
                type="number"
                min={0}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
              />
            </div>
            {productType === 'direct' && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Purchase Price (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Product Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              >
                <option value="Active">Active (Published)</option>
                <option value="Draft">Draft (Inactive / Hidden)</option>
                {productType === 'direct' && <option value="Out of Stock">Out of Stock</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Product Quantity / Pieces</label>
              <input
                type="text"
                value={piecesInfo}
                onChange={(e) => setPiecesInfo(e.target.value)}
                placeholder="e.g. 1 Piece, Pair of 2, Set of 3"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            {productType === 'direct' && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                />
              </div>
            )}
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-5 pt-1 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span>Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBestseller} onChange={(e) => setIsBestseller(e.target.checked)} />
              <span>Bestseller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isSpecialOffer} onChange={(e) => setIsSpecialOffer(e.target.checked)} />
              <span>Special Offer</span>
            </label>
          </div>

          {/* 2. Multi-Image Gallery & Video Upload */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Product Images ({images.length}) · First image is Main Thumbnail
              </p>
              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingImg ? 'Uploading...' : 'Upload Images'}</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFilesUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-black/20">
                  <img src={img} alt="" className="w-full h-24 object-cover" />
                  <div className="p-1.5 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 hover:text-[#14B8A6] disabled:opacity-30"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[10px]">{idx === 0 ? 'Main' : `#${idx + 1}`}</span>
                    <button
                      type="button"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      className="p-1 hover:text-[#14B8A6] disabled:opacity-30"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-red-500"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newImageUrl.trim()) return;
                  setImages((prev) => [...prev, newImageUrl.trim()]);
                  setNewImageUrl('');
                }}
                className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
              >
                Add URL
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span>Product Video (Optional Upload MP4/WebM or URL)</span>
                </label>
                <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-[#14B8A6] text-xs font-semibold inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingVideo ? 'Uploading Video...' : 'Upload Video'}</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://...mp4 or uploaded video path"
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                />
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="px-3 py-2 rounded-lg border border-red-500/30 text-red-500 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
              {videoUrl && (
                <video src={videoUrl} controls className="w-full max-h-40 rounded-lg bg-black border border-zinc-800" />
              )}
            </div>
          </div>

          {/* 3. Sizes, Colors & Variant Stock Matrix (Direct Products Only) */}
          {productType === 'direct' && (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Sizes, Colors &amp; Product Stock
              </p>
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-[#0F6E56]/15 dark:bg-[#14B8A6]/15 text-[#0F6E56] dark:text-[#14B8A6]">
                Total Product Stock: {totalStock}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Product Sizes (Click to add/remove)</p>
              <div className="flex flex-wrap items-center gap-2">
                {Array.from(new Set([...DEFAULT_SIZES, ...sizes])).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1 rounded-md font-mono text-xs font-semibold border ${
                      sizes.includes(sz)
                        ? 'bg-[#0F6E56] dark:bg-[#14B8A6] border-transparent text-white dark:text-zinc-950'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  placeholder="Custom size"
                  className="w-28 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customSize.trim() && !sizes.includes(customSize.trim())) {
                      setSizes((prev) => [...prev, customSize.trim()]);
                      setCustomSize('');
                    }
                  }}
                  className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs"
                >
                  + Add Size
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-500">Product Colors</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => setColors((prev) => prev.filter((x) => x.name !== c.name))}
                      className="text-red-500 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="Color name (e.g. Midnight Teal)"
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                />
                <button
                  type="button"
                  onClick={addColor}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
                >
                  Add Color
                </button>
              </div>
            </div>

            {hasVariants ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Stock per Size &amp; Color Combination
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={quickFillQty}
                      onChange={(e) => setQuickFillQty(e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleQuickFillMatrix}
                      className="px-2.5 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:border-[#14B8A6]"
                    >
                      Apply to All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {sizes.map((s) =>
                    colors.map((c) => {
                      const key = `${s}|${c.name}`;
                      return (
                        <div
                          key={key}
                          className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="truncate">
                            {s} / {c.name}
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={variantStock[key] ?? 0}
                            onChange={(e) =>
                              setVariantStock((prev) => ({ ...prev, [key]: Math.max(0, Number(e.target.value)) }))
                            }
                            className="w-16 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-right"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Direct Product Stock Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={directStock}
                  onChange={(e) => setDirectStock(e.target.value)}
                  className="w-40 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 font-mono"
                />
              </div>
            )}
          </div>
          )}

          {/* 4. Descriptions, Weight, Material & Warranty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Product Weight</label>
              <input
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 450g"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Material</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. 100% Organic Cotton"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Warranty Information</label>
              <input
                type="text"
                value={warrantyInfo}
                onChange={(e) => setWarrantyInfo(e.target.value)}
                placeholder="e.g. 1 Year Service Warranty"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-zinc-500 mb-1">Product Short Description *</label>
              <input
                type="text"
                required
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="One-line summary shown on cards and top of product page"
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs text-zinc-500 mb-1">Full Product Description *</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed materials, craftsmanship, sizing guidance, and usage information..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Search Keywords</label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700"
              />
            </div>
          </div>

          {/* 5. Specifications & Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500">Product Specifications</p>
                <button
                  type="button"
                  onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
                  className="text-xs text-[#14B8A6] inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Spec
                </button>
              </div>
              {specs.map((sp, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Label"
                    value={sp.label}
                    onChange={(e) => {
                      const copy = [...specs];
                      copy[i].label = e.target.value;
                      setSpecs(copy);
                    }}
                    className="w-1/2 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={sp.value}
                    onChange={(e) => {
                      const copy = [...specs];
                      copy[i].value = e.target.value;
                      setSpecs(copy);
                    }}
                    className="w-1/2 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-red-500 shrink-0"
                    title="Remove Spec"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-500">Product Features</p>
                <button
                  type="button"
                  onClick={() => setFeatures((prev) => [...prev, ''])}
                  className="text-xs text-[#14B8A6] inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Feature
                </button>
              </div>
              {features.map((ft, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Feature bullet"
                    value={ft}
                    onChange={(e) => {
                      const copy = [...features];
                      copy[i] = e.target.value;
                      setFeatures(copy);
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setFeatures((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-red-500 shrink-0"
                    title="Remove Feature"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImg || uploadingVideo}
              className="px-6 py-2.5 rounded-lg bg-[#0F6E56] dark:bg-[#14B8A6] text-white dark:text-zinc-950 text-xs font-semibold"
            >
              {saving ? 'Saving...' : product ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
