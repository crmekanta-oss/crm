import { supabase } from '../lib/supabase';

/**
 * CRM Service for handling Supabase operations
 */
export const crmService = {

  // =========================
  // FETCH FUNNELS
  // =========================
  async getAllFunnels() {
    console.log('Fetching all funnels...');
    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }

      return (data || []).map(this.mapFromDb);

    } catch (error) {
      console.error('Error in getAllFunnels:', error.message);
      return [];
    }
  },

  // =========================
  // SAVE FUNNEL (INSERT / UPDATE)
  // =========================
  async saveFunnel(funnel, user) {
    console.log('Saving funnel:', funnel);

    try {
      // 🔹 Map data
      const dbData = this.mapToDb(funnel);

      // 🔴 REQUIRED FIELD CHECK
      if (!dbData.lead_source) throw new Error('lead_source is required');
      if (!dbData.next_follow_up) throw new Error('next_follow_up is required');

      // 🔴 ADD created_by
      dbData.created_by = user?.name || 'admin';

      // 🔹 Check if update or insert
      const isUpdate = !!funnel.id;

      if (isUpdate) {
        console.log('Updating funnel:', funnel.id);

        const { data, error } = await supabase
          .from('funnels')
          .update(dbData)
          .eq('id', funnel.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        return this.mapFromDb(data[0]);
      }

      // 🔹 INSERT NEW
      console.log('Inserting new funnel...');

      const { data, error } = await supabase
        .from('funnels')
        .insert([dbData])
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      return this.mapFromDb(data[0]);

    } catch (error) {
      console.error('Error in saveFunnel:', error.message);
      throw error;
    }
  },

  // =========================
  // UPDATE STATUS
  // =========================
  async updateStatus(id, status, lostDropReason = "") {
    try {
      const { error } = await supabase
        .from('funnels')
        .update({ status, lost_drop_reason: lostDropReason || null })
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('Error updating status:', error.message);
    }
  },

  // =========================
  // DELETE FUNNEL
  // =========================
  async deleteFunnel(id) {
    try {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', id);

      if (error) throw error;

    } catch (error) {
      console.error('Error deleting funnel:', error.message);
    }
  },

  // =========================
  // COMMENTS
  // =========================
  async getComments(funnelId) {
    try {
      const { data, error } = await supabase
        .from('audit_comments')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(c => ({
        text: c.text,
        author: c.author,
        role: c.role,
        time: new Date(c.created_at).toLocaleString()
      }));

    } catch (error) {
      console.error('Error fetching comments:', error.message);
      return [];
    }
  },

  async addComment(funnelId, comment) {
    try {
      const { error } = await supabase
        .from('audit_comments')
        .insert([{
          funnel_id: funnelId,
          author: comment.author,
          role: comment.role,
          text: comment.text
        }]);

      if (error) throw error;

    } catch (error) {
      console.error('Error adding comment:', error.message);
    }
  },

  // Get all follow-up logs for a funnel
async getFollowupLogs(funnelId) {
  const { data, error } = await supabase
    .from('followup_logs')
    .select('*')
    .eq('funnel_id', funnelId)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    loggedBy: row.logged_by,
    loggedAt: new Date(row.logged_at).toLocaleString('en-IN', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    followUpDate: row.follow_up_date,
    customerResponse: row.customer_response,
    outcome: row.outcome,
    nextFollowUp: row.next_follow_up,
  }));
},

// Add a new follow-up log entry
async addFollowupLog(funnelId, log) {
  const { data, error } = await supabase
    .from('followup_logs')
    .insert({
      funnel_id: funnelId,
      logged_by: log.loggedBy,
      follow_up_date: log.followUpDate,
      customer_response: log.customerResponse,
      outcome: log.outcome,
      next_follow_up: log.nextFollowUp || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
},

// Update next follow-up date on the funnel
async updateNextFollowup(funnelId, date) {
  const { error } = await supabase
    .from('funnels')
    .update({ next_follow_up: date })
    .eq('id', funnelId);
  if (error) throw error;
},
  
  // =========================
  // USERS
  // =========================
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error fetching users:', error.message);
      return [];
    }
  },

  async saveUsers(users) {
    try {
      for (const user of users) {
        const { error } = await supabase
          .from('users')
          .upsert(user, { onConflict: 'username' });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving users:', error.message);
    }
  },

  async deleteUser(username) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);

      if (error) throw error;

    } catch (error) {
      console.error('Error deleting user:', error.message);
    }
  },

  /**
   * Maps Frontend camelCase object to Database snake_case object
   */
  mapToDb(f) {
    const isNum = v => v !== "" && v !== null && v !== undefined;
    return {
      name: f.name, // Required
      phone: f.phone || null,
      email: f.email || null,
      city_region: f.cityRegion || null,
      enquiry_type: f.enquiryType || null,
      funnel_type: f.funnelType || null,
      lead_source: f.leadSource, // Required
      next_follow_up: f.nextFollowUp, // Required
      products: f.products || [],
      remarks: f.remarks || null,
      delivery_details: f.deliveryDetails || null,
      payment_terms: f.paymentTerms || null,
      assigned_to: f.assignedTo || null,
      order_number: f.orderNumber || null,
      quote_qty: isNum(f.quoteQty) ? Number(f.quoteQty) : null,
      quote_amount: isNum(f.quoteAmount) ? Number(f.quoteAmount) : null,
      quote_desc: f.quoteDesc || null,
      status: f.status || 'Pending',
      lost_drop_reason: f.lostDropReason || null,
    };
  },

  /**
   * Maps Database snake_case object to Frontend camelCase object
   */
  mapFromDb(f) {
    if (!f) return null;
    return {
      id: f.id,
      name: f.name,
      phone: f.phone,
      email: f.email,
      cityRegion: f.city_region,
      enquiryType: f.enquiry_type,
      funnelType: f.funnel_type,
      leadSource: f.lead_source,
      nextFollowUp: f.next_follow_up,
      products: f.products || [],
      remarks: f.remarks,
      deliveryDetails: f.delivery_details,
      paymentTerms: f.payment_terms,
      orderNumber: f.order_number,
      quoteQty: f.quote_qty,
      quoteAmount: f.quote_amount,
      quoteDesc: f.quote_desc,
      status: f.status,
      createdAt: new Date(f.created_at).toLocaleString('en-IN', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      createdBy: f.created_by,
      assignedTo: f.assigned_to || null,
      lostDropReason: f.lost_drop_reason || "",
    };
  }
