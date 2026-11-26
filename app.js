/* =========================================================
   SPOTIZEE ENGINE V5 — 1:1 SPOTIFY MOBILE LAYOUT
   YouTube Data API v3 + Cache + Shuffle/Repeat + LRCLIB
   Tanpa Backtick (Aman untuk TrebEdit)
   ========================================================= */

var FALLBACK_NODES = [
  { type: "invidious", url: "https://inv.nadeko.net" },
  { type: "invidious", url: "https://yt.artemislena.eu" },
  { type: "piped", url: "https://pipedapi.kavin.rocks" }
];

var state = {
  queue: [],
  currentIndex: -1,
  currentTrack: null,
  currentContext: "Late Night Mix",
  likedTracks: JSON.parse(localStorage.getItem("spotizee_liked") || "[]"),
  recentlyPlayed: JSON.parse(localStorage.getItem("qualyst_recently_played") || "[]"),
  defaultQuickTracks: [],
  ytCache: JSON.parse(localStorage.getItem("spotizee_yt_cache") || "{}"),
  ytApiKey: localStorage.getItem("spotizee_yt_key") || "",
  lyrics: [],
  searchTimer: null,
  playerMode: "audio",
  ytCandidates: [],
  ytCandidateIndex: 0,
  progressTimer: null,
  isShuffle: false,
  isRepeat: false
};

var audio = document.getElementById("audio-engine");
var ytPlayer = null;
var ytReady = false;

/* 1. INISIALISASI */
document.addEventListener("DOMContentLoaded", function() {
  injectHiddenYouTubeContainer();
  injectApiKeyPanel();
  setupNavigation();
  setupPlayerControls();
  renderLibrary();
  renderRecentPlayedGrid();
  loadHomeTracks("Bleachers The Cure", "Late Night Mix");
  loadAdditionalHomeShelves();
  loadTrendingMusic();
});

function injectHiddenYouTubeContainer() {
  var wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.width = "1px";
  wrap.style.height = "1px";
  wrap.style.opacity = "0.01";
  wrap.style.pointerEvents = "none";
  wrap.style.bottom = "0";
  wrap.style.left = "0";
  wrap.style.overflow = "hidden";

  var playerDiv = document.createElement("div");
  playerDiv.id = "yt-hidden-player";
  wrap.appendChild(playerDiv);
  document.body.appendChild(wrap);

  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

/* Panel API Key pada tab YouTube API */
function injectApiKeyPanel() {
  var host = document.getElementById("api-settings-host");
  if (!host) return;

  var box = document.createElement("div");
  box.id = "api-settings-card";
  box.className = "api-settings-card";

  var statusText = state.ytApiKey ? "API Key tersimpan di perangkat ini" : "Belum ada API Key";
  var statusColor = state.ytApiKey ? "#9CCBFF" : "#8793A8";

  box.innerHTML =
    '<div class="api-card-heading">YouTube Data API v3</div>' +
    '<div id="yt-key-status" class="api-key-status" style="color:' + statusColor + ';">' + statusText + '</div>' +
    '<label class="api-input-label" for="yt-key-input">API Key</label>' +
    '<div class="api-input-row">' +
      '<input type="password" id="yt-key-input" placeholder="Masukkan API Key milikmu" value="' + escapeHtml(state.ytApiKey) + '" autocomplete="off" spellcheck="false">' +
      '<button type="button" id="toggle-yt-key" class="api-secondary-btn" aria-label="Tampilkan API Key">Lihat</button>' +
    '</div>' +
    '<div class="api-action-row">' +
      '<button type="button" id="save-yt-key" class="api-primary-btn">Simpan API Key</button>' +
      '<button type="button" id="clear-yt-key" class="api-secondary-btn">Hapus</button>' +
    '</div>';

  host.appendChild(box);

  document.getElementById("toggle-yt-key").addEventListener("click", function() {
    var input = document.getElementById("yt-key-input");
    var visible = input.type === "text";
    input.type = visible ? "password" : "text";
    this.textContent = visible ? "Lihat" : "Sembunyi";
    this.setAttribute("aria-label", visible ? "Tampilkan API Key" : "Sembunyikan API Key");
  });

  document.getElementById("save-yt-key").addEventListener("click", function() {
    var val = document.getElementById("yt-key-input").value.trim();
    state.ytApiKey = val;
    localStorage.setItem("spotizee_yt_key", val);
    updateApiKeyStatus();
    loadTrendingMusic();
    showToast(val ? "API Key tersimpan di perangkat ini" : "API Key dihapus");
  });

  document.getElementById("clear-yt-key").addEventListener("click", function() {
    state.ytApiKey = "";
    localStorage.removeItem("spotizee_yt_key");
    document.getElementById("yt-key-input").value = "";
    document.getElementById("yt-key-input").type = "password";
    document.getElementById("toggle-yt-key").textContent = "Lihat";
    updateApiKeyStatus();
    loadTrendingMusic();
    showToast("API Key dihapus");
  });
}

function updateApiKeyStatus() {
  var status = document.getElementById("yt-key-status");
  if (!status) return;
  if (state.ytApiKey) {
    status.textContent = "API Key tersimpan di perangkat ini";
    status.style.color = "#9CCBFF";
  } else {
    status.textContent = "Belum ada API Key";
    status.style.color = "#8793A8";
  }
}

window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player("yt-hidden-player", {
    height: "1",
    width: "1",
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: function() { ytReady = true; },
      onStateChange: onYtStateChange,
      onError: onYtError
    }
  });
};

