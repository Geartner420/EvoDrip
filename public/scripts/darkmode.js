// 🌗 Dark Mode Toggle
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// 🌗 Theme beim Laden anwenden
(function () {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

// 🛠️ Komma zu Punkt bei Zahlfeldern beim Absenden
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', () => {
      document.querySelectorAll('input[type="number"]').forEach(input => {
        input.value = input.value.replace(',', '.');
      });
    });
  }
});
