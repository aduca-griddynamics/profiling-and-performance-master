### Issue #1

**Issue Description:**
Sequential API Calls: Finance data (Deposits, Dividents, Gains) is fetched sequentially instead of in parallel, tripling load time.

**Technical Description:**
In `public/javascript/main.js` lines 28-37, the `appendFinanceData()` function uses a for loop to fetch finance data sequentially. Each API call waits for the previous one to complete before starting. With three endpoints (dividents, deposits, gains), this creates an artificial waterfall effect where total time = sum of all response times instead of max(response times).

**Screenshot/Measurement:**
- Open Chrome DevTools → Network tab
- Reload the page and observe the API calls to `/api/dividents`, `/api/deposits`, and `/api/gains`
- Note that each call starts only after the previous one completes
- Total time: ~3 seconds (sequential) vs potential ~1 second (parallel)

**Recommendation:**
Replace the sequential for loop with Promise.all() to fetch all finance data in parallel:
```javascript
const dataTypes = ['dividents', 'deposits', 'gains'];
const promises = dataTypes.map(type => getFinanceData(type));
const results = await Promise.all(promises);
dataTypes.forEach((type, i) => {
    const $el = target.find(`#${type}`);
    $el.text(numberFormatter.format(results[i]));
});
```

---

### Issue #2

**Issue Description:**
Blocking CPU Calculation: The calculate() function blocks the Node.js event loop for 2-3 seconds on every finance API call, preventing concurrent request handling

**Technical Description:**
The `utils/calculate.js` file contains a synchronous while loop that counts from 0 to 2,000,000,000. This blocks the Node.js event loop for approximately 2-3 seconds per request. The function is called in:
- `routes/deposits.js` line 9
- `routes/dividents.js` line 9  
- `routes/gains.js` line 9

Since Node.js is single-threaded, this prevents the server from handling any other requests during execution.

**Screenshot/Measurement:**
- Open Chrome DevTools → Network tab → Click on any finance API request (dividents/deposits/gains)
- Observe "Waiting (TTFB)" time is ~2-3 seconds
- During this time, server cannot process other requests (test by making multiple concurrent requests)

**Recommendation:**
Remove the synchronous `calculate()` function call from all routes, or if calculation is necessary:
1. Move to a worker thread using Node.js Worker Threads
2. Use child processes
3. Offload to a background job queue
4. Move calculation to client-side if applicable

---

### Issue #3

**Issue Description:**
DOM Layout Thrashing: Individual DOM appends for 100+ table rows cause hundreds of layout recalculations

**Technical Description:**
In `public/javascript/main.js`:
- Lines 54-72 (appendOperations): Creates and appends each table row individually
- Lines 105-135 (appendUsers): Creates and appends each table row individually

Each `appendChild()` operation triggers a browser layout recalculation. With 100 rows × multiple cells per row, this causes hundreds of layout recalculations.

**Screenshot/Measurement:**
- Open Chrome DevTools → Performance tab
- Click "Load more" button in Users tab
- Stop recording and observe:
  - Multiple "Recalculate Style" and "Layout" events in the flame chart
  - Long Task warnings (tasks > 50ms)
  - Total scripting time > 200ms for rendering

**Recommendation:**
Use DocumentFragment to batch DOM operations:
```javascript
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
    const row = createRow(data[i]); // create row with all cells
    fragment.appendChild(row);
}
tbody.appendChild(fragment); // Single append operation
```
Or use innerHTML with sanitized template strings for even better performance.

---

### Issue #4

**Issue Description:**
Memory Leak: The storeTable() function accumulates DOM references that prevent garbage collection

**Technical Description:**
The `storeTable()` function in `public/javascript/main.js` (lines 203-209) stores every table/tbody element in a global `this.tables` array. This array grows indefinitely and prevents garbage collection of detached DOM nodes:
- Called in `appendOperations()` line 53
- Called in `appendUsers()` line 103  
- Called in `refreshOperations()` line 84

These stored references serve no purpose in the code but prevent browser from reclaiming memory.

**Screenshot/Measurement:**
- Open Chrome DevTools → Memory tab → Take heap snapshot
- Click "Load more" users 5-10 times
- Take another heap snapshot and compare
- Filter for "Detached HTMLTableSectionElement" objects
- Observe growing count of detached DOM nodes that cannot be garbage collected

**Recommendation:**
Remove the `storeTable()` function entirely and all calls to it (lines 53, 84, 103, 203-209). The tables don't need to be stored in memory after appending to the DOM.

---

### Issue #5

**Issue Description:**
Inefficient Positioning: Custom offset calculation functions are slower than modern browser APIs

**Technical Description:**
Functions `getTop()` and `getLeft()` in `public/javascript/main.js` (lines 166-182) manually traverse the DOM tree using `offsetTop`, `offsetLeft`, and `offsetParent`. This approach:
1. Triggers multiple layout calculations
2. Doesn't account for CSS transforms, scrolling, or fixed positioning correctly
3. Is slower than native browser APIs

These functions are called in `showLoader()` (lines 189-190) every time a loader is displayed.

**Screenshot/Measurement:**
- Open Chrome DevTools → Performance tab
- Record while page loads or when clicking "Refresh"
- Observe function calls to `getTop()` and `getLeft()` in the flame chart
- Each takes 1-5ms, which adds up with multiple loaders

**Recommendation:**
Replace custom offset functions with `getBoundingClientRect()`:
```javascript
function showLoader(element) {
    const clone = $('#loader').clone();
    const rect = element[0].getBoundingClientRect();
    clone.removeClass('d-none');
    clone.width(rect.width);
    clone.height(rect.height);
    clone.offset({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
    });
    clone.appendTo('body');
    element.loader = clone;
}
```

---

### Issue #6

**Issue Description:**
Wasteful Refresh Logic: The table refresh operation performs unnecessary DOM manipulations

**Technical Description:**
The `refreshOperations()` function in `public/javascript/main.js` (lines 78-85):
1. Empties all table cells (line 81: `$rows.find('td').empty()`)
2. Calls `appendOperations()` which creates a new tbody
3. Then removes the old rows (line 83: `$rows.not(':first').remove()`)

This approach does unnecessary work:
- Empties cells that will be removed anyway
- Creates new tbody while old tbody still exists
- Multiple jQuery selector operations ($rows, find, not)

**Screenshot/Measurement:**
- Open Chrome DevTools → Performance tab
- Click "Refresh" button on Finance tab
- Observe the execution time of `refreshOperations()` function
- Note multiple DOM manipulations and jQuery operations

**Recommendation:**
Simplify the refresh operation:
```javascript
async function refreshOperations() {
    const $operationsTable = $('#userOperations');
    $operationsTable.find('tbody').remove(); // Remove old tbody
    await appendOperations(); // Add new tbody
}
```
This eliminates unnecessary DOM operations and improves refresh speed by 2-3x.

---

### Issue #7

**Issue Description:**
Suboptimal Image Formats: The application uses legacy image formats (PNG for icons, unoptimized JPEG for map) instead of modern, more efficient formats, resulting in larger file sizes and slower load times.

**Technical Description:**
The application serves images in older formats without optimization:

1. **Icon images (10 files)**: All icons are 32x32 PNG files. While each is small (~1-3KB), PNG is not the most efficient format for:
   - Simple icon graphics (SVG would be smaller and scalable)
   - Raster icons (WebP offers 25-35% better compression than PNG)

2. **Map image** (`images/map.jpg`): The world map is served as a JPEG without:
   - Modern format alternatives (WebP/AVIF provide 30-50% better compression)
   - Responsive image variants (serves full resolution to all devices)
   - Visible optimization (could be compressed further without quality loss)

3. **No next-gen format support**: No fallback to WebP or AVIF formats, which are supported by 95%+ of modern browsers and offer significantly better compression ratios.

**Screenshot/Measurement:**
- Open Chrome DevTools → Network tab
- Reload the page and check the size of:
  - Individual icon PNGs (~1-3KB each, total ~15-20KB for 10 icons)
  - `images/map.jpg` 428.5kB
- Use Lighthouse audit → "Serve images in next-gen formats" recommendation
- Compare file sizes: Convert one icon to WebP and observe 25-35% size reduction

**Recommendation:**
1. **For icons**: Convert to SVG (best for scalability) or WebP format with PNG fallback:
   ```html
   <picture>
     <source srcset="icons/briefcase_32px.webp" type="image/webp">
     <img src="icons/briefcase_32px.png" alt="Briefcase">
   </picture>
   ```
   Or use an icon font/SVG sprite sheet for all icons.

2. **For the map image**: Provide WebP/AVIF versions with responsive sizes:
   ```html
   <picture>
     <source srcset="images/map-800w.avif 800w, images/map-1200w.avif 1200w" type="image/avif">
     <source srcset="images/map-800w.webp 800w, images/map-1200w.webp 1200w" type="image/webp">
     <img src="images/map.jpg" srcset="images/map-800w.jpg 800w, images/map-1200w.jpg 1200w" 
          sizes="(max-width: 800px) 100vw, 1024px" alt="World map">
   </picture>
   ```

3. **Expected impact**: 30-40% reduction in total image payload (especially significant on mobile networks).

---

### Issue #8

**Issue Description:**
Layout Shift (CLS): Images without explicit dimensions cause Cumulative Layout Shift when they load

**Technical Description:**
In `public/index.html`, images are rendered without explicit `width` and `height` attributes:
- Line 33: `<img class="logo" src="images/logo.png" alt="Company logo">` - Only CSS height defined
- Line 123: `<img class="map" src="images/map.jpg" alt="World map">` - Only CSS max-width defined

When images load without reserved space, the browser doesn't know how much space to allocate. This causes content to shift down as each image loads, resulting in poor CLS scores. The map image (~428KB) is particularly impactful as it shifts all content below it.

**Screenshot/Measurement:**
- Open Chrome DevTools → Performance tab → Check "Screenshots"
- Reload the page and observe visual snapshots showing content jumping
- Use Lighthouse → "Cumulative Layout Shift" metric (Core Web Vital)
- DevTools → Performance Insights → "Layout Shifts" section shows exact shift occurrences

**Recommendation:**
Add explicit width and height attributes that match the image's aspect ratio:
```html
<!-- Logo with intrinsic dimensions -->
<img class="logo" src="images/logo.png" alt="Company logo" width="160" height="40">