function onYtStateChange(event) {
  if (event.data === 1) {
    state.playerMode = "youtube";
    rememberRecentlyPlayed(state.currentTrack);
    document.getElementById("mini-play-btn").textContent = "❚❚";
    document.getElementById("btn-play-pause").textContent = "❚❚";
    document.getElementById("stream-badge").textContent = "FULL AUDIO";
    startYouTubeProgressLoop();
  } else if (event.data === 2) {
    document.getElementById("mini-play-btn").textContent = "▶";
    document.getElementById("btn-play-pause").textContent = "▶";
  } else if (event.data === 0) {
    handleTrackEnded();
  }
}

function onYtError() {
  state.ytCandidateIndex++;
  if (state.ytCandidateIndex < state.ytCandidates.length && ytReady) {
    ytPlayer.loadVideoById(state.ytCandidates[state.ytCandidateIndex]);
  } else if (state.currentTrack) {
    tryAudiusFullTrack(state.currentTrack);
  }
}

/* 2. NAVIGASI TAB & PENCARIAN */
function setupNavigation() {
  var navItems = document.querySelectorAll(".nav-item");
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].addEventListener("click", function() {
      var targetId = this.getAttribute("data-target");
      for (var j = 0; j < navItems.length; j++) {
        navItems[j].classList.remove("active");
      }
      this.classList.add("active");

      var views = document.querySelectorAll(".tab-view");
      for (var k = 0; k < views.length; k++) {
        views[k].classList.remove("active");
      }
      document.getElementById(targetId).classList.add("active");
    });
  }

  var pills = document.querySelectorAll("#view-home .pill");
  for (var p = 0; p < pills.length; p++) {
    pills[p].addEventListener("click", function() {
      for (var x = 0; x < pills.length; x++) {
        pills[x].classList.remove("active");
      }
      this.classList.add("active");
      var label = this.textContent;
      loadHomeTracks(this.getAttribute("data-query"), label);
    });
  }

  var genreTiles = document.querySelectorAll(".sp-genre-tile");
  for (var g = 0; g < genreTiles.length; g++) {
    genreTiles[g].addEventListener("click", function() {
      var q = this.getAttribute("data-query");
      document.getElementById("search-input").value = q;
      document.getElementById("clear-search").classList.remove("hidden");
      performSearch(q);
    });
  }

  var searchInput = document.getElementById("search-input");
  var clearBtn = document.getElementById("clear-search");

  searchInput.addEventListener("input", function() {
    var val = this.value.trim();
    if (val.length > 0) {
      clearBtn.classList.remove("hidden");
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(function() {
        performSearch(val);
      }, 450);
    } else {
      clearBtn.classList.add("hidden");
      document.getElementById("search-genres-wrap").classList.remove("hidden");
      document.getElementById("search-track-list").innerHTML = "";
    }
  });

  clearBtn.addEventListener("click", function() {
    searchInput.value = "";
    clearBtn.classList.add("hidden");
    document.getElementById("search-genres-wrap").classList.remove("hidden");
    document.getElementById("search-track-list").innerHTML = "";
  });
}

