/**
 * ExpertSeal Platform Extraction Reference
 * 
 * This file documents the DOM selectors, data extraction strategies, and UI injection
 * targets for each supported social media platform.
 * 
 * Because Chrome Extension content scripts cannot easily import ES modules across
 * dynamic contexts without complex bundling, the actual live extraction logic is
 * implemented directly inside `content/content.js`.
 * 
 * Contributors: When platforms update their DOM structures or test new UI variants,
 * use this document as the reference guide to update the selectors in `content/content.js`.
 * 
 * ============================================================================
 * 1. YOUTUBE (youtube.com)
 * ============================================================================
 * 
 * Supported Page Types:
 *   - Channel Home / About: https://www.youtube.com/@handle
 *   - Watch / Video Page:   https://www.youtube.com/watch?v=...
 *   - YouTube Shorts:       https://www.youtube.com/shorts/...
 * 
 * DOM Selectors:
 *   • Channel Name (Display):
 *       - Channel Page: `ytd-channel-name #text`, `#channel-name`, `#channel-header-container #text`
 *       - Video Page:   `ytd-video-owner-renderer ytd-channel-name #text a`, `#upload-info ytd-channel-name`
 *       - Shorts:       `ytd-reel-video-renderer ytd-channel-name #text`
 *   • Handle / Username:
 *       - Channel Header: `#channel-handle`, `yt-formatted-string[id="channel-handle"]`
 *       - URL Fallback:   Extracted from pathname `/@([a-zA-Z0-9_.-]+)`
 *       - Video Owner:    `ytd-video-owner-renderer a[href*="/@"]` (href attribute)
 *   • Subscriber Count:
 *       - Channel Page: `#subscriber-count`, `yt-formatted-string#subscriber-count`
 *       - Video Page:   `#owner-sub-count`, `yt-formatted-string#owner-sub-count`
 *   • Bio / Description:
 *       - Channel About: `#description-container yt-formatted-string`, `#description-inner`
 *       - Video Page:   `ytd-watch-metadata #description-inline-expander`
 *   • Profile URL:
 *       - Channel Page: `window.location.origin + '/' + handle`
 *       - Video Page:   Target href on `ytd-video-owner-renderer a.yt-simple-endpoint`
 *   • Official / Verification Badge:
 *       - Badge Element: `ytd-badge-supported-renderer [aria-label*="Verified"]`
 * 
 * Injection Target (Where ExpertSeal 'Verify' button mounts):
 *   - Channel Header: Append to `#buttons.ytd-c4-tabbed-header-renderer` or adjacent to subscribe button
 *   - Watch Page: Adjacent to `ytd-subscribe-button-renderer` inside `#owner` container
 * 
 * Navigation Event:
 *   - YouTube is a single-page Polymer application. Listen to `yt-navigate-finish` on window/document
 *     rather than relying solely on page reload.
 * 
 * ============================================================================
 * 2. TIKTOK (tiktok.com)
 * ============================================================================
 * 
 * Supported Page Types:
 *   - User Profile Page: https://www.tiktok.com/@username
 *   - Video View Modal:  https://www.tiktok.com/@username/video/...
 * 
 * DOM Selectors:
 *   • Username (@handle):
 *       - Profile Header: `h1[data-e2e="user-title"]`, `h2[data-e2e="user-title"]`, `.tiktok-profile h1`
 *       - URL Fallback:   Extracted from pathname `/@([a-zA-Z0-9_.-]+)`
 *   • Display Name:
 *       - Profile Header: `h2[data-e2e="user-subtitle"]`, `h1[data-e2e="user-subtitle"]`
 *   • Bio / Description:
 *       - Bio Text:       `h2[data-e2e="user-bio"]`, `[data-e2e="user-bio"]`, `.tiktok-profile h2`
 *   • External Bio Link:
 *       - Link Anchor:    `a[data-e2e="user-link"] span`, `a[data-e2e="user-link"]`
 *   • Follower / Like Stats:
 *       - Follower Count: `strong[data-e2e="followers-count"]`
 *       - Likes Count:    `strong[data-e2e="likes-count"]`
 *   • Verified Badge:
 *       - Checkmark SVG:  `svg[data-e2e="verify-badge"]`, `svg[data-e2e="verified-badge"]`
 *   • Profile URL:
 *       - `window.location.origin + '/@' + username`
 * 
 * Injection Target:
 *   - Profile Header: Next to `button[data-e2e="follow-button"]` or inside the profile actions container
 *   - Video Feed: Next to author handle in `[data-e2e="video-author-info"]`
 * 
 * Navigation Event:
 *   - Observe URL changes via `popstate`, History API wrappers, or MutationObserver on `#app`
 * 
 * ============================================================================
 * 3. X / TWITTER (x.com & twitter.com)
 * ============================================================================
 * 
 * Supported Page Types:
 *   - User Profile: https://x.com/username
 *   - Tweet / Status: https://x.com/username/status/...
 * 
 * DOM Selectors:
 *   • Display Name:
 *       - Profile Header: `div[data-testid="UserName"] > div:first-child span`
 *       - Tweet Header:   `article [data-testid="User-Name"] span:first-child`
 *   • Username / Handle:
 *       - Profile Header: `div[data-testid="UserName"] span:is(:contains("@"), [dir="ltr"])`
 *       - Robust: Elements containing text starting with `@` inside `[data-testid="UserName"]`
 *       - URL Fallback:   Extracted from pathname `^/([a-zA-Z0-9_]+)$`
 *   • Bio / Description:
 *       - Profile Header: `[data-testid="UserDescription"]`
 *   • External Website Link:
 *       - Profile Header: `[data-testid="UserUrl"] a`, `[data-testid="UserProfileHeader_Items"] a[target="_blank"]`
 *   • Location & Joined Date:
 *       - Location:       `[data-testid="UserLocation"]`
 *       - Joined Date:    `[data-testid="UserJoinDate"]`
 *   • Verification Status:
 *       - Blue Checkmark: `[data-testid="icon-verified"]`, `svg[aria-label*="Verified"]`
 *       - Gold (Org):     `svg[data-testid="icon-verified"][style*="rgb(234, 179, 8)"]`
 *       - Grey (Gov):     `svg[data-testid="icon-verified"][style*="rgb(130, 154, 171)"]`
 * 
 * Injection Target:
 *   - Profile Header: Append to the action bar containing `[data-testid="placementTracking"]` or
 *     adjacent to the Follow/Following button `[data-testid$="-follow"]` or `[data-testid$="-unfollow"]`
 * 
 * Navigation Event:
 *   - React single-page architecture with dynamic screen transitions.
 *   - Hook into title/URL changes or attach a persistent MutationObserver on `main[role="main"]`.
 * 
 * ============================================================================
 * 4. BEST PRACTICES FOR SELECTOR STABILITY
 * ============================================================================
 * 
 * 1. Prefer `data-testid` or `data-e2e` attributes over obfuscated CSS class names
 *    (e.g., `.css-175oi2r` or `.r-18u37iz` mutate with every client-side build).
 * 2. Always provide a fallback to window.location.pathname when parsing handles.
 * 3. Debounce DOM extraction queries (200-300ms) to prevent performance hits
 *    during infinite scrolls or feed rendering.
 * 4. Cache extracted creator metadata in session memory so repetitive layout shifts
 *    do not trigger duplicate network or DOM traversal calls.
 */

// Universal Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    platforms: ['youtube', 'tiktok', 'twitter', 'x']
  };
}
