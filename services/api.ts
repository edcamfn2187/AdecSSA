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
      const localSession = localStorage.getItem('ebd_local_session');
      if (localSession) {
        return { data: { session: JSON.parse(localSession) }, error: null };
      }
      return supabase.auth.getSession();
    },
    onAuthStateChange(callback: any) {
      // Adiciona o callback à lista para disparar manualmente se necessário
      if (typeof window !== 'undefined') {
        (window as any)._auth_callback = callback;
      }
      return supabase.auth.onAuthStateChange(callback);
    },
    async signOut() {
      localStorage.removeItem('ebd_local_session');
      if (typeof window !== 'undefined' && (window as any)._auth_callback) {
        (window as any)._auth_callback('SIGNED_OUT', null);
      }
      return supabase.auth.signOut();
    },
    async checkSetup() {
      try {
        const response = await fetch(`${API_URL}/api/auth/check-setup`);
        if (response.ok) {
          return await response.json();
        }
        return { isSetup: true }; // Fallback
      } catch (e) {
        console.warn('Check setup failed:', e);
        return { isSetup: true };
      }
    },
    async setup(data: any) {
      const response = await fetch(`${API_URL}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao configurar sistema');
      }
      const { session } = await response.json();
      localStorage.setItem('ebd_local_session', JSON.stringify(session));
      
      if (typeof window !== 'undefined' && (window as any)._auth_callback) {
        (window as any)._auth_callback('SIGNED_IN', session);
      }
      return { data: { session }, error: null };
    },
    async signInWithPassword(credentials: any) {
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        if (response.ok) {
          const { session } = await response.json();
          localStorage.setItem('ebd_local_session', JSON.stringify(session));
          
          // Dispara o callback manualmente para o App.tsx reagir
          if (typeof window !== 'undefined' && (window as any)._auth_callback) {
            (window as any)._auth_callback('SIGNED_IN', session);
          }
          
          return { data: { session }, error: null };
        }
      } catch (e) {
        console.warn('Local auth failed, falling back to Supabase:', e);
      }
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
