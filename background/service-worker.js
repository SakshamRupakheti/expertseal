/**
 * ExpertSeal - Service Worker (Background Script)
 * Manifest V3 compatible background script handling LLM verification requests,
 * API communication, caching, and settings management.
 */

// ============================================================================
// 1. Constants & Configuration
// ============================================================================

/**
 * Cache time-to-live: 30 days in milliseconds
 * 30 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
 */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Key prefix for cached verification results in chrome.storage.local
 */
const CACHE_KEY_PREFIX = 'cache_';

/**
 * Default fallback provider if none is specified
 */
const DEFAULT_PROVIDER = 'gemini';

/**
 * The Master Verification Prompt sent to LLMs to evaluate creator credentials.
 */
const MASTER_PROMPT = `You are ExpertSeal, a credential verification agent. Your task is to determine whether a social media content creator has REAL, VERIFIABLE expertise in the field they create content about.

You will receive information about a content creator. Your job is to search the web and verify their credentials.

## Verification Steps

1. **Identify the person**: Use their display name, username, and bio to find their real identity.
2. **Find professional profiles**: Search for them on LinkedIn, professional association directories, university faculty pages, hospital/clinic directories, law firm pages, company websites, Google Scholar, etc.
3. **Verify claimed credentials**: 
   - Medical: Check state medical board registries, NPI registry (npiregistry.cms.hhs.gov), hospital affiliations
   - Legal: Check state bar association directories
   - Academic: Check university faculty pages, Google Scholar profiles, publication records
   - Finance: Check FINRA BrokerCheck, SEC advisor search, CPA directories
   - Engineering: Check professional engineering license databases
   - Fitness/Nutrition: Check NASM, ACE, ISSA certifications, registered dietitian databases
   - General: LinkedIn, personal websites, published work, speaking engagements
4. **Cross-reference**: Confirm the social media account actually belongs to the verified professional (matching names, photos, linked accounts, etc.)

## Important Rules
- Only report what you can ACTUALLY FIND with evidence. Do not hallucinate credentials.
- If verified=true: You found strong evidence they ARE a credentialed expert
- If verified=false: You found evidence they are NOT qualified or are misrepresenting credentials  
- If verified=null: You could not find enough information to verify either way
- Note if someone is an "enthusiast" vs a "certified professional" - both are valid but different
- Always include source URLs where you found information

## Output Format
Return ONLY a valid JSON object (no markdown, no code blocks, just raw JSON):
{
  "verified": true | false | null,
  "confidence": "high" | "medium" | "low",
  "name": "Full verified name or null",
  "claimed_expertise": "What they appear to claim expertise in",
  "verified_credentials": [
    {
      "credential": "e.g., MD, Board Certified in Cardiology",
      "source": "e.g., American Board of Medical Specialties",
      "url": "verification URL if available"
    }
  ],
  "professional_profiles": [
    {
      "platform": "e.g., LinkedIn",
      "url": "profile URL",
      "matches": true | false
    }
  ],
  "red_flags": ["List any concerns, empty array if none"],
  "summary": "2-3 sentence summary of findings"
}`;

// ============================================================================
// 2. Cache Layer Helpers (chrome.storage.local)
// ============================================================================

/**
 * Generates a normalized cache key for a given platform and username.
 * e.g., 'cache_youtube_hubermanlab' or 'cache_x_drandrew'
 *
 * @param {string} platform - The social platform ('youtube', 'tiktok', 'twitter', 'x')
 * @param {string} username - The creator's handle/username
 * @returns {string} Normalized cache key
 */
function getCacheKey(platform, username) {
  const normPlatform = (platform || 'unknown').toLowerCase().trim();
  const normUsername = (username || 'unknown').toLowerCase().trim().replace(/^@/, '');
  return `${CACHE_KEY_PREFIX}${normPlatform}_${normUsername}`;
}

/**
 * Retrieves a cached verification entry if it exists and has not expired.
 *
 * @param {string} platform - Platform identifier
 * @param {string} username - Creator handle
 * @returns {Promise<object|null>} The cached entry or null if expired/not found
 */
