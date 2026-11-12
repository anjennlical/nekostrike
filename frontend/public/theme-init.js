// Runs before the app stylesheet: avoid a flash of the wrong saved theme.
;(function () {
  var preference = 'dark'
  try {
    var saved = localStorage.getItem('nekostrike-theme')
    if (['light', 'dark', 'system'].includes(saved)) preference = saved
  } catch (_) {
    /* Private storage must not prevent startup. */
  }
  var dark =
    preference === 'dark' ||
    (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.themePreference = preference
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
})()
