(function() {
  // Widget state
  const currentScript = document.currentScript;
  const voxoraPublicKey = currentScript.getAttribute("data-voxora-public-key");
  const env = currentScript.getAttribute("data-voxora-env") || "dev";

  var isWidgetOpen = false;
  var iframe;
  var chatButton;
  var unreadBadge;
  var unreadCount = 0;
  var widgetToken = null;
  var apiBaseUrl = env === "dev" ? "http://localhost:3002" : "https://api.voxora.com";
  var widgetConfig = null;

  // JWT Authentication functions
  async function generateWidgetToken() {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/widget/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voxoraPublicKey: voxoraPublicKey,
          origin: window.location.origin
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data.token) {
        widgetToken = data.data.token;
        console.log('Widget token generated successfully');
        return widgetToken;
      } else {
        throw new Error('Failed to generate token');
      }
    } catch (error) {
      console.error('Error generating widget token:', error);
      throw error;
    }
  }

  // Create chat button
  function createChatButton() {
    chatButton = document.createElement("div");
    chatButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
  const baseBg = (widgetConfig && widgetConfig.backgroundColor) || "#667eea";
  Object.assign(chatButton.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "60px",
      height: "60px",
      borderRadius: "50%",
  background: baseBg,
      boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      zIndex: "999999",
      transition: "all 0.3s ease",
      transform: "scale(0)",
      opacity: "0"
    });

    // Hover effects
    chatButton.addEventListener("mouseenter", function() {
      if (!isWidgetOpen) {
        chatButton.style.transform = "scale(1.1)";
        chatButton.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
      }
    });

    chatButton.addEventListener("mouseleave", function() {
      if (!isWidgetOpen) {
        chatButton.style.transform = "scale(1)";
        chatButton.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
      }
    });

    chatButton.addEventListener("click", toggleWidget);
    
    return chatButton;
  }

  // Create unread badge
  function createUnreadBadge() {
    unreadBadge = document.createElement("div");
    unreadBadge.textContent = unreadCount;
    
    Object.assign(unreadBadge.style, {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      background: "#ff4757",
      color: "white",
      fontSize: "12px",
      fontWeight: "bold",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    });
    
    chatButton.appendChild(unreadBadge);
  }

  // Create iframe widget
  async function createWidget() {
    try {
      // Generate JWT token first
      if (!widgetToken) {
        await generateWidgetToken();
      }

      iframe = document.createElement("iframe");
  const cfg = widgetConfig ? encodeURIComponent(btoa(JSON.stringify(widgetConfig))) : '';
  iframe.src = `${apiBaseUrl}/widget?voxoraPublicKey=${encodeURIComponent(voxoraPublicKey)}&token=${encodeURIComponent(widgetToken)}${cfg ? `&cfg=${cfg}` : ''}`;
      iframe.allow = "microphone; camera";
    
    Object.assign(iframe.style, {
      position: "fixed",
      bottom: "100px",
      right: "24px",
      width: "380px",
      height: "600px",
      maxWidth: "calc(100vw - 48px)",
      maxHeight: "calc(100vh - 140px)",
      border: "none",
      borderRadius: "16px",
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
      zIndex: "999998",
      background: "white",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      transform: "scale(0.8) translateY(20px)",
      opacity: "0",
      transformOrigin: "bottom right",
      display: "none"
    });

    // Add iframe message listener (accept from any origin; adjust if you restrict hosting)
    window.addEventListener("message", function(event) {
      try {
        const t = event?.data?.type;
        if (!t) return;
        // Debug: log message type and origin
        if (typeof t === 'string') {
          // Keep lightweight; comment out if too chatty
          // console.debug('[VoxoraWidget] postMessage', t, 'from', event.origin);
        }
        if (t === "MINIMIZE_WIDGET") {
          closeWidget();
        } else if (t === "NEW_MESSAGE") {
          if (!isWidgetOpen) {
            unreadCount++;
            updateUnreadBadge();
          }
        }
      } catch {}
    });

    return iframe;
    } catch (error) {
      console.error('Error creating widget:', error);
      // Create iframe without token as fallback
      iframe = document.createElement("iframe");
      iframe.src = `${apiBaseUrl}/widget?voxoraPublicKey=${encodeURIComponent(voxoraPublicKey)}`;
      iframe.allow = "microphone; camera";
      
      Object.assign(iframe.style, {
        position: "fixed",
        bottom: "100px",
        right: "24px",
        width: "380px",
        height: "600px",
        maxWidth: "calc(100vw - 48px)",
        maxHeight: "calc(100vh - 140px)",
        border: "none",
        borderRadius: "16px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        zIndex: "999998",
        background: "white",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: "scale(0.8) translateY(20px)",
        opacity: "0",
        transformOrigin: "bottom right",
        display: "none"
      });
      
      // Add iframe message listener (fallback path)
      window.addEventListener("message", function(event) {
        try {
          const t = event?.data?.type;
          if (!t) return;
          if (t === "MINIMIZE_WIDGET") {
            closeWidget();
          } else if (t === "NEW_MESSAGE") {
            if (!isWidgetOpen) {
              unreadCount++;
              updateUnreadBadge();
            }
          }
        } catch {}
      });

      return iframe;
    }
  }

  // Toggle widget visibility
  function toggleWidget() {
    if (isWidgetOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  // Open widget
  function openWidget() {
    isWidgetOpen = true;
    iframe.style.display = "block";
    
    // Update button appearance
    chatButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    chatButton.style.transform = "scale(1) rotate(90deg)";
    
    // Animate widget in
    requestAnimationFrame(() => {
      iframe.style.transform = "scale(1) translateY(0)";
      iframe.style.opacity = "1";
    });

    // Clear unread count
    unreadCount = 0;
    updateUnreadBadge();
  }

  // Close widget
  function closeWidget() {
  isWidgetOpen = false;
    
    // Update button appearance
    chatButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    chatButton.style.transform = "scale(1) rotate(0deg)";
    
    // Animate widget out
    if (iframe) {
      iframe.style.transform = "scale(0.8) translateY(20px)";
      iframe.style.opacity = "0";
      setTimeout(() => {
        if (iframe) iframe.style.display = "none";
      }, 300);
    }
  }

  // Update unread badge
  function updateUnreadBadge() {
    if (unreadCount > 0) {
      unreadBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      unreadBadge.style.display = "flex";
    } else {
      unreadBadge.style.display = "none";
    }
  }

  // Initialize widget
  async function initWidget() {
    // Create elements
    // Preload widget config
    try {
      const resp = await fetch(`${apiBaseUrl}/api/v1/widget/config?voxoraPublicKey=${encodeURIComponent(voxoraPublicKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        widgetConfig = data?.data?.config || null;
      }
    } catch (e) {
      console.warn('Failed to fetch widget config', e);
    }

    createChatButton();
    createUnreadBadge();
    await createWidget();
    
    // Append to DOM
    document.body.appendChild(chatButton);
    document.body.appendChild(iframe);
    
    // Animate button in
    requestAnimationFrame(() => {
      chatButton.style.transform = "scale(1)";
      chatButton.style.opacity = "1";
    });

    // Add responsive behavior
    function handleResize() {
      if (window.innerWidth <= 480) {
        iframe.style.width = "calc(100vw - 24px)";
        iframe.style.height = "calc(100vh - 120px)";
        iframe.style.right = "12px";
        iframe.style.bottom = "80px";
        iframe.style.borderRadius = "12px";
      } else {
        iframe.style.width = "380px";
        iframe.style.height = "600px";
        iframe.style.right = "24px";
        iframe.style.bottom = "100px";
        iframe.style.borderRadius = "16px";
      }
    }

    window.addEventListener("resize", handleResize);
    handleResize();
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }

  // Expose global API
  window.VoxoraWidget = {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    addUnread: function() {
      if (!isWidgetOpen) {
        unreadCount++;
        updateUnreadBadge();
      }
    }
  };
})();
