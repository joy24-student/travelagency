// @ts-nocheck
// Advanced Search & Filtering Service
import { supabase } from "@/utils/supabase";

export interface SearchFilter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "like"
    | "in"
    | "between";
  value: any;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  table: string;
  filters: SearchFilter[];
  sort_field?: string;
  sort_order?: "asc" | "desc";
  admin_id: string;
  created_at: string;
  is_favorite?: boolean;
}

export interface SearchResult {
  id: string;
  table: string;
  data: any;
  relevance_score?: number;
  matched_fields?: string[];
}

// Full-Text Search Service
export const searchService = {
  async fullTextSearch(query: string, tables?: string[], limit: number = 50) {
    try {
      const tablesToSearch = tables || [
        "user_admin_details",
        "agency_admin_details",
        "destinations",
        "packages",
        "bookings",
      ];

      const results: SearchResult[] = [];

      for (const table of tablesToSearch) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .ilike("name,email,title", `%${query}%`)
          .limit(limit / tablesToSearch);

        if (!error && data) {
          data.forEach((item) => {
            results.push({
              id: item.id,
              table,
              data: item,
              relevance_score: this.calculateRelevance(item, query),
              matched_fields: this.getMatchedFields(item, query),
            });
          });
        }
      }

      return results.sort(
        (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0),
      );
    } catch (err) {
      console.error("Error performing full-text search:", err);
      return [];
    }
  },

  calculateRelevance(item: any, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();

    Object.values(item).forEach((value: any) => {
      if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        if (lowerValue === lowerQuery) score += 10;
        else if (lowerValue.startsWith(lowerQuery)) score += 5;
        else if (lowerValue.includes(lowerQuery)) score += 2;
      }
    });

    return score;
  },

  getMatchedFields(item: any, query: string): string[] {
    const matched: string[] = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(item).forEach(([field, value]) => {
      if (
        typeof value === "string" &&
        value.toLowerCase().includes(lowerQuery)
      ) {
        matched.push(field);
      }
    });

    return matched;
  },

  // Advanced filtering
  async advancedFilter(
    table: string,
    filters: SearchFilter[],
    limit: number = 100,
    offset: number = 0,
  ) {
    try {
      let query = supabase
        .from(table)
        .select("*, count:count()", { count: "exact" });

      filters.forEach((filter) => {
        switch (filter.operator) {
          case "eq":
            query = query.eq(filter.field, filter.value);
            break;
          case "neq":
            query = query.neq(filter.field, filter.value);
            break;
          case "gt":
            query = query.gt(filter.field, filter.value);
            break;
          case "gte":
            query = query.gte(filter.field, filter.value);
            break;
          case "lt":
            query = query.lt(filter.field, filter.value);
            break;
          case "lte":
            query = query.lte(filter.field, filter.value);
            break;
          case "like":
            query = query.ilike(filter.field, `%${filter.value}%`);
            break;
          case "in":
            query = query.in(filter.field, filter.value);
            break;
          case "between":
            query = query
              .gte(filter.field, filter.value.start)
              .lte(filter.field, filter.value.end);
            break;
        }
      });

      const { data, count, error } = await query.range(
        offset,
        offset + limit - 1,
      );

      if (error) throw error;

      return {
        results: data || [],
        total: count || 0,
        limit,
        offset,
      };
    } catch (err) {
      console.error("Error applying advanced filters:", err);
      return { results: [], total: 0, limit, offset };
    }
  },

  // Saved filters
  async saveFiler(filter: Omit<SavedSearch, "id" | "created_at">) {
    try {
      const { data, error } = await supabase
        .from("saved_filters")
        .insert({
          ...filter,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      console.error("Error saving filter:", err);
      return null;
    }
  },

  async getSavedFilters(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("saved_filters")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching saved filters:", err);
      return [];
    }
  },

  async getFavoriteFilters(adminId: string) {
    try {
      const { data, error } = await supabase
        .from("saved_filters")
        .select("*")
        .eq("admin_id", adminId)
        .eq("is_favorite", true);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching favorite filters:", err);
      return [];
    }
  },

  async updateSavedFilter(filterId: string, updates: Partial<SavedSearch>) {
    try {
      const { data, error } = await supabase
        .from("saved_filters")
        .update(updates)
        .eq("id", filterId)
        .select();

      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      console.error("Error updating saved filter:", err);
      return null;
    }
  },

  async deleteSavedFilter(filterId: string) {
    try {
      const { error } = await supabase
        .from("saved_filters")
        .delete()
        .eq("id", filterId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error deleting saved filter:", err);
      return false;
    }
  },

  async toggleFavorite(filterId: string, isFavorite: boolean) {
    return this.updateSavedFilter(filterId, { is_favorite: isFavorite });
  },

  // Predefined filters
  async getVerifiedUsersFilter() {
    return {
      field: "verification_status",
      operator: "eq" as const,
      value: "verified",
    };
  },

  async getUnverifiedUsersFilter() {
    return {
      field: "verification_status",
      operator: "eq" as const,
      value: "pending",
    };
  },

  async getSuspendedUsersFilter() {
    return {
      field: "account_status",
      operator: "eq" as const,
      value: "suspended",
    };
  },

  async getHighValueUsersFilter(minSpent: number = 10000) {
    return {
      field: "total_spent",
      operator: "gte" as const,
      value: minSpent,
    };
  },

  async getInactiveUsersFilter(daysSinceLogin: number = 90) {
    const date = new Date();
    date.setDate(date.getDate() - daysSinceLogin);
    return {
      field: "last_login",
      operator: "lt" as const,
      value: date.toISOString(),
    };
  },

  async getRecentlyJoinedFilter(daysAgo: number = 7) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      field: "created_at",
      operator: "gte" as const,
      value: date.toISOString(),
    };
  },

  // Sorting
  async applySort(
    table: string,
    filters: SearchFilter[],
    sortField: string,
    sortOrder: "asc" | "desc" = "asc",
    limit: number = 100,
  ) {
    try {
      let query = supabase.from(table).select("*");

      filters.forEach((filter) => {
        switch (filter.operator) {
          case "eq":
            query = query.eq(filter.field, filter.value);
            break;
          case "like":
            query = query.ilike(filter.field, `%${filter.value}%`);
            break;
          // ... other operators
        }
      });

      const { data, error } = await query
        .order(sortField, { ascending: sortOrder === "asc" })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error applying sort:", err);
      return [];
    }
  },

  // Faceted search
  async getFacets(table: string, field: string) {
    try {
      const { data, error } = await supabase.from(table).select(field);

      if (error) throw error;

      // Count occurrences
      const facets: Record<string, number> = {};
      data?.forEach((item) => {
        const value = item[field];
        facets[value] = (facets[value] || 0) + 1;
      });

      return Object.entries(facets)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    } catch (err) {
      console.error("Error fetching facets:", err);
      return [];
    }
  },

  // Autocomplete suggestions
  async getAutocompleteSuggestions(
    table: string,
    field: string,
    prefix: string,
    limit: number = 10,
  ) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(field)
        .ilike(field, `${prefix}%`)
        .limit(limit);

      if (error) throw error;

      // Extract unique values
      const suggestions = Array.from(
        new Set(data?.map((item) => item[field]) || []),
      );
      return suggestions as string[];
    } catch (err) {
      console.error("Error fetching autocomplete suggestions:", err);
      return [];
    }
  },
};