/* 3. KATALOG & COVER HD (ITUNES SEARCH API) */
function fetchCatalog(query, callback) {
  var url = "https://itunes.apple.com/search?term=" + encodeURIComponent(query) + "&media=music&entity=song&limit=20";
  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var tracks = [];
      if (data && data.results) {
        for (var i = 0; i < data.results.length; i++) {
          var item = data.results[i];
          var hdCover = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "";
          tracks.push({
            id: String(item.trackId),
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName || "",
            cover: hdCover,
            duration: Math.floor((item.trackTimeMillis || 0) / 1000),
            previewUrl: item.previewUrl || ""
          });
        }
      }
      callback(tracks);
    })
    .catch(function() {
      callback([]);
    });
}

function renderHorizontalShelf(tracks, container, contextLabel) {
  if (!container) return;
  container.innerHTML = "";
  if (!tracks || !tracks.length) {
    container.innerHTML = '<div class="loader-text">Belum ada rekomendasi untuk ditampilkan.</div>';
    return;
  }

  for (var i = 0; i < tracks.length; i++) {
    (function(index, track) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "shelf-card";
      card.setAttribute("aria-label", "Putar " + track.title + " oleh " + track.artist);
      card.innerHTML =
        '<span class="shelf-art-wrap"><img src="' + escapeHtml(track.cover || "") + '" alt="" loading="lazy"></span>' +
        '<span class="shelf-title">' + escapeHtml(track.title) + '</span>' +
        '<span class="shelf-sub">' + escapeHtml(track.artist) + '</span>';
      card.addEventListener("click", function() {
        state.queue = tracks;
        state.currentContext = contextLabel || "Rekomendasi";
        playTrackAtIndex(index);
      });
      container.appendChild(card);
    })(i, tracks[i]);
  }
}


/* Grid enam kartu: riwayat pemutaran mengisi bagian depan, katalog default melengkapi sisanya. */
function renderRecentPlayedGrid() {
  var gridEl = document.getElementById("quick-grid");
  if (!gridEl) return;

  gridEl.innerHTML = "";

  var visibleTracks = [];
  var seenIds = {};

  /* Lagu yang benar-benar sudah diputar selalu berada di urutan teratas. */
  var recent = state.recentlyPlayed.slice(0, 6);
  for (var r = 0; r < recent.length && visibleTracks.length < 6; r++) {
    var recentId = String(recent[r].id || "");
    if (!seenIds[recentId]) {
      visibleTracks.push(recent[r]);
      seenIds[recentId] = true;
    }
  }

  /* Pertahankan kartu default yang belum tergantikan oleh riwayat pemutaran. */
  var defaults = state.defaultQuickTracks || [];
  for (var d = 0; d < defaults.length && visibleTracks.length < 6; d++) {
    var defaultId = String(defaults[d].id || defaults[d].youtubeVideoId || "");
    if (!seenIds[defaultId]) {
      visibleTracks.push(defaults[d]);
      seenIds[defaultId] = true;
    }
  }

  if (!visibleTracks.length) {
    gridEl.innerHTML =
      '<div class="recent-empty">Memuat pilihan lagu...</div>';
    return;
  }

  for (var i = 0; i < visibleTracks.length; i++) {
    (function(index, track, tracksForGrid) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "sp-quick-item";
      card.setAttribute("aria-label", "Putar " + track.title + " oleh " + track.artist);
      card.innerHTML =
        '<img src="' + escapeHtml(track.cover || "") + '" alt="" loading="lazy">' +
        '<span>' + escapeHtml(track.title || "Tanpa judul") + '</span>';
      card.addEventListener("click", function() {
        state.queue = tracksForGrid.slice();
        state.currentContext = "Baru Diputar";
        playTrackAtIndex(index);
      });
      gridEl.appendChild(card);
    })(i, visibleTracks[i], visibleTracks);
  }
}

