/**
 * مدار — لایه تعامل و انیمیشن
 *
 * ۱) هدر چسبان و نوار پیشرفت اسکرول
 * ۲) منوی موبایل
 * ۳) ورود کلمه‌به‌کلمه تیتر هیرو
 * ۴) اسکرول‌ریویل با تأخیر پلکانی
 * ۵) شمارنده اعداد فارسی
 * ۶) نوارهای پیشرفت و مهارت
 * ۷) بصری مداری هیرو (canvas) + پارالاکس
 * ۸) سوییچ پیش‌نمایش، تب مسیر رشد، آکاردئون، ریل اسکرین‌ها
 */
(function () {
	'use strict';

	var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

	function toFa(value) {
		return String(value).replace(/[0-9]/g, function (d) { return FA[+d]; });
	}

	function toEn(value) {
		return String(value).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); });
	}

	function group(value) {
		return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
	}

	/* ---------------------------------------------------------------- ۱ */
	var header = document.getElementById('site-header');
	var progress = document.querySelector('.scroll-progress');

	function onScroll() {
		var y = window.scrollY || document.documentElement.scrollTop;

		if (header) {
			header.classList.toggle('is-stuck', y > 8);
		}

		if (progress) {
			var height = document.documentElement.scrollHeight - window.innerHeight;
			progress.style.transform = 'scaleX(' + (height > 0 ? Math.min(y / height, 1) : 0) + ')';
		}

		parallax(y);
	}

	window.addEventListener('scroll', onScroll, { passive: true });

	/* ---------------------------------------------------------------- ۲ */
	var burger = document.getElementById('madar-burger');
	var panel = document.getElementById('madar-panel');

	if (burger && panel) {
		burger.addEventListener('click', function () {
			var open = panel.classList.toggle('is-open');
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
			document.body.style.overflow = open ? 'hidden' : '';
		});

		panel.addEventListener('click', function (event) {
			if (event.target.closest('a')) {
				panel.classList.remove('is-open');
				burger.setAttribute('aria-expanded', 'false');
				document.body.style.overflow = '';
			}
		});
	}

	/* ---------------------------------------------------------------- ۳ */
	function splitWords(el) {
		var nodes = Array.prototype.slice.call(el.childNodes);
		var index = 0;

		nodes.forEach(function (node) {
			if (node.nodeType === 3) {
				var frag = document.createDocumentFragment();
				node.textContent.split(/(\s+)/).forEach(function (chunk) {
					if (!chunk.trim()) {
						frag.appendChild(document.createTextNode(chunk));
						return;
					}
					frag.appendChild(wrap(chunk, index++));
				});
				el.replaceChild(frag, node);
			} else if (node.nodeType === 1) {
				var inner = node.textContent;
				node.textContent = '';
				inner.split(/(\s+)/).forEach(function (chunk) {
					if (!chunk.trim()) {
						node.appendChild(document.createTextNode(chunk));
						return;
					}
					node.appendChild(wrap(chunk, index++));
				});
			}
		});

		function wrap(text, i) {
			var span = document.createElement('span');
			var inner = document.createElement('i');
			span.className = 'word';
			inner.textContent = text;
			inner.style.setProperty('--d', (i * 55) + 'ms');
			span.appendChild(inner);
			return span;
		}
	}

	var heroTitle = document.querySelector('.hero h1');
	if (heroTitle && !REDUCED) {
		splitWords(heroTitle);
		heroTitle.classList.add('is-split');
		requestAnimationFrame(function () {
			setTimeout(function () { heroTitle.classList.add('is-in'); }, 120);
		});
	}

	/* ---------------------------------------------------------------- ۴ */
	var animated = document.querySelectorAll('[data-anim], .reveal');

	// تأخیر پلکانی برای فرزندان یک شبکه
	document.querySelectorAll('[data-stagger]').forEach(function (parent) {
		var gap = parseInt(parent.getAttribute('data-stagger'), 10) || 70;
		Array.prototype.forEach.call(parent.children, function (child, i) {
			if (child.hasAttribute('data-anim') || child.classList.contains('reveal')) {
				child.style.setProperty('--d', (i * gap) + 'ms');
			}
		});
	});

	function activate(el) {
		el.classList.add('is-in');

		if (el.hasAttribute('data-count')) {
			countUp(el);
		}
		el.querySelectorAll('[data-count]').forEach(countUp);
		el.querySelectorAll('.meter i, .bar-fill').forEach(fillBar);
	}

	if (!('IntersectionObserver' in window) || REDUCED) {
		Array.prototype.forEach.call(animated, activate);
	} else {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					activate(entry.target);
					observer.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

		Array.prototype.forEach.call(animated, function (el) { observer.observe(el); });
	}

	/* ---------------------------------------------------------------- ۵ */
	function countUp(el) {
		if (el.dataset.counted) { return; }
		el.dataset.counted = '1';

		var raw = el.getAttribute('data-count') || el.textContent;
		var digits = toEn(raw).replace(/[^\d]/g, '');
		if (!digits) { return; }

		var target = parseInt(digits, 10);
		var text = toEn(el.textContent);
		var prefix = text.slice(0, text.search(/\d/)).replace(/[٬,]/g, '');
		var suffix = text.slice(text.search(/\d/)).replace(/[\d٬,]/g, '');

		if (REDUCED || target > 100000) {
			el.textContent = prefix + toFa(group(target)) + suffix;
			return;
		}

		var start = performance.now();
		var duration = 1500;

		function tick(now) {
			var p = Math.min((now - start) / duration, 1);
			var eased = 1 - Math.pow(1 - p, 4);
			el.textContent = prefix + toFa(group(Math.round(target * eased))) + suffix;
			if (p < 1) { requestAnimationFrame(tick); }
		}

		requestAnimationFrame(tick);
	}

	/* ---------------------------------------------------------------- ۶ */
	function fillBar(el) {
		if (el.dataset.filled) { return; }
		el.dataset.filled = '1';

		var width = el.style.width || el.getAttribute('data-w') || '0%';
		el.style.width = '0%';
		requestAnimationFrame(function () {
			setTimeout(function () { el.style.width = width; }, 80);
		});
	}

	/* ---------------------------------------------------------------- ۷ */
	var parallaxItems = [];
	document.querySelectorAll('[data-parallax]').forEach(function (el) {
		parallaxItems.push({ el: el, factor: parseFloat(el.getAttribute('data-parallax')) || 0.06 });
	});

	function parallax(y) {
		if (REDUCED) { return; }
		parallaxItems.forEach(function (item) {
			var rect = item.el.getBoundingClientRect();
			if (rect.bottom < -200 || rect.top > window.innerHeight + 200) { return; }
			var offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * item.factor;
			item.el.style.transform = 'translate3d(0,' + (-offset).toFixed(2) + 'px,0)';
		});
	}

	var canvas = document.getElementById('madar-orbit');
	if (canvas && !REDUCED) {
		drawOrbit(canvas);
	}

	function drawOrbit(cv) {
		var ctx = cv.getContext('2d');
		var rings = [];
		var w = 0;
		var h = 0;
		var t = 0;
		var mx = 0;
		var my = 0;
		var tx = 0;
		var ty = 0;

		for (var i = 0; i < 190; i++) {
			rings.push({
				r: 0.16 + Math.random() * 0.4,
				squash: 0.14 + Math.random() * 0.52,
				tilt: Math.random() * Math.PI,
				drift: (Math.random() - 0.5) * 0.0013,
				warm: Math.random() > 0.55,
				alpha: 0.03 + Math.random() * 0.08,
				depth: 0.3 + Math.random() * 0.7
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

		window.addEventListener('mousemove', function (event) {
			tx = (event.clientX / window.innerWidth - 0.5) * 26;
			ty = (event.clientY / window.innerHeight - 0.5) * 18;
		}, { passive: true });

		function frame() {
			t += 1;
			mx += (tx - mx) * 0.05;
			my += (ty - my) * 0.05;

			ctx.clearRect(0, 0, w, h);

			var cx = w / 2 + mx;
			var cy = h * 0.44 + my;
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
				ctx.ellipse(
					cx + mx * ring.depth * 0.6,
					cy + my * ring.depth * 0.6,
					rx, ry, angle, 0, Math.PI * 2
				);
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

	/* ---------------------------------------------------------------- ۸ */
	// سوییچ موبایل / دسکتاپ
	document.querySelectorAll('.showcase__switch button').forEach(function (button) {
		button.addEventListener('click', function () {
			var group = button.closest('.showcase');
			if (!group) { return; }

			group.querySelectorAll('.showcase__switch button').forEach(function (other) {
				other.setAttribute('aria-selected', other === button ? 'true' : 'false');
			});
			group.querySelectorAll('.showcase__pane').forEach(function (pane) {
				pane.classList.toggle('is-active', pane.id === 'pane-' + button.dataset.pane);
			});
		});
	});

	// تب‌های مسیر رشد
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
				target.querySelectorAll('.meter i').forEach(function (bar) {
					bar.dataset.filled = '';
					fillBar(bar);
				});
			}
		});
	});

	// آکاردئون سؤالات
	document.querySelectorAll('.faq__q').forEach(function (button) {
		button.addEventListener('click', function () {
			var item = button.closest('.faq__item');
			var answer = document.getElementById(button.getAttribute('aria-controls'));
			var open = button.getAttribute('aria-expanded') === 'true';

			button.setAttribute('aria-expanded', open ? 'false' : 'true');
			if (answer) { answer.classList.toggle('is-open', !open); }
			if (item) { item.classList.toggle('is-open', !open); }
		});
	});

	// ریل اسکرین‌های اپ
	document.querySelectorAll('.rail').forEach(function (rail) {
		var track = rail.querySelector('.rail__track');
		if (!track) { return; }

		var rtl = getComputedStyle(track).direction === 'rtl';

		rail.querySelectorAll('[data-rail]').forEach(function (button) {
			button.addEventListener('click', function () {
				var step = track.clientWidth * 0.62 * (rtl ? -1 : 1);
				track.scrollBy({
					left: button.dataset.rail === 'next' ? step : -step,
					behavior: REDUCED ? 'auto' : 'smooth'
				});
			});
		});
	});

	onScroll();
})();