<!-- Map with intrinsic dimensions (responsive via CSS) -->
<img class="map" src="images/map.jpg" alt="World map" width="1024" height="512">
```
Combined with CSS `max-width: 100%; height: auto;`, this reserves space during load while remaining responsive.

---

### Issue #9

**Issue Description:**
Render-Blocking Resources: All JavaScript files in `<head>` block HTML parsing and delay First Contentful Paint

**Technical Description:**
In `public/index.html` (lines 13-22), four JavaScript files are loaded synchronously in the `<head>`:
- jquery-3.3.1.slim.min.js (~70KB)
- popper.min.js (~20KB)
- bootstrap.min.js (~60KB)
- main.js

None have `async` or `defer` attributes. This means:
1. HTML parsing stops at each `<script>` tag
2. Browser downloads and executes each script before continuing
3. Users see a blank page until all scripts complete
4. Total blocking time: ~150-300ms on fast connections, much worse on slow networks

**Screenshot/Measurement:**
- Run Lighthouse audit → "Eliminate render-blocking resources" warning
- Open DevTools → Network tab → Observe script download timing vs DOMContentLoaded
- DevTools → Performance tab → Look for long "Parse HTML" gaps while scripts load

**Recommendation:**
1. Move scripts to end of `<body>` and add `defer` attribute:
```html
<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" defer></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" defer></script>
<script src="/javascript/main.js" defer></script>
```
2. Or use `async` for independent scripts where execution order doesn't matter
3. Consider inlining critical JS and lazy-loading non-critical scripts

---

### Issue #10

**Issue Description:**
Missing Resource Hints: No preconnect or dns-prefetch for external CDN domains, causing connection delays

**Technical Description:**
The page loads resources from 3 external domains without any resource hints:
- `code.jquery.com` (jQuery)
- `cdnjs.cloudflare.com` (normalize.css, popper.js)
- `stackpath.bootstrapcdn.com` (Bootstrap CSS/JS)

For each new origin, the browser must perform:
1. DNS lookup (~20-120ms)
2. TCP connection (~20-100ms)
3. TLS handshake (~30-100ms on HTTPS)

Without hints, these happen sequentially and late in the page load, adding 150-400ms of latency per domain.

**Screenshot/Measurement:**
- Open DevTools → Network tab → Enable "Connection" column
- Observe "DNS Lookup", "Initial Connection", and "SSL" times for external resources
- Use WebPageTest → Connection View to visualize domain connection timing

**Recommendation:**
Add resource hints in the `<head>` before loading resources:
```html
<head>
  <!-- DNS prefetch for all external domains -->
  <link rel="dns-prefetch" href="//code.jquery.com">
  <link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
  <link rel="dns-prefetch" href="//stackpath.bootstrapcdn.com">
  
  <!-- Preconnect for critical resources (includes DNS + TCP + TLS) -->
  <link rel="preconnect" href="https://code.jquery.com" crossorigin>
  <link rel="preconnect" href="https://stackpath.bootstrapcdn.com" crossorigin>
  
  <!-- Rest of head content -->
