(function() {
  // Widget state
  var isWidgetOpen = false;
  var iframe;
  var chatButton;
  var unreadBadge;
  var unreadCount = 0;

  // Create chat button
  function createChatButton() {
    chatButton = document.createElement("div");
    chatButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
    Object.assign(chatButton.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
  function createWidget() {
    iframe = document.createElement("iframe");
    iframe.src = "http://localhost:3002/widget";
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

    // Add iframe message listener
    window.addEventListener("message", function(event) {
      if (event.origin !== "http://127.0.0.1:5500") return;
      
      if (event.data.type === "MINIMIZE_WIDGET") {
        closeWidget();
      } else if (event.data.type === "NEW_MESSAGE") {
        if (!isWidgetOpen) {
          unreadCount++;
          updateUnreadBadge();
        }
      }
    });

    return iframe;
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
    iframe.style.transform = "scale(0.8) translateY(20px)";
    iframe.style.opacity = "0";
    
    setTimeout(() => {
      iframe.style.display = "none";
    }, 300);
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
  function initWidget() {
    // Create elements
    createChatButton();
    createUnreadBadge();
    createWidget();
    
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
