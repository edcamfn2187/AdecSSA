import { supabase } from './supabase';

const API_URL = ''; // Relative to the current host

export const api = {
  async get(table: string, params?: Record<string, string>) {
    try {
      let url = `${API_URL}/api/${table}`;
      if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }
      const response = await fetch(url);
      
      // If backend says DB is not configured, fallback to Supabase
      if (response.status === 503) {
        console.warn(`Backend DB not configured, falling back to Supabase for ${table}`);
        let query = supabase.from(table).select('*');
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        const { data, error } = await query;
        if (error) throw error;
        return data;
      }

      if (!response.ok) throw new Error(`Failed to fetch ${table}`);
      return response.json();
    } catch (e) {
      console.warn(`API fetch failed for ${table}, trying Supabase fallback:`, e);
      let query = supabase.from(table).select('*');
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      const { data, error } = await query;
      if (error) throw new Error(`Fallback to Supabase failed for ${table}: ${error.message}`);
      return data;
    }
  },

  async post(table: string, data: any) {
    try {
      const response = await fetch(`${API_URL}/api/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.status === 503) {
        console.warn(`Backend DB not configured, falling back to Supabase for POST ${table}`);
        const { data: result, error } = await supabase.from(table).insert(data).select();
        if (error) throw error;
        return result[0];
      }
      if (!response.ok) throw new Error(`Failed to create ${table}`);
      return response.json();
    } catch (e) {
      console.warn(`API POST failed for ${table}, trying Supabase fallback:`, e);
      const { data: result, error } = await supabase.from(table).insert(data).select();
      if (error) throw new Error(`Fallback to Supabase failed for ${table}: ${error.message}`);
      return result[0];
    }
  },

  async put(table: string, id: string, data: any) {
    try {
      const response = await fetch(`${API_URL}/api/${table}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.status === 503) {
        console.warn(`Backend DB not configured, falling back to Supabase for PUT ${table}`);
        const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select();
        if (error) throw error;
        return result[0];
      }
      if (!response.ok) throw new Error(`Failed to update ${table}`);
      return response.json();
    } catch (e) {
      console.warn(`API PUT failed for ${table}, trying Supabase fallback:`, e);
      const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select();
      if (error) throw new Error(`Fallback to Supabase failed for ${table}: ${error.message}`);
      return result[0];
    }
  },

  async delete(table: string, id: string) {
    try {
      const response = await fetch(`${API_URL}/api/${table}/${id}`, {
        method: 'DELETE',
      });
      if (response.status === 503) {
        console.warn(`Backend DB not configured, falling back to Supabase for DELETE ${table}`);
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return { success: true };
      }
      if (!response.ok) throw new Error(`Failed to delete ${table}`);
      return response.json();
    } catch (e) {
      console.warn(`API DELETE failed for ${table}, trying Supabase fallback:`, e);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(`Fallback to Supabase failed for ${table}: ${error.message}`);
      return { success: true };
    }
  },

  async upsert(table: string, data: any, conflict_key: string = 'id') {
    try {
      const response = await fetch(`${API_URL}/api/upsert/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, conflict_key }),
      });
      if (response.status === 503) {
        console.warn(`Backend DB not configured, falling back to Supabase for UPSERT ${table}`);
        const { data: result, error } = await supabase.from(table).upsert(data, { onConflict: conflict_key }).select();
        if (error) throw error;
        return result[0];
      }
      if (!response.ok) throw new Error(`Failed to upsert ${table}`);
      return response.json();
    } catch (e) {
      console.warn(`API UPSERT failed for ${table}, trying Supabase fallback:`, e);
      const { data: result, error } = await supabase.from(table).upsert(data, { onConflict: conflict_key }).select();
      if (error) throw new Error(`Fallback to Supabase failed for ${table}: ${error.message}`);
      return result[0];
    }
  },

  auth: {
    async getSession() {
      return supabase.auth.getSession();
    },
    onAuthStateChange(callback: any) {
      return supabase.auth.onAuthStateChange(callback);
    },
    async signOut() {
      return supabase.auth.signOut();
    },
    async signInWithPassword(credentials: any) {
      return supabase.auth.signInWithPassword(credentials);
    },
    async signUp(credentials: any) {
      return supabase.auth.signUp(credentials);
    },
    async updateUser(attributes: any) {
      return supabase.auth.updateUser(attributes);
    }
  }
};
