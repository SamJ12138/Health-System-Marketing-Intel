import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Building2, TrendingUp, Lightbulb, Zap } from 'lucide-react';
import { trendCategories, channelOptions, effortOptions, impactOptions } from './data/options';
import { snapshotDateRange, formatDateRange, computeStats } from './lib/dataset';
import { DEFAULT_MODEL } from './lib/anthropicClient';
import { researchCompetitor as researchCompetitorLive, researchTrend as researchTrendLive, describeError } from './lib/liveResearch';
import { toggleOpportunity, summarizeOpportunities } from './lib/opportunities';
import { buildReport, reportFileName } from './lib/report';
import { tabConfig } from './components/tabConfig';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import ApiKeyModal from './components/ApiKeyModal';
import TopBar from './components/TopBar';
import StatsRow from './components/StatsRow';
import Footer from './components/Footer';
import MobileNav, { MOBILE_QUERY } from './components/MobileNav';
import { useMediaQuery } from './hooks/useMediaQuery';
import FixtureBanner from './components/FixtureBanner';
import CompetitorsTab from './components/tabs/CompetitorsTab';
import TrendsTab from './components/tabs/TrendsTab';
import OpportunitiesTab from './components/tabs/OpportunitiesTab';
import ReportTab from './components/tabs/ReportTab';

