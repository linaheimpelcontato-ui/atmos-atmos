import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackWishlistAdd, trackWishlistRemove } from "@/lib/analytics";
import AuthModal from "@/components/auth/AuthModal";

export type WishlistItemType = "waterfall" | "experience" | "accommodation" | "service" | "itinerary";

export interface WishlistItem {
  id: string;
  type: WishlistItemType;
  name: string;
  details?: string;
  imageUrl?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Initialize state directly from localStorage to avoid one-frame empty state
  const [items, setItems] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem("atmos_wishlist");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<WishlistItem | null>(null);
  const prevUserRef = useRef<string | null>(null);

  // Sync to localStorage immediately on change
  useEffect(() => {
    localStorage.setItem("atmos_wishlist", JSON.stringify(items));
  }, [items]);

  // Load items from DB when user logs in and merge with local state
  useEffect(() => {
    if (user && user.id !== prevUserRef.current) {
      const fetchAndSync = async () => {
        const { data, error } = await supabase
          .from("wishlist_items")
          .select("*")
          .eq("user_id", user.id);

        if (!error && data) {
          const dbItems: WishlistItem[] = data.map((row) => ({
            id: row.item_id,
            type: row.item_type as WishlistItemType,
            name: row.item_name,
            details: row.item_details ?? undefined,
            imageUrl: row.item_image_url ?? undefined,
          }));
          
          setItems(prevLocalItems => {
            // Priority: Items that exist in BOTH (latest version)
            // Plus items that exist only in DB (from other sessions)
            // Plus items that exist only locally (guest session)
            const merged = [...dbItems];
            
            prevLocalItems.forEach(localItem => {
              const inDB = merged.some(dbItem => dbItem.id === localItem.id);
              if (!inDB) {
                merged.push(localItem);
                // Background sync local items TO cloud
                saveItemToDB(localItem, user.id);
              }
            });
            
            return merged;
          });
        }
      };

      fetchAndSync();
      prevUserRef.current = user.id;
    } else if (!user && prevUserRef.current) {
      // Just logged out — optional: clear or keep local
      prevUserRef.current = null;
    }
  }, [user]);

  // Handle pending items after authentication
  useEffect(() => {
    if (pendingItem && user) {
      const itemToLink = pendingItem;
      setPendingItem(null);
      
      setItems(prev => {
        if (prev.some(i => i.id === itemToLink.id)) return prev;
        saveItemToDB(itemToLink, user.id);
        return [...prev, itemToLink];
      });
    }
  }, [user, pendingItem]);

  const saveItemToDB = async (item: WishlistItem, userId: string) => {
    try {
      await supabase.from("wishlist_items").upsert({
        user_id: userId,
        item_id: item.id,
        item_type: item.type,
        item_name: item.name,
        item_details: item.details ?? null,
        item_image_url: item.imageUrl ?? null,
      }, { onConflict: "user_id,item_id" });
    } catch (err) {
      console.error("Supabase sync error:", err);
    }
  };

  const addItem = useCallback((item: WishlistItem) => {
    if (!user) {
      setPendingItem(item);
      setAuthModalOpen(true);
      return;
    }

    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      saveItemToDB(item, user.id);
      trackWishlistAdd(item.type, item.name);
      return [...prev, item];
    });
  }, [user]);

  const removeItem = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) trackWishlistRemove(item.type);
    
    setItems((prev) => prev.filter((i) => i.id !== id));
    
    if (user) {
      supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", id);
    }
  }, [user, items]);

  const isInWishlist = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  );

  const clearWishlist = useCallback(() => {
    setItems([]);
    localStorage.removeItem("atmos_wishlist");
    if (user) {
      supabase.from("wishlist_items").delete().eq("user_id", user.id);
    }
  }, [user]);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  return (
    <WishlistContext.Provider
      value={{ items, addItem, removeItem, isInWishlist, clearWishlist, count: items.length }}
    >
      {children}
      <AuthModal
        open={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingItem(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