function rememberRecentlyPlayed(track) {
  if (!track) return;
  var normalized = {
    id: String(track.id || track.youtubeVideoId || (track.title + "-" + track.artist)),
    title: track.title || "Tanpa judul",
    artist: track.artist || "Artis tidak diketahui",
    album: track.album || "",
    cover: track.cover || "",
    duration: track.duration || 0,
    previewUrl: track.previewUrl || "",
    youtubeVideoId: track.youtubeVideoId || ""
  };

  state.recentlyPlayed = state.recentlyPlayed.filter(function(item) {
    return String(item.id) !== normalized.id;
  });
  state.recentlyPlayed.unshift(normalized);
  state.recentlyPlayed = state.recentlyPlayed.slice(0, 6);

  try {
    localStorage.setItem("qualyst_recently_played", JSON.stringify(state.recentlyPlayed));
  } catch (error) {
    console.warn("Riwayat pemutaran tidak dapat disimpan.", error);
  }
  renderRecentPlayedGrid();
}

function loadHomeTracks(query, contextLabel) {
  var gridEl = document.getElementById("quick-grid");
  var shelfEl = document.getElementById("home-shelf");
  var recommendationEl = document.getElementById("home-track-list");
  state.currentContext = contextLabel || "Personal Mix";

  if (recommendationEl) recommendationEl.innerHTML = '<div class="loader-text">Memuat rekomendasi...</div>';

  fetchCatalog(query, function(tracks) {
    if (tracks.length === 0) {
      if (recommendationEl) recommendationEl.innerHTML = '<div class="loader-text">Gagal memuat katalog. Periksa koneksi internet.</div>';
      return;
    }

    /* Isi enam kartu awal dari katalog. Riwayat lagu yang diputar akan menggantikannya satu per satu. */
    state.defaultQuickTracks = tracks.slice(0, 6);
    renderRecentPlayedGrid();

    /* Pilihan Malam Ini dan Rekomendasi memakai pola album horizontal. */
    renderHorizontalShelf(tracks.slice(4, 12), shelfEl, "Pilihan Malam Ini");
    renderHorizontalShelf(tracks.slice(0, 16), recommendationEl, "Rekomendasi Untukmu");
  });
}

function loadAdditionalHomeShelves() {
  var shelves = [
    { query: "indie alternative rock songs", id: "indie-shelf", context: "Indie & Alternative" },
    { query: "lagu pop indonesia hits", id: "indo-shelf", context: "Pop Indonesia" }
  ];
  for (var i = 0; i < shelves.length; i++) {
    (function(item) {
      fetchCatalog(item.query, function(tracks) {
        renderHorizontalShelf(tracks.slice(0, 16), document.getElementById(item.id), item.context);
      });
    })(shelves[i]);
  }
}

function parseYouTubeDuration(value) {
  var match = String(value || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
}

function loadTrendingMusic() {
  var shelf = document.getElementById("viral-music-shelf");
  if (!shelf) return;
  if (!state.ytApiKey) {
    shelf.innerHTML = '<div class="shelf-empty">Masukkan API Key di tab YouTube API untuk memuat chart musik populer Indonesia.</div>';
    return;
  }

  shelf.innerHTML = '<div class="loader-text">Memuat musik populer Indonesia...</div>';
  var url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=ID&videoCategoryId=10&maxResults=18&key=" + encodeURIComponent(state.ytApiKey);
  fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error("YouTube API request failed");
      return res.json();
    })
    .then(function(data) {
      var tracks = [];
      if (data && Array.isArray(data.items)) {
        for (var i = 0; i < data.items.length; i++) {
          var item = data.items[i];
          if (!item.id || !item.snippet) continue;
          var thumbs = item.snippet.thumbnails || {};
          tracks.push({
            id: "yt-trending-" + item.id,
            youtubeVideoId: item.id,
            title: item.snippet.title || "Video musik",
            artist: item.snippet.channelTitle || "YouTube Music",
            album: "YouTube Music Chart Indonesia",
            cover: (thumbs.maxres && thumbs.maxres.url) || (thumbs.high && thumbs.high.url) || (thumbs.medium && thumbs.medium.url) || "",
            duration: parseYouTubeDuration(item.contentDetails && item.contentDetails.duration),
            previewUrl: ""
          });
        }
      }
      if (!tracks.length) {
        shelf.innerHTML = '<div class="shelf-empty">Chart musik belum tersedia untuk API Key atau wilayah ini.</div>';
        return;
      }
      renderHorizontalShelf(tracks, shelf, "Sedang Viral · YouTube Indonesia");
    })
    .catch(function() {
      shelf.innerHTML = '<div class="shelf-empty">Chart tidak dapat dimuat. Periksa API Key, batas kuota, dan izin YouTube Data API v3.</div>';
    });
}

