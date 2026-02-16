# Performance Testing Guide

## Overview

Performance testing ensures the Pulse Premier League app maintains optimal speed and responsiveness across all devices and network conditions.

## Performance Targets

### Load Time Targets
- **Initial Page Load**: < 3 seconds
- **Time to Interactive**: < 5 seconds
- **Service Worker Installation**: < 2 seconds

### Operation Targets
- **Database Operations**: < 100ms average
- **Sync Operations**: < 5 seconds
- **UI Render**: < 16ms (60 FPS)
- **Search/Filter**: < 200ms

### Resource Limits
- **Total App Size**: < 2MB
- **JavaScript Bundle**: < 500KB
- **CSS**: < 50KB
- **Images/Icons**: < 100KB total

## Monitoring Integration

The app includes built-in performance monitoring via `js/monitoring.js`:

### Automatic Tracking
- Page load performance
- Database operation times
- Sync operation duration
- Render times
- Error rates
- User interactions

### Access Monitoring Data
```javascript
// Get performance summary
const summary = PPL.monitoring.getPerformanceSummary();

// Get health status
const health = PPL.monitoring.getHealthStatus();

// Export diagnostic data
const diagnostics = PPL.monitoring.exportData();
```

## Performance Testing Checklist

### 1. Page Load Testing

**Test on Various Connections:**
- ✅ Fast 3G (400ms RTT, 400Kbps down)
- ✅ Slow 3G (400ms RTT, 400Kbps down)
- ✅ Offline (cached)
- ✅ WiFi (fast connection)

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Set throttling to "Fast 3G"
4. Hard reload (Ctrl+Shift+R)
5. Check Load time < 3s

### 2. Database Performance Testing

**Test Scenarios:**
```javascript
// Create 100 matches and measure time
const startTime = performance.now();
for (let i = 0; i < 100; i++) {
    await PPL.storage.saveMatch(mockMatch);
}
const duration = performance.now() - startTime;
console.log('100 saves took:', duration, 'ms');
// Target: < 1000ms total (< 10ms per operation)
```

**Test Operations:**
- Save match (target: < 50ms)
- Load match (target: < 30ms)
- Query matches (target: < 100ms)
- Update statistics (target: < 50ms)
- Export data (target: < 500ms)

### 3. UI Responsiveness Testing

**Frame Rate Monitoring:**
```javascript
// Monitor render performance
let lastTime = performance.now();
function checkFrameRate() {
    const now = performance.now();
    const delta = now - lastTime;
    if (delta > 16.67) {
        console.warn('Dropped frame:', delta, 'ms');
    }
    lastTime = now;
    requestAnimationFrame(checkFrameRate);
}
requestAnimationFrame(checkFrameRate);
```

**Interaction Latency:**
- Button clicks: < 100ms response
- Form inputs: < 50ms feedback
- Navigation: < 200ms transition

### 4. Memory Usage Testing

**Chrome DevTools Memory Profiler:**
1. Open DevTools > Memory tab
2. Take heap snapshot before operations
3. Perform 50+ match operations
4. Take another heap snapshot
5. Compare for memory leaks

**Target Memory Usage:**
- Initial load: < 10MB
- After 10 matches: < 15MB
- After 50 matches: < 25MB
- No continuous growth (no leaks)

### 5. Sync Performance Testing

**GitHub Sync Tests:**
```javascript
// Measure sync time
const startTime = performance.now();
await PPL.sync.pushToGitHub();
const duration = performance.now() - startTime;
console.log('Sync duration:', duration, 'ms');
// Target: < 5000ms
```

**Test Scenarios:**
- Small dataset (1-5 matches): < 2s
- Medium dataset (10-20 matches): < 5s
- Large dataset (50+ matches): < 10s
- Retry on failure: < 30s total

### 6. Offline Performance

**Service Worker Cache Performance:**
1. Load app online
2. Go offline (Network tab > Offline)
3. Reload page
4. Measure load time < 1s (from cache)

