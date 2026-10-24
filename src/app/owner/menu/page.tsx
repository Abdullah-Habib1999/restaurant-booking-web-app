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
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#F5F0E9]">
            Menu & Culinary Offerings
          </h1>
          <p className="text-sm text-[#B7AAA0] mt-1">
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
          className="px-4 py-2.5 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isAddingItem ? 'Cancel Item Form' : 'Add New Menu Item'}
        </button>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          feedback.startsWith('Error') 
            ? 'bg-[#2E1212] border-[#7F1D1D] text-[#FCA5A5]' 
            : 'bg-[#132A1C] border-[#22543D] text-[#86EFAC]'
        }`}>
          {feedback.startsWith('Error') ? <X className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-[#86EFAC]" />}
          <span>{feedback}</span>
        </div>
      )}

      {/* ADD NEW ITEM FORM */}
      {isAddingItem && (
        <form onSubmit={handleSaveNewItem} className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 sm:p-8 shadow-xl space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
            New Culinary Item Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Item Name</label>
              <input
                type="text"
                placeholder="e.g. Grilled Chicken Steak or Risotto"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Category</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#151311] text-[#F5F0E9]">{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Price ($ USD)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
                required
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold uppercase text-[#8D8178] mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Key ingredients, culinary preparation, and flavor profile..."
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-[#8D8178] mb-1">Optional Photo URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={itemImageUrl}
                onChange={(e) => setItemImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
              />
            </div>

            <div className="flex items-center gap-6 pt-5 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#F5F0E9]">
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
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  Vegetarian
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#F5F0E9]">
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
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  Non-Vegetarian
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-[#F5F0E9]">
                <input
                  type="checkbox"
                  checked={itemGlutenFree}
                  onChange={(e) => setItemGlutenFree(e.target.checked)}
                  className="accent-[#8B5E45] w-4 h-4"
                />
                Gluten-Free
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="px-4 py-2 rounded-xl bg-[#151311] border border-[#332A25] text-xs font-semibold text-[#8D8178] hover:text-[#F5F0E9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold shadow-sm cursor-pointer"
            >
              Save Menu Item
            </button>
          </div>
        </form>
      )}

      {/* QUICK ADD CATEGORY BAR */}
      <form onSubmit={handleAddCategory} className="bg-[#181513] rounded-2xl border border-[#332A25] p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D8178] whitespace-nowrap">
          Create Category:
        </span>
        <input
          type="text"
          placeholder="e.g. Handmade Pasta, Chef Specialties, Wine by Glass"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-[#332A25] bg-[#151311] text-xs text-[#F5F0E9] placeholder-[#8D8178] focus:outline-none focus:ring-1 focus:ring-[#8B5E45]"
          required
        />
        <button
          type="submit"
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#8B5E45] hover:bg-[#9E6C51] text-[#F5F0E9] text-xs font-semibold transition whitespace-nowrap cursor-pointer shadow-sm"
        >
          Add Category
        </button>
      </form>

      {/* LIST OF CATEGORIES & DISHES */}
      <div className="space-y-6">
        {categories.map(cat => {
          const itemsInCat = menuItems.filter(m => m.categoryId === cat.id);
          return (
            <div key={cat.id} className="bg-[#181513] rounded-3xl border border-[#332A25] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#332A25] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#F5F0E9]">
                  {cat.name}
                </h3>
                <span className="text-xs text-[#8D8178]">
                  {itemsInCat.length} dishes
                </span>
              </div>

              {itemsInCat.length === 0 ? (
                <p className="text-xs text-[#8D8178] italic py-2">
                  No dishes in this category yet.
                </p>
              ) : (
                <div className="divide-y divide-[#332A25]">
                  {itemsInCat.map(item => (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {item.imageUrl && (
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#151311] shrink-0 border border-[#332A25]">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-sm text-[#F5F0E9]">
                              {item.name}
                            </h4>
                            {item.isVegetarian && (
                              <span className="px-2 py-0.5 rounded-md bg-[#132A1C] text-[#86EFAC] text-[10px] font-semibold flex items-center gap-1 border border-[#22543D]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#86EFAC]"></span>
                                Veg
                              </span>
                            )}
                            {item.isNonVegetarian && (
                              <span className="px-2 py-0.5 rounded-md bg-[#2E1212] text-[#FCA5A5] text-[10px] font-semibold flex items-center gap-1 border border-[#7F1D1D]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FCA5A5]"></span>
                                Non-Veg
                              </span>
                            )}
                            {item.isGlutenFree && (
                              <span className="px-2 py-0.5 rounded-md bg-[#291F11] text-[#FDE68A] text-[10px] font-semibold border border-[#5E4018]">
                                GF
                              </span>
                            )}
                            {!item.isAvailable && (
                              <span className="px-2 py-0.5 rounded-md bg-[#2E1212] text-[#FCA5A5] text-[10px] font-bold border border-[#7F1D1D]">
                                Unavailable
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#B7AAA0] mt-0.5 max-w-xl">
                            {item.description}
                          </p>
                          <div className="mt-1 font-bold text-xs text-[#C6A47E]">
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
                              ? 'bg-[#132A1C] text-[#86EFAC] border-[#22543D] hover:bg-[#22543D]/50'
                              : 'bg-[#151311] text-[#8D8178] border-[#332A25] hover:text-[#F5F0E9]'
                          }`}
                        >
                          {item.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-xl hover:bg-[#2E1212] text-red-400 border border-transparent hover:border-[#7F1D1D] transition cursor-pointer"
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