function performSearch(query) {
  var listEl = document.getElementById("search-track-list");
  document.getElementById("search-genres-wrap").classList.add("hidden");
  state.currentContext = "Pencarian: " + query;
  listEl.innerHTML = '<div class="loader-text">Mencari "' + escapeHtml(query) + '"...</div>';

  fetchCatalog(query, function(tracks) {
    if (tracks.length === 0) {
      listEl.innerHTML = '<div class="loader-text">Lagu tidak ditemukan.</div>';
      return;
    }
    renderTrackList(tracks, listEl);
  });
}

function renderTrackList(tracks, container) {
  container.innerHTML = "";
  for (var i = 0; i < tracks.length; i++) {
    (function(index, track) {
      var row = document.createElement("div");
      row.className = "track-item";
      if (state.currentTrack && state.currentTrack.id === track.id) {
        row.classList.add("playing");
      }

      row.innerHTML =
        '<img src="' + track.cover + '" alt="">' +
        '<div class="track-meta">' +
          '<div class="track-title">' + escapeHtml(track.title) + '</div>' +
          '<div class="track-artist">' + escapeHtml(track.artist) + '</div>' +
        '</div>' +
        '<div class="track-more">•••</div>';

      row.addEventListener("click", function() {
        state.queue = tracks;
        playTrackAtIndex(index);
      });

      container.appendChild(row);
    })(i, tracks[i]);
  }
}

/* 4. PEMUTAR FULL AUDIO */
function playTrackAtIndex(index) {
  if (index < 0 || index >= state.queue.length) return;
  state.currentIndex = index;
  var track = state.queue[index];
  state.currentTrack = track;

  stopAllPlayback();
  updatePlayerUI(track);
  loadSyncedLyrics(track.title, track.artist);
  setupLockscreenMedia(track);

  /* Perbarui highlight lagu yang aktif di daftar */
  if (track.youtubeVideoId) {
    if (ytReady && ytPlayer && typeof ytPlayer.loadVideoById === "function") {
      state.playerMode = "youtube";
      ytPlayer.loadVideoById(track.youtubeVideoId);
    } else {
      searchOfficialYouTubeApi(track.artist + " - " + track.title, track);
    }
    return;
  }

  if (state.ytCache[track.id] && ytReady) {
    state.ytCandidates = state.ytCache[track.id];
    state.ytCandidateIndex = 0;
    state.playerMode = "youtube";
    ytPlayer.loadVideoById(state.ytCandidates[0]);
    return;
  }

  var searchQuery = track.artist + " - " + track.title + " lyrics";

  if (state.ytApiKey) {
    searchOfficialYouTubeApi(searchQuery, track);
  } else {
    findFallbackNodes(0, searchQuery, track);
  }
}

function stopAllPlayback() {
  clearInterval(state.progressTimer);
  audio.pause();
  audio.removeAttribute("src");
  if (ytReady && ytPlayer && typeof ytPlayer.stopVideo === "function") {
    ytPlayer.stopVideo();
  }
}

function searchOfficialYouTubeApi(query, track) {
  var url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=5&q=" +
            encodeURIComponent(query) + "&key=" + encodeURIComponent(state.ytApiKey);

  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var ids = [];
      if (data && data.items) {
        for (var i = 0; i < data.items.length; i++) {
          if (data.items[i].id && data.items[i].id.videoId) {
            ids.push(data.items[i].id.videoId);
          }
        }
      }

      if (ids.length > 0 && ytReady) {
        state.ytCache[track.id] = ids;
        localStorage.setItem("spotizee_yt_cache", JSON.stringify(state.ytCache));
        state.ytCandidates = ids;
        state.ytCandidateIndex = 0;
        state.playerMode = "youtube";
        ytPlayer.loadVideoById(ids[0]);
      } else {
        findFallbackNodes(0, query, track);
      }
    })
    .catch(function() {
      findFallbackNodes(0, query, track);
    });
}

