self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  let title = 'Waktu Memasak Habis! 🍜';
  let body = 'Timer Anda telah selesai. Segera periksa masakan Anda!';
  let url = '/';

  try {
    if (event.data) {
      const text = event.data.text();
      try {
        const data = JSON.parse(text);
        if (data) {
          title = data.title || title;
          body = data.body || body;
          url = data.url || url;
        }
      } catch (e) {
        if (text) {
          body = text;
        }
      }
    }
  } catch (e) {
    console.error("Error parsing push payload:", e);
  }

  // To prevent double notifications on iOS, we wrap the notification inside a promise
  const notificationPromise = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    const isFocused = windowClients.some(function(client) {
      return client.focused;
    });

    // If there is an active focused tab, we send a postMessage to it
    if (isFocused) {
      windowClients.forEach(function(client) {
        client.postMessage({ type: 'TIMER_FINISHED_PUSH' });
      });
      return; 
    }

    // Clean options strictly compatible with iOS Safari
    const options = {
      body: body,
      icon: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: 'cooking-timer',
      data: {
        url: url
      }
    };

    return self.registration.showNotification(title, options);
  }).catch(function(err) {
    console.error("Error displaying notification:", err);
    // Safe absolute fallback
    return self.registration.showNotification('Waktu Memasak Habis! 🍜', {
      body: 'Timer Anda telah selesai. Segera periksa masakan Anda!',
      icon: '/favicon.ico',
      tag: 'cooking-timer',
      data: { url: '/' }
    });
  });

  event.waitUntil(notificationPromise);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(urlToOpen) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
