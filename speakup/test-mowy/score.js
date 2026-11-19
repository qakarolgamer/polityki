// Ocena podobieństwa: ile słów wzorca telefon usłyszał w dobrej kolejności.
// Wynik = wspólne słowa (najdłuższy wspólny podciąg) / max(słowa wzorca, słowa usłyszane).
// Dzięki temu karane są i słowa pominięte, i dopisane.
(function (root) {
  "use strict";

  var DIGITS = {
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
    "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten",
    "11": "eleven", "12": "twelve"
  };

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[‘’ʼ`]/g, "'")
      .replace(/'/g, "")
      .replace(/-/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map(function (w) { return DIGITS[w] || w; });
  }

  function lcs(a, b) {
    var prev = new Array(b.length + 1).fill(0);
    for (var i = 1; i <= a.length; i++) {
      var cur = [0];
      for (var j = 1; j <= b.length; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Zwraca liczbę całkowitą 0–100.
  function score(reference, heard) {
    var r = normalize(reference);
    var h = normalize(heard);
    if (r.length === 0 || h.length === 0) return 0;
    return Math.round((100 * lcs(r, h)) / Math.max(r.length, h.length));
  }

  // Słowa wzorca, których nie usłyszano (do podświetlenia).
  function missedWords(reference, heard) {
    var h = normalize(heard);
    var left = h.slice();
    return normalize(reference).filter(function (w) {
      var k = left.indexOf(w);
      if (k === -1) return true;
      left.splice(k, 1);
      return false;
    });
  }

  function average(nums) {
    if (!nums.length) return 0;
    var s = 0;
    for (var i = 0; i < nums.length; i++) s += nums[i];
    return Math.round(s / nums.length);
  }

  var api = { normalize: normalize, score: score, missedWords: missedWords, average: average };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SpeakScore = api;
})(typeof window !== "undefined" ? window : globalThis);