async function getFromCache(platform, username) {
  const key = getCacheKey(platform, username);
  try {
    const data = await chrome.storage.local.get([key]);
    const entry = data[key];

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - (entry.timestamp || 0);

    if (age > CACHE_TTL_MS) {
      console.log(`[ExpertSeal] Cache entry expired for ${key} (age: ${Math.round(age / 86400000)} days)`);
      // Optionally clean up expired entry
      await chrome.storage.local.remove([key]);
      return null;
    }

    console.log(`[ExpertSeal] Cache hit for ${key}`);
    return entry;
  } catch (err) {
    console.warn(`[ExpertSeal] Error reading cache for ${key}:`, err);
    return null;
  }
}

/**
 * Saves a verification result to local cache with timestamp and provider metadata.
 *
 * @param {string} platform - Platform identifier
 * @param {string} username - Creator handle
 * @param {object} result - The normalized verification result object
 * @param {string} provider - LLM provider used ('gemini', 'openai', 'perplexity')
 * @returns {Promise<void>}
 */
async function saveToCache(platform, username, result, provider) {
  const key = getCacheKey(platform, username);
  const entry = {
    result,
    timestamp: Date.now(),
    provider,
    platform: platform.toLowerCase().trim(),
    username: username.toLowerCase().trim().replace(/^@/, '')
  };

  try {
    await chrome.storage.local.set({ [key]: entry });
    console.log(`[ExpertSeal] Saved verification result to cache for ${key}`);
  } catch (err) {
    console.error(`[ExpertSeal] Failed to save to cache for ${key}:`, err);
  }
}

/**
 * Clears all verification entries from local cache.
 *
 * @returns {Promise<number>} Number of keys removed
 */
async function clearAllCache() {
  try {
    const allData = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allData).filter(k => k.startsWith(CACHE_KEY_PREFIX));

    if (cacheKeys.length > 0) {
      await chrome.storage.local.remove(cacheKeys);
    }
    console.log(`[ExpertSeal] Cleared ${cacheKeys.length} items from cache`);
    return cacheKeys.length;
  } catch (err) {
    console.error('[ExpertSeal] Error clearing cache:', err);
    throw err;
  }
}

/**
 * Calculates cache statistics including total items, platform breakdown, and age.
 *
 * @returns {Promise<object>} Cache statistics
 */
async function getCacheStatistics() {
  try {
    const allData = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(allData).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    const now = Date.now();

    let activeCount = 0;
    let expiredCount = 0;
    let oldestTimestamp = null;
    let newestTimestamp = null;
    const byPlatform = {};

    for (const key of cacheKeys) {
      const entry = allData[key];
      if (!entry) continue;

      const age = now - (entry.timestamp || 0);
      const isExpired = age > CACHE_TTL_MS;

      if (isExpired) {
        expiredCount++;
      } else {
        activeCount++;
      }

      if (entry.timestamp) {
        if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
        if (!newestTimestamp || entry.timestamp > newestTimestamp) {
          newestTimestamp = entry.timestamp;
        }
      }

      const platform = (entry.platform || key.replace(CACHE_KEY_PREFIX, '').split('_')[0] || 'other').toLowerCase();
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
    }

    return {
      totalEntries: cacheKeys.length,
      activeEntries: activeCount,
      expiredEntries: expiredCount,
      byPlatform,
      oldestTimestamp,
      newestTimestamp,
      ttlDays: 30
    };
  } catch (err) {
    console.error('[ExpertSeal] Error computing cache stats:', err);
    throw err;
  }
}

// ============================================================================
// 3. Settings Management (chrome.storage.sync)
// ============================================================================

/**
 * Retrieves the stored API settings.
 * Supports both generic 'apiKey' and provider-specific keys ('geminiApiKey', etc.)
 *
 * @returns {Promise<object>} Current settings configuration
 */
