/**
 * Real-Life English lesson helpers
 * - Browser SpeechSynthesis listen buttons
 * - Show/hide Bangla / sample answers
 * - Lightweight quiz scoring
 * Works without network; degrades gracefully if TTS unavailable.
 */
(function () {
  'use strict';

  function speakText(text) {
    if (!text || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available in this browser.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(String(text));
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Could not play speech:', err);
    }
  }

  window.speakText = speakText;

  window.rleToggle = function (id, btn) {
    var el = document.getElementById(id);
    if (!el) return;
    var open = el.classList.toggle('is-open');
    el.classList.toggle('rle-hidden', !open);
    if (btn) {
      var showLabel = btn.getAttribute('data-show') || 'Show';
      var hideLabel = btn.getAttribute('data-hide') || 'Hide';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? hideLabel : showLabel;
    }
  };

  window.rleSelectOption = function (btn) {
    var group = btn.closest('[data-quiz-group]');
    if (!group || group.getAttribute('data-locked') === '1') return;
    var options = group.querySelectorAll('.rle-option');
    options.forEach(function (opt) {
      opt.classList.remove('correct', 'wrong');
      opt.setAttribute('aria-pressed', 'false');
    });
    var correct = btn.getAttribute('data-correct') === 'true';
    btn.classList.add(correct ? 'correct' : 'wrong');
    btn.setAttribute('aria-pressed', 'true');
    if (correct) {
      group.setAttribute('data-answered', '1');
      group.setAttribute('data-correct', '1');
    } else {
      group.setAttribute('data-answered', '1');
      group.setAttribute('data-correct', '0');
      options.forEach(function (opt) {
        if (opt.getAttribute('data-correct') === 'true') {
          opt.classList.add('correct');
        }
      });
    }
  };

  window.rleScoreQuiz = function (quizId, resultId) {
    var quiz = document.getElementById(quizId);
    var result = document.getElementById(resultId);
    if (!quiz || !result) return;
    var groups = quiz.querySelectorAll('[data-quiz-group]');
    var total = groups.length;
    var score = 0;
    groups.forEach(function (group) {
      if (group.getAttribute('data-correct') === '1') score += 1;
      group.setAttribute('data-locked', '1');
    });
    var pct = total ? Math.round((score / total) * 100) : 0;
    var msg =
      'Score: ' +
      score +
      ' / ' +
      total +
      ' (' +
      pct +
      '%). ';
    if (pct === 100) msg += 'Excellent — you are interview-ready.';
    else if (pct >= 70) msg += 'Good work. Review the missed items and try again.';
    else msg += 'Keep practicing. Read the sample answers, then retry.';
    result.hidden = false;
    result.textContent = msg;
    result.focus();
  };

  window.rleResetQuiz = function (quizId, resultId) {
    var quiz = document.getElementById(quizId);
    var result = document.getElementById(resultId);
    if (!quiz) return;
    quiz.querySelectorAll('[data-quiz-group]').forEach(function (group) {
      group.setAttribute('data-locked', '0');
      group.setAttribute('data-answered', '0');
      group.setAttribute('data-correct', '0');
      group.querySelectorAll('.rle-option').forEach(function (opt) {
        opt.classList.remove('correct', 'wrong');
        opt.setAttribute('aria-pressed', 'false');
      });
    });
    if (result) {
      result.hidden = true;
      result.textContent = '';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var fill = document.querySelector('.rle-progress .fill');
    if (fill) {
      window.addEventListener(
        'scroll',
        function () {
          var h = document.documentElement;
          var max = h.scrollHeight - h.clientHeight;
          var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
          fill.style.width = pct + '%';
        },
        { passive: true }
      );
    }

    var back = document.getElementById('rleBackTop');
    if (back) {
      window.addEventListener(
        'scroll',
        function () {
          if (window.scrollY > 500) back.classList.add('show');
          else back.classList.remove('show');
        },
        { passive: true }
      );
      back.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    document.querySelectorAll('[data-speak]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        speakText(btn.getAttribute('data-speak'));
      });
    });
  });
})();
