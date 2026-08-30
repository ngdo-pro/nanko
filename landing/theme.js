(function () {
  var STORAGE_KEY = 'nanko-theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = document.querySelectorAll('[data-theme-choice]');

  function current() {
    var stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  }

  function apply(choice) {
    if (choice === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', choice);
    }
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === choice));
    });
  }

  function set(choice) {
    if (choice === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, choice);
    }
    apply(choice);
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      set(btn.dataset.themeChoice);
    });
  });

  media.addEventListener('change', function () {
    if (current() === 'system') apply('system');
  });

  apply(current());
})();
