package app.cineglass.android;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {

    private static final String DEFAULT_SITE_URL = "https://movies.archimnet.com";
    private static final String DEFAULT_FILTER_URL = "https://movies.archimnet.com/cineglass-filters.txt";
    private static final String CONFIG_URL = "https://movies.archimnet.com/cineglass-server/api/app-config.php";
    private static final long REMOTE_CHECK_MS = 60_000L;
    private static final String FILTER_CACHE = "filters.txt";
    private static final String UA_SUFFIX = " MegahEntAndroid/1.0";

    // Always-on blocklist. Survives first launch, stale caches and failed
    // filter fetches. Covers the pop/CPM networks embed players lean on.
    private static final String[] BUILTIN_BLOCKED = {
            "propu.sh", "propellerads.com", "propellerclick.com", "toponadnet.com",
            "onclickperformance.com", "onclickalgo.com", "onclickmega.com",
            "onclickpredictiv.com", "onclickshow.com", "highperformancecpm.com",
            "highestpaymentcpm.com", "highrevenuecpm.com", "effectivegatecpm.com",
            "profitableratecpm.com", "revenuecpmgate.com", "clickaine.com",
            "clickadu.com", "adcash.com", "adcashrevenue.com", "betteradsystem.com",
            "admaven.com", "ad-maven.net", "doubleclick.net", "googlesyndication.com",
            "googleadservices.com", "imasdk.googleapis.com", "adservice.google.com",
            "popads.net", "popcash.net", "zedo.com", "outbrain.com", "taboola.com",
            "mgid.com", "exoclick.com", "exosrv.com", "juicyads.com", "hilltopads.net",
            "adsterra.com", "adskeeper.com", "bidvertiser.com", "infolinks.com",
            "pubmatic.com", "rubiconproject.com", "openx.net", "smartadserver.com",
            "effectivecpmnetwork.com", "cpmnetwork.com", "adsco.re", "histats.com",
            "hstatics.net", "clickaine.com", "popads.net",
            "casalemedia.com", "criteo.com", "criteo.net", "bidswitch.net",
            "sharethrough.com", "indexww.com", "33across.com", "adnxs.com",
            "media.net", "amazon-adsystem.com", "moatads.com", "adsafeprotected.com",
            "doubleverify.com", "scorecardresearch.com", "quantserve.com",
            // Live TV (NontonGo player chain): AdCash aclib, Adsterra popunder
            // tags, rotating pop loaders, popunder landing, obfuscated pop,
            // plus its cloudfront fallback loader. hamis.romponalis.st is the
            // real stream frame — never add it here.
            "acscdn.com", "bvtpk.com", "llvpn.com", "mks98.com",
            "intelligenceadex.com", "muggpolys.com", "hillsakra.com",
            "dklx87bzgnce.cloudfront.net",
            // Round 2: PopAds rotating throwaway domains (dlstreams stream
            // page), the direct-link popunder loader inside the romponalis
            // player frame, and the waust.at tracker it ships with.
            "xadsmart.com", "yumswqbnhgl.com", "lzblmscveiqb.com",
            "d11enq2rymy0yl.cloudfront.net", "spikertrepan.com", "waust.at",
            // Round 3: captured in the shell logs on the live-TV player chain.
            // spendsdetachment.com = popunder landing (nontongo/livetv),
            // luugy.com = monetag direct-link loader (?dovr=true), and the
            // AliExpress affiliate click tracker that trails the same pop.
            "spendsdetachment.com", "luugy.com", "s.click.aliexpress.com"
    };

    // Substring markers checked against the full URL. Catches rotating ad
    // hosts that no domain list keeps up with (VAST/preroll, popunder
    // loaders, IMA SDK payloads) without breaking player assets.
    private static final String[] BLOCKED_URL_TOKENS = {
            "/vast", "vast.xml", "?vast=", "/prebid", "prebid.js",
            "popunder", "pop_under", "imasdk", "/pagead/", "/ads/",
            "/ads.js", "ads.js", "/preroll", "interstitial", "/adserver.",
            "effectivecpmnetwork", "cpmnetwork", "adsco.re", "histats", "hstatics",
            "adblock-detector", "/banner.js",
            // Round 3: smartpop landing path (rotating hosts all funnel
            // through /smartpop/), monetag dovr direct-links and the
            // AliExpress affiliate pop trail seen on live TV.
            "/smartpop/", "dovr=true", "aliexpress", "spendsdetachment",
            // PopAds 'visibly' sticky-banner renderers — filenames survive
            // the rotating throwaway domains they are served from.
            "visibly.min.js", "uexif.min.js", "lexif.min.js",
            "googlesyndication", "doubleclick", "propellerads", "adcash",
            "exoclick", "juicyads", "hilltopads", "adsterra", "popcash",
            "popads.net", "clickaine", "taboola", "outbrain", "mgid.com"
    };

    private final Set<String> blockedDomains = Collections.synchronizedSet(new HashSet<String>());
    private volatile String targetUrl = DEFAULT_SITE_URL;
    private volatile String webViewUa = "";
    private volatile String filterUrl = DEFAULT_FILTER_URL;
    private volatile boolean adminOffline = false;
    private WebView web;
    private FrameLayout fullScreenContainer;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#050505"));

        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        fullScreenContainer = new FrameLayout(this);
        fullScreenContainer.setBackgroundColor(Color.BLACK);
        fullScreenContainer.setVisibility(View.GONE);
        root.addView(fullScreenContainer, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // The IPTV portal only serves HTTP — allow the WebView to fetch it
        // even when the site itself loads over HTTPS (browsers block this;
        // our player needs portal streams + HLS manifests to play).
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        // Always revalidate against the dev server so shell-side changes
        // (filters, site URL) show up without clearing app storage.
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        // Popups get their own window only so onCreateWindow can deny them;
        // scripts may not open windows by themselves.
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setUserAgentString(s.getUserAgentString() + UA_SUFFIX);
        webViewUa = s.getUserAgentString();

        loadCachedFilters();
        refreshFiltersAsync();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openIfExternal(request.getUrl());
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    showErrorPage();
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Belt-and-braces: hide the web-only downloads button even if
                // the site is an older deploy without the UA-based hide.
                view.evaluateJavascript(
                        "(function(){var b=document.getElementById('nav-download-btn');"
                                + "if(!b){var all=document.querySelectorAll('button');"
                                + "for(var i=0;i<all.length;i++){var o=all[i].getAttribute('onclick')||'';"
                                + "if(o.indexOf('Downloads coming soon')>-1){b=all[i];break;}}}"
                                + "if(b)b.style.display='none';})();", null);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (isBlocked(u)) {
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
                // Live-TV player-chain documents are fetched and scrubbed of
                // ad loaders before the WebView ever sees them (see
                // isPlayerChainDoc — popunders there rotate throwaway domains
                // that no blocklist keeps up with).
                if ("GET".equalsIgnoreCase(request.getMethod()) && isPlayerChainDoc(u)) {
                    WebResourceResponse clean = fetchAndScrub(u, request.getRequestHeaders());
                    if (clean != null) return clean;
                }
                return null;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                // Every window.open is an advert popup (embed players run dozens
                // of them) — deny all. Legit external links (trailers, support)
                // open in the system browser via openIfExternal().
                if (resultMsg != null) {
                    try {
                        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                        if (transport != null) transport.setWebView(null);
                        resultMsg.sendToTarget();
                    } catch (Exception ignored) {
                    }
                }
                return true;
            }

            // HTML5 fullscreen from the player (providers' fullscreen button)
            // → immersive landscape, like YouTube. Back exits fullscreen.
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customViewCallback = callback;
                fullScreenContainer.addView(view, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                fullScreenContainer.setVisibility(View.VISIBLE);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                applyImmersive(true);
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }

            // Fake 'missed video call' ad creatives ride on JS dialogs and
            // permission prompts — none of them are legitimate here, so all
            // are suppressed at the shell level.
            @Override
            public boolean onJsAlert(WebView view, String url, String message, android.webkit.JsResult result) {
                result.cancel();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, android.webkit.JsResult result) {
                result.cancel();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, android.webkit.JsPromptResult result) {
                result.cancel();
                return true;
            }

            @Override
            public boolean onJsBeforeUnload(WebView view, String url, String message, android.webkit.JsResult result) {
                result.cancel();
                return true;
            }

            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest request) {
                request.deny();
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                callback.invoke(origin, false, false);
            }
        });

        web.setBackgroundColor(Color.parseColor("#050505"));
        web.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void retry() {
                runOnUiThread(() -> web.loadUrl(targetUrl));
            }
        }, "shell");
        web.loadUrl(targetUrl);

        fetchRemoteConfig();
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            exitFullscreen();
            return;
        }
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void exitFullscreen() {
        if (customView == null) return;
        fullScreenContainer.removeView(customView);
        customView = null;
        fullScreenContainer.setVisibility(View.GONE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        applyImmersive(false);
        if (customViewCallback != null) {
            try {
                customViewCallback.onCustomViewHidden();
            } catch (Exception ignored) {
            }
            customViewCallback = null;
        }
    }

    private void applyImmersive(boolean on) {
        View decor = getWindow().getDecorView();
        if (on) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            decor.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private void fetchRemoteConfig() {
        new Thread(() -> {
            while (true) {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(CONFIG_URL).openConnection();
                    c.setConnectTimeout(5000);
                    c.setReadTimeout(5000);
                    String body = readAll(c.getInputStream());
                    c.disconnect();

                    JSONObject root = new JSONObject(body);
                    JSONObject shell = root.optJSONObject("shellConfig");
                    String status = root.optString("status", "online");
                    String message = root.optString("offlineMessage", "MegahEnt is temporarily unavailable.");
                    String url = shell == null ? null : shell.optString("url", null);
                    String fUrl = shell == null ? null : shell.optString("filter_url", null);

                    boolean forceOffline = status.equals("offline") || (shell != null && shell.optBoolean("force_offline", false));
                    String newSite = (url != null && url.startsWith("http")) ? url : null;
                    String newFilter = (fUrl != null && fUrl.startsWith("http")) ? fUrl : null;

                    final boolean wantOffline = forceOffline;
                    final String offlineMsg = message;
                    final String newSiteFinal = newSite;
                    final String newFilterFinal = newFilter;

                    runOnUiThread(() -> {
                        if (newSiteFinal != null && !newSiteFinal.equals(targetUrl)) {
                            targetUrl = newSiteFinal;
                            if (!adminOffline) web.loadUrl(targetUrl);
                        }
                        if (newFilterFinal != null && !newFilterFinal.equals(filterUrl)) {
                            filterUrl = newFilterFinal;
                            refreshFiltersAsync();
                        }
                        if (wantOffline && !adminOffline) {
                            adminOffline = true;
                            showAdminOffline(offlineMsg);
                        } else if (!wantOffline && adminOffline) {
                            adminOffline = false;
                            web.loadUrl(targetUrl);
                        }
                    });
                } catch (Exception ignored) {
                }
                try {
                    Thread.sleep(REMOTE_CHECK_MS);
                } catch (InterruptedException e) {
                    return;
                }
            }
        }, "remote-config").start();
    }

    /** Friendly error page instead of a black screen when the site is unreachable. */
    private void showErrorPage() {
        String html = "<!doctype html><html><head><meta charset='utf-8'>"
                + "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                + "<style>"
                + "*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%}"
                + "body{display:flex;align-items:center;justify-content:center;background:#050505;color:#e8e8e8;"
                + "font-family:'Segoe UI',system-ui,sans-serif;text-align:center;user-select:none}"
                + ".wrap{max-width:420px;padding:32px}"
                + ".logo{font-size:46px;font-weight:800;letter-spacing:-1px;"
                + "background:linear-gradient(90deg,#ffb59e,#ff571a);-webkit-background-clip:text;background-clip:text;"
                + "color:transparent;margin-bottom:18px}"
                + "h1{font-size:21px;font-weight:600;margin-bottom:10px}"
                + "p{color:#9ca3af;font-size:14px;line-height:1.55;margin-bottom:26px}"
                + "button{border:0;cursor:pointer;padding:13px 38px;border-radius:999px;color:#fff;font-size:14px;"
                + "font-weight:600;background:linear-gradient(135deg,#ff571a,#ffb59e)}"
                + "</style></head><body><div class='wrap'>"
                + "<div class='logo'>MegahEnt</div>"
                + "<h1>Can&rsquo;t reach MegahEnt right now</h1>"
                + "<p>Check your Wi-Fi connection, then try again.</p>"
                + "<button onclick='shell.retry()'>Try Again</button>"
                + "</div></body></html>";
        String b64 = Base64.encodeToString(html.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        web.loadDataWithBaseURL(null, b64, "text/html", "base64", null);
    }

    private void showAdminOffline(String message) {        String html = "<!doctype html><html><head><meta charset='utf-8'><style>"
                + "*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%}"
                + "body{display:flex;align-items:center;justify-content:center;background:#050505;color:#e8e8e8;"
                + "font-family:'Segoe UI',system-ui,sans-serif;text-align:center;user-select:none}"
                + ".wrap{max-width:440px;padding:32px}"
                + ".logo{font-size:46px;font-weight:800;letter-spacing:-1px;"
                + "background:linear-gradient(90deg,#ffb59e,#ff571a);-webkit-background-clip:text;background-clip:text;"
                + "color:transparent;margin-bottom:20px}"
                + "h1{font-size:22px;font-weight:600;margin-bottom:10px}"
                + "p{color:#9ca3af;font-size:14px;line-height:1.55}"
                + "</style></head><body><div class='wrap'>"
                + "<div class='logo'>MegahEnt</div>"
                + "<h1>We&rsquo;ll be right back</h1>"
                + "<p>" + TextUtils.htmlEncode(message) + "</p>"
                + "</div></body></html>";
        String b64 = Base64.encodeToString(html.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        web.loadData(b64, "text/html", "base64");
    }

    /** Millis of the last "blocked" toast, so ad loops don't spam the UI. */
    private volatile long lastBlockToastAt;

    private boolean openIfExternal(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.US);
        // WebView-internal schemes must keep loading inside the app.
        if (scheme.equals("about") || scheme.equals("blob") || scheme.equals("data")
                || scheme.equals("javascript")) {
            return false;
        }
        if (!scheme.startsWith("http")) {
            // mailto/tel are harmless user-intent links; everything else
            // (intent://, market://, app schemes) is a popunder trick to
            // bounce the user into the browser or the Play Store — refuse.
            if (scheme.equals("mailto") || scheme.equals("tel")) {
                tryOpenExternally(u);
                return true;
            }
            blockFlash(u);
            return true;
        }
        String host = u.getHost() == null ? "" : u.getHost();
        if (isAllowedHost(host)) return false;
        blockFlash(u);
        return true;
    }

    /** Lets the user know the shell ate the redirect instead of failing silently. */
    private void blockFlash(Uri u) {
        android.util.Log.w("MegahEnt", "blocked ad redirect: " + u);
        long now = android.os.SystemClock.elapsedRealtime();
        if (now - lastBlockToastAt < 4000L) return;
        lastBlockToastAt = now;
        try {
            android.widget.Toast.makeText(this, "Ad redirect blocked", android.widget.Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {
        }
    }

    private boolean isAllowedHost(String host) {
        if (host.equals("localhost") || host.equals("192.168.0.100")) return true;
        if (host.endsWith(".vercel.app") || host.endsWith(".cineglass.app")) return true;
        String targetHost = Uri.parse(targetUrl).getHost();
        return targetHost != null && (host.equals(targetHost) || host.endsWith("." + targetHost));
    }

    private void tryOpenExternally(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception ignored) {
        }
    }

    // -----------------------------------------------------------------------
    // HTML scrubbing of the live-TV player chain (NontonGo -> dlstreams ->
    // romponalis). These pages embed popunder loaders on rotating throwaway
    // domains, so the documents themselves are fetched, stripped of ad
    // scripts and handed to the WebView clean. Only these host families are
    // touched; everything else passes through untouched. On any failure the
    // WebView simply loads the original page (playback never breaks).
    // -----------------------------------------------------------------------

    private static final Pattern EXTERNAL_SCRIPT = Pattern.compile(
            "<script\\b[^>]*\\bsrc\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))[^>]*>\\s*</script>",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern INLINE_SCRIPT = Pattern.compile(
            "<script\\b[^>]*>(.*?)</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern MONETAG_META = Pattern.compile(
            "<meta\\s[^>]*name\\s*=\\s*[\"']monetag[\"'][^>]*>", Pattern.CASE_INSENSITIVE);
    /** Direct-link loader paths like /rnsPTHp2LRz9/150052 (random token + id). */
    private static final Pattern DIRECT_LINK_PATH = Pattern.compile("^/[A-Za-z0-9]{8,}/\\d+/?$");
    private static final String[] INLINE_AD_MARKERS = {
            "aclib.runPop", "popundersPerIP", "histats.start", "_hasync",
            "dataset.zone", "monetag", "disable-devtool",
            // Round 3: generic pop machinery that survives the rotating
            // domains — window.open calls, smartpop landings, the AliExpress
            // affiliate trail. Player-chain docs never legitimately use these.
            "window.open(", "smartpop", "aliexpress"
    };

    private static boolean isPlayerChainDoc(Uri u) {
        String host = u.getHost();
        if (host == null) return false;
        host = host.toLowerCase(Locale.US);
        String path = u.getPath() == null ? "" : u.getPath();
        if ((host.equals("nontongo.win") || host.endsWith(".nontongo.win")) && path.startsWith("/livetv/")) return true;
        if (host.equals("dlstreams.st") || host.endsWith(".dlstreams.st")) return true;
        // romponalis serves the player frame from several paths; scrub the
        // whole host family (nothing here is blocked, only ad-script stripped).
        if (host.endsWith(".romponalis.st") || host.equals("romponalis.st")) return true;
        return false;
    }

    /** Fetches the document with the WebView's own headers and scrubs ad loaders. */
    private WebResourceResponse fetchAndScrub(Uri u, Map<String, String> headers) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(u.toString()).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(15000);
            c.setInstanceFollowRedirects(true);
            if (headers != null) {
                for (Map.Entry<String, String> h : headers.entrySet()) {
                    String name = h.getKey();
                    if (name == null) continue;
                    String low = name.toLowerCase(Locale.US);
                    // Skip encoding/range/conditional headers: relaying
                    // Accept-Encoding breaks auto-decompression and
                    // conditional headers trigger 304s we cannot answer.
                    if (low.equals("accept-encoding") || low.equals("range") || low.startsWith("if-")) continue;
                    c.setRequestProperty(name, h.getValue());
                }
            }
            c.setRequestProperty("User-Agent", webViewUa.isEmpty() ? web.getSettings().getUserAgentString() : webViewUa);
            int code = c.getResponseCode();
            if (code != 200) return null;
            String ctype = c.getContentType();
            if (ctype == null || !ctype.toLowerCase(Locale.US).startsWith("text/html")) return null;
            String html = readAll(c.getInputStream());
            String cleaned = scrubAdHtml(html);
            if (cleaned == null) cleaned = html; // still inject the shims
            String host = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.US);
            boolean streamDoc = host.equals("dlstreams.st") || host.endsWith(".dlstreams.st");
            cleaned = injectShims(cleaned, streamDoc);
            byte[] body = cleaned.getBytes(StandardCharsets.UTF_8);
            return new WebResourceResponse("text/html", "utf-8", new ByteArrayInputStream(body));
        } catch (Exception e) {
            return null; // on any failure the WebView simply loads the original
        } finally {
            if (c != null) try { c.disconnect(); } catch (Exception ignored) {}
        }
    }

    /** Returns the HTML with ad loaders stripped, or null when nothing matched. */
    private String scrubAdHtml(String html) {
        boolean changed = false;
        // 1. External <script src> tags pointing at blocked hosts / direct-link loaders.
        Matcher m = EXTERNAL_SCRIPT.matcher(html);
        StringBuffer out = new StringBuffer(html.length());
        while (m.find()) {
            String src = m.group(2) != null ? m.group(2) : (m.group(3) != null ? m.group(3) : m.group(4));
            if (isAdScriptSrc(src)) {
                m.appendReplacement(out, "");
                changed = true;
            } else {
                m.appendReplacement(out, Matcher.quoteReplacement(m.group(0)));
            }
        }
        m.appendTail(out);
        if (changed) html = out.toString();

        // 2. Inline scripts with known ad markers.
        m = INLINE_SCRIPT.matcher(html);
        out = new StringBuffer(html.length());
        changed = false;
        while (m.find()) {
            String body = m.group(1) == null ? "" : m.group(1).toLowerCase(Locale.US);
            boolean ad = false;
            for (String t : INLINE_AD_MARKERS) {
                if (body.contains(t)) { ad = true; break; }
            }
            if (ad) {
                m.appendReplacement(out, "");
                changed = true;
            } else {
                m.appendReplacement(out, Matcher.quoteReplacement(m.group(0)));
            }
        }
        m.appendTail(out);
        if (changed) html = out.toString();

        // 3. Monetag meta tag.
        m = MONETAG_META.matcher(html);
        if (m.find()) {
            html = m.replaceAll("");
            changed = true;
        }

        return changed ? html : null;
    }

    private boolean isAdScriptSrc(String src) {
        if (src == null) return false;
        src = src.trim();
        if (src.isEmpty() || !src.contains("//")) return false;
        if (src.startsWith("//")) src = "https:" + src;
        Uri u = Uri.parse(src);
        String host = u.getHost();
        if (host == null) return false;
        host = host.toLowerCase(Locale.US);
        for (String d : BUILTIN_BLOCKED) {
            if (host.equals(d) || host.endsWith("." + d)) return true;
        }
        synchronized (blockedDomains) {
            for (String d : blockedDomains) {
                if (host.equals(d) || host.endsWith("." + d)) return true;
            }
        }
        String path = u.getPath() == null ? "" : u.getPath();
        if (DIRECT_LINK_PATH.matcher(path).matches()) return true;
        if (src.contains("disable-devtool")) return true;
        return false;
    }

    // --- Popup defenses -------------------------------------------------------
    // Neutralises alert/confirm/prompt and push-permission bait on every
    // scrubbed page. Fake "missed video call" creatives use these APIs.
    private static final String API_STUB_SHIM =
            "<script>(function(){try{" +
            "window.alert=function(){};" +
            "window.confirm=function(){return false};" +
            "window.prompt=function(){return null};" +
            "if(window.Notification&&Notification.requestPermission){" +
            "Notification.requestPermission=function(){return Promise.resolve('denied')}};" +
            "}catch(e){}})();</script>";

    // dlstreams pages only: the obfuscated player/ads engine on those pages
    // appends fixed/absolute full-screen modals (fake notification popups).
    // Their only legitimate content is the static #thatframe player iframe,
    // so any later-appended fixed overlay (or wrapper holding an extra
    // iframe) is removed. Cloudflare's hidden challenge iframe (absolute,
    // no z-index) is left alone.
    private static final String OVERLAY_SHIM =
            "<script>(function(){try{" +
            "var ok=function(el){" +
            "if(!el||el.nodeType!==1)return;" +
            "var t=el.tagName;if(t==='SCRIPT'||t==='STYLE'||t==='LINK'||t==='META'||t==='TITLE')return;" +
            "var tf=document.getElementById('thatframe');" +
            "if(tf&&(el===tf||el.contains(tf)))return;" +
            "var cs=window.getComputedStyle(el);" +
            "if((cs.position==='fixed'||cs.position==='absolute')&&" +
            "(parseInt(cs.zIndex||'0',10)>=1000||(el.querySelector&&el.querySelector('iframe')))){" +
            "el.remove();}};" +
            "new MutationObserver(function(ms){" +
            "for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;" +
            "for(var j=0;j<a.length;j++)ok(a[j]);}})" +
            ".observe(document.documentElement,{childList:true,subtree:true});" +
            "}catch(e){}})();</script>";

    // All player-chain docs (NontonGo, dlstreams, romponalis): neutralises
    // window.open, hides common ad containers via CSS, and sweeps the DOM
    // (initial pass + MutationObserver) removing ad iframes/links served from
    // rotating throwaway domains no blocklist keeps up with. The player
    // iframes themselves (dlstreams #thatframe, anything on the player-chain
    // hosts) are explicitly protected, so playback is never touched.
    private static final String RUNTIME_AD_SHIM =
            "<script>(function(){try{" +
            "window.open=function(){return null};" +
            "var st=document.createElement('style');" +
            "st.textContent=\"iframe[src*='ads'],iframe[src*='doubleclick']," +
            "iframe[id^='google_ads'],ins.adsbygoogle,div[id^='google_ads']," +
            "div[data-ad],div[data-adzone],div[id*='banner'],div[class*='banner']," +
            "div[id*='adx'],div[class*='adbox']{display:none!important}\";" +
            "(document.head||document.documentElement).appendChild(st);" +
            "var TOK=['/ads/','ads.js','/smartpop/','popunder','popads','popcash'," +
            "'doubleclick','googlesyndication','propellerads','adcash','adsterra'," +
            "'exoclick','juicyads','hilltopads','clickadu','admaven','mgid.com'," +
            "'taboola','outbrain','adsco.re','histats','effectivecpm'," +
            "'effectivegatecpm','highperformancecpm','highestpaymentcpm'," +
            "'highrevenuecpm','profitableratecpm','revenuecpm','monetag'," +
            "'aliexpress','spendsdetachment','luugy.com','bvtpk','llvpn','mks98'," +
            "'intelligenceadex','muggpolys','hillsakra','acscdn','xadsmart'," +
            "'waust.at','spikertrepan','uexif','lexif','visibly.min'];" +
            "var tok=function(l){for(var i=0;i<TOK.length;i++)if(l.indexOf(TOK[i])>-1)return true;return false};" +
            "var adSrc=function(u){if(!u)return false;var l=String(u).toLowerCase();" +
            "return l.indexOf('http')===0&&tok(l)};" +
            "var adLink=function(u){if(!u)return false;var l=String(u).toLowerCase();" +
            "if(l.indexOf('http')!==0)return false;if(tok(l))return true;" +
            "try{return /^\\/[a-z0-9]{8,}\\/\\d+/i.test(new URL(l).pathname)}catch(e){return false}};" +
            "var BADW=['ad','ads','adsbox','advert','banner','popunder','google_ads','adsbygoogle'];" +
            "var KEEP=/(nontongo|dlstreams|romponalis)/;" +
            "var ok=function(el){if(!el||el.nodeType!==1)return;" +
            "var tf=document.getElementById('thatframe');" +
            "if(el===tf||(tf&&el.contains&&el.contains(tf)))return;" +
            "var t=el.tagName;if(t==='SCRIPT'||t==='STYLE'||t==='LINK'||t==='VIDEO'||t==='SOURCE')return;" +
            "var g=el.getAttribute?function(n){return el.getAttribute(n)}:function(){return null};" +
            "if(t==='IFRAME'||t==='OBJECT'||t==='EMBED'){" +
            "var s=String(g('src')||'');" +
            "if(KEEP.test(s.toLowerCase()))return;" +
            "if(adSrc(s)||adSrc(g('data'))||adLink(s)){el.remove();}return}" +
            "if(t==='A'){if(adLink(g('href'))){el.remove();}return}" +
            "if(t==='INS'&&/adsbygoogle/i.test(el.className||'')){el.remove();return}" +
            "var idc=((el.id||'')+' '+(typeof el.className==='string'?el.className:'')).toLowerCase();" +
            "for(var k=0;k<BADW.length;k++){var w=BADW[k],i2=idc.indexOf(w);if(i2>-1){var a2=i2?idc.charAt(i2-1):'',b2=idc.charAt(i2+w.length)||'';if(!/[a-z0-9]/.test(a2)&&!/[a-z0-9]/.test(b2)){el.remove();break}}}};" +
            "var sweep=function(){try{var els=document.querySelectorAll('iframe,object,embed,a,ins');" +
            "for(var i=0;i<els.length;i++)ok(els[i]);}catch(e){}};" +
            "sweep();" +
            "new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;" +
            "for(var j=0;j<a.length;j++)ok(a[j]);}})" +
            ".observe(document.documentElement,{childList:true,subtree:true});" +
            "}catch(e){}})();</script>";

    private String injectShims(String html, boolean streamDoc) {
        String shim = API_STUB_SHIM + RUNTIME_AD_SHIM + (streamDoc ? OVERLAY_SHIM : "");
        int i = html.toLowerCase(Locale.US).indexOf("<head");
        if (i >= 0) {
            int gt = html.indexOf('>', i);
            if (gt >= 0) return html.substring(0, gt + 1) + shim + html.substring(gt + 1);
        }
        return shim + html;
    }

    private boolean isBlocked(Uri u) {
        String url = u.toString().toLowerCase();
        for (String t : BLOCKED_URL_TOKENS) {
            if (url.contains(t)) return true;
        }
        String host = u.getHost();
        if (host == null) return false;
        host = host.toLowerCase();
        for (String d : BUILTIN_BLOCKED) {
            if (host.equals(d) || host.endsWith("." + d)) return true;
        }
        synchronized (blockedDomains) {
            for (String d : blockedDomains) {
                if (host.equals(d) || host.endsWith("." + d)) return true;
            }
        }
        return false;
    }

    private void loadCachedFilters() {
        File f = new File(getFilesDir(), FILTER_CACHE);
        if (!f.exists()) {
            loadBundledFilters();
            return;
        }
        try {
            parseInto(readAll(new FileInputStream(f)), blockedDomains);
        } catch (Exception e) {
            loadBundledFilters();
        }
    }

    private void loadBundledFilters() {
        try {
            parseInto(readAll(getAssets().open("filters.txt")), blockedDomains);
        } catch (Exception ignored) {
        }
    }

    private void refreshFiltersAsync() {
        final String url = filterUrl;
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(5000);
                c.setReadTimeout(5000);
                String text = readAll(c.getInputStream());
                c.disconnect();

                Set<String> fresh = Collections.synchronizedSet(new HashSet<String>());
                parseInto(text, fresh);
                if (fresh.isEmpty()) return;

                blockedDomains.clear();
                blockedDomains.addAll(fresh);

                FileOutputStream out = openFileOutput(FILTER_CACHE, MODE_PRIVATE);
                out.write(text.getBytes(StandardCharsets.UTF_8));
                out.close();
            } catch (Exception ignored) {
            }
        }, "filter-refresh").start();
    }

    private static void parseInto(String text, Set<String> out) {
        for (String line : text.split("\r?\n")) {
            String l = line.trim();
            if (l.isEmpty() || l.startsWith("!") || l.contains("#")) continue;
            if (l.startsWith("||")) {
                int end = l.indexOf('^', 2);
                if (end < 0) end = l.indexOf('/', 2);
                if (end > 2) out.add(l.substring(2, end).toLowerCase());
            }
        }
    }

    private static String readAll(InputStream in) {
        Scanner sc = new Scanner(in, "UTF-8").useDelimiter("\\A");
        String t = sc.hasNext() ? sc.next() : "";
        sc.close();
        return t;
    }
}
