'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

interface Deal {
  dealId: string;
  chainId: string;
  title: string;
  description: string;
  dealType: 'IN_APP' | 'IN_STORE' | 'COUPON_CODE' | 'SIGNUP_BONUS' | 'WEAR_PROMO' | 'PUNCH_CARD';
  params?: {
    couponCode?: string;
    minPurchaseCents?: number;
    freeItemId?: string;
    promoWearColor?: string;
    bonusPoints?: number;
    [key: string]: any;
  };
  startDate: string;
  endDate?: string;
  locationScope: 'GLOBAL' | 'REGIONAL' | 'STORE_SPECIFIC';
  regions?: string[];
  storeIds?: string[];
  geoHash?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

type DealType = Deal['dealType'];
type LocationScope = Deal['locationScope'];

export default function DealDashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [formData, setFormData] = useState({
    chainId: '',
    title: '',
    description: '',
    dealType: 'IN_APP' as DealType,
    params: {} as Deal['params'],
    startDate: '',
    endDate: '',
    locationScope: 'GLOBAL' as LocationScope,
    regions: [] as string[],
    storeIds: [] as string[],
    geoHash: '',
    active: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await axios.get('/api/dealslist');
      setDeals(res.data);
    } catch (err) {
      console.error('Error fetching deals:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'regions' || name === 'storeIds') {
      // Handle array inputs (comma-separated)
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setFormData(prev => ({ ...prev, [name]: arrayValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.patch(`/api/dealslist/${editingId}`, formData);
      } else {
        await axios.post('/api/dealslist', formData);
      }
      setFormData({ 
        chainId: '', 
        title: '', 
        description: '', 
        dealType: 'IN_APP' as DealType, 
        params: {}, 
        startDate: '', 
        endDate: '', 
        locationScope: 'GLOBAL' as LocationScope, 
        regions: [], 
        storeIds: [], 
        geoHash: '', 
        active: true 
      });
      setEditingId(null);
      await fetchDeals();
    } catch (err) {
      console.error('Error saving deal:', err);
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingId(deal.dealId);
    setFormData({
      chainId: deal.chainId || '',
      title: deal.title || '',
      description: deal.description || '',
      dealType: deal.dealType || 'IN_APP' as DealType,
      params: deal.params || {},
      startDate: deal.startDate ? deal.startDate.slice(0, 10) : '',
      endDate: deal.endDate ? deal.endDate.slice(0, 10) : '',
      locationScope: deal.locationScope || 'GLOBAL' as LocationScope,
      regions: deal.regions || [],
      storeIds: deal.storeIds || [],
      geoHash: deal.geoHash || '',
      active: deal.active ?? true
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      await axios.delete(`/api/dealslist/${id}`);
      await fetchDeals();
    } catch (err) {
      console.error('Error deleting deal:', err);
    }
  };

  const dealTypes: DealType[] = ['IN_APP', 'IN_STORE', 'COUPON_CODE', 'SIGNUP_BONUS', 'WEAR_PROMO', 'PUNCH_CARD'];
  const locationScopes: LocationScope[] = ['GLOBAL', 'REGIONAL', 'STORE_SPECIFIC'];

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">Error Admin Dashboard</h1>

      {/* Deal Form */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingId ? 'Edit' : 'Add New'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chain ID</label>
            <input
              name="chainId"
              value={formData.chainId}
              onChange={handleInputChange}
              placeholder="e.g., popeyes, mcdonalds"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Deal title"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Full description of the deal"
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
            <select
              name="dealType"
              value={formData.dealType}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {dealTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Scope</label>
            <select
              name="locationScope"
              value={formData.locationScope}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {locationScopes.map(scope => (
                <option key={scope} value={scope}>{scope.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {formData.locationScope === 'REGIONAL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regions (comma-separated)</label>
              <input
                name="regions"
                value={formData.regions.join(', ')}
                onChange={handleInputChange}
                placeholder="e.g., MD, DC, VA"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {formData.locationScope === 'STORE_SPECIFIC' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store IDs (comma-separated)</label>
              <input
                name="storeIds"
                value={formData.storeIds.join(', ')}
                onChange={handleInputChange}
                placeholder="e.g., store1, store2, store3"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Geo Hash</label>
            <input
              name="geoHash"
              value={formData.geoHash}
              onChange={handleInputChange}
              placeholder="Optional geohash"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Active</label>
          </div>

          <div className="md:col-span-2 text-right">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition"
            >
              {editingId ? 'Update' : 'Add'} Deal
            </button>
          </div>
        </form>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map(deal => (
          <div
            key={deal.dealId}
            className={`bg-white shadow-lg rounded-lg p-5 hover:shadow-2xl transition ${
              !deal.active ? 'opacity-60' : ''
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">{deal.title || 'Untitled Deal'}</h3>
              <div className="flex flex-col items-end">
                <span className="px-2 py-1 text-sm font-medium text-indigo-800 bg-indigo-100 rounded mb-1">
                  {deal.dealType?.replace('_', ' ') || 'No Type'}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  deal.active 
                    ? 'text-green-800 bg-green-100' 
                    : 'text-red-800 bg-red-100'
                }`}>
                  {deal.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-2">{deal.chainId || 'Unknown Chain'}</p>
            <p className="text-gray-700 text-sm mb-3">{deal.description}</p>
            
            <div className="text-sm text-gray-500 mb-3">
              <div className="mb-1">
                <strong>Scope:</strong> {deal.locationScope?.replace('_', ' ')}
              </div>
              {deal.startDate ? (
                <div>
                  <strong>Start:</strong> {format(new Date(deal.startDate), 'MMM d, yyyy')}
                </div>
              ) : (
                <div>No Start Date</div>
              )}
              {deal.endDate ? (
                <div>
                  <strong>End:</strong> {format(new Date(deal.endDate), 'MMM d, yyyy')}
                </div>
              ) : (
                <div>No Expiry</div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => handleEdit(deal)}
                className="text-yellow-600 hover:underline text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(deal.dealId)}
                className="text-red-600 hover:underline text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}