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

	// بصری مداری هیرو: قوس‌های ظریف مداری روی کاغذ روشن.
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

		for (var i = 0; i < 190; i++) {
			rings.push({
				r: 0.16 + Math.random() * 0.4,
				squash: 0.14 + Math.random() * 0.52,
				tilt: Math.random() * Math.PI,
				drift: (Math.random() - 0.5) * 0.0013,
				warm: Math.random() > 0.55,
				alpha: 0.03 + Math.random() * 0.08
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
			var cy = h * 0.44;
			var base = Math.min(w, h) * 1.12;

			ctx.lineWidth = 0.65;
			rings.forEach(function (ring, i) {
				var angle = ring.tilt + t * ring.drift;
				var rx = base * ring.r;
				var ry = rx * ring.squash;
				var pulse = 0.78 + 0.22 * Math.sin((t + i * 11) * 0.005);

				ctx.strokeStyle = ring.warm
					? 'rgba(196,116,38,' + ring.alpha * pulse + ')'
					: 'rgba(42,52,206,' + ring.alpha * pulse * 0.9 + ')';

				ctx.beginPath();
				ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2);
				ctx.stroke();
			});

			ctx.beginPath();
			ctx.arc(cx, cy, base * 0.1, 0, Math.PI * 2);
			ctx.strokeStyle = 'rgba(42,52,206,.16)';
			ctx.lineWidth = 1;
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
