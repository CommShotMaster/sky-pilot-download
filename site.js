// Sky Pilot download site: language toggle, "your device" download, and the Code Lab demo.
(function () {
  "use strict";

  var RELEASE = "https://github.com/CommShotMaster/sky-pilot-download/releases/latest/download/";
  var root = document.documentElement;

  // --- Language -----------------------------------------------------------------

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function setLang(lang) {
    root.setAttribute("data-lang", lang);
    root.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    document.title = lang === "zh" ? "天空飞手 Sky Pilot" : "Sky Pilot – drone simulator for kids";
  }

  setLang(store("lang") === "en" ? "en" : "zh");
  document.getElementById("lang-toggle").addEventListener("click", function () {
    var next = root.getAttribute("data-lang") === "zh" ? "en" : "zh";
    setLang(next);
    store("lang", next);
  });

  // --- Your device ----------------------------------------------------------------

  var ua = navigator.userAgent || "";
  var platform = "other";
  if (/Android/i.test(ua)) platform = "android";
  else if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) platform = "ios";
  else if (/Windows/i.test(ua)) platform = "windows";

  var main = document.getElementById("main-download");
  var sub = document.getElementById("main-download-sub");
  if (platform === "android") {
    main.href = RELEASE + "SkyPilot.apk";
    sub.innerHTML = '<span lang="zh">安卓 APK，58 MB</span><span lang="en">Android APK, 58 MB</span>';
  } else if (platform === "windows") {
    main.href = RELEASE + "SkyPilot-Windows.zip";
    sub.innerHTML = '<span lang="zh">Windows 版，82 MB</span><span lang="en">For Windows, 82 MB</span>';
  } else if (platform === "ios") {
    sub.innerHTML = '<span lang="zh">iPhone 和 iPad 暂时不支持</span><span lang="en">Not on iPhone or iPad yet</span>';
  }

  var card = document.querySelector('.platform[data-platform="' + platform + '"]');
  if (card) {
    card.classList.add("is-yours");
    var tag = document.createElement("span");
    tag.className = "yours-tag";
    tag.innerHTML = '<span lang="zh">你现在用的设备</span><span lang="en">The device you\'re using</span>';
    card.insertBefore(tag, card.firstChild);
    card.parentNode.insertBefore(card, card.parentNode.firstChild);
  }

  // --- Code Lab demo ----------------------------------------------------------------
  // Runs the same program as the blocks: take off, repeat 4 (forward 4 m, turn right 90°),
  // photo, land. The running block lights up, like in the game.

  var tabs = document.querySelectorAll(".demo-tabs button");
  var views = { blocks: document.getElementById("view-blocks"), python: document.getElementById("view-python") };
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener("click", function () {
      Array.prototype.forEach.call(tabs, function (t) { t.setAttribute("aria-selected", t === tab ? "true" : "false"); });
      var view = tab.getAttribute("data-view");
      views.blocks.hidden = view !== "blocks";
      views.python.hidden = view !== "python";
    });
  });

  var runBtn = document.getElementById("run");
  var drone = document.getElementById("drone");
  var body = document.getElementById("drone-body");
  var shadow = document.getElementById("drone-shadow");
  var trail = document.getElementById("trail");
  var flash = document.getElementById("flash");
  var caption = document.getElementById("demo-caption");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var START = { x: 3, y: 7.5 };
  var state, timer, token = 0;

  var CAPTIONS = {
    idle: ["每格 1 米。按“运行”试试看。", "Each square is 1 m. Press RUN to try it."],
    takeoff: ["起飞！", "Taking off!"],
    loop: ["重复执行：第 %d 次", "Repeat: round %d"],
    forward: ["向前飞 4 米", "Flying forward 4 m"],
    turn: ["右转 90 度", "Turning right 90°"],
    photo: ["咔嚓！拍了一张照片。", "Click! Took a photo."],
    land: ["降落", "Landing"],
    done: ["完成！无人机飞了一个边长 4 米的正方形。只用了 6 块积木。", "Done! The drone flew a 4 m square using just 6 blocks."]
  };

  function say(key, n) {
    var c = CAPTIONS[key];
    caption.innerHTML = '<span lang="zh">' + c[0].replace("%d", n) + '</span><span lang="en">' + c[1].replace("%d", n) + "</span>";
  }

  function light(step) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-step]"), function (el) {
      el.classList.toggle("on", step !== null && el.getAttribute("data-step") === String(step));
    });
  }

  function draw() {
    drone.setAttribute("transform", "translate(" + state.x.toFixed(3) + " " + state.y.toFixed(3) + ")");
    body.setAttribute("transform", "rotate(" + state.h.toFixed(2) + ") scale(" + state.lift.toFixed(3) + ")");
    shadow.setAttribute("rx", (0.55 / state.lift).toFixed(3));
    shadow.setAttribute("ry", (0.55 / state.lift).toFixed(3));
  }

  function reset() {
    token++;
    clearTimeout(timer);
    state = { x: START.x, y: START.y, h: 0, lift: 1 };
    trail.setAttribute("points", START.x + "," + START.y);
    flash.setAttribute("opacity", "0");
    light(null);
    draw();
  }

  // Animate one property change over `ms` milliseconds, then call next.
  function tween(ms, apply, next) {
    var my = token;
    if (reduced) { apply(1); draw(); return next(); }
    var t0 = performance.now();
    function frame(now) {
      if (my !== token) return;
      var k = Math.min((now - t0) / ms, 1);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      apply(e);
      draw();
      if (k < 1) requestAnimationFrame(frame);
      else next();
    }
    requestAnimationFrame(frame);
  }

  function wait(ms, next) {
    var my = token;
    timer = setTimeout(function () { if (my === token) next(); }, reduced ? 0 : ms);
  }

  function run() {
    reset();
    runBtn.setAttribute("data-running", "true");
    runBtn.querySelector(".run-label").innerHTML = '<span lang="zh">停止</span><span lang="en">STOP</span>';
    var points = [START.x + "," + START.y];
    var round = 0;

    var steps = [];
    steps.push(function (next) {
      light(0); say("takeoff");
      tween(800, function (e) { state.lift = 1 + 0.3 * e; }, next);
    });
    for (var r = 0; r < 4; r++) {
      steps.push(function (next) { round++; light("loop"); say("loop", round); wait(350, next); });
      steps.push(function (next) {
        light(1); say("forward");
        var x0 = state.x, y0 = state.y;
        var rad = state.h * Math.PI / 180;
        var dx = Math.sin(rad) * 4, dy = -Math.cos(rad) * 4;
        tween(1300, function (e) {
          state.x = x0 + dx * e; state.y = y0 + dy * e;
          trail.setAttribute("points", points.concat([state.x.toFixed(2) + "," + state.y.toFixed(2)]).join(" "));
        }, function () { points.push(state.x.toFixed(2) + "," + state.y.toFixed(2)); next(); });
      });
      steps.push(function (next) {
        light(2); say("turn");
        var h0 = state.h;
        tween(700, function (e) { state.h = h0 + 90 * e; }, next);
      });
    }
    steps.push(function (next) {
      light(3); say("photo");
      flash.setAttribute("transform", "translate(" + (state.x - START.x) + " " + (state.y - START.y) + ")");
      tween(500, function (e) { flash.setAttribute("opacity", String(0.8 * (1 - e))); }, next);
    });
    steps.push(function (next) {
      light(4); say("land");
      tween(800, function (e) { state.lift = 1.3 - 0.3 * e; }, next);
    });

    var i = 0;
    (function nextStep() {
      if (i < steps.length) return steps[i++](nextStep);
      light(null); say("done"); stopUi();
    })();
  }

  function stopUi() {
    runBtn.setAttribute("data-running", "false");
    runBtn.querySelector(".run-label").innerHTML = '<span lang="zh">运行</span><span lang="en">RUN</span>';
  }

  runBtn.addEventListener("click", function () {
    if (runBtn.getAttribute("data-running") === "true") {
      reset(); stopUi(); say("idle");
    } else {
      run();
    }
  });

  reset();
})();