function findFallbackNodes(nodeIndex, query, track) {
  if (nodeIndex >= FALLBACK_NODES.length) {
    tryAudiusFullTrack(track);
    return;
  }

  var node = FALLBACK_NODES[nodeIndex];
  var endpoint = node.type === "invidious"
    ? node.url + "/api/v1/search?q=" + encodeURIComponent(query) + "&type=video"
    : node.url + "/search?q=" + encodeURIComponent(query) + "&filter=videos";

  fetch(endpoint)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var ids = [];
      if (node.type === "invidious" && Array.isArray(data)) {
        for (var i = 0; i < Math.min(data.length, 4); i++) {
          if (data[i].videoId) ids.push(data[i].videoId);
        }
      } else if (node.type === "piped" && data && data.items) {
        for (var j = 0; j < Math.min(data.items.length, 4); j++) {
          var u = data.items[j].url || "";
          var vid = u.split("v=")[1];
          if (vid) ids.push(vid);
        }
      }

      if (ids.length > 0 && ytReady) {
        state.ytCandidates = ids;
        state.ytCandidateIndex = 0;
        state.playerMode = "youtube";
        ytPlayer.loadVideoById(ids[0]);
      } else {
        findFallbackNodes(nodeIndex + 1, query, track);
      }
    })
    .catch(function() {
      findFallbackNodes(nodeIndex + 1, query, track);
    });
}

function tryAudiusFullTrack(track) {
  var q = encodeURIComponent(track.artist + " " + track.title);
  var url = "https://discoveryprovider.audius.co/v1/tracks/search?query=" + q + "&app_name=SpotiZee";

  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(resData) {
      if (resData && resData.data && resData.data.length > 0) {
        var audiusId = resData.data[0].id;
        state.playerMode = "audio";
        audio.src = "https://discoveryprovider.audius.co/v1/tracks/" + audiusId + "/stream?app_name=SpotiZee";
        audio.play();
        document.getElementById("stream-badge").textContent = "FULL";
      } else {
        playPreviewFallback(track);
      }
    })
    .catch(function() {
      playPreviewFallback(track);
    });
}

function playPreviewFallback(track) {
  if (track.previewUrl) {
    state.playerMode = "audio";
    audio.src = track.previewUrl;
    audio.play();
    document.getElementById("stream-badge").textContent = "30S";
    if (!state.ytApiKey) {
      showToast("Isi YouTube API Key di Koleksi Kamu untuk full lagu");
    }
  } else {
    showToast("Audio tidak tersedia");
  }
}

/* 5. LIRIK SINKRON (LRCLIB API) */
function loadSyncedLyrics(title, artist) {
  var box = document.getElementById("lyrics-container");
  var statusEl = document.getElementById("lyrics-status");
  state.lyrics = [];
  box.innerHTML = '<p class="lyric-line active">Mencari lirik...</p>';
  statusEl.textContent = "...";

  var url = "https://lrclib.net/api/get?track_name=" + encodeURIComponent(title) + "&artist_name=" + encodeURIComponent(artist);
  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.syncedLyrics) {
        state.lyrics = parseLRC(data.syncedLyrics);
        statusEl.textContent = "SINKRON";
        renderLyricsLines();
      } else if (data && data.plainLyrics) {
        statusEl.textContent = "TEKS";
        box.innerHTML = '<p class="lyric-line active" style="white-space:pre-line">' + escapeHtml(data.plainLyrics) + '</p>';
      } else {
        statusEl.textContent = "-";
        box.innerHTML = '<p class="lyric-line">Lirik belum tersedia.</p>';
      }
    })
    .catch(function() {
      statusEl.textContent = "-";
      box.innerHTML = '<p class="lyric-line">Gagal memuat lirik.</p>';
    });
}

function parseLRC(lrcText) {
  var lines = lrcText.split("\n");
  var result = [];
  var regex = /^\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;

  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(regex);
    if (match) {
      var min = parseInt(match[1], 10);
      var sec = parseFloat(match[2]);
      var text = match[3].trim();
      if (text) {
        result.push({ time: min * 60 + sec, text: text });
      }
    }
  }
  return result;
}

function renderLyricsLines() {
  var box = document.getElementById("lyrics-container");
  box.innerHTML = "";
  for (var i = 0; i < state.lyrics.length; i++) {
    var p = document.createElement("p");
    p.className = "lyric-line";
    p.id = "lyric-" + i;
    p.textContent = state.lyrics[i].text;
    box.appendChild(p);
  }
}

