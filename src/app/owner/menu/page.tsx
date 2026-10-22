'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  DollarSign, 
  UtensilsCrossed, 
  Tag, 
  Sparkles 
} from 'lucide-react';
import { db } from '@/lib/db';
import { MenuCategory, MenuItem } from '@/types';

import { useAuth } from '@/context/AuthContext';

export default function MenuManagementPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const targetRestaurantId = user?.ownedRestaurantId || 'rest-1';

  // New Category Modal / Input
  const [newCatName, setNewCatName] = useState('');
  
  // New Item State
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('18.00');
  const [itemCategory, setItemCategory] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemVeg, setItemVeg] = useState(false);
  const [itemNonVeg, setItemNonVeg] = useState(false);
  const [itemGlutenFree, setItemGlutenFree] = useState(false);

  // Success Feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadMenu = async () => {
    setLoading(true);
    let [cats, items] = await Promise.all([
      db.getMenuCategories(targetRestaurantId),
      db.getMenuItems(targetRestaurantId)
    ]);

    // If a newly registered restaurant has no categories yet, create default ones automatically
    if (cats.length === 0) {
      const defaultCategories = ['Starters & Appetizers', 'Main Courses', 'Chef Specialties', 'Desserts & Beverages'];
      for (let i = 0; i < defaultCategories.length; i++) {
        const cat = await db.saveMenuCategory({
          id: `cat-${targetRestaurantId}-${Date.now()}-${i + 1}`,
          restaurantId: targetRestaurantId,
          name: defaultCategories[i],
          displayOrder: i + 1,
          isActive: true
        });
        cats.push(cat);
      }
    }

    setCategories(cats);
    setMenuItems(items);
    if (cats.length > 0) {
      setItemCategory(prev => prev || cats[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMenu();
  }, [user]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: MenuCategory = {
      id: `cat-${Date.now()}`,
      restaurantId: targetRestaurantId,
      name: newCatName.trim(),
      displayOrder: categories.length + 1,
      isActive: true
    };

    await db.saveMenuCategory(newCat);
    setCategories(prev => [...prev, newCat]);
    if (!itemCategory) {
      setItemCategory(newCat.id);
    }
    setNewCatName('');
    setFeedback(`Category "${newCat.name}" created.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    await db.saveMenuItem(updated);
    setMenuItems(prev => prev.map(m => m.id === item.id ? updated : m));
    setFeedback(`"${item.name}" marked as ${updated.isAvailable ? 'Available' : 'Unavailable'}.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleDeleteItem = async (itemId: string) => {
    await db.deleteMenuItem(itemId);
    setMenuItems(prev => prev.filter(m => m.id !== itemId));
    setFeedback('Menu item deleted.');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFeedback('Error: Please enter an item name.');
      return;
    }
    
    let activeCatId = itemCategory;
    if (!activeCatId) {
      if (categories.length > 0) {
        activeCatId = categories[0].id;
      } else {
        // Auto create category if none exist
        const autoCat: MenuCategory = {
          id: `cat-${targetRestaurantId}-${Date.now()}`,
          restaurantId: targetRestaurantId,
          name: 'Main Courses',
          displayOrder: 1,
          isActive: true
        };
        await db.saveMenuCategory(autoCat);
        setCategories([autoCat]);
        activeCatId = autoCat.id;
      }
    }

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      restaurantId: targetRestaurantId,
      categoryId: activeCatId,
      name: itemName.trim(),
      description: itemDescription.trim(),
      price: Number(itemPrice) || 0,
      imageUrl: itemImageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
      isAvailable: true,
      isVegetarian: itemVeg,
      isNonVegetarian: itemNonVeg,
      isVegan: false,
      isGlutenFree: itemGlutenFree,
      displayOrder: menuItems.length + 1
    };

    await db.saveMenuItem(newItem);
    setMenuItems(prev => [...prev, newItem]);
    setIsAddingItem(false);
    setItemName('');
    setItemDescription('');
    setItemVeg(false);
    setItemNonVeg(false);
    setItemGlutenFree(false);
    setFeedback(`"${newItem.name}" added to menu successfully.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1C1C]">
            Menu & Culinary Offerings
          </h1>
          <p className="text-sm text-[#6B625D] mt-1">
            Manage your categories, set dish prices, and toggle immediate dish availability.
          </p>
        </div>

        <button
          onClick={() => {
            if (categories.length > 0 && !itemCategory) {
              setItemCategory(categories[0].id);
            }
            setIsAddingItem(!isAddingItem);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          {isAddingItem ? 'Cancel Item Form' : 'Add New Menu Item'}
        </button>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          feedback.startsWith('Error') 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {feedback.startsWith('Error') ? <X className="w-4 h-4 text-red-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
          <span>{feedback}</span>
        </div>
      )}

      {/* ADD NEW ITEM FORM */}
      {isAddingItem && (
        <form onSubmit={handleSaveNewItem} className="bg-white rounded-3xl border border-[#795548]/40 p-6 sm:p-8 shadow-md space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
            New Culinary Item Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Grilled Chicken Steak or Risotto"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">Category</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">Price ($ USD)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
                required
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold uppercase text-[#6B625D] mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Key ingredients, culinary preparation, and flavor profile..."
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-[#6B625D] mb-1">Optional Photo URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={itemImageUrl}
                onChange={(e) => setItemImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-[#1C1C1C]"
              />
            </div>

            <div className="flex items-center gap-6 pt-5 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1C1C1C]">
                <input
                  type="checkbox"
                  checked={itemVeg}
                  onChange={(e) => {
                    setItemVeg(e.target.checked);
                    if (e.target.checked) setItemNonVeg(false);
                  }}
                  className="accent-emerald-700 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                  Vegetarian
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1C1C1C]">
                <input
                  type="checkbox"
                  checked={itemNonVeg}
                  onChange={(e) => {
                    setItemNonVeg(e.target.checked);
                    if (e.target.checked) setItemVeg(false);
                  }}
                  className="accent-red-700 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                  Non-Vegetarian
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1C1C1C]">
                <input
                  type="checkbox"
                  checked={itemGlutenFree}
                  onChange={(e) => setItemGlutenFree(e.target.checked)}
                  className="accent-[#795548] w-4 h-4"
                />
                Gluten-Free
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="px-4 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E1DA] text-xs font-semibold text-[#6B625D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4E342E] hover:bg-[#795548] text-white text-xs font-semibold shadow-xs"
            >
              Save Menu Item
            </button>
          </div>
        </form>
      )}

      {/* QUICK ADD CATEGORY BAR */}
      <form onSubmit={handleAddCategory} className="bg-white rounded-2xl border border-[#E8E1DA] p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#6B625D] whitespace-nowrap">
          Create Category:
        </span>
        <input
          type="text"
          placeholder="e.g. Handmade Pasta, Chef Specialties, Wine by Glass"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="w-full px-3 py-1.5 rounded-xl border border-[#E8E1DA] bg-[#FAF9F6] text-xs text-[#1C1C1C]"
          required
        />
        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E1DA] hover:bg-[#E8E1DA] text-xs font-bold text-[#4E342E] transition whitespace-nowrap cursor-pointer"
        >
          Add Category
        </button>
      </form>

      {/* LIST OF CATEGORIES & DISHES */}
      <div className="space-y-6">
        {categories.map(cat => {
          const itemsInCat = menuItems.filter(m => m.categoryId === cat.id);
          return (
            <div key={cat.id} className="bg-white rounded-3xl border border-[#E8E1DA] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E1DA] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#1C1C1C]">
                  {cat.name}
                </h3>
                <span className="text-xs text-[#6B625D]">
                  {itemsInCat.length} dishes
                </span>
              </div>

              {itemsInCat.length === 0 ? (
                <p className="text-xs text-[#6B625D] italic py-2">
                  No dishes in this category yet.
                </p>
              ) : (
                <div className="divide-y divide-[#E8E1DA]/60">
                  {itemsInCat.map(item => (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {item.imageUrl && (
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-sm text-[#1C1C1C]">
                              {item.name}
                            </h4>
                            {item.isVegetarian && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold flex items-center gap-1 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Veg
                              </span>
                            )}
                            {item.isNonVegetarian && (
                              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-800 text-[10px] font-semibold flex items-center gap-1 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                Non-Veg
                              </span>
                            )}
                            {item.isGlutenFree && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                                GF
                              </span>
                            )}
                            {!item.isAvailable && (
                              <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6B625D] mt-0.5 max-w-xl">
                            {item.description}
                          </p>
                          <div className="mt-1 font-bold text-xs text-[#4E342E]">
                            ${item.price.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Availability & Delete Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {item.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-xl hover:bg-red-50 text-red-600 border border-transparent hover:border-red-200 transition cursor-pointer"
                          title="Delete dish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
