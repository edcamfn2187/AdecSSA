import { supabase } from './supabase';

const API_URL = ''; // Relative to the current host

export const api = {
  async get(table: string, params?: Record<string, string>) {
    let url = `${API_URL}/api/${table}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${table}`);
    return response.json();
  },

  async post(table: string, data: any) {
    const response = await fetch(`${API_URL}/api/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to create ${table}`);
    return response.json();
  },

  async put(table: string, id: string, data: any) {
    const response = await fetch(`${API_URL}/api/${table}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to update ${table}`);
    return response.json();
  },

  async delete(table: string, id: string) {
    const response = await fetch(`${API_URL}/api/${table}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete ${table}`);
    return response.json();
  },

  async upsert(table: string, data: any, conflict_key: string = 'id') {
    const response = await fetch(`${API_URL}/api/upsert/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, conflict_key }),
    });
    if (!response.ok) throw new Error(`Failed to upsert ${table}`);
    return response.json();
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