</head>
```
Expected improvement: 100-300ms faster load times for external resources.

---

### Issue #11

**Issue Description:**
API Over-fetching: Server returns 1000 rows by default but client only uses 100, wasting 90% of transferred data

**Technical Description:**
In the backend routes:
- `routes/operations.js` (line 6): `const rows = Number(req.query.rows) || 1000;`
- `routes/users.js` (line 6): `const rows = Number(req.query.rows) || 1000;`

Both endpoints generate 1000 rows by default. However, the frontend (`public/javascript/main.js`):
- `appendOperations()` line 54: only iterates over 100 items
- `appendUsers()` line 105: only iterates over 100 items

This means:
- 900 unnecessary rows are generated on the server (CPU waste)
- 900 unnecessary rows are serialized to JSON (memory waste)
- 900 unnecessary rows are transferred over network (~90KB wasted per request)
- 900 unnecessary rows are parsed on client (CPU waste)

**Screenshot/Measurement:**
- Open DevTools → Network tab → Click on `/api/operations` or `/api/users`
- Check response size: ~100-150KB when only ~10-15KB is needed
- Preview response JSON and count items (1000 vs needed 100)

**Recommendation:**
1. Client should request only needed data:
```javascript
async function getOperationsData(rowsCount = 100) {
    let endpoint = `${ENDPOINTS.ROOT}/${ENDPOINTS.OPERATIONS}?rows=${rowsCount}`;
    const response = await fetch(endpoint);
    const data = await response.json();
    return data.operations;
}
```

2. Server should have sensible defaults:
```javascript
router.get('/', function(req, res, next) {
  const rows = Math.min(Number(req.query.rows) || 100, 500); // Default 100, max 500
  // ...
});
```

---

### Issue #12

**Issue Description:**
No HTTP Response Compression: Server doesn't compress API responses, resulting in larger transfer sizes

**Technical Description:**
The Express server in `app.js` does not use compression middleware. This means:
- All API responses (JSON) are sent uncompressed
- HTML, CSS, and JS files from `express.static` are also uncompressed
- JSON compresses exceptionally well (60-80% reduction typical)

For a 100KB JSON response, compression could reduce it to 20-30KB—significant savings especially on mobile networks.

**Screenshot/Measurement:**
- Open DevTools → Network tab → Check response headers for any API call
- Note absence of `Content-Encoding: gzip` or `Content-Encoding: br`
- Compare "Size" vs "Content" columns (they'll be identical without compression)
- Use curl: `curl -I -H "Accept-Encoding: gzip" http://localhost:3000/api/operations`

