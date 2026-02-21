// ─────────────────────────────────────────────────────────
//  script.js  —  CI/CD Dashboard Frontend Logic
//
//  HOW DATA FLOWS:
//  Before (Review 1):  script.js → mockRuns array (fake data)
//  After  (Review 2):  script.js → fetch('/api/...') → server.js → GitHub API
//
//  The only thing that changes between the two versions is
//  WHERE the data comes from. All the rendering functions
//  (renderRuns, renderStats, etc.) stay exactly the same.
// ─────────────────────────────────────────────────────────

// ── Config ───────────────────────────────────────────────
// Set this to true to use real backend, false for mock data.
// Flip to true once server.js is running.
var USE_BACKEND = false;

// URL of your backend server (server.js)
var BACKEND_URL = 'http://localhost:3000';


// ════════════════════════════════════════════════════════
//  1. PAGE NAVIGATION
// ════════════════════════════════════════════════════════

function showPage(pageId, clickedEl) {
  document.querySelectorAll('.page').forEach(function(page) {
    page.classList.remove('active');
  });
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(navItem) {
    navItem.classList.remove('active');
  });
  if (clickedEl) clickedEl.classList.add('active');

  // Load fresh data for this page whenever we navigate to it
  loadPageData(pageId);
}


// ════════════════════════════════════════════════════════
//  2. DATA LOADING
//  One function decides: mock data or real backend?
// ════════════════════════════════════════════════════════

function loadPageData(pageId) {
  if (USE_BACKEND) {
    loadFromBackend(pageId);
  } else {
    loadMockData(pageId);
  }
}

// ── Load from real backend ────────────────────────────────
function loadFromBackend(pageId) {
  if (pageId === 'overview') {
    fetchData('/api/stats').then(function(data) {
      if (data && data.stats) renderStats(data.stats);
    });
    fetchData('/api/runs').then(function(data) {
      if (data && data.runs) renderRuns(data.runs);
    });
  }

  if (pageId === 'source') {
    fetchData('/api/commits').then(function(data) {
      if (data && data.commits) renderCommits(data.commits);
    });
    fetchData('/api/pulls').then(function(data) {
      if (data && data.pulls) renderPulls(data.pulls);
    });
  }

  if (pageId === 'build' || pageId === 'test' || pageId === 'deploy') {
    fetchData('/api/runs').then(function(data) {
      if (data && data.runs && data.runs.length > 0) {
        var latestRunId = data.runs[0].id;
        fetchData('/api/runs/' + latestRunId).then(function(runDetail) {
          if (runDetail && runDetail.jobs) {
            renderJobSteps(pageId, runDetail.jobs);
          }
        });
      }
    });
  }
}

// ── Generic fetch helper ──────────────────────────────────
async function fetchData(endpoint) {
  try {
    showLoading(endpoint);
    var response = await fetch(BACKEND_URL + endpoint);
    var data     = await response.json();
    if (!data.success) {
      showError(endpoint, data.error);
      return null;
    }
    return data;
  } catch (err) {
    showError(endpoint, 'Could not connect to backend. Is server.js running?');
    return null;
  }
}

function showLoading(endpoint) {
  if (endpoint === '/api/runs') {
    var tbody = document.getElementById('runs-table');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px">Loading from GitHub...</td></tr>';
  }
}

function showError(endpoint, message) {
  if (endpoint === '/api/runs') {
    var tbody = document.getElementById('runs-table');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:20px">⚠ ' + message + '</td></tr>';
  }
}


// ════════════════════════════════════════════════════════
//  3. RENDERING FUNCTIONS
//  Take data (from backend OR mock) and update the page.
//  These never change — only the data source changes.
// ════════════════════════════════════════════════════════

function renderStats(stats) {
  setTextById('stat-total-runs',   stats.totalRuns);
  setTextById('stat-pass-rate',    stats.passRate + '%');
  setTextById('stat-avg-duration', stats.avgDuration);
  setTextById('stat-active-runs',  stats.activeRuns);
  setTextById('stat-failed-today', stats.failedToday);
}

function renderRuns(runs) {
  var tbody = document.getElementById('runs-table');
  if (!tbody) return;

  var pillClass = { pass: 'pass', fail: 'fail', run: 'run', pending: 'skip' };
  var pillLabel = { pass: 'PASSED', fail: 'FAILED', run: 'RUNNING', pending: 'PENDING' };

  var rows = runs.map(function(run) {
    var status = run.status || 'pending';
    return (
      '<tr>' +
        '<td><span style="font-family:var(--font-mono);color:var(--accent)">#' + run.runNumber + '</span></td>' +
        '<td style="font-family:var(--font-mono);font-size:11px">' + run.branch + '</td>' +
        '<td style="font-family:var(--font-mono);color:var(--muted)">' + run.sha + '</td>' +
        '<td>' + run.author + '</td>' +
        '<td><span class="pill ' + (pillClass[status] || 'skip') + '"><span class="pill-dot"></span>' + (pillLabel[status] || status.toUpperCase()) + '</span></td>' +
        '<td style="font-family:var(--font-mono)">' + run.duration + '</td>' +
        '<td style="font-family:var(--font-mono);color:var(--muted)">' + run.started + '</td>' +
      '</tr>'
    );
  });

  tbody.innerHTML = rows.join('');
}

