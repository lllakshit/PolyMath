// Add this script to fix task display issues
document.addEventListener("DOMContentLoaded", () => {
  // Function to fix task card display
  function fixTaskDisplay() {
    const taskCards = document.querySelectorAll(".task-card");

    taskCards.forEach((card) => {
      // Get the task height from the style attribute
      const height = Number.parseInt(card.style.height || "60");

      // Ensure task cards have proper overflow handling
      card.style.overflowY = "auto";

      // Fix task description display
      const description = card.querySelector(".task-description");
      if (description) {
        description.style.display = "block";
        description.style.webkitLineClamp = "unset";
        description.style.overflow = "visible";

        // If task is tall enough, allow more description to show
        if (height > 100) {
          description.style.maxHeight = height - 70 + "px";
        }
      }

      // Ensure task card has the correct width
      card.style.width = "calc(100% - 1rem)";
    });
  }

  // Function to handle mobile sidebar and dashboard
  function setupMobileNavigation() {
    const sidebar = document.getElementById("sidebar");
    const dashboardPanel = document.getElementById("dashboard-panel");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const dashboardToggle = document.getElementById("dashboard-toggle");

    // Add close buttons for mobile
    function addCloseButton(element, position) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "mobile-close-btn";
      closeBtn.innerHTML = "&times;";
      closeBtn.style.position = "absolute";
      closeBtn.style.top = "10px";
      closeBtn.style[position] = "10px";

      closeBtn.addEventListener("click", () => {
        element.classList.remove("show");
        document.body.classList.remove(
          element === sidebar ? "sidebar-open" : "dashboard-open"
        );
      });

      element.appendChild(closeBtn);
    }

    // Only add close buttons on mobile
    if (window.innerWidth <= 768) {
      addCloseButton(sidebar, "right");
      addCloseButton(dashboardPanel, "left");

      // Toggle body class when sidebar/dashboard is opened
      if (sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
          document.body.classList.toggle(
            "sidebar-open",
            sidebar.classList.contains("show")
          );
        });
      }

      if (dashboardToggle) {
        dashboardToggle.addEventListener("click", () => {
          document.body.classList.toggle(
            "dashboard-open",
            dashboardPanel.classList.contains("show")
          );
        });
      }
    }
  }

  // Call functions
  fixTaskDisplay();
  setupMobileNavigation();

  // Fix task display when window is resized
  window.addEventListener("resize", fixTaskDisplay);

  // Fix task display after tasks are rendered
  // This assumes you have a function that renders tasks
  const originalRenderTasks = window.renderTasks;
  if (typeof originalRenderTasks === "function") {
    window.renderTasks = function () {
      originalRenderTasks.apply(this, arguments);
      setTimeout(fixTaskDisplay, 100);
    };
  }
});