**IndexedDB Availability:**
- All data accessible offline
- No errors on offline operations
- Graceful sync queue when offline

## Performance Optimization Techniques

### Applied Optimizations

1. **Lazy Loading**
   - Service worker caches resources
   - IndexedDB for data persistence
   - On-demand data loading

2. **Debouncing/Throttling**
   - Search input debounced (300ms)
   - Scroll events throttled (100ms)
   - Resize handlers throttled (200ms)

3. **Efficient DOM Updates**
   - Batch DOM updates
   - Use document fragments
   - Minimize reflows

4. **Caching Strategy**
   - Cache-first for static assets
   - Network-first for data
   - Stale-while-revalidate for updates

5. **Code Splitting**
   - Separate modules
   - Load monitoring optionally
   - Defer non-critical scripts

## Browser Performance Tools

### Chrome DevTools Performance Panel

1. Open DevTools > Performance tab
2. Click Record
3. Perform user actions
4. Stop recording
5. Analyze:
   - Long tasks (> 50ms)
   - Frame drops
   - Paint times
   - Script execution

### Lighthouse Audit

1. Open DevTools > Lighthouse tab
2. Select categories:
   - Performance
   - Progressive Web App
   - Best Practices
3. Run audit
4. Target scores:
   - Performance: > 90
   - PWA: 100
   - Best Practices: > 95

### Performance Metrics

**Core Web Vitals:**
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

## Automated Performance Testing

### Using Lighthouse CI

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://paawaanjoglkar.github.io/SF-Metadata/pulse-premier-league/
          uploadArtifacts: true
```

## Performance Regression Prevention

### Pre-Commit Checks
- Bundle size limits
- No console.log in production
- Validate JSON manifests

### CI/CD Checks
- Lighthouse score thresholds
- Load time budgets
- Resource size limits

## Common Performance Issues

### Issue: Slow Page Load
**Causes:**
- Large JavaScript bundles
- Unoptimized images
- No caching

**Solutions:**
- Enable service worker
- Optimize images
- Use cache-first strategy

### Issue: Janky Animations
**Causes:**
- Layout thrashing
- Heavy JavaScript on main thread
- Complex CSS animations

**Solutions:**
- Use CSS transforms
- Use requestAnimationFrame
- Debounce events

### Issue: Memory Leaks
**Causes:**
- Event listeners not removed
- Global variables accumulating
- Circular references

**Solutions:**
- Clean up event listeners
- Use weak references
- Limit cache sizes

### Issue: Slow Database Operations
**Causes:**
- Unindexed queries
- Large transactions
- No query optimization

**Solutions:**
- Add indexes to frequently queried fields
- Batch operations
- Use cursors for large datasets

## Performance Monitoring in Production

### Built-in Monitoring
```javascript
// Check health status
setInterval(() => {
    const health = PPL.monitoring.getHealthStatus();
    if (health.status === 'degraded') {
        console.warn('Performance degraded:', health.issues);
    }
}, 60000); // Check every minute
```

### Export Diagnostics
```javascript
// Export diagnostic report
function exportDiagnostics() {
    const data = PPL.monitoring.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ppl-diagnostics-' + Date.now() + '.json';
    a.click();
}
```

## Performance Testing Schedule

### During Development
- Test on every major feature addition
- Profile before and after optimizations
- Monitor bundle size changes

### Before Release
- Full Lighthouse audit
- Load testing on slow connections
- Memory profiling
- Cross-browser testing

### Post-Release
- Monitor real user metrics
- Check error rates
- Track performance trends
- Review user feedback

## Performance KPIs

### Track These Metrics
1. Average page load time
2. Average database operation time
3. Sync success rate
4. Error rate
5. 95th percentile response times
6. Cache hit rate
7. Offline availability

### Monthly Performance Review
- Review monitoring data
- Identify bottlenecks
- Plan optimizations
- Update baselines

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [IndexedDB Performance](https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/indexeddb-best-practices)
