/**
 * teach-by-audio — In-Browser Interactive Audio Player Runtime
 * Zero-dependency, offline-ready audio-first lesson player.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AudioLessonPlayer = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * Calculates cumulative start and end timestamps for each segment based on durationSeconds.
   */
  function calculateSegmentTimelines(segments) {
    let cursor = 0;
    return segments.map((seg, idx) => {
      const duration = Number(seg.durationSeconds) || 15; // default 15s if duration not set
      const start = cursor;
      const end = cursor + duration;
      cursor = end;
      return {
        id: seg.id,
        index: idx,
        type: seg.type,
        title: seg.title,
        visualCardId: seg.visualCardId || null,
        startTime: start,
        endTime: end,
        duration: duration,
      };
    });
  }

  /**
   * Finds the active segment for a given playback timestamp.
   */
  function determineActiveSegment(timelines, currentTime) {
    if (!timelines || timelines.length === 0) return null;
    const found = timelines.find((t) => currentTime >= t.startTime && currentTime < t.endTime);
    return found || timelines[timelines.length - 1];
  }

  /**
   * Formats seconds into MM:SS.
   */
  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  /**
   * Compiles demonstrated learning evidence into a ready-to-paste markdown block.
   */
  function formatEvidenceMarkdown(lesson, quizResults) {
    const lines = [
      `### Learning Evidence: Lesson ${lesson.id} — ${lesson.title}`,
      `- Date: ${new Date().toISOString().slice(0, 10)}`,
      `- Demonstrated Outcome: ${lesson.missionOutcome}`,
      `- Checkpoint Performance:`,
    ];

    if (Array.isArray(lesson.checkpoints)) {
      lesson.checkpoints.forEach((chk, idx) => {
        const result = quizResults[chk.id];
        if (result && result.passed) {
          lines.push(`  - Checkpoint ${idx + 1} (${chk.id}): PASSED on attempt ${result.attempts}`);
        } else if (result) {
          lines.push(`  - Checkpoint ${idx + 1} (${chk.id}): ATTEMPTED (${result.attempts} attempts)`);
        } else {
          lines.push(`  - Checkpoint ${idx + 1} (${chk.id}): Not completed`);
        }
      });
    }

    return lines.join("\n");
  }

  class Player {
    constructor(options = {}) {
      this.lesson = options.lesson || this.loadLessonFromDom();
      if (!this.lesson) return;

      this.timelines = calculateSegmentTimelines(this.lesson.segments || []);
      this.totalDuration = this.timelines.length > 0 ? this.timelines[this.timelines.length - 1].endTime : 0;
      this.activeSegment = null;
      this.quizResults = {}; // { [checkpointId]: { passed: bool, attempts: number } }
      this.pendingCheckpoints = new Set((this.lesson.checkpoints || []).map((c) => c.segmentId));
      this.pausedForCheckpoint = false;
      this.isMockPlayback = false;

      this.audio = document.getElementById("lesson-audio");
      this.dom = {
        playBtn: document.getElementById("player-play-btn"),
        playIcon: document.getElementById("player-play-icon"),
        timeDisplay: document.getElementById("player-time"),
        scrubber: document.getElementById("player-scrubber"),
        pauseBanner: document.getElementById("checkpoint-banner"),
        evidenceText: document.getElementById("evidence-text"),
        copyBtn: document.getElementById("copy-evidence-btn"),
      };

      this.init();
    }

    loadLessonFromDom() {
      const dataEl = document.getElementById("lesson-data");
      if (dataEl && dataEl.textContent) {
        try {
          return JSON.parse(dataEl.textContent);
        } catch (e) {
          console.error("Failed to parse #lesson-data JSON", e);
        }
      }
      return null;
    }

    init() {
      this.bindAudioEvents();
      this.bindControls();
      this.bindQuizzes();
      this.updateActiveSegment(0);
      this.updateEvidenceText();
    }

    bindAudioEvents() {
      if (!this.audio) {
        // Fallback simulated playback timer if audio element is absent or missing src
        this.isMockPlayback = true;
        this.mockTime = 0;
        return;
      }

      this.audio.addEventListener("timeupdate", () => {
        this.onTimeUpdate(this.audio.currentTime);
      });

      this.audio.addEventListener("ended", () => {
        this.setPlayState(false);
      });

      this.audio.addEventListener("loadedmetadata", () => {
        if (this.audio.duration && !isNaN(this.audio.duration)) {
          this.totalDuration = this.audio.duration;
        }
        this.updateTimeDisplay(this.audio.currentTime);
      });
    }

    bindControls() {
      if (this.dom.playBtn) {
        this.dom.playBtn.addEventListener("click", () => this.togglePlay());
      }

      if (this.dom.scrubber) {
        this.dom.scrubber.addEventListener("input", (e) => {
          const targetTime = (parseFloat(e.target.value) / 100) * this.totalDuration;
          this.seekTo(targetTime);
        });
      }

      // Playback speed buttons
      document.querySelectorAll(".speed-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const speed = parseFloat(e.target.dataset.speed || "1.0");
          document.querySelectorAll(".speed-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          if (this.audio) this.audio.playbackRate = speed;
        });
      });

      // Segment timeline pills
      document.querySelectorAll(".segment-pill").forEach((pill) => {
        pill.addEventListener("click", (e) => {
          const segId = e.currentTarget.dataset.segmentId;
          const targetSeg = this.timelines.find((t) => t.id === segId);
          if (targetSeg) {
            this.seekTo(targetSeg.startTime);
          }
        });
      });

      // Copy Evidence button
      if (this.dom.copyBtn) {
        this.dom.copyBtn.addEventListener("click", () => this.copyEvidenceToClipboard());
      }

      // Keyboard shortcut: Spacebar toggles play/pause
      window.addEventListener("keydown", (e) => {
        if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
          e.preventDefault();
          this.togglePlay();
        }
      });
    }

    bindQuizzes() {
      if (!Array.isArray(this.lesson.checkpoints)) return;

      this.lesson.checkpoints.forEach((chk) => {
        const card = document.getElementById(`card-${chk.id}`);
        if (!card) return;

        const options = card.querySelectorAll(".option-btn");
        const feedback = card.querySelector(".checkpoint-feedback");

        options.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const selectedIdx = parseInt(e.currentTarget.dataset.index, 10);
            this.handleQuizAnswer(chk, selectedIdx, options, feedback);
          });
        });
      });
    }

    handleQuizAnswer(chk, selectedIdx, optionButtons, feedbackEl) {
      if (!this.quizResults[chk.id]) {
        this.quizResults[chk.id] = { passed: false, attempts: 0 };
      }
      this.quizResults[chk.id].attempts += 1;

      const isCorrect = selectedIdx === chk.correctIndex;

      optionButtons.forEach((btn, idx) => {
        btn.classList.remove("selected-correct", "selected-incorrect");
        if (idx === selectedIdx) {
          btn.classList.add(isCorrect ? "selected-correct" : "selected-incorrect");
        }
      });

      if (feedbackEl) {
        feedbackEl.className = `checkpoint-feedback ${isCorrect ? "correct" : "incorrect"}`;
        feedbackEl.textContent = isCorrect
          ? `✓ Correct! ${chk.explanation}`
          : `✗ Not quite. ${chk.explanation}`;
      }

      if (isCorrect) {
        this.quizResults[chk.id].passed = true;
        this.pendingCheckpoints.delete(chk.segmentId);

        // Resume audio if paused for checkpoint
        if (this.pausedForCheckpoint) {
          this.pausedForCheckpoint = false;
          if (this.dom.pauseBanner) this.dom.pauseBanner.style.display = "none";
        }
      }

      this.updateEvidenceText();
    }

    onTimeUpdate(currentTime) {
      this.updateTimeDisplay(currentTime);
      this.updateActiveSegment(currentTime);

      // Checkpoint auto-pause trigger
      if (this.activeSegment && this.activeSegment.type === "checkpoint") {
        if (this.pendingCheckpoints.has(this.activeSegment.id) && !this.pausedForCheckpoint) {
          this.triggerCheckpointPause(this.activeSegment.id);
        }
      }
    }

    triggerCheckpointPause(segmentId) {
      this.pausedForCheckpoint = true;
      this.pause();

      if (this.dom.pauseBanner) {
        this.dom.pauseBanner.style.display = "block";
      }

      // Scroll checkpoint card into view
      const matchingChk = (this.lesson.checkpoints || []).find((c) => c.segmentId === segmentId);
      if (matchingChk) {
        const card = document.getElementById(`card-${matchingChk.id}`);
        if (card) {
          card.classList.add("highlighted");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }

    updateActiveSegment(currentTime) {
      const seg = determineActiveSegment(this.timelines, currentTime);
      if (!seg || seg.id === (this.activeSegment && this.activeSegment.id)) return;

      this.activeSegment = seg;

      // Update pills
      document.querySelectorAll(".segment-pill").forEach((pill) => {
        pill.classList.toggle("active", pill.dataset.segmentId === seg.id);
      });

      // Update visual card
      document.querySelectorAll(".visual-card").forEach((card) => {
        card.classList.toggle("active", card.id === seg.visualCardId);
      });
    }

    updateTimeDisplay(currentTime) {
      if (this.dom.timeDisplay) {
        this.dom.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(this.totalDuration)}`;
      }
      if (this.dom.scrubber && this.totalDuration > 0) {
        this.dom.scrubber.value = (currentTime / this.totalDuration) * 100;
      }
    }

    togglePlay() {
      if (this.pausedForCheckpoint) {
        // Gated: do not play until question answered
        if (this.dom.pauseBanner) this.dom.pauseBanner.style.display = "block";
        return;
      }

      if (this.audio) {
        if (this.audio.paused) {
          this.audio.play().catch(() => {});
          this.setPlayState(true);
        } else {
          this.audio.pause();
          this.setPlayState(false);
        }
      }
    }

    pause() {
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
      }
      this.setPlayState(false);
    }

    setPlayState(isPlaying) {
      if (this.dom.playIcon) {
        this.dom.playIcon.textContent = isPlaying ? "⏸" : "▶";
      }
    }

    seekTo(seconds) {
      const clamped = Math.max(0, Math.min(seconds, this.totalDuration));
      if (this.audio) {
        this.audio.currentTime = clamped;
      }
      this.onTimeUpdate(clamped);
    }

    updateEvidenceText() {
      if (this.dom.evidenceText) {
        this.dom.evidenceText.textContent = formatEvidenceMarkdown(this.lesson, this.quizResults);
      }
    }

    copyEvidenceToClipboard() {
      const text = formatEvidenceMarkdown(this.lesson, this.quizResults);
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (this.dom.copyBtn) {
            const original = this.dom.copyBtn.textContent;
            this.dom.copyBtn.textContent = "Copied to Clipboard! ✓";
            setTimeout(() => {
              this.dom.copyBtn.textContent = original;
            }, 2500);
          }
        });
      }
    }
  }

  // Auto-initialize when loaded in browser
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      window.playerInstance = new Player();
    });
  }

  return {
    Player,
    calculateSegmentTimelines,
    determineActiveSegment,
    formatTime,
    formatEvidenceMarkdown,
  };
});