**Recommendation:**
Install and use the compression middleware:
```bash
npm install compression
```

In `app.js`:
```javascript
const compression = require('compression');

const app = express();
app.use(compression()); // Add before other middleware

app.use(logger('dev'));
// ... rest of middleware
```

Expected impact: 60-80% reduction in response sizes for text-based content (JSON, HTML, CSS, JS).

---

### Issue #13

**Issue Description:**
No Cache Headers on API Responses: API endpoints don't set Cache-Control headers, causing unnecessary repeat requests

**Technical Description:**
The API routes in `routes/` (deposits.js, dividents.js, gains.js, operations.js, users.js) don't set any caching headers. Every page load makes fresh requests to all endpoints even though:
- Finance data (deposits, dividents, gains) likely doesn't change frequently
- The same data could be cached for a short period

Without cache headers, browsers must revalidate or re-fetch on every navigation, increasing server load and slowing perceived performance.

**Screenshot/Measurement:**
- Open DevTools → Network tab → Reload page
- Click on any `/api/*` request → Headers tab
- Note absence of `Cache-Control`, `ETag`, or `Last-Modified` headers
- Disable cache and reload: observe all requests are re-fetched

**Recommendation:**
Add appropriate cache headers based on data volatility:

For finance summary data (doesn't change per-request):
```javascript
router.get('/', function(req, res, next) {
  res.set('Cache-Control', 'private, max-age=60'); // Cache for 1 minute
  // ... existing code
});
```

For operations/users data (changes more frequently):
```javascript
router.get('/', function(req, res, next) {
  res.set('Cache-Control', 'private, max-age=30'); // Cache for 30 seconds
  res.set('Vary', 'Accept-Encoding'); // Vary by encoding for CDN compatibility
  // ... existing code
});
```

For truly static data, consider longer cache durations with `stale-while-revalidate` for better UX.

---
