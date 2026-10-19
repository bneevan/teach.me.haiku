/**
 * pronounce.js &bull; Interactive Japanese Audio Pronunciations
 * teach-by-audio Studio &bull; Autumn 2026
 *
 * Provides tactile audio icons next to all non-English (Japanese) terms across the studio.
 */
(function() {
  'use strict';

  // Determine base path to assets/audio/words/
  const scriptTag = document.querySelector('script[src*="pronounce.js"]');
  let basePath = "assets/audio/words/";
  if (scriptTag) {
    const src = scriptTag.getAttribute("src") || "";
    const idx = src.lastIndexOf("pronounce.js");
    if (idx !== -1) {
      basePath = src.substring(0, idx) + "audio/words/";
    }
  }

  // Audio player singleton
  let currentAudio = null;
  let currentActiveBtn = null;

  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    if (currentActiveBtn) {
      currentActiveBtn.classList.remove("playing");
      currentActiveBtn = null;
    }
  }

  window.playPronunciation = function(slug, btn, customSrc) {
    if (currentAudio && currentActiveBtn === btn) {
      stopCurrentAudio();
      return;
    }
    stopCurrentAudio();

    const audioUrl = customSrc || (basePath + slug + ".m4a");
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    currentActiveBtn = btn;
    if (btn) btn.classList.add("playing");

    audio.onended = function() {
      if (btn) btn.classList.remove("playing");
      currentAudio = null;
      currentActiveBtn = null;
    };
    audio.onerror = function() {
      if (btn) btn.classList.remove("playing");
      currentAudio = null;
      currentActiveBtn = null;
    };
    audio.play().catch(function() {
      if (btn) btn.classList.remove("playing");
      currentAudio = null;
      currentActiveBtn = null;
    });
  };

  // Terms dictionary (Ordered with multi-word expressions first)
  const TERMS_CONFIG = [
    // Multi-word phrases & titles
    { pattern: /\b(mono\s+no\s+aware|mono-no-aware)\b/i, slug: "mono-no-aware", kana: "もののあわれ", label: "Mono no aware" },
    { pattern: /\b(ichibutsu-jitate|ichibutsu\s+jitate)\b/i, slug: "ichibutsu-jitate", kana: "いちぶつじたて", label: "Ichibutsu-jitate" },
    { pattern: /\bichibutsu\b/i, slug: "ichibutsu-jitate", kana: "いちぶつじたて", label: "Ichibutsu" },
    { pattern: /\b(wabi-sabi|wabi\s+sabi)\b/i, slug: "wabi-sabi", kana: "わびさび", label: "Wabi-sabi" },
    { pattern: /\b(matsuo\s+bash[oō])(?=[^a-zA-Z0-9]|$)/i, slug: "basho", kana: "ばしょう", label: "Matsuo Bashō" },
    { pattern: /\b(yosa\s+buson)\b/i, slug: "buson", kana: "ぶそん", label: "Yosa Buson" },
    { pattern: /\b(kobayashi\s+issa)\b/i, slug: "issa", kana: "いっさ", label: "Kobayashi Issa" },
    { pattern: /\b(masaoka\s+shiki)\b/i, slug: "shiki", kana: "しき", label: "Masaoka Shiki" },
    { pattern: /\b(chiyo-ni|chiyoni)\b/i, slug: "chiyo-ni", kana: "ちよに", label: "Chiyo-ni" },
    { pattern: /\b(furuike\s+ya)\b/i, slug: "furuike-ya", kana: "ふるいけや", label: "Furuike ya" },
    { pattern: /\b(kawazu\s+tobikomu)\b/i, slug: "kawazu-tobikomu", kana: "かわずとびこむ", label: "Kawazu tobikomu" },
    { pattern: /\b(mizu\s+no\s+oto)\b/i, slug: "mizu-no-oto", kana: "みずのおと", label: "Mizu no oto" },

    // Single terms
    { pattern: /\bkireji\b/i, slug: "kireji", kana: "きれじ", label: "Kireji" },
    { pattern: /\bkigo\b/i, slug: "kigo", kana: "きご", label: "Kigo" },
    { pattern: /\bsaijiki\b/i, slug: "saijiki", kana: "さいじき", label: "Saijiki" },
    { pattern: /\bteikei\b/i, slug: "teikei", kana: "ていけい", label: "Teikei" },
    { pattern: /\btoriawase\b/i, slug: "toriawase", kana: "とりあわせ", label: "Toriawase" },
    { pattern: /\byohaku\b/i, slug: "yohaku", kana: "よはく", label: "Yohaku" },
    { pattern: /\bshasei\b/i, slug: "shasei", kana: "しゃせい", label: "Shasei" },
    { pattern: /\bkarumi\b/i, slug: "karumi", kana: "かるみ", label: "Karumi" },
    { pattern: /\bsenryu\b/i, slug: "senryu", kana: "せんりゅう", label: "Senryu" },
    { pattern: /\bonji\b/i, slug: "onji", kana: "おんじ", label: "Onji" },
    { pattern: /\bhokku\b/i, slug: "hokku", kana: "ほっく", label: "Hokku" },
    { pattern: /\brenga\b/i, slug: "renga", kana: "れんが", label: "Renga" },
    { pattern: /\bhaiga\b/i, slug: "haiga", kana: "はいが", label: "Haiga" },
    { pattern: /\bginko\b/i, slug: "ginko", kana: "ぎんこう", label: "Ginko" },
    { pattern: /\b(bash[oō])(?=[^a-zA-Z0-9]|$)/i, slug: "basho", kana: "ばしょう", label: "Bashō" },
    { pattern: /\bbuson\b/i, slug: "buson", kana: "ぶそん", label: "Buson" },
    { pattern: /\bissa\b/i, slug: "issa", kana: "いっさ", label: "Issa" },
    { pattern: /\bshiki\b/i, slug: "shiki", kana: "しき", label: "Shiki" },
    { pattern: /\bkaeru\b/i, slug: "kaeru", kana: "かえる", label: "Kaeru" },
    { pattern: /\bmatsumushi\b/i, slug: "matsumushi", kana: "まつむし", label: "Matsumushi" },

    // Haiku
    { pattern: /\bhaiku\b/i, slug: "haiku", kana: "はいく", label: "Haiku" },

    // Japanese phonetic 'on' (never match English preposition 'on')
    { pattern: /\b(?:17\s+|5-7-5\s+|phonetic\s+)?on(?:\s*\(\s*音|\s+morae|\s+mora|\s+units|\s+cadence|\b)/i, isSpecialOn: true, slug: "on", kana: "おん", label: "On" }
  ];

  function createAudioButton(slug, kana, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ja-audio-btn";
    btn.setAttribute("data-slug", slug);
    btn.setAttribute("data-audio", basePath + slug + ".m4a");
    btn.setAttribute("aria-label", "Listen to Japanese pronunciation: " + kana + " (" + label + ")");
    btn.setAttribute("title", "Listen to pronunciation: " + kana + " (" + label + ")");
    btn.innerHTML = "&#128266;";
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      e.preventDefault();
      window.playPronunciation(slug, btn);
    });
    return btn;
  }

  // Bind existing audio buttons in the document
  function bindExistingButtons() {
    document.querySelectorAll(".term-audio-btn, .ja-audio-btn, [data-slug]").forEach(function(btn) {
      if (btn._hasPronounceBinding) return;
      btn._hasPronounceBinding = true;
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        const slug = btn.getAttribute("data-slug");
        const src = btn.getAttribute("data-audio");
        window.playPronunciation(slug, btn, src);
      });
    });
  }

  // Scan and annotate non-English terms in text blocks
  function annotateDocument() {
    const IGNORED_TAGS = new Set([
      'SCRIPT', 'STYLE', 'BUTTON', 'TEXTAREA', 'INPUT', 'SELECT',
      'CODE', 'PRE', 'AUDIO', 'VIDEO', 'NAV', 'svg', 'path'
    ]);

    const contentRoot = document.querySelector(".lesson-container") || document.body;

    // Process blocks (p, li, h1, h2, h3, h4, td, th, blockquote, dd, div.term-definition, div.comp-desc)
    const blocks = contentRoot.querySelectorAll(
      "p, li, h1, h2, h3, h4, td, th, blockquote, dd, div.term-definition, div.comp-desc, div.prompt-banner, div.reading-card, div.lesson-title, div.fc-term-romaji"
    );

    blocks.forEach(function(block) {
      // Avoid re-annotating if already processed
      if (block.hasAttribute("data-ja-scanned")) return;
      block.setAttribute("data-ja-scanned", "true");

      const annotatedSlugsInBlock = new Set();

      // Collect all valid text nodes
      const walker = document.createTreeWalker(
        block,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            let p = node.parentElement;
            while (p && p !== block) {
              if (IGNORED_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
              if (p.classList && (p.classList.contains("ja-audio-btn") || p.classList.contains("term-audio-btn") || p.classList.contains("meter-pill"))) {
                return NodeFilter.FILTER_REJECT;
              }
              p = p.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) {
        textNodes.push(n);
      }

      textNodes.forEach(function(textNode) {
        if (!textNode.parentElement) return;
        const parentTag = textNode.parentElement.tagName;
        const isItalic = (parentTag === 'EM' || parentTag === 'I');

        for (let i = 0; i < TERMS_CONFIG.length; i++) {
          const cfg = TERMS_CONFIG[i];
          if (annotatedSlugsInBlock.has(cfg.slug)) {
            continue; // Already annotated this term in this block
          }

          // Special logic for 'on'
          if (cfg.isSpecialOn) {
            if (!isItalic) {
              // Only match if followed by (音 or phonetic context
              const onMatch = textNode.nodeValue.match(/\bOn\s*\(\s*音|\b17\s+on\b|\b5-7-5\s+on\b/);
              if (!onMatch) continue;
            } else {
              // Italic <em>on</em>
              if (textNode.nodeValue.trim().toLowerCase() !== "on") continue;
            }
          }

          cfg.pattern.lastIndex = 0;
          const match = cfg.pattern.exec(textNode.nodeValue);
          if (match) {
            // Term matched!
            annotatedSlugsInBlock.add(cfg.slug);

            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;
            const textVal = textNode.nodeValue;

            const beforeText = textVal.substring(0, matchEnd);
            const afterText = textVal.substring(matchEnd);

            // Create pronunciation button
            const audioBtn = createAudioButton(cfg.slug, cfg.kana, cfg.label);

            if (parentTag === 'A') {
              // Insert after </a> tag rather than inside <a>
              const anchor = textNode.parentElement;
              if (anchor.nextSibling) {
                anchor.parentNode.insertBefore(audioBtn, anchor.nextSibling);
              } else {
                anchor.parentNode.appendChild(audioBtn);
              }
            } else {
              // Split node and insert button directly after the word
              textNode.nodeValue = beforeText;
              const nextTextNode = document.createTextNode(afterText);
              if (textNode.nextSibling) {
                textNode.parentNode.insertBefore(nextTextNode, textNode.nextSibling);
                textNode.parentNode.insertBefore(audioBtn, nextTextNode);
              } else {
                textNode.parentNode.appendChild(audioBtn);
                textNode.parentNode.appendChild(nextTextNode);
              }
            }
            break; // Proceed to next text node
          }
        }
      });
    });
  }

  // Run initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      bindExistingButtons();
      annotateDocument();
    });
  } else {
    bindExistingButtons();
    annotateDocument();
  }
})();
