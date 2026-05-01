import { supabase } from '../lib/supabase';

export const leadService = {
  async getAll() {
    const { data, error } = await supabase
      .from('leads')
      .select('*, customers(name, company)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(lead) {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async getStats() {
    const { data, error } = await supabase
      .from('leads')
      .select('value, status');
    
    if (error) throw error;

    const totalLeads = data.length;
    const totalRevenue = data.reduce((acc, lead) => acc + (Number(lead.value) || 0), 0);
    
    return { totalLeads, totalRevenue };
  }
};
