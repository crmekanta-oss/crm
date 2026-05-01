import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { crmService } from '../services/crmService';
import { Plus, Search, Filter } from 'lucide-react';

const Customers = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    contact_person: '',
    phone: '',
    email: '',
    city: '',
    enquiry_type: '',
    funnel_type: '',
    lead_source: '',
    next_follow_up: '',
    status: 'New'
  });

  const columns = [
    { header: 'Contact', accessor: 'contact_person' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'City', accessor: 'city' },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          row.status === 'Won' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {row.status}
        </span>
      )
    },
    { header: 'Follow-up', accessor: 'next_follow_up' }
  ];

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await crmService.getAll();
      setLeads(data);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await crmService.addFunnel(formData);
    
    if (result.success) {
      alert('Success! Lead added to CRM.');
      setShowModal(false);
      setFormData({
        contact_person: '',
        phone: '',
        email: '',
        city: '',
        enquiry_type: '',
        funnel_type: '',
        lead_source: '',
        next_follow_up: '',
        status: 'New'
      });
      fetchLeads();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Funnel</h1>
          <p className="text-gray-500 text-sm">Manage your sales funnel and leads</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all font-medium shadow-sm"
        >
          <Plus size={20} />
          Add New Lead
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative mb-6">
          <strong className="font-bold">Database Error: </strong>
          <span className="block sm:inline">{error}</span>
          <p className="mt-2 text-sm">Please make sure you have created the "crm" table in your Supabase SQL Editor.</p>
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={leads} 
        loading={loading} 
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 my-8">
            <h2 className="text-xl font-bold mb-6">Add New Funnel Entry</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Contact Person</label>
                <input name="contact_person" required className="w-full p-2.5 border rounded-lg" value={formData.contact_person} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <input name="phone" className="w-full p-2.5 border rounded-lg" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input name="email" type="email" className="w-full p-2.5 border rounded-lg" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">City</label>
                <input name="city" className="w-full p-2.5 border rounded-lg" value={formData.city} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Enquiry Type</label>
                <input name="enquiry_type" className="w-full p-2.5 border rounded-lg" value={formData.enquiry_type} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Funnel Type</label>
                <input name="funnel_type" className="w-full p-2.5 border rounded-lg" value={formData.funnel_type} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Lead Source</label>
                <input name="lead_source" className="w-full p-2.5 border rounded-lg" value={formData.lead_source} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Next Follow-up</label>
                <input name="next_follow_up" type="date" className="w-full p-2.5 border rounded-lg" value={formData.next_follow_up} onChange={handleChange} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select name="status" className="w-full p-2.5 border rounded-lg" value={formData.status} onChange={handleChange}>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              
              <div className="col-span-full flex gap-4 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Submit Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
