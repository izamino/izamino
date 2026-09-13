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