export default function App({ dataset, fetchImpl }) {
  const { competitors, homeSystem, homeEntry } = dataset;
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('competitors');
  // The API key is held here, in memory, and nowhere else.
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [showApiModal, setShowApiModal] = useState(false);
  // Live research answers sit on top of the verified snapshot and never replace it.
  const [liveEntries, setLiveEntries] = useState({});
  const [liveTrends, setLiveTrends] = useState([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState({});
  const [trendSearch, setTrendSearch] = useState('');
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [errors, setErrors] = useState({});
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [copyState, setCopyState] = useState('idle'); // idle | copied | failed
  const isNarrow = useMediaQuery(MOBILE_QUERY);
  const [showReport, setShowReport] = useState(false);
  const [opportunityFilters, setOpportunityFilters] = useState({ channel: '', effort: '', impact: '' });

  const entries = useMemo(() => ({ ...dataset.entries, ...liveEntries }), [dataset.entries, liveEntries]);
  const trends = useMemo(() => [...liveTrends, ...dataset.trends], [liveTrends, dataset.trends]);
  const snapshotLabel = useMemo(() => formatDateRange(snapshotDateRange(dataset)), [dataset]);
  // Landing-page numbers describe the verified snapshot only, never live answers.
  const snapshotStats = useMemo(() => computeStats(dataset), [dataset]);

  // The bookmark state is derived from the saved opportunities, so the two cannot drift apart.
  const savedInsights = useMemo(() => new Set(opportunities.map((o) => o.id)), [opportunities]);

  const toggleSave = useCallback((id) => {
    setOpportunities((ops) => toggleOpportunity(ops, id, { competitors, entries, trends }));
  }, [competitors, entries, trends]);

  const discardLive = useCallback((id) => {
    setLiveEntries((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id)));
  }, []);

  const removeOpportunity = useCallback((id) => {
    setOpportunities((ops) => ops.filter((o) => o.id !== id));
  }, []);

  const researchCompetitor = useCallback(async (competitorId) => {
    if (!apiKey) { setShowApiModal(true); return; }
    const competitor = competitors.find((c) => c.id === competitorId);
    setLoadingCompetitors((prev) => ({ ...prev, [competitorId]: true }));
    setErrors((prev) => ({ ...prev, [competitorId]: null }));
    try {
      const entry = await researchCompetitorLive({ competitor, apiKey, model, fetchImpl });
      setLiveEntries((prev) => ({ ...prev, [competitorId]: entry }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [competitorId]: describeError(err).message }));
    } finally {
      setLoadingCompetitors((prev) => ({ ...prev, [competitorId]: false }));
    }
  }, [apiKey, model, competitors, fetchImpl]);

  const searchTrend = useCallback(async (query) => {
    if (!query.trim()) return;
    if (!apiKey) { setShowApiModal(true); return; }
    setLoadingTrend(true);
    setErrors((prev) => ({ ...prev, trendSearch: null }));
    try {
      const trend = await researchTrendLive({ query, apiKey, model, fetchImpl });
      setLiveTrends((prev) => [trend, ...prev]);
      setTrendSearch('');
    } catch (err) {
      setErrors((prev) => ({ ...prev, trendSearch: describeError(err).message }));
    } finally {
      setLoadingTrend(false);
    }
  }, [apiKey, model, fetchImpl]);

  const generateReport = useCallback(() => {
    setReportMarkdown(buildReport({ competitors, homeSystem, homeEntry, entries, trends, opportunities, generatedAt: new Date() }));
    setShowReport(true);
    setCopyState('idle');
  }, [competitors, homeSystem, homeEntry, entries, trends, opportunities]);

  // The clipboard can be missing (insecure context) or refuse (permission): say so instead of failing silently.
  const copyReport = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(reportMarkdown);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }, [reportMarkdown]);

  const downloadReport = useCallback(() => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = reportFileName(new Date()); a.click();
    URL.revokeObjectURL(url);
  }, [reportMarkdown]);

  const statsData = [
    { label: 'Systems Tracked', value: competitors.length, icon: Building2, color: 'text-accent-sky' },
    // Counts the verified snapshot only; live answers are named separately so the two are never added up.
    {
      label: 'Verified Trends', value: dataset.trends.length, icon: TrendingUp, color: 'text-accent-teal',
      note: liveTrends.length > 0 ? `+${liveTrends.length} live, unreviewed` : null,
    },
    { label: 'Saved Opportunities', value: opportunities.length, icon: Lightbulb, color: 'text-accent-amber' },
    { label: 'Quick Wins', value: summarizeOpportunities(opportunities).quickWins, icon: Zap, color: 'text-accent-emerald' },
  ];

  const tabSubtitles = {
    competitors: 'How each system markets itself online: sourced facts, then labelled analysis',
    trends: 'Health-system marketing trends: sourced summaries and examples, then labelled analysis',
    opportunities: opportunities.length > 0 ? `${opportunities.length} ${opportunities.length === 1 ? 'opportunity' : 'opportunities'} saved` : 'Bookmark insights to build your opportunity list',
    report: 'Compile the facts, their sources and the analysis into a Markdown report',
  };

  return (
    <MotionConfig reducedMotion="user">
    {dataset.isFixture && <FixtureBanner />}
    <AnimatePresence mode="wait">
      {showLanding ? (
        <LandingPage key="landing" onEnter={() => setShowLanding(false)} stats={snapshotStats} snapshotLabel={snapshotLabel} />
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen noise-bg"
        >
          <AnimatePresence>
            {showApiModal && (
              <ApiKeyModal
                initialModel={model}
                connected={!!apiKey}
                onSave={({ apiKey: key, model: chosen }) => { setApiKey(key); setModel(chosen); setShowApiModal(false); }}
                onClose={() => setShowApiModal(false)}
                onDisconnect={() => { setApiKey(''); setShowApiModal(false); }}
              />
            )}
          </AnimatePresence>

          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} connected={!!apiKey} model={model} onApiClick={() => setShowApiModal(true)} />

          <div className="main-with-sidebar">
            <TopBar
              title={tabConfig.find(t => t.id === activeTab)?.label}
              subtitle={tabSubtitles[activeTab]}
              showConnect={!apiKey}
              onConnect={() => setShowApiModal(true)}
              snapshotLabel={snapshotLabel}
            />

            <main className="px-4 md:px-8 py-6 md:py-8 relative z-10">
              <StatsRow stats={statsData} />

              <AnimatePresence mode="wait">
                {activeTab === 'competitors' && (
                    <CompetitorsTab
                      key="competitors"
                      competitors={competitors}
                      entries={entries}
                      snapshotEntries={dataset.entries}
                      homeSystem={homeSystem}
                      homeEntry={homeEntry}
                      onDiscardLive={discardLive}
                      loadingCompetitors={loadingCompetitors}
                      errors={errors}
                      onResearch={researchCompetitor}
                      savedInsights={savedInsights}
                      onToggleSave={toggleSave}
                    />
                )}

                {activeTab === 'trends' && (
                    <TrendsTab
                      key="trends"
                      trends={trends}
                      trendCategories={trendCategories}
                      trendSearch={trendSearch}
                      onTrendSearchChange={setTrendSearch}
                      onSearch={searchTrend}
                      loadingTrend={loadingTrend}
                      error={errors.trendSearch}
                      savedInsights={savedInsights}
                      onToggleSave={toggleSave}
                    />
                )}

                {activeTab === 'opportunities' && (
                    <OpportunitiesTab
                      key="opportunities"
                      opportunities={opportunities}
                      filters={opportunityFilters}
                      onFiltersChange={setOpportunityFilters}
                      onRemove={removeOpportunity}
                      onNavigate={setActiveTab}
                      channelOptions={channelOptions}
                      effortOptions={effortOptions}
                      impactOptions={impactOptions}
                    />
                )}

                {activeTab === 'report' && (
                    <ReportTab
                      key="report"
                      reportMarkdown={reportMarkdown}
                      showReport={showReport}
                      onGenerate={generateReport}
                      onCopy={copyReport}
                      copyState={copyState}
                      onDownload={downloadReport}
                    />
                )}
              </AnimatePresence>
            </main>

            <Footer />
          </div>

          {isNarrow && <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />}
        </motion.div>
      )}
    </AnimatePresence>
    </MotionConfig>
  );
}
