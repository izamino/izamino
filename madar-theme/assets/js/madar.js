/**
 * تعاملات قالب مدار: منوی موبایل، تب مسیر رشد، آکاردئون سؤالات، ظاهر شدن بخش‌ها.
 */
(function () {
	'use strict';

	var header = document.getElementById('site-header');
	var burger = document.getElementById('madar-burger');
	var panel = document.getElementById('madar-panel');

	if (header) {
		var onScroll = function () {
			header.classList.toggle('is-stuck', window.scrollY > 8);
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
	}

	if (burger && panel) {
		burger.addEventListener('click', function () {
			var open = panel.classList.toggle('is-open');
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
		});

		panel.addEventListener('click', function (event) {
			if (event.target.closest('a')) {
				panel.classList.remove('is-open');
				burger.setAttribute('aria-expanded', 'false');
			}
		});
	}

	// سوییچ پیش‌نمایش موبایل / دسکتاپ.
	document.querySelectorAll('.showcase__switch button').forEach(function (button) {
		button.addEventListener('click', function () {
			var group = button.closest('.showcase');
			if (!group) return;

			group.querySelectorAll('.showcase__switch button').forEach(function (other) {
				other.setAttribute('aria-selected', other === button ? 'true' : 'false');
			});
			group.querySelectorAll('.showcase__pane').forEach(function (pane) {
				pane.classList.toggle('is-active', pane.id === 'pane-' + button.dataset.pane);
			});
		});
	});

	// بصری مداری هیرو: هزاران قوس مداری چرخان.
	var canvas = document.getElementById('madar-orbit');
	if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		drawOrbit(canvas);
	}

	function drawOrbit(cv) {
		var ctx = cv.getContext('2d');
		var rings = [];
		var w = 0;
		var h = 0;
		var t = 0;

		for (var i = 0; i < 230; i++) {
			rings.push({
				r: 0.12 + Math.random() * 0.42,
				squash: 0.12 + Math.random() * 0.55,
				tilt: Math.random() * Math.PI,
				drift: (Math.random() - 0.5) * 0.0016,
				warm: Math.random() > 0.35,
				alpha: 0.06 + Math.random() * 0.22
			});
		}

		function resize() {
			var dpr = Math.min(window.devicePixelRatio || 1, 2);
			w = cv.clientWidth;
			h = cv.clientHeight;
			cv.width = w * dpr;
			cv.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function frame() {
			t += 1;
			ctx.clearRect(0, 0, w, h);

			var cx = w / 2;
			var cy = h * 0.42;
			var base = Math.min(w, h) * 1.05;

			var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.42);
			glow.addColorStop(0, 'rgba(242,161,92,.16)');
			glow.addColorStop(0.5, 'rgba(226,112,58,.05)');
			glow.addColorStop(1, 'rgba(8,9,11,0)');
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, w, h);

			ctx.lineWidth = 0.7;
			rings.forEach(function (ring, i) {
				var angle = ring.tilt + t * ring.drift;
				var rx = base * ring.r;
				var ry = rx * ring.squash;
				var pulse = 0.82 + 0.18 * Math.sin((t + i * 9) * 0.006);

				ctx.strokeStyle = ring.warm
					? 'rgba(242,181,120,' + ring.alpha * pulse + ')'
					: 'rgba(150,190,235,' + ring.alpha * pulse * 0.7 + ')';

				ctx.beginPath();
				ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2);
				ctx.stroke();
			});

			ctx.beginPath();
			ctx.arc(cx, cy, base * 0.115, 0, Math.PI * 2);
			ctx.strokeStyle = 'rgba(255,214,166,.5)';
			ctx.lineWidth = 1.4;
			ctx.stroke();

			requestAnimationFrame(frame);
		}

		resize();
		window.addEventListener('resize', resize);
		requestAnimationFrame(frame);
	}

	// تب‌های مسیر رشد.
	var tabs = document.querySelectorAll('.track-tab');
	Array.prototype.forEach.call(tabs, function (tab) {
		tab.addEventListener('click', function () {
			Array.prototype.forEach.call(tabs, function (other) {
				other.setAttribute('aria-selected', other === tab ? 'true' : 'false');
			});

			document.querySelectorAll('.track-panel').forEach(function (pane) {
				pane.classList.remove('is-active');
			});

			var target = document.getElementById('panel-' + tab.dataset.track);
			if (target) {
				target.classList.add('is-active');
			}
		});
	});

	// آکاردئون سؤالات پرتکرار.
	document.querySelectorAll('.faq__q').forEach(function (button) {
		button.addEventListener('click', function () {
			var answer = document.getElementById(button.getAttribute('aria-controls'));
			var open = button.getAttribute('aria-expanded') === 'true';

			button.setAttribute('aria-expanded', open ? 'false' : 'true');
			if (answer) {
				answer.classList.toggle('is-open', !open);
			}
		});
	});

	// ظاهر شدن تدریجی بخش‌ها.
	var reveals = document.querySelectorAll('.reveal');
	if (!('IntersectionObserver' in window)) {
		reveals.forEach(function (el) {
			el.classList.add('is-in');
		});
		return;
	}

	var observer = new IntersectionObserver(
		function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-in');
					observer.unobserve(entry.target);
				}
			});
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
	);

	reveals.forEach(function (el) {
		observer.observe(el);
	});
})();
