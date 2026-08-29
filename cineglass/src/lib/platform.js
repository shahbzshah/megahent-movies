export const IS_SHELL =
  typeof navigator !== 'undefined' &&
  (navigator.userAgent.includes('MegahEntDesktop') ||
    navigator.userAgent.includes('MegahEntAndroid'))