async function getStoredSettings() {
  try {
    const defaults = {
      provider: DEFAULT_PROVIDER,
      apiKey: '',
      geminiApiKey: '',
      openaiApiKey: '',
      perplexityApiKey: ''
    };

    const stored = await chrome.storage.sync.get(defaults);
    const activeProvider = stored.provider || DEFAULT_PROVIDER;

    // Resolve the active API key with fallback precedence
    let activeApiKey = stored.apiKey;
    if (activeProvider === 'gemini' && stored.geminiApiKey) {
      activeApiKey = stored.geminiApiKey;
    } else if (activeProvider === 'openai' && stored.openaiApiKey) {
      activeApiKey = stored.openaiApiKey;
    } else if (activeProvider === 'perplexity' && stored.perplexityApiKey) {
      activeApiKey = stored.perplexityApiKey;
    }

    return {
      provider: activeProvider,
      apiKey: activeApiKey || '',
      geminiApiKey: stored.geminiApiKey || '',
      openaiApiKey: stored.openaiApiKey || '',
      perplexityApiKey: stored.perplexityApiKey || '',
      hasKey: Boolean(activeApiKey && activeApiKey.trim().length > 0)
    };
  } catch (err) {
    console.error('[ExpertSeal] Failed to load settings:', err);
    return {
      provider: DEFAULT_PROVIDER,
      apiKey: '',
      hasKey: false
    };
  }
}

/**
 * Saves user settings to chrome.storage.sync.
 *
 * @param {object} newSettings - Object containing updated keys/provider
 * @returns {Promise<void>}
 */
async function saveStoredSettings(newSettings) {
  try {
    await chrome.storage.sync.set(newSettings);
    console.log('[ExpertSeal] Settings updated successfully');
  } catch (err) {
    console.error('[ExpertSeal] Failed to save settings:', err);
    throw err;
  }
}

// ============================================================================
// 4. LLM API Integration (Gemini, OpenAI, Perplexity)
// ============================================================================

/**
 * Formats creator details into a structured user message for the LLM.
 *
 * @param {object} creator - The creator information object
 * @returns {string} Formatted text prompt segment
 */
function buildCreatorContextPrompt(creator) {
  const lines = [
    'Please verify the following content creator:',
    `• Platform: ${creator.platform || 'Unknown'}`,
    `• Username / Handle: @${(creator.username || '').replace(/^@/, '')}`,
    `• Display Name: ${creator.displayName || 'N/A'}`,
    `• Bio / Description: ${creator.bio || 'N/A'}`,
    `• Profile URL: ${creator.profileUrl || 'N/A'}`,
    `• Content Topic / Claimed Focus: ${creator.contentTopic || 'General Content'}`
  ];
  return lines.join('\n');
}

/**
 * Calls Google Gemini API (gemini-2.0-flash) with Google Search grounding.
 *
 * @param {string} apiKey - Google Gemini API Key
 * @param {string} creatorContext - Creator information formatted string
 * @returns {Promise<string>} Raw text output from Gemini
 */
async function callGemini(apiKey, creatorContext) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const promptText = `${MASTER_PROMPT}\n\n${creatorContext}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: promptText }
        ]
      }
    ],
    tools: [
      {
        googleSearch: {}
      }
    ],
    generationConfig: {
      temperature: 0.2
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = await response.text();
    }
    throw new Error(`Gemini API error (Status ${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate || !candidate.content || !candidate.content.parts) {
    throw new Error('Gemini API returned an empty or blocked candidate response.');
  }

  // Concatenate text parts
  const fullText = candidate.content.parts
    .map(p => p.text || '')
    .filter(t => Boolean(t))
    .join('\n');

  if (!fullText.trim()) {
    throw new Error('Gemini API candidate contained no text parts.');
  }

  return fullText;
}

/**
 * Calls OpenAI API with web search preview enabled (gpt-4o-search-preview).
 *
 * @param {string} apiKey - OpenAI API key
 * @param {string} creatorContext - Creator information formatted string
 * @returns {Promise<string>} Raw text output from OpenAI
 */
