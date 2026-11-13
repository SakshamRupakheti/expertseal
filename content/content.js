/**
 * ExpertSeal - Content Script
 * Injected into YouTube, TikTok, and X (Twitter) to verify creator credentials.
 * Connects to background service worker and renders high-fidelity verification cards.
 */

(function () {
  'use strict';

  // Prevent multiple injections in same frame
  if (window.__EXPERTSEAL_INJECTED__) return;
  window.__EXPERTSEAL_INJECTED__ = true;

  // Platform detection
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
    return null;
  }

  const platform = detectPlatform();
  if (!platform) return;

  // State
  let activeOverlay = null;
  let activeLoadingBtn = null;
  let lastUrl = window.location.href;

  // SVG Icons
  const ICONS = {
    shield: `<svg viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.52 3.84 10.74 9 12 5.16-1.26 9-6.48 9-12V7l-9-5zm0 18.92c-4.14-1.1-7.14-5.26-7.14-9.92V8.34l7.14-3.97 7.14 3.97V11c0 4.66-3 8.82-7.14 9.92z"/></svg>`,
    shieldCheck: `<svg viewBox="0 0 24 24"><path fill="#22c55e" d="M12 2L3 7v5c0 5.52 3.84 10.74 9 12 5.16-1.26 9-6.48 9-12V7l-9-5zm-2 15l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`,
    shieldAlert: `<svg viewBox="0 0 24 24"><path fill="#ef4444" d="M12 2L3 7v5c0 5.52 3.84 10.74 9 12 5.16-1.26 9-6.48 9-12V7l-9-5zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`,
    shieldWarning: `<svg viewBox="0 0 24 24"><path fill="#f59e0b" d="M12 2L3 7v5c0 5.52 3.84 10.74 9 12 5.16-1.26 9-6.48 9-12V7l-9-5zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`,
    spinner: `<svg viewBox="0 0 24 24"><path d="M12 2v4c3.31 0 6 2.69 6 6s-2.69 6-6 6v4c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>`
  };

  /**
   * Extract Creator Info based on platform and context
   */
  function extractCreatorInfo(triggerElement) {
    const info = {
      platform,
      username: '',
      displayName: '',
      bio: '',
      profileUrl: ''
    };

    try {
      if (platform === 'youtube') {
        // Video page context
        const videoOwner = triggerElement 
          ? triggerElement.closest('ytd-video-owner-renderer, #owner, #upload-info')
          : document.querySelector('ytd-video-owner-renderer, #owner, #upload-info');

        if (videoOwner) {
          const channelLink = videoOwner.querySelector('#channel-name a, ytd-channel-name a, #owner-name a');
          if (channelLink) {
            info.displayName = channelLink.textContent.trim();
            info.profileUrl = channelLink.href || (window.location.origin + channelLink.getAttribute('href'));
            // Derive handle/username from href or text
            const match = info.profileUrl.match(/@([^/?#]+)/);
            info.username = match ? `@${match[1]}` : info.displayName;
          }
        }

        // Channel page context fallback
        if (!info.displayName) {
          const channelHeader = document.querySelector('#channel-header, ytd-channel-header-renderer, #meta');
          if (channelHeader) {
            const nameEl = channelHeader.querySelector('#channel-name #text, ytd-channel-name yt-formatted-string, #channel-name a');
            if (nameEl) info.displayName = nameEl.textContent.trim();

            const handleEl = channelHeader.querySelector('#channel-handle, [id*="handle"]');
            if (handleEl) {
              info.username = handleEl.textContent.trim();
            } else {
              const urlMatch = window.location.pathname.match(/@([^/?#]+)/);
              info.username = urlMatch ? `@${urlMatch[1]}` : info.displayName;
            }
            info.profileUrl = window.location.href;
          }
        }
      } else if (platform === 'tiktok') {
        const isProfile = window.location.pathname.startsWith('/@') && !window.location.pathname.includes('/video/');

        if (isProfile) {
          const userTitle = document.querySelector('[data-e2e="user-title"], [class*="UserTitle"]');
          const userSubTitle = document.querySelector('[data-e2e="user-subtitle"], [class*="UserSubTitle"]');
          const bioEl = document.querySelector('[data-e2e="user-bio"], [class*="UserBio"]');

          info.username = userTitle ? userTitle.textContent.trim() : '';
          info.displayName = userSubTitle ? userSubTitle.textContent.trim() : (info.username || '');
          info.bio = bioEl ? bioEl.textContent.trim() : '';
          info.profileUrl = window.location.href;
        } else {
          // Video or feed context
          const container = triggerElement ? triggerElement.closest('[data-e2e="feed-item"], [data-e2e="video-author-container"], div[class*="AuthorContainer"]') : null;
          const authorEl = (container && container.querySelector('[data-e2e="video-author-uniqueid"], [class*="AuthorTitle"]')) 
            || document.querySelector('[data-e2e="video-author-uniqueid"], [class*="AuthorTitle"], [data-e2e="user-title"]');

          if (authorEl) {
            info.username = authorEl.textContent.trim();
            info.displayName = info.username;
            info.profileUrl = `${window.location.origin}/@${info.username.replace('@', '')}`;
          }
        }
      } else if (platform === 'twitter') {
        // Check if inside a tweet article
        const tweetArticle = triggerElement ? triggerElement.closest('article[data-testid="tweet"]') : null;

        if (tweetArticle) {
          const userNameEl = tweetArticle.querySelector('[data-testid="User-Name"]');
          if (userNameEl) {
            const spans = Array.from(userNameEl.querySelectorAll('span'));
            const handleSpan = spans.find(s => s.textContent.trim().startsWith('@'));
            info.username = handleSpan ? handleSpan.textContent.trim() : '';
            const nameSpan = spans.find(s => s.textContent.trim() && !s.textContent.trim().startsWith('@') && s.textContent.trim() !== '·');
            info.displayName = nameSpan ? nameSpan.textContent.trim() : (info.username || '');
            
            const linkEl = userNameEl.querySelector('a[href*="/"]');
            info.profileUrl = linkEl ? linkEl.href : (info.username ? `${window.location.origin}/${info.username.replace('@', '')}` : '');
          }
        } else {
          // Profile page context
          const userNameEl = document.querySelector('[data-testid="UserName"]');
          if (userNameEl) {
            const spans = Array.from(userNameEl.querySelectorAll('span'));
            const handleSpan = spans.find(s => s.textContent.trim().startsWith('@'));
            info.username = handleSpan ? handleSpan.textContent.trim() : '';
            const nameSpan = spans.find(s => s.textContent.trim() && !s.textContent.trim().startsWith('@'));
            info.displayName = nameSpan ? nameSpan.textContent.trim() : (info.username || '');
          }

          const bioEl = document.querySelector('[data-testid="UserDescription"]');
          if (bioEl) info.bio = bioEl.textContent.trim();

          info.profileUrl = window.location.href;
        }
      }
    } catch (e) {
      console.warn('[ExpertSeal] Extraction error:', e);
    }

    // Normalization
    if (info.username && !info.username.startsWith('@') && !info.username.startsWith('http')) {
      info.username = `@${info.username}`;
    }
    if (!info.displayName && info.username) {
      info.displayName = info.username.replace('@', '');
    }

    return info;
  }

  /**
   * Create Verify Button DOM element
   */
  function createVerifyButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `es-verify-btn es-btn-${platform}`;
    btn.title = 'Verify creator credentials with ExpertSeal';
    btn.innerHTML = `
      <span class="es-verify-btn-icon">${ICONS.shield}</span>
      <span class="es-verify-btn-text">Verify</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleVerifyClick(btn);
    });

    return btn;
  }

  /**
   * Handle Click on Verify Button
   */
  async function handleVerifyClick(btn) {
    if (btn.classList.contains('es-btn-loading')) return;

    // Close any existing overlay
    closeOverlay();

    // Set loading state
    activeLoadingBtn = btn;
    btn.classList.add('es-btn-loading');
    const textEl = btn.querySelector('.es-verify-btn-text');
    const iconEl = btn.querySelector('.es-verify-btn-icon');
    const originalText = textEl ? textEl.textContent : 'Verify';
    
    if (textEl) textEl.textContent = 'Verifying...';
    if (iconEl) iconEl.innerHTML = ICONS.spinner;

    // Extract creator details
    const creatorInfo = extractCreatorInfo(btn);

    // Show initial loading overlay anchored to button
    showLoadingOverlay(btn, creatorInfo);

    try {
      // Send verification request to background service worker
      chrome.runtime.sendMessage({
        action: 'verify',
        platform: creatorInfo.platform,
        username: creatorInfo.username,
        displayName: creatorInfo.displayName,
        bio: creatorInfo.bio || '',
        profileUrl: creatorInfo.profileUrl || window.location.href
      }, (response) => {
        // Reset button state
        btn.classList.remove('es-btn-loading');
        if (textEl) textEl.textContent = originalText;
        if (iconEl) iconEl.innerHTML = ICONS.shield;
        activeLoadingBtn = null;

        if (chrome.runtime.lastError) {
          renderErrorOverlay(btn, creatorInfo, {
            error: 'CONNECTION_ERROR',
            message: 'Could not connect to ExpertSeal service worker. If the extension was recently updated, please refresh this tab.'
          });
          return;
        }

        if (!response || (response.success === false && response.error)) {
          renderErrorOverlay(btn, creatorInfo, response || { message: 'Verification failed. Please check your API key in extension settings.' });
          return;
        }

        // Render verification card with normalized payload
        renderResultOverlay(btn, creatorInfo, response);
      });
    } catch (err) {
      console.error('[ExpertSeal] Verification error:', err);
      btn.classList.remove('es-btn-loading');
      if (textEl) textEl.textContent = originalText;
      if (iconEl) iconEl.innerHTML = ICONS.shield;
      renderErrorOverlay(btn, creatorInfo, {
        error: 'CLIENT_ERROR',
        message: err.message || 'An unexpected error occurred while verifying.'
      });
    }
  }

  /**
   * Position overlay dynamically relative to button and viewport
   */
  function positionOverlay(overlay, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    const overlayWidth = 370;
    const margin = 8;

    // Left coordinate clamped inside viewport
    let left = rect.left + scrollX;
    if (rect.left + overlayWidth > window.innerWidth - 16) {
      left = window.innerWidth - overlayWidth - 16 + scrollX;
    }
    if (left < 16 + scrollX) {
      left = 16 + scrollX;
    }

    // Top coordinate (auto-flip if near bottom of viewport)
    let top = rect.bottom + scrollY + margin;
    const estimatedHeight = 360;
    if (rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight) {
      top = rect.top + scrollY - estimatedHeight - margin;
    }

    overlay.style.top = `${Math.max(10, top)}px`;
    overlay.style.left = `${Math.max(10, left)}px`;
  }

  /**
   * Close and cleanup active overlay
   */
  function closeOverlay() {
    if (activeOverlay) {
      activeOverlay.remove();
      activeOverlay = null;
    }
  }

  /**
   * Show Loading Card Overlay
   */
  function showLoadingOverlay(anchorEl, creator) {
    closeOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'es-overlay-container';

    overlay.innerHTML = `
      <div class="es-overlay-header">
        <div class="es-overlay-creator-meta">
          <div class="es-overlay-avatar-shield">
            ${ICONS.shield}
          </div>
          <div class="es-overlay-names">
            <span class="es-overlay-display-name">${escapeHTML(creator.displayName || 'Creator')}</span>
            <span class="es-overlay-handle">${escapeHTML(creator.username || '')}</span>
          </div>
        </div>
        <button class="es-overlay-close-btn" title="Close" id="es-btn-close">✕</button>
      </div>

      <div class="es-verdict-banner">
        <span class="es-verdict-badge es-verdict-error" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3);">
          🔍 Searching & Verifying Credentials...
        </span>
        <span class="es-confidence-pill">Live Grounding</span>
      </div>

      <div class="es-overlay-body">
        <div class="es-loading-skeleton">
          <div class="es-skeleton-line" style="width: 85%;"></div>
          <div class="es-skeleton-line" style="width: 100%;"></div>
          <div class="es-skeleton-line" style="width: 70%;"></div>
          <div class="es-skeleton-line" style="width: 90%; margin-top: 8px;"></div>
        </div>
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          Querying university directories, medical/legal registries & publications...
        </p>
      </div>

      <div class="es-overlay-footer">
        <span>ExpertSeal Verification Agent</span>
        <span>Secure BYOK Mode</span>
      </div>
    `;

    document.body.appendChild(overlay);
    positionOverlay(overlay, anchorEl);
    activeOverlay = overlay;

    // Close on X
    overlay.querySelector('#es-btn-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeOverlay();
    });
  }

  /**
   * Render Result Overlay
   * Seamlessly handles both service-worker.js { success: true, data: { ... } } and direct schemas
   */
  function renderResultOverlay(anchorEl, creator, response) {
    closeOverlay();

    const data = response.data || response;
    
    // Evaluate verification verdict
    const isVerified = data.verified === true || data.isVerified === true || data.status === 'verified';
    const isUnverified = data.verified === false || data.isVerified === false || data.status === 'unverified';

    let verdictClass = 'es-verdict-warning';
    let verdictIcon = '⚠️';
    let verdictText = 'Inconclusive / Needs Info';
    let shieldIcon = ICONS.shieldWarning;

    if (isVerified) {
      verdictClass = 'es-verdict-verified';
      verdictIcon = '✅';
      verdictText = 'Verified Expert';
      shieldIcon = ICONS.shieldCheck;
    } else if (isUnverified) {
      verdictClass = 'es-verdict-unverified';
      verdictIcon = '❌';
      verdictText = 'Unverified / Red Flags';
      shieldIcon = ICONS.shieldAlert;
    }

    const confidence = (data.confidence || 'Medium').toUpperCase();
    const verifiedName = data.name || data.creator?.displayName || creator.displayName || 'Creator';
    const creatorHandle = creator.username || (data.name ? `@${data.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}` : '');
    const claimedExpertise = data.claimed_expertise || data.claimedExpertise || '';
    const summary = data.summary || 'No evaluation summary provided.';
    const credentials = Array.isArray(data.verified_credentials) ? data.verified_credentials : (Array.isArray(data.credentials) ? data.credentials : []);
    const redFlags = Array.isArray(data.red_flags) ? data.red_flags : (Array.isArray(data.redFlags) ? data.redFlags : []);
    const profiles = Array.isArray(data.professional_profiles) ? data.professional_profiles : (Array.isArray(data.professionalProfiles) ? data.professionalProfiles : []);
    const provider = response.provider ? `⚡ ${response.provider}` : '⚡ AI Grounding';
    const cacheBadge = response.cached ? ' • Cached' : ' • Live Search';

    const overlay = document.createElement('div');
    overlay.className = 'es-overlay-container';

    // Build Credentials HTML
    let credentialsHtml = '';
    if (credentials.length > 0) {
      credentialsHtml = `
        <div class="es-cred-section">
          <div class="es-section-title">Verified Credentials & Affiliations</div>
          <ul class="es-cred-list">
            ${credentials.map(c => {
              const title = typeof c === 'string' ? c : (c.credential || c.title || c.degree || c.name || '');
              const source = c.source || c.institution || c.organization || '';
              const link = (c.url || c.sourceUrl) 
                ? `<a href="${escapeHTML(c.url || c.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="es-source-link">Source ↗</a>` 
                : '';
              return `
                <li class="es-cred-item">
                  <span class="es-cred-icon">🎓</span>
                  <div class="es-cred-content">
                    <span class="es-cred-title">${escapeHTML(title)}</span>
                    ${source ? `<span class="es-cred-institution">${escapeHTML(source)}</span>` : ''}
                    ${link}
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    }

    // Build Red Flags HTML
    let redFlagsHtml = '';
    if (redFlags.length > 0) {
      redFlagsHtml = `
        <div class="es-redflags-box">
          <div class="es-section-title" style="color: #f87171;">⚠️ Potential Discrepancies & Flags</div>
          ${redFlags.map(rf => `
            <div class="es-redflag-item">
              <span class="es-redflag-bullet">•</span>
              <span>${escapeHTML(typeof rf === 'string' ? rf : (rf.text || rf.warning || ''))}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build Profiles HTML
    let profilesHtml = '';
    if (profiles.length > 0) {
      profilesHtml = `
        <div class="es-profiles-section">
          <div class="es-section-title">Professional Profiles</div>
          <div class="es-profiles-grid">
            ${profiles.map(p => {
              const platformName = p.platform || p.name || 'Profile';
              const url = p.url || p.link || '#';
              return `
                <a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="es-profile-badge">
                  <span>${escapeHTML(platformName)}</span>
                  <span style="font-size: 10px; opacity: 0.7;">↗</span>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="es-overlay-header">
        <div class="es-overlay-creator-meta">
          <div class="es-overlay-avatar-shield">
            ${shieldIcon}
          </div>
          <div class="es-overlay-names">
            <span class="es-overlay-display-name">${escapeHTML(verifiedName)}</span>
            <span class="es-overlay-handle">${escapeHTML(creatorHandle)}</span>
          </div>
        </div>
        <button class="es-overlay-close-btn" title="Close" id="es-btn-close">✕</button>
      </div>

      <div class="es-verdict-banner">
        <span class="es-verdict-badge ${verdictClass}">
          <span>${verdictIcon}</span>
          <span>${verdictText}</span>
        </span>
        <span class="es-confidence-pill">${escapeHTML(confidence)} CONFIDENCE</span>
      </div>

      <div class="es-overlay-body">
        ${claimedExpertise ? `
          <div style="font-size: 11.5px; color: #94a3b8; display: flex; align-items: center; gap: 5px;">
            <span style="color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px;">Claimed Field:</span>
            <span style="color: #e2e8f0; font-weight: 500;">${escapeHTML(claimedExpertise)}</span>
          </div>
        ` : ''}

        <div class="es-summary-section">
          <div class="es-section-title">Assessment Summary</div>
          <p class="es-summary-text">${escapeHTML(summary)}</p>
        </div>

        ${redFlagsHtml}
        ${credentialsHtml}
        ${profilesHtml}
      </div>

      <div class="es-overlay-footer">
        <div class="es-footer-provider">
          <span>${escapeHTML(provider)}${escapeHTML(cacheBadge)}</span>
        </div>
        <div>
          <span>ExpertSeal Verified</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    positionOverlay(overlay, anchorEl);
    activeOverlay = overlay;

    overlay.querySelector('#es-btn-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeOverlay();
    });
  }

  /**
   * Render Error / Setup Required Overlay
   */
  function renderErrorOverlay(anchorEl, creator, errorData) {
    closeOverlay();

    const isApiKeyError = errorData.error === 'API_KEY_MISSING' || 
                          (errorData.error && errorData.error.toLowerCase().includes('api key')) ||
                          (errorData.message && errorData.message.toLowerCase().includes('api key'));

    const overlay = document.createElement('div');
    overlay.className = 'es-overlay-container';

    overlay.innerHTML = `
      <div class="es-overlay-header">
        <div class="es-overlay-creator-meta">
          <div class="es-overlay-avatar-shield" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3);">
            ${ICONS.shield}
          </div>
          <div class="es-overlay-names">
            <span class="es-overlay-display-name">${escapeHTML(creator.displayName || 'ExpertSeal')}</span>
            <span class="es-overlay-handle">${escapeHTML(creator.username || '')}</span>
          </div>
        </div>
        <button class="es-overlay-close-btn" title="Close" id="es-btn-close">✕</button>
      </div>

      <div class="es-verdict-banner">
        <span class="es-verdict-badge es-verdict-error">
          <span>${isApiKeyError ? '⚙️' : '❌'}</span>
          <span>${isApiKeyError ? 'Setup Required' : 'Verification Failed'}</span>
        </span>
      </div>

      <div class="es-overlay-body">
        <div class="es-error-container">
          <div class="es-error-title">${isApiKeyError ? 'API Key Required' : 'Unable to Complete Verification'}</div>
          <div class="es-error-desc">
            ${isApiKeyError 
              ? 'ExpertSeal uses your own Gemini, OpenAI, or Perplexity API key for privacy and direct search verification. Please enter your key in the extension popup.' 
              : escapeHTML(errorData.message || errorData.error || 'An error occurred while contacting the verification service.')}
          </div>
          ${isApiKeyError ? `
            <button type="button" class="es-settings-btn" id="es-open-settings-btn">
              Open Extension Settings ↗
            </button>
          ` : `
            <button type="button" class="es-settings-btn" id="es-retry-btn">
              Retry Verification
            </button>
          `}
        </div>
      </div>

      <div class="es-overlay-footer">
        <span>ExpertSeal BYOK Protection</span>
        <span>Local & Private</span>
      </div>
    `;

    document.body.appendChild(overlay);
    positionOverlay(overlay, anchorEl);
    activeOverlay = overlay;

    overlay.querySelector('#es-btn-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeOverlay();
    });

    const settingsBtn = overlay.querySelector('#es-open-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        try {
          if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            alert('Click the ExpertSeal extension icon in your Chrome toolbar to enter your API key.');
          }
        } catch(e) {
          alert('Click the ExpertSeal extension icon in your Chrome toolbar to enter your API key.');
        }
      });
    }

    const retryBtn = overlay.querySelector('#es-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        closeOverlay();
        handleVerifyClick(anchorEl);
      });
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Platform Specific Injection Handlers
   */

  // 1. YouTube Injection
  function injectYouTube() {
    // Video Watch Page: Inject near channel owner info
    const ownerRenderer = document.querySelector('ytd-video-owner-renderer, #owner, #upload-info');
    if (ownerRenderer && !ownerRenderer.querySelector('.es-verify-btn')) {
      const channelNameContainer = ownerRenderer.querySelector('#channel-name, ytd-channel-name');
      if (channelNameContainer) {
        const btn = createVerifyButton();
        channelNameContainer.parentNode.insertBefore(btn, channelNameContainer.nextSibling);
      }
    }

    // Channel Page: Inject near channel title in header
    const channelHeader = document.querySelector('#channel-header-container, ytd-channel-header-renderer #inner-header-container, #meta #channel-name');
    if (channelHeader && !channelHeader.querySelector('.es-verify-btn')) {
      const target = channelHeader.querySelector('#channel-name, ytd-channel-name') || channelHeader;
      const btn = createVerifyButton();
      target.appendChild(btn);
    }
  }

  // 2. TikTok Injection
  function injectTikTok() {
    // Profile page: Inject near user title
    const userTitle = document.querySelector('[data-e2e="user-title"], [class*="UserTitle"]');
    if (userTitle && !userTitle.parentNode.querySelector('.es-verify-btn')) {
      const btn = createVerifyButton();
      userTitle.parentNode.appendChild(btn);
    }

    // Video Feed items: Inject in video author area
    const authorContainers = document.querySelectorAll('[data-e2e="video-author-uniqueid"], [class*="AuthorTitle"]');
    authorContainers.forEach((author) => {
      if (!author.parentNode.querySelector('.es-verify-btn')) {
        const btn = createVerifyButton();
        author.parentNode.insertBefore(btn, author.nextSibling);
      }
    });
  }

  // 3. X (Twitter) Injection
  function injectTwitter() {
    // Profile Page: Inject near UserName header
    const profileUserName = document.querySelector('[data-testid="UserName"]');
    if (profileUserName && !profileUserName.parentNode.querySelector('.es-verify-btn')) {
      const btn = createVerifyButton();
      profileUserName.appendChild(btn);
    }

    // Tweets in feed: Inject next to author in tweet header
    const tweetUserNames = document.querySelectorAll('article[data-testid="tweet"] [data-testid="User-Name"]');
    tweetUserNames.forEach((userNameContainer) => {
      if (!userNameContainer.querySelector('.es-verify-btn')) {
        const btn = createVerifyButton();
        userNameContainer.appendChild(btn);
      }
    });
  }

  /**
   * Main Dispatcher for Button Injections
   */
  function injectButtons() {
    if (platform === 'youtube') {
      injectYouTube();
    } else if (platform === 'tiktok') {
      injectTikTok();
    } else if (platform === 'twitter') {
      injectTwitter();
    }
  }

  /**
   * Throttled / Debounced MutationObserver
   */
  let debounceTimer = null;
  function scheduleInjection() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Check for SPA route change
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        closeOverlay();
      }
      injectButtons();
    }, 450);
  }

  // Global listeners for dismissals
  document.addEventListener('click', (e) => {
    if (activeOverlay && !activeOverlay.contains(e.target) && (!activeLoadingBtn || !activeLoadingBtn.contains(e.target))) {
      closeOverlay();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOverlay();
    }
  });

  // Handle SPA navigation events
  window.addEventListener('popstate', () => {
    closeOverlay();
    scheduleInjection();
  });

  // Observe DOM for infinite scrolling & SPA element replacements
  const observer = new MutationObserver(() => {
    scheduleInjection();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Initial runs
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons);
  } else {
    injectButtons();
  }

  // Polling fallback for dynamic hydration (YouTube & X)
  setTimeout(injectButtons, 1000);
  setTimeout(injectButtons, 2500);
})();