/* 6. KONTROL PEMUTAR, SHUFFLE & REPEAT */
function setupPlayerControls() {
  var fullPlayer = document.getElementById("full-player");

  document.getElementById("open-full-player").addEventListener("click", function() {
    fullPlayer.classList.add("open");
  });

  document.getElementById("close-full-player").addEventListener("click", function() {
    fullPlayer.classList.remove("open");
  });

  document.getElementById("mini-play-btn").addEventListener("click", togglePlay);
  document.getElementById("btn-play-pause").addEventListener("click", togglePlay);
  document.getElementById("btn-next").addEventListener("click", playNextInQueue);

  document.getElementById("btn-prev").addEventListener("click", function() {
    if (state.queue.length > 0) {
      var prevIdx = (state.currentIndex - 1 + state.queue.length) % state.queue.length;
      playTrackAtIndex(prevIdx);
    }
  });

  document.getElementById("btn-shuffle").addEventListener("click", function() {
    state.isShuffle = !state.isShuffle;
    this.classList.toggle("active", state.isShuffle);
    showToast(state.isShuffle ? "Mode Acak Aktif" : "Mode Acak Nonaktif");
  });

  document.getElementById("btn-repeat").addEventListener("click", function() {
    state.isRepeat = !state.isRepeat;
    this.classList.toggle("active", state.isRepeat);
    showToast(state.isRepeat ? "Ulangi Lagu Aktif" : "Ulangi Lagu Nonaktif");
  });

  document.getElementById("mini-like-btn").addEventListener("click", toggleLikeCurrent);
  document.getElementById("fp-like-btn").addEventListener("click", toggleLikeCurrent);

  var slider = document.getElementById("seek-slider");
  slider.addEventListener("input", function() {
    var pct = this.value / 100;
    if (state.playerMode === "youtube" && ytReady && ytPlayer.getDuration) {
      var dur = ytPlayer.getDuration();
      if (dur) ytPlayer.seekTo(pct * dur, true);
    } else if (audio.duration) {
      audio.currentTime = pct * audio.duration;
    }
  });

  audio.addEventListener("timeupdate", function() {
    if (state.playerMode === "audio" && audio.duration) {
      syncProgressAndLyrics(audio.currentTime, audio.duration);
    }
  });

  audio.addEventListener("play", function() {
    rememberRecentlyPlayed(state.currentTrack);
    document.getElementById("mini-play-btn").textContent = "❚❚";
    document.getElementById("btn-play-pause").textContent = "❚❚";
  });

  audio.addEventListener("pause", function() {
    document.getElementById("mini-play-btn").textContent = "▶";
    document.getElementById("btn-play-pause").textContent = "▶";
  });

  audio.addEventListener("ended", handleTrackEnded);
}

function handleTrackEnded() {
  if (state.isRepeat) {
    playTrackAtIndex(state.currentIndex);
  } else {
    playNextInQueue();
  }
}

function playNextInQueue() {
  if (state.queue.length === 0) return;
  if (state.isShuffle && state.queue.length > 1) {
    var randIdx = Math.floor(Math.random() * state.queue.length);
    playTrackAtIndex(randIdx);
  } else {
    var nextIdx = (state.currentIndex + 1) % state.queue.length;
    playTrackAtIndex(nextIdx);
  }
}

function startYouTubeProgressLoop() {
  clearInterval(state.progressTimer);
  state.progressTimer = setInterval(function() {
    if (state.playerMode === "youtube" && ytReady && ytPlayer && typeof ytPlayer.getCurrentTime === "function") {
      var cur = ytPlayer.getCurrentTime() || 0;
      var dur = ytPlayer.getDuration() || 0;
      if (dur > 0) {
        syncProgressAndLyrics(cur, dur);
      }
    }
  }, 400);
}

