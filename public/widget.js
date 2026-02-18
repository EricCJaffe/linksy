/**
 * Linksy Widget Embed Script
 *
 * Usage:
 *   <script src="https://your-linksy-domain.com/widget.js" data-slug="your-host-slug"></script>
 *
 * Optional attributes on the script tag:
 *   data-slug        (required) Your host provider slug
 *   data-height      iframe height in px (default: 700)
 *   data-border-radius  border radius in px (default: 8)
 *   data-container-id   id to give the wrapper div (default: linksy-widget)
 */
(function () {
  'use strict';

  // Find this script tag
  var scripts = document.querySelectorAll('script[src*="widget.js"]');
  var thisScript = null;
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src.indexOf('widget.js') !== -1) {
      thisScript = scripts[i];
      break;
    }
  }

  if (!thisScript) {
    console.error('[Linksy] Could not locate widget.js script tag.');
    return;
  }

  var slug = thisScript.getAttribute('data-slug');
  if (!slug) {
    console.error('[Linksy] Missing required data-slug attribute on widget script tag.');
    return;
  }

  var height = thisScript.getAttribute('data-height') || '700';
  var borderRadius = thisScript.getAttribute('data-border-radius') || '8';
  var containerId = thisScript.getAttribute('data-container-id') || 'linksy-widget';

  // Derive base URL from the script's own src
  var scriptSrc = thisScript.src;
  var baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/widget.js'));

  // Build the iframe src
  var iframeSrc = baseUrl + '/find-help/' + encodeURIComponent(slug);

  // Create wrapper
  var container = document.createElement('div');
  container.id = containerId;
  container.style.cssText = [
    'width: 100%',
    'min-height: ' + height + 'px',
    'position: relative',
    'overflow: hidden',
    'border-radius: ' + borderRadius + 'px',
  ].join('; ');

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.title = 'Community Resource Finder';
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'geolocation');
  iframe.setAttribute('allowfullscreen', '');
  iframe.style.cssText = [
    'width: 100%',
    'height: ' + height + 'px',
    'border: none',
    'display: block',
  ].join('; ');

  container.appendChild(iframe);

  // Insert the widget immediately after the script tag
  if (thisScript.parentNode) {
    thisScript.parentNode.insertBefore(container, thisScript.nextSibling);
  } else {
    document.body.appendChild(container);
  }
})();
