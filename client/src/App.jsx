import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import BuyerDiscoveryView from './components/BuyerDiscoveryView';
import SavedLeadsView from './components/SavedLeadsView';
import EmailCampaignsView from './components/EmailCampaignsView';
import AnalyticsView from './components/AnalyticsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('discovery');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [searchParams, setSearchParams] = useState({
    product: 'Textiles',
    country: 'United States',
    industry: 'Apparel & Textiles',
    role: 'Importer',
  });

  const [discoveryData, setDiscoveryData] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(null);

  const [savedLeads, setSavedLeads] = useState([]);
  const [queuedRecipients, setQueuedRecipients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const refreshSavedLeads = useCallback(async () => {
    try {
      const data = await api.getLeads();
      setSavedLeads(data.leads || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    }
  }, []);

  const refreshCampaignsAndAnalytics = useCallback(async () => {
    try {
      const [cmpData, analyticsData] = await Promise.all([
        api.getCampaigns(),
        api.getAnalytics(),
      ]);
      setTemplates(cmpData.templates || []);
      setCampaigns(cmpData.campaigns || []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load campaigns/analytics:', err);
    }
  }, []);

  const runBuyerSearch = useCallback(async (paramsToUse) => {
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    try {
      const result = await api.searchBuyers(paramsToUse);
      setDiscoveryData(result);
    } catch (err) {
      setDiscoveryError(err.message);
    } finally {
      setDiscoveryLoading(false);
    }
  }, []);

  useEffect(() => {
    api.getStatus().then(setIntegrationStatus).catch(() => {});
    refreshSavedLeads();
    refreshCampaignsAndAnalytics();
    runBuyerSearch({
      product: 'Textiles',
      country: 'United States',
      industry: 'Apparel & Textiles',
      role: 'Importer',
    });
  }, [refreshSavedLeads, refreshCampaignsAndAnalytics, runBuyerSearch]);

  const handleSaveLeads = async (leadsToSave) => {
    await api.saveLeads(leadsToSave);
    await Promise.all([refreshSavedLeads(), refreshCampaignsAndAnalytics()]);
  };

  const handleToggleLeadTag = async (lead, tag) => {
    const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
    const nextTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    await api.updateLead(lead.id, { tags: nextTags });
    await Promise.all([refreshSavedLeads(), refreshCampaignsAndAnalytics()]);
  };

  const handleUpdateLead = async (leadId, patch) => {
    await api.updateLead(leadId, patch);
    await refreshSavedLeads();
  };

  const handleDeleteLead = async (leadId) => {
    await api.deleteLead(leadId);
    await Promise.all([refreshSavedLeads(), refreshCampaignsAndAnalytics()]);
  };

  const handleSendToCampaign = (buyersList) => {
    setQueuedRecipients((prev) => {
      const byKey = new Map(prev.map((item) => [item.id || item.companyName, item]));
      for (const b of buyersList) {
        byKey.set(b.id || b.companyName, b);
      }
      return Array.from(byKey.values());
    });
    setActiveTab('campaigns');
  };

  const handleCampaignSent = async (payload) => {
    const res = await api.sendCampaign(payload);
    await Promise.all([refreshSavedLeads(), refreshCampaignsAndAnalytics()]);
    return res;
  };

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    await api.updateDeliveryStatus(deliveryId, status);
    await refreshCampaignsAndAnalytics();
  };

  const handleQuickSearch = (term) => {
    const next = { ...searchParams, product: term };
    setSearchParams(next);
    setActiveTab('discovery');
    runBuyerSearch(next);
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedLeadsCount={savedLeads.length}
        queuedRecipientsCount={queuedRecipients.length}
        integrationStatus={integrationStatus}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="app-main">
        <TopBar
          activeTab={activeTab}
          quickQuery={searchParams.product}
          onQuickSearch={handleQuickSearch}
          integrationStatus={integrationStatus}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onJumpToCampaign={() => setActiveTab('campaigns')}
          queuedCount={queuedRecipients.length}
        />

        <main className="app-content">
          {activeTab === 'discovery' && (
            <BuyerDiscoveryView
              searchParams={searchParams}
              onChangeSearchParams={setSearchParams}
              onRunSearch={runBuyerSearch}
              discoveryData={discoveryData}
              loading={discoveryLoading}
              error={discoveryError}
              savedLeads={savedLeads}
              onSaveLeads={handleSaveLeads}
              onToggleLeadTag={handleToggleLeadTag}
              onSendToCampaign={handleSendToCampaign}
            />
          )}

          {activeTab === 'leads' && (
            <SavedLeadsView
              leads={savedLeads}
              onToggleTag={handleToggleLeadTag}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onSendToCampaign={handleSendToCampaign}
              onGoToDiscovery={() => setActiveTab('discovery')}
            />
          )}

          {activeTab === 'campaigns' && (
            <EmailCampaignsView
              templates={templates}
              campaigns={campaigns}
              queuedRecipients={queuedRecipients}
              setQueuedRecipients={setQueuedRecipients}
              savedLeads={savedLeads}
              integrationStatus={integrationStatus}
              onCampaignSent={handleCampaignSent}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              analytics={analytics}
              onRefresh={refreshCampaignsAndAnalytics}
              onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            />
          )}
        </main>
      </div>
    </div>
  );
}