async function callOpenAI(apiKey, creatorContext) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: 'gpt-4o-search-preview',
    web_search_options: {
      search_context_size: 'medium'
    },
    messages: [
      {
        role: 'system',
        content: MASTER_PROMPT
      },
      {
        role: 'user',
        content: creatorContext
      }
    ],
    temperature: 0.2
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = await response.text();
    }
    throw new Error(`OpenAI API error (Status ${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI API returned an empty choices message.');
  }

  return content;
}

/**
 * Calls Perplexity AI API using the Sonar model with web search capabilities.
 *
 * @param {string} apiKey - Perplexity API key
 * @param {string} creatorContext - Creator information formatted string
 * @returns {Promise<string>} Raw text output from Perplexity
 */
async function callPerplexity(apiKey, creatorContext) {
  const endpoint = 'https://api.perplexity.ai/chat/completions';

  const payload = {
    model: 'sonar',
    messages: [
      {
        role: 'system',
        content: MASTER_PROMPT
      },
      {
        role: 'user',
        content: creatorContext
      }
    ],
    temperature: 0.2
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch (_) {
      errorDetail = await response.text();
    }
    throw new Error(`Perplexity API error (Status ${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Perplexity API returned an empty choices message.');
  }

  return content;
}

// ============================================================================
// 5. Response Parsing & Schema Normalization
// ============================================================================

/**
 * Robust JSON extractor that handles direct JSON, markdown code blocks,
 * and conversational prefixes/suffixes from LLM responses.
 *
 * @param {string} rawText - Raw LLM string output
 * @returns {object} Parsed JSON object
 */
function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid response received from LLM.');
  }

  const trimmed = rawText.trim();

  // Strategy 1: Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  // Strategy 2: Extract from ```json ... ``` or ``` ... ``` markdown fence
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(codeBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch (_) {}
  }

  // Strategy 3: Find outermost curly braces { ... }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (parseErr) {
      throw new Error(`Failed to parse extracted JSON candidate: ${parseErr.message}`);
    }
  }

  throw new Error('No valid JSON object could be located in the LLM response.');
}

/**
 * Normalizes and validates the parsed JSON against the expected ExpertSeal schema.
 * Prevents UI breaks if the LLM omitted or mistyped certain fields.
 *
 * @param {object} parsed - The raw parsed JSON from LLM
 * @returns {object} Guaranteed safe and structured verification result
 */
function normalizeVerificationResult(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Verification result is not an object.');
  }

  // Parse verified boolean / null
  let verified = null;
  if (parsed.verified === true || parsed.verified === 'true') {
    verified = true;
  } else if (parsed.verified === false || parsed.verified === 'false') {
    verified = false;
  }

  // Parse confidence
  let confidence = 'medium';
  if (typeof parsed.confidence === 'string') {
    const confLower = parsed.confidence.toLowerCase().trim();
    if (['high', 'medium', 'low'].includes(confLower)) {
      confidence = confLower;
    }
  }

  // Parse name
  const name = typeof parsed.name === 'string' && parsed.name.trim() !== ''
    ? parsed.name.trim()
    : null;

  // Claimed expertise
  const claimed_expertise = typeof parsed.claimed_expertise === 'string'
    ? parsed.claimed_expertise.trim()
    : '';

  // Verified credentials list
  const verified_credentials = Array.isArray(parsed.verified_credentials)
    ? parsed.verified_credentials.map(c => ({
        credential: String(c.credential || '').trim(),
        source: String(c.source || '').trim(),
        url: String(c.url || '').trim()
      })).filter(c => c.credential || c.source)
    : [];

  // Professional profiles list
  const professional_profiles = Array.isArray(parsed.professional_profiles)
    ? parsed.professional_profiles.map(p => ({
        platform: String(p.platform || '').trim(),
        url: String(p.url || '').trim(),
        matches: Boolean(p.matches)
      })).filter(p => p.platform || p.url)
    : [];

  // Red flags list
  const red_flags = Array.isArray(parsed.red_flags)
    ? parsed.red_flags.map(r => String(r).trim()).filter(Boolean)
    : [];

  // Summary
  const summary = typeof parsed.summary === 'string'
    ? parsed.summary.trim()
    : 'No summary provided by verification agent.';

  return {
    verified,
    confidence,
    name,
    claimed_expertise,
    verified_credentials,
    professional_profiles,
    red_flags,
    summary
  };
}

// ============================================================================
// 6. Verification Orchestration
// ============================================================================

/**
 * Main verification pipeline:
 * 1. Checks cache for active entry
 * 2. If missed/expired, retrieves configured LLM provider and API key
 * 3. Calls the respective search-grounded LLM
 * 4. Parses and sanitizes output JSON
 * 5. Saves result to cache
 * 6. Returns result to caller
 *
 * @param {object} creatorData - { platform, username, displayName, bio, profileUrl, contentTopic }
 * @returns {Promise<object>} Verification outcome
 */
