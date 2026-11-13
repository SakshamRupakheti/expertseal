/**
 * ExpertSeal - Extension Popup Controller
 * Manages provider configuration, BYOK API keys, and cache statistics.
 * Seamlessly integrates with background service-worker.js and Chrome storage.
 */

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const statusPill = document.getElementById('status-pill');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  const providerCards = document.querySelectorAll('.es-provider-card');
  const providerDescText = document.getElementById('provider-desc-text');
  const providerBadge = document.getElementById('provider-badge');
  const apiKeyLink = document.getElementById('api-key-link');
  
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
  const eyeIcon = document.getElementById('eye-icon');
  const eyeOffIcon = document.getElementById('eye-off-icon');
  
  const saveBtn = document.getElementById('save-btn');
  const saveBtnText = document.getElementById('save-btn-text');
  const saveSpinner = document.getElementById('save-spinner');
  const saveIcon = document.getElementById('save-icon');
  
  const statVerifications = document.getElementById('stat-verifications');
  const statCached = document.getElementById('stat-cached');
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  let toastTimeout = null;

  // Provider metadata & descriptions
  const PROVIDER_CONFIG = {
    gemini: {
      name: 'Gemini',
      badge: 'Recommended',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      keyLabel: 'Get Gemini Key ↗',
      description: 'Gemini utilizes Google Search Grounding for high-speed, citation-backed verification of academic records and professional licenses.',
      placeholder: 'AIzaSy...'
    },
    openai: {
      name: 'OpenAI',
      badge: 'GPT-4o',
      keyUrl: 'https://platform.openai.com/api-keys',
      keyLabel: 'Get OpenAI Key ↗',
      description: 'OpenAI GPT-4o performs multi-query web search to rigorously verify credentials, publications, and institutional affiliations.',
      placeholder: 'sk-proj-...'
    },
    perplexity: {
      name: 'Perplexity',
      badge: 'Sonar Realtime',
      keyUrl: 'https://www.perplexity.ai/settings/api',
      keyLabel: 'Get Perplexity Key ↗',
      description: 'Perplexity Sonar provides real-time web search and domain filtering for deep-dive creator reputation and fact-checking.',
      placeholder: 'pplx-...'
    }
  };

  // State
  let currentProvider = 'gemini';
  let storedKeys = {
    gemini: '',
    openai: '',
    perplexity: ''
  };

  /**
   * Safe storage access wrappers for chrome.storage
   */
  const Storage = {
    syncGet(defaults) {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.get(defaults, resolve);
        } else {
          const result = {};
          for (const k in defaults) {
            result[k] = localStorage.getItem(`es_sync_${k}`) || defaults[k];
          }
          resolve(result);
        }
      });
    },

    syncSet(data) {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set(data, resolve);
        } else {
          for (const k in data) {
            localStorage.setItem(`es_sync_${k}`, typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]);
          }
          resolve();
        }
      });
    },

    localGet(keys) {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, resolve);
        } else {
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach((k) => {
              const val = localStorage.getItem(`es_local_${k}`);
              try { result[k] = JSON.parse(val); } catch(e) { result[k] = val; }
            });
          }
          resolve(result);
        }
      });
    }
  };

  /**
   * Display Toast message
   */
  function showToast(message, isError = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastMessage.textContent = message;
    if (isError) {
      toast.classList.add('es-toast-error');
    } else {
      toast.classList.remove('es-toast-error');
    }
    
    toast.classList.remove('es-toast-hidden');
    
    toastTimeout = setTimeout(() => {
      toast.classList.add('es-toast-hidden');
    }, 3200);
  }

  /**
   * Update status indicator UI
   */
  function updateStatus(hasKey) {
    if (hasKey) {
      statusPill.className = 'es-status-pill status-ready';
      statusText.textContent = 'Active';
      statusPill.title = 'ExpertSeal is active and ready to verify creators.';
    } else {
      statusPill.className = 'es-status-pill status-error';
      statusText.textContent = 'Key Required';
      statusPill.title = 'API key missing. Enter your key below to activate verification.';
    }
  }

  /**
   * Set active provider in UI
   */
  function setProviderUI(provider) {
    currentProvider = provider;
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.gemini;

    // Update radio and card states
    providerCards.forEach((card) => {
      if (card.getAttribute('data-provider') === provider) {
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      } else {
        card.classList.remove('active');
      }
    });

    // Update dynamic text and links
    providerDescText.textContent = config.description;
    providerBadge.textContent = config.badge;
    apiKeyLink.href = config.keyUrl;
    apiKeyLink.textContent = config.keyLabel;
    apiKeyInput.placeholder = `Enter ${config.name} API key (${config.placeholder})`;

    // Populate provider key if known
    const keyForProvider = storedKeys[provider] || '';
    apiKeyInput.value = keyForProvider;

    // Check status
    updateStatus(Boolean(keyForProvider.trim()));
  }

  /**
   * Load initial data from Chrome storage & service worker
   */
  async function loadSettings() {
    try {
      const syncData = await Storage.syncGet({
        provider: 'gemini',
        apiKey: '',
        geminiApiKey: '',
        openaiApiKey: '',
        perplexityApiKey: '',
        apiKeys: null
      });

      currentProvider = syncData.provider || 'gemini';
      
      // Load keys supporting both formats
      storedKeys.gemini = syncData.geminiApiKey || (syncData.apiKeys && syncData.apiKeys.gemini) || '';
      storedKeys.openai = syncData.openaiApiKey || (syncData.apiKeys && syncData.apiKeys.openai) || '';
      storedKeys.perplexity = syncData.perplexityApiKey || (syncData.apiKeys && syncData.apiKeys.perplexity) || '';

      // Fallback: if only single apiKey exists and matches current provider
      if (!storedKeys[currentProvider] && syncData.apiKey) {
        storedKeys[currentProvider] = syncData.apiKey;
      }

      setProviderUI(currentProvider);
      
      // Check status
      const activeKey = storedKeys[currentProvider] || apiKeyInput.value.trim();
      updateStatus(Boolean(activeKey));

      // Load statistics
      await loadStats();
    } catch (err) {
      console.error('[ExpertSeal] Failed to load settings:', err);
      updateStatus(false);
    }
  }

  /**
   * Load stats from service worker or local storage
   */
  async function loadStats() {
    try {
      // First try sending message to service worker
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'getCacheStats' }, (res) => {
          if (res && res.success && res.stats) {
            const stats = res.stats;
            statCached.textContent = (stats.activeEntries ?? stats.totalEntries ?? 0).toLocaleString();
            // Read verifications counter
            chrome.storage.local.get(['verificationsCount', 'totalVerifications'], (loc) => {
              const total = loc.totalVerifications ?? loc.verificationsCount ?? stats.totalEntries ?? 0;
              statVerifications.textContent = total.toLocaleString();
            });
            return;
          }
          fallbackReadStats();
        });
      } else {
        fallbackReadStats();
      }
    } catch (err) {
      fallbackReadStats();
    }
  }

  /**
   * Fallback read from chrome.storage.local
   */
  async function fallbackReadStats() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(null, (allData) => {
          if (!allData) return;
          const cacheKeys = Object.keys(allData).filter(k => k.startsWith('cache_') || k.startsWith('es_cache_'));
          const totalVerifications = allData.totalVerifications || allData.verificationsCount || cacheKeys.length;
          statVerifications.textContent = totalVerifications.toLocaleString();
          statCached.textContent = cacheKeys.length.toLocaleString();
        });
      }
    } catch (e) {
      console.warn('[ExpertSeal] Stats fallback error:', e);
    }
  }

  /**
   * Save configuration
   */
  async function saveSettings() {
    const rawKey = apiKeyInput.value.trim();
    if (!rawKey) {
      showToast(`Please enter an API key for ${PROVIDER_CONFIG[currentProvider].name}`, true);
      apiKeyInput.focus();
      return;
    }

    // Button loading state
    saveBtn.disabled = true;
    saveSpinner.classList.remove('es-hidden');
    saveIcon.classList.add('es-hidden');
    saveBtnText.textContent = 'Saving...';

    storedKeys[currentProvider] = rawKey;

    const payload = {
      provider: currentProvider,
      apiKey: rawKey,
      geminiApiKey: storedKeys.gemini,
      openaiApiKey: storedKeys.openai,
      perplexityApiKey: storedKeys.perplexity,
      apiKeys: storedKeys,
      updatedAt: new Date().toISOString()
    };

    try {
      // Save directly to chrome.storage.sync
      await Storage.syncSet(payload);

      // Also notify service worker if available
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'saveSettings', settings: payload }, () => {});
      }

      updateStatus(true);
      showToast('Settings saved! Ready to verify.');
    } catch (err) {
      console.error('[ExpertSeal] Failed to save settings:', err);
      showToast('Error saving settings. Try again.', true);
    } finally {
      saveBtn.disabled = false;
      saveSpinner.classList.add('es-hidden');
      saveIcon.classList.remove('es-hidden');
      saveBtnText.textContent = 'Save Settings';
    }
  }

  /**
   * Clear cache action
   */
  async function clearCache() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'clearCache' }, (res) => {
          statCached.textContent = '0';
          showToast('Verification cache cleared');
        });
      } else {
        statCached.textContent = '0';
        showToast('Verification cache cleared');
      }
    } catch (err) {
      console.error('[ExpertSeal] Failed to clear cache:', err);
      showToast('Failed to clear cache', true);
    }
  }

  // Event Listeners
  providerCards.forEach((card) => {
    card.addEventListener('click', () => {
      const selected = card.getAttribute('data-provider');
      if (selected && selected !== currentProvider) {
        // Save current input before switching
        if (apiKeyInput.value.trim()) {
          storedKeys[currentProvider] = apiKeyInput.value.trim();
        }
        setProviderUI(selected);
      }
    });
  });

  // Toggle API key visibility
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    if (isPassword) {
      eyeIcon.classList.add('es-hidden');
      eyeOffIcon.classList.remove('es-hidden');
    } else {
      eyeIcon.classList.remove('es-hidden');
      eyeOffIcon.classList.add('es-hidden');
    }
    apiKeyInput.focus();
  });

  // Save on button click
  saveBtn.addEventListener('click', saveSettings);

  // Save on Enter in input
  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSettings();
    }
  });

  // Clear cache
  clearCacheBtn.addEventListener('click', clearCache);

  // Initial load
  loadSettings();
});
