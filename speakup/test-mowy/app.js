(function () {
  "use strict";

  // 15 zdań: od łatwych do trudniejszych. Kawiarnia, lotnisko, hotel, small talk.
  var PHRASES = [
    { place: "Small talk", text: "Hello, how are you?" },
    { place: "Kawiarnia", text: "A coffee, please." },
    { place: "Kawiarnia", text: "Can I have the bill, please?" },
    { place: "Hotel", text: "Where is the lift?" },
    { place: "Small talk", text: "Nice to meet you. Where are you from?" },
    { place: "Lotnisko", text: "Is this seat taken?" },
    { place: "Kawiarnia", text: "I would like a large latte with oat milk." },
    { place: "Small talk", text: "What do you do for a living?" },
    { place: "Lotnisko", text: "Where can I check in my luggage?" },
    { place: "Hotel", text: "I booked a double room for three nights." },
    { place: "Lotnisko", text: "My flight has been delayed by two hours." },
    { place: "Hotel", text: "Could you recommend a good restaurant nearby?" },
    { place: "Small talk", text: "I thought the show was on Thursday, not this weekend." },
    { place: "Small talk", text: "The weather has been terrible this week, hasn't it?" },
    { place: "Hotel", text: "Would it be possible to check out a bit later tomorrow?" }
  ];

  var S = window.SpeakScore;
  var results = new Array(PHRASES.length).fill(null);
  var active = null; // { rec, index }

  var $ = function (id) { return document.getElementById(id); };
  var list = $("list");

  function getSR() {
    if (/[?&]symuluj=brak\b/.test(location.search)) return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function cls(score) {
    return score >= 80 ? "good" : score >= 50 ? "mid" : "bad";
  }

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function buildList(supported) {
    PHRASES.forEach(function (p, i) {
      var card = el("article", "card");
      card.id = "card-" + i;
      card.appendChild(el("div", "meta", (i + 1) + " / " + PHRASES.length + " · " + p.place));
      card.appendChild(el("p", "phrase", p.text));
      var row = el("div", "row");
      var btn = el("button", "big", "Mów");
      btn.type = "button";
      btn.id = "speak-" + i;
      btn.disabled = !supported;
      btn.addEventListener("click", function () { toggle(i); });
      row.appendChild(btn);
      var sc = el("span", "score", "");
      sc.id = "score-" + i;
      row.appendChild(sc);
      card.appendChild(row);
      var heard = el("p", "heard");
      heard.id = "heard-" + i;
      card.appendChild(heard);
      var alt = el("p", "alt");
      alt.id = "alt-" + i;
      card.appendChild(alt);
      var missed = el("p", "missed");
      missed.id = "missed-" + i;
      card.appendChild(missed);
      var msg = el("p", "msg");
      msg.id = "msg-" + i;
      card.appendChild(msg);
      list.appendChild(card);
    });
  }

  function setHeard(i, text, interim) {
    var h = $("heard-" + i);
    h.textContent = "";
    h.appendChild(el("span", null, "Telefon usłyszał: "));
    h.appendChild(interim ? el("i", null, text) : el("b", null, text));
  }

  function renderResult(i) {
    var r = results[i];
    var sc = $("score-" + i);
    sc.textContent = r.top + "%";
    sc.className = "score " + cls(r.top);
    setHeard(i, r.heard || "—", false);
    $("alt-" + i).textContent = r.best > r.top
      ? "Najbliższa z propozycji telefonu (" + r.best + "%): " + r.bestText
      : "";
    var missed = S.missedWords(PHRASES[i].text, r.heard);
    $("missed-" + i).textContent = missed.length ? "Nie rozpoznano słów: " + missed.join(", ") : "";
    updateProgress();
  }

  function updateProgress() {
    var done = results.filter(Boolean).length;
    $("progress").textContent = done + " / " + PHRASES.length;
  }

  function stopActive() {
    if (active) {
      try { active.rec.stop(); } catch (e) { /* już zatrzymane */ }
    }
  }

  var ERRORS = {
    "not-allowed": "Brak zgody na mikrofon. Zezwól na mikrofon dla tej strony (ikona kłódki obok adresu) i spróbuj jeszcze raz.",
    "service-not-allowed": "Przeglądarka nie pozwala na rozpoznawanie mowy. Otwórz stronę w Google Chrome.",
    "no-speech": "Nic nie usłyszałem. Naciśnij Mów i mów od razu, trochę głośniej.",
    "audio-capture": "Nie widzę mikrofonu. Sprawdź, czy inna aplikacja go nie używa.",
    "network": "Brak internetu. Rozpoznawanie w Chrome działa przez sieć.",
    "language-not-supported": "Ta przeglądarka nie rozpoznaje angielskiego (en-US)."
  };

  function toggle(i) {
    if (active && active.index === i) { stopActive(); return; }
    stopActive();
    var SR = getSR();
    if (!SR) { showUnsupported(); return; }

    var rec;
    try { rec = new SR(); } catch (e) { showUnsupported(); return; }
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    var btn = $("speak-" + i);
    var gotFinal = false;
    var hadError = false;
    $("msg-" + i).textContent = "";
    active = { rec: rec, index: i };
    btn.textContent = "Stop";
    btn.classList.add("recording");

    rec.onresult = function (ev) {
      var res = ev.results[ev.results.length - 1];
      if (!res) return;
      if (!res.isFinal) { setHeard(i, res[0].transcript, true); return; }
      gotFinal = true;
      var target = PHRASES[i].text;
      var alts = [];
      for (var k = 0; k < res.length; k++) {
        var t = res[k].transcript;
        alts.push({ text: t, score: S.score(target, t), conf: res[k].confidence });
      }
      var best = alts.reduce(function (a, b) { return b.score > a.score ? b : a; }, alts[0]);
      results[i] = {
        heard: alts[0].text,
        top: alts[0].score,
        best: best.score,
        bestText: best.text,
        conf: alts[0].conf,
        alternatives: alts.length
      };
      renderResult(i);
    };

    rec.onerror = function (ev) {
      hadError = true;
      if (ev.error === "aborted") return;
      $("msg-" + i).textContent = ERRORS[ev.error] || ("Błąd rozpoznawania: " + ev.error);
    };

    rec.onend = function () {
      btn.textContent = "Mów";
      btn.classList.remove("recording");
      if (active && active.rec === rec) active = null;
      if (!gotFinal && !hadError) $("msg-" + i).textContent = ERRORS["no-speech"];
    };

    try {
      rec.start();
    } catch (e) {
      hadError = true;
      $("msg-" + i).textContent = "Nie udało się włączyć mikrofonu: " + e.message;
      btn.textContent = "Mów";
      btn.classList.remove("recording");
      active = null;
    }
  }

  function showUnsupported() {
    $("unsupported").hidden = false;
    for (var i = 0; i < PHRASES.length; i++) $("speak-" + i).disabled = true;
  }

  function shortDevice() {
    var ua = navigator.userAgent;
    var android = (ua.match(/Android [\d.]+/) || [""])[0];
    var chrome = (ua.match(/Chrome\/(\d+)/) || ["", ""])[1];
    var parts = [];
    if (android) parts.push(android);
    if (chrome) parts.push("Chrome " + chrome);
    return parts.join(", ") || "nieznana przeglądarka";
  }

  function resultText() {
    var done = [];
    var lines = [];
    PHRASES.forEach(function (p, i) {
      var r = results[i];
      if (r) {
        done.push(r);
        lines.push((i + 1) + ". " + r.top + "% (najbliższa propozycja " + r.best + "%) | wzorzec: " + p.text +
          " | usłyszane: " + (r.heard || "—"));
      } else {
        lines.push((i + 1) + ". pominięte | wzorzec: " + p.text);
      }
    });
    var avgTop = S.average(done.map(function (r) { return r.top; }));
    var avgBest = S.average(done.map(function (r) { return r.best; }));
    return {
      done: done.length,
      avgTop: avgTop,
      avgBest: avgBest,
      text: [
        "Test mowy EN (speakup) – wynik",
        "Zdania: " + done.length + " / " + PHRASES.length,
        "Średnia (1. propozycja telefonu): " + avgTop + "%",
        "Średnia (najbliższa z propozycji): " + avgBest + "%",
        "Urządzenie: " + shortDevice()
      ].concat(lines).join("\n")
    };
  }

  function showResult() {
    stopActive();
    var r = resultText();
    $("summary").textContent = r.done
      ? "Średnia: " + r.avgTop + "% (najbliższa z propozycji: " + r.avgBest + "%), zdania: " + r.done + " / " + PHRASES.length
      : "Nie ma jeszcze żadnego wyniku. Wróć i naciśnij Mów przy zdaniu.";
    var ol = $("resultList");
    ol.textContent = "";
    PHRASES.forEach(function (p, i) {
      var li = el("li");
      var res = results[i];
      var sc = el("span", "score " + (res ? cls(res.top) : ""), res ? res.top + "%" : "pominięte");
      li.appendChild(sc);
      li.appendChild(document.createTextNode(" " + p.text));
      if (res) li.appendChild(el("small", null, "Usłyszane: " + (res.heard || "—")));
      ol.appendChild(li);
    });
    $("copyStatus").textContent = "";
    $("copyFallback").hidden = true;
    $("list").hidden = true;
    $("result").hidden = false;
    window.scrollTo(0, 0);
  }

  function copyResult() {
    var text = resultText().text;
    var ok = function () { $("copyStatus").textContent = "Skopiowano. Wklej wynik w czat."; };
    var fallback = function () {
      var ta = $("copyFallback");
      ta.value = text;
      ta.hidden = false;
      ta.focus();
      ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (e) { done = false; }
      $("copyStatus").textContent = done
        ? "Skopiowano. Wklej wynik w czat."
        : "Nie udało się skopiować samo. Przytrzymaj palec na tekście poniżej, zaznacz wszystko i skopiuj.";
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else {
      fallback();
    }
  }

  var supported = !!getSR();
  buildList(supported);
  if (!supported) showUnsupported();
  $("showResult").addEventListener("click", showResult);
  $("copy").addEventListener("click", copyResult);
  $("back").addEventListener("click", function () {
    $("result").hidden = true;
    $("list").hidden = false;
  });
})();