async function handleVerifyRequest(creatorData) {
  const { platform, username, displayName, bio, profileUrl, contentTopic } = creatorData || {};

  if (!platform || !username) {
    throw new Error('Missing required creator fields: platform and username are required.');
  }

  // Step 1: Check cache
  const cached = await getFromCache(platform, username);
  if (cached && cached.result) {
    return {
      success: true,
      data: cached.result,
      cached: true,
      timestamp: cached.timestamp,
      provider: cached.provider
    };
  }

  // Step 2: Retrieve API credentials
  const settings = await getStoredSettings();
  if (!settings.hasKey || !settings.apiKey) {
    throw new Error(
      `No API key configured for provider "${settings.provider}". ` +
      'Please open the ExpertSeal extension popup and set your API key.'
    );
  }

  const provider = settings.provider.toLowerCase();
  const apiKey = settings.apiKey;
  const creatorContext = buildCreatorContextPrompt({
    platform,
    username,
    displayName,
    bio,
    profileUrl,
    contentTopic
  });

  console.log(`[ExpertSeal] Requesting verification for @${username} via ${provider}...`);

  // Step 3: Call the selected LLM provider
  let rawResponseText = '';
  switch (provider) {
    case 'gemini':
      rawResponseText = await callGemini(apiKey, creatorContext);
      break;

    case 'openai':
      rawResponseText = await callOpenAI(apiKey, creatorContext);
      break;

    case 'perplexity':
      rawResponseText = await callPerplexity(apiKey, creatorContext);
      break;

    default:
      throw new Error(`Unsupported LLM provider: "${provider}". Supported: gemini, openai, perplexity.`);
  }

  // Step 4: Parse & normalize response
  const rawJson = extractJsonFromText(rawResponseText);
  const normalizedResult = normalizeVerificationResult(rawJson);

  // Step 5: Save to cache
  await saveToCache(platform, username, normalizedResult, provider);

  // Step 6: Return formatted response
  return {
    success: true,
    data: normalizedResult,
    cached: false,
    timestamp: Date.now(),
    provider
  };
}

// ============================================================================
// 7. Message Router (chrome.runtime.onMessage)
// ============================================================================

/**
 * Central message listener for content scripts, options page, and popup.
 * Note: Must return true to keep the message channel open for asynchronous sendResponse.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const { action } = message;

  switch (action) {
    case 'verify':
      handleVerifyRequest(message.creator || message.data || message)
        .then(result => sendResponse(result))
        .catch(err => {
          console.error('[ExpertSeal] Verification failed:', err);
          sendResponse({
            success: false,
            error: err.message || 'Verification process encountered an unexpected error.'
          });
        });
      return true; // Keep channel open for async response

    case 'getSettings':
      getStoredSettings()
        .then(settings => sendResponse({ success: true, settings }))
        .catch(err => {
          console.error('[ExpertSeal] Error fetching settings:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case 'saveSettings':
      saveStoredSettings(message.settings || {})
        .then(() => sendResponse({ success: true }))
        .catch(err => {
          console.error('[ExpertSeal] Error saving settings:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case 'clearCache':
      clearAllCache()
        .then(clearedCount => sendResponse({ success: true, clearedCount }))
        .catch(err => {
          console.error('[ExpertSeal] Error clearing cache:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case 'getCacheStats':
      getCacheStatistics()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(err => {
          console.error('[ExpertSeal] Error getting cache stats:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    default:
      console.warn(`[ExpertSeal] Received unrecognized action: ${action}`);
      sendResponse({ success: false, error: `Unrecognized action: ${action}` });
      return false;
  }
});

// ============================================================================
// 8. Service Worker Lifecycle Hooks
// ============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[ExpertSeal] Service worker initialized. Reason: ${details.reason}`);
  // Set default settings if not already present
  chrome.storage.sync.get(['provider'], (result) => {
    if (!result.provider) {
      chrome.storage.sync.set({ provider: DEFAULT_PROVIDER });
    }
  });
});