function syncProgressAndLyrics(currentTime, duration) {
  var pct = (currentTime / duration) * 100;
  document.getElementById("seek-slider").value = pct;
  document.getElementById("mini-progress-bar").style.width = pct + "%";
  document.getElementById("current-time").textContent = formatTime(currentTime);
  document.getElementById("total-duration").textContent = formatTime(duration);

  if (state.lyrics.length > 0) {
    var activeIdx = -1;
    for (var i = 0; i < state.lyrics.length; i++) {
      if (currentTime >= state.lyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    if (activeIdx !== -1) {
      var allLines = document.querySelectorAll(".lyric-line");
      for (var j = 0; j < allLines.length; j++) {
        allLines[j].classList.remove("active");
      }
      var currentLine = document.getElementById("lyric-" + activeIdx);
      if (currentLine) {
        currentLine.classList.add("active");
        currentLine.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
}

function togglePlay() {
  if (!state.currentTrack) return;
  if (state.playerMode === "youtube" && ytReady && ytPlayer) {
    var st = ytPlayer.getPlayerState();
    if (st === 1) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  } else if (audio.src) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }
}

function updatePlayerUI(track) {
  document.getElementById("mini-player").classList.remove("hidden");
  document.getElementById("mini-cover").src = track.cover;
  document.getElementById("mini-title").textContent = track.title;
  document.getElementById("mini-artist").textContent = track.artist;

  document.getElementById("fp-cover").src = track.cover;
  document.getElementById("fp-title").textContent = track.title;
  document.getElementById("fp-artist").textContent = track.artist;
  document.getElementById("fp-context-name").textContent = state.currentContext;
  document.getElementById("stream-badge").textContent = "...";

  updateLikeButtons();
}

/* 7. LIKED SONGS */
function isTrackLiked(trackId) {
  for (var i = 0; i < state.likedTracks.length; i++) {
    if (state.likedTracks[i].id === trackId) return true;
  }
  return false;
}

function toggleLikeCurrent() {
  if (!state.currentTrack) return;
  var id = state.currentTrack.id;
  var exists = false;
  var updated = [];

  for (var i = 0; i < state.likedTracks.length; i++) {
    if (state.likedTracks[i].id === id) {
      exists = true;
    } else {
      updated.push(state.likedTracks[i]);
    }
  }

  if (!exists) {
    updated.unshift(state.currentTrack);
    showToast("Ditambahkan ke Lagu yang Disukai");
  } else {
    showToast("Dihapus dari Lagu yang Disukai");
  }

  state.likedTracks = updated;
  localStorage.setItem("spotizee_liked", JSON.stringify(updated));
  updateLikeButtons();
  renderLibrary();
}

function updateLikeButtons() {
  if (!state.currentTrack) return;
  var liked = isTrackLiked(state.currentTrack.id);
  var miniBtn = document.getElementById("mini-like-btn");
  var fpBtn = document.getElementById("fp-like-btn");

  miniBtn.textContent = liked ? "♥" : "♡";
  fpBtn.textContent = liked ? "✓" : "+";

  if (liked) {
    miniBtn.classList.add("liked");
    fpBtn.classList.add("liked");
  } else {
    miniBtn.classList.remove("liked");
    fpBtn.classList.remove("liked");
  }
}

function renderLibrary() {
  var listEl = document.getElementById("library-track-list");
  var count = state.likedTracks.length;
  document.getElementById("liked-count").textContent = count + " lagu";
  document.getElementById("lib-total-badge").textContent = count + " Lagu";

  if (count === 0) {
    listEl.innerHTML = '<div class="loader-text">Belum ada lagu tersimpan. Tap ikon ♡ atau + saat memutar lagu.</div>';
    return;
  }
  renderTrackList(state.likedTracks, listEl);
}

/* 8. LOCKSCREEN MEDIA SESSION */
function setupLockscreenMedia(track) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: [{ src: track.cover, sizes: "512x512", type: "image/jpeg" }]
    });

    navigator.mediaSession.setActionHandler("play", function() { togglePlay(); });
    navigator.mediaSession.setActionHandler("pause", function() { togglePlay(); });
    navigator.mediaSession.setActionHandler("nexttrack", function() { playNextInQueue(); });
    navigator.mediaSession.setActionHandler("previoustrack", function() {
      if (state.queue.length > 0) {
        var prevIdx = (state.currentIndex - 1 + state.queue.length) % state.queue.length;
        playTrackAtIndex(prevIdx);
      }
    });
  }
}

/* HELPERS */
function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" + s : s);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  var toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast.hideTimer);
  toast.hideTimer = setTimeout(function() {
    toast.classList.add("hidden");
  }, 2200);
}