function renderCommits(commits) {
  var tbody = document.getElementById('commits-table');
  if (!tbody) return;
  tbody.innerHTML = commits.map(function(c) {
    return (
      '<tr>' +
        '<td style="font-family:var(--font-mono);color:var(--accent)">' + c.sha + '</td>' +
        '<td class="td-main">' + c.message + '</td>' +
        '<td>' + c.author + '</td>' +
        '<td style="font-family:var(--font-mono);color:var(--muted)">' + c.date + '</td>' +
      '</tr>'
    );
  }).join('');
}

function renderPulls(pulls) {
  var tbody = document.getElementById('pulls-table');
  if (!tbody) return;
  tbody.innerHTML = pulls.map(function(pr) {
    return (
      '<tr>' +
        '<td style="font-family:var(--font-mono);color:var(--accent)">#' + pr.number + '</td>' +
        '<td class="td-main">' + pr.title + '</td>' +
        '<td>' + pr.author + '</td>' +
        '<td style="font-family:var(--font-mono)">' + pr.branch + '</td>' +
        '<td><span class="pill pass"><span class="pill-dot"></span>OPEN</span></td>' +
        '<td style="font-family:var(--font-mono);color:var(--muted)">' + pr.createdAt + '</td>' +
      '</tr>'
    );
  }).join('');
}

function renderJobSteps(pageId, jobs) {
  var jobNameMap = { build: ['build'], test: ['test'], deploy: ['deploy'] };
  var targetNames = jobNameMap[pageId] || [];
  var matchingJob = jobs.find(function(job) {
    return targetNames.some(function(name) {
      return job.name.toLowerCase().includes(name.toLowerCase());
    });
  });
  if (!matchingJob) return;

  var headerPill = document.querySelector('#page-' + pageId + ' .page-header .pill');
  if (headerPill) {
    headerPill.className = 'pill ' + matchingJob.status;
    headerPill.innerHTML = '<span class="pill-dot"></span>' + matchingJob.status.toUpperCase();
  }

  var badge = document.getElementById('badge-' + pageId);
  if (badge) {
    var badgeMap  = { pass: 'badge-pass', fail: 'badge-fail', run: 'badge-run', pending: 'badge-warn' };
    var labelMap  = { pass: 'OK', fail: 'FAIL', run: 'RUN', pending: '...' };
    badge.className   = 'stage-badge ' + (badgeMap[matchingJob.status] || 'badge-warn');
    badge.textContent = labelMap[matchingJob.status] || '?';
  }
}

function setTextById(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}


// ════════════════════════════════════════════════════════
//  4. MOCK DATA  (used when USE_BACKEND = false)
// ════════════════════════════════════════════════════════

var mockRunsData = [
  { id: 9001, runNumber: 142, branch: 'feature/auth',   sha: 'a3f9c12', author: 'rahul-s',  status: 'run',  duration: '1m 48s', started: '2 min ago'  },
  { id: 9000, runNumber: 141, branch: 'fix/db-timeout', sha: 'f1e2a09', author: 'priya-n',  status: 'pass', duration: '4m 11s', started: '1 hr ago'   },
  { id: 8999, runNumber: 140, branch: 'feature/export', sha: 'b9c3d14', author: 'arjun-d',  status: 'fail', duration: '2m 55s', started: '3 hr ago'   },
  { id: 8998, runNumber: 139, branch: 'main',           sha: 'c4a8e21', author: 'rahul-s',  status: 'pass', duration: '3m 58s', started: '5 hr ago'   },
  { id: 8997, runNumber: 138, branch: 'feature/export', sha: 'e7d1f09', author: 'arjun-d',  status: 'pass', duration: '4m 02s', started: '8 hr ago'   },
  { id: 8996, runNumber: 137, branch: 'hotfix/login',   sha: 'a1b2c3d', author: 'priya-n',  status: 'pass', duration: '3m 20s', started: '1 day ago'  },
  { id: 8995, runNumber: 136, branch: 'main',           sha: 'd4e5f6a', author: 'rahul-s',  status: 'fail', duration: '1m 09s', started: '1 day ago'  }
];

var mockStatsData = {
  totalRuns: 142, passRate: 87, avgDuration: '4m 32s', activeRuns: 2, failedToday: 3
};

function loadMockData(pageId) {
  if (pageId === 'overview') {
    renderStats(mockStatsData);
    renderRuns(mockRunsData);
  }
}


// ════════════════════════════════════════════════════════
//  5. BUILD PROGRESS BAR ANIMATION
// ════════════════════════════════════════════════════════

var buildProgress = 72;
var buildInterval = setInterval(function() {
  var bar     = document.getElementById('build-bar');
  var pctText = document.getElementById('build-pct');
  if (!bar) return;
  if (buildProgress < 98) {
    buildProgress += 0.3;
    bar.style.width = buildProgress.toFixed(1) + '%';
    if (pctText) pctText.textContent = Math.floor(buildProgress) + '%';
  } else {
    clearInterval(buildInterval);
    bar.style.background = 'var(--green)';
    bar.style.width = '100%';
    if (pctText) { pctText.textContent = 'Done'; pctText.className = 'progress-pct up'; }
  }
}, 800);


// ════════════════════════════════════════════════════════
//  6. REFRESH BUTTON
// ════════════════════════════════════════════════════════

function onRefreshClick() {
  if (USE_BACKEND) {
    var activePage = document.querySelector('.page.active');
    if (activePage) loadPageData(activePage.id.replace('page-', ''));
  } else {
    alert('Mock mode active.\nSet USE_BACKEND = true in script.js\nand run: node server.js');
  }
}


// ════════════════════════════════════════════════════════
//  7. INIT
// ════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  loadPageData('overview');
});
