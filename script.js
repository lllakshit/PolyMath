document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const appContainer = document.querySelector(".app-container"); // Main container
  const modal = document.getElementById("task-modal");
  const closeModalBtn = modal.querySelector(".close-btn");
  const cancelModalBtn = modal.querySelector(".cancel-btn");
  const taskForm = document.getElementById("task-form");
  const modalTitle = document.getElementById("modal-title");
  const taskIdInput = document.getElementById("task-id");
  const deleteTaskBtn = document.getElementById("delete-task-btn");
  const taskHistoryView = document.getElementById("task-history-view");
  const taskHistoryItemsUl = document.getElementById("task-history-items");

  // Desktop Specific
  const sidebar = document.querySelector(".sidebar"); // Reference sidebar itself
  const createTaskBtnDesktop = document.getElementById(
    "create-task-btn-desktop"
  );
  const disciplineList = document.getElementById("discipline-list");
  const unscheduledTasksListSidebar = document.getElementById(
    "unscheduled-tasks-list-sidebar"
  );
  const taskHistoryListSidebar = document.getElementById(
    "task-history-list-sidebar"
  );

  // Mobile Specific
  const mobileTabsContainer = document.querySelector(".mobile-tabs");
  const tabButtons = document.querySelectorAll(".tab-button");
  const fabCreateTaskBtn = document.getElementById("fab-create-task");
  const unscheduledTasksListMobile = document.getElementById(
    "unscheduled-tasks-list-mobile"
  );
  const taskHistoryListMobile = document.getElementById(
    "task-history-list-mobile"
  );

  // Shared / Panel Content Elements
  const mainContent = document.querySelector(".main-content"); // Container for panels on mobile
  const tabPanels = document.querySelectorAll(".tab-panel");
  const schedulerPanel = document.getElementById("tab-panel-schedule");
  const dashboardPanel = document.getElementById("tab-panel-dashboard");
  const unscheduledPanel = document.getElementById("tab-panel-unscheduled");
  const historyPanel = document.getElementById("tab-panel-history");

  // Scheduler Elements (inside schedule panel)
  const scheduledTasksList = document.getElementById("scheduled-tasks-list");
  const currentDateDisplay = document.getElementById("current-date-display");
  const timelineDateSpan = document.getElementById("timeline-date");
  const prevDayBtn = document.getElementById("prev-day-btn");
  const nextDayBtn = document.getElementById("next-day-btn");
  const todayBtn = document.getElementById("today-btn");

  // Dashboard Elements (inside dashboard panel)
  const timePerSubjectUl = document.getElementById("time-per-subject");
  const subjectProgressBarsDiv = document.getElementById(
    "subject-progress-bars"
  );
  const focusChartCanvas = document.getElementById("focus-chart");
  const upcomingTasksUl = document.getElementById("upcoming-tasks");
  const summaryWellTextarea = document.getElementById("summary-well");
  const summaryBlockersTextarea = document.getElementById("summary-blockers");
  const summaryNextTextarea = document.getElementById("summary-next");
  const generateSummaryBtn = document.getElementById("generate-summary-btn");
  const generatedSummaryOutput = document.getElementById(
    "generated-summary-output"
  );
  const exportJsonBtn = document.getElementById("export-json-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");

  // Combined Create Task Buttons
  const createTaskBtns = document.querySelectorAll(".create-task-btn"); // FAB + Desktop Button

  // --- State ---
  let tasks = []; // Array to hold all task objects { id: '...', history: [{...}, {...}] }
  let currentViewDate = new Date(); // Date currently shown in the scheduler
  let draggedTaskId = null;
  let focusChartInstance = null;
  let currentActiveTabSelector = "#tab-panel-schedule"; // Default active tab selector
  let isMobileView = window.innerWidth <= 768; // Initial check

  // --- Constants ---
  const LOCAL_STORAGE_KEY = "learningTasksData";
  const DISCIPLINES = [
    "AI/ML",
    "Quantum Computing",
    "Physics",
    "Math",
    "Content Creation",
    "Freelancing",
    "Other",
  ]; // Keep in sync with HTML

  // ========================================
  // Initialization
  // ========================================
  function init() {
    console.log("Initializing App...");
    loadTasks();
    setupEventListeners();
    checkAndUpdateView(); // Initial render based on screen size
  }

  // Checks screen size and triggers appropriate UI rendering
  function checkAndUpdateView() {
    isMobileView = window.innerWidth <= 768; // Update view flag
    console.log("checkAndUpdateView - isMobileView:", isMobileView);
    renderUI();
  }

  // Main UI Rendering Orchestrator
  function renderUI() {
    console.log("renderUI called. Mobile:", isMobileView);
    // Always render potentially visible components
    renderSchedulerForDate(currentViewDate); // Render schedule content
    renderDashboard(); // Render dashboard content

    if (isMobileView) {
      // Mobile specific rendering
      activateTab(currentActiveTabSelector); // Ensure correct tab is shown
      // Render content for *potentially* visible mobile tabs (even if not active immediately)
      renderMobileUnscheduledTasks();
      renderMobileHistoryTasks();
    } else {
      // Desktop specific rendering
      // Ensure all panels are visible on desktop
      tabPanels.forEach((panel) => (panel.style.display = "block"));
      renderDesktopSidebarLists();
    }
    // Note: renderSchedulerForDate and renderDashboard are called regardless
    // because their containers exist in both mobile panels and desktop main content.
  }

  // ========================================
  // localStorage Functions
  // ========================================
  function saveTasks() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
      console.log("Tasks saved to localStorage.");
    } catch (e) {
      console.error("Error saving tasks to localStorage:", e);
      alert("Could not save tasks. LocalStorage might be full or disabled.");
    }
  }

  function loadTasks() {
    const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        // Basic validation
        if (
          Array.isArray(parsedTasks) &&
          !parsedTasks.some((t) => !t || !t.id || !Array.isArray(t.history))
        ) {
          tasks = parsedTasks;
          // Ensure history array exists if missing from old data (migration)
          tasks.forEach((task) => {
            if (!Array.isArray(task.history)) {
              console.warn(
                `Task ${task.id} missing history array, attempting migration.`
              );
              // Assuming the object itself was the only history entry
              const taskData = { ...task };
              delete taskData.id; // Don't store id within history array entry
              delete taskData.history; // Remove circular ref
              task.history = [taskData]; // Create history array
            }
          });
          console.log("Tasks loaded from localStorage:", tasks.length);
        } else {
          console.warn(
            "Invalid task structure found in localStorage. Resetting."
          );
          tasks = [];
          saveTasks(); // Clear invalid storage
        }
      } catch (e) {
        console.error("Error parsing tasks from localStorage:", e);
        tasks = []; // Reset if parsing fails
      }
    } else {
      tasks = []; // Initialize if nothing is stored
      console.log("No tasks found in localStorage, initializing empty array.");
    }
    // Ensure task IDs are present (migration)
    tasks = tasks.map((task) => ({
      id: task.id || generateUniqueId(), // Assign ID if missing
      history: task.history || [], // Ensure history array exists
    }));
  }

  // ========================================
  // Task Utility Functions
  // ========================================
  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  // Gets the latest non-deleted version of a task
  function getLatestTaskVersion(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.history || task.history.length === 0) return null;
    // Iterate backwards through history
    for (let i = task.history.length - 1; i >= 0; i--) {
      if (task.history[i] && !task.history[i].deleted) {
        // Return a copy, adding the task ID and history index for reference
        return { ...task.history[i], id: task.id, historyId: i };
      }
    }
    return null; // All versions are deleted or history is malformed
  }

  // Gets all currently active (not deleted) tasks
  function getAllActiveTasks() {
    return tasks
      .map((task) => getLatestTaskVersion(task.id))
      .filter((task) => task !== null);
  }

  // Gets the full history log, newest first
  function getAllTaskHistory() {
    let flatHistory = [];
    tasks.forEach((task) => {
      if (task.history) {
        task.history.forEach((version, index) => {
          flatHistory.push({
            taskId: task.id,
            historyIndex: index,
            timestamp: version.timestamp,
            ...version, // Spread the rest of the version data
          });
        });
      }
    });
    return flatHistory.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
  }

  // ========================================
  // Task CRUD Operations
  // ========================================
  function createTask(taskData) {
    const newTask = {
      id: generateUniqueId(),
      history: [
        {
          timestamp: Date.now(),
          ...taskData,
          deleted: false,
        },
      ],
    };
    tasks.push(newTask);
    console.log(`Task created: ${newTask.id}, Title: ${taskData.title}`);
    saveTasks();
    renderUI(); // Refresh UI
    closeModal();
  }

  function updateTask(taskId, updatedData) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.error("Task not found for update:", taskId);
      return;
    }
    // Ensure history exists before pushing
    if (!tasks[taskIndex].history) {
      tasks[taskIndex].history = [];
    }
    tasks[taskIndex].history.push({
      timestamp: Date.now(),
      ...updatedData,
      deleted: false,
    });
    console.log(`Task updated: ${taskId}, Title: ${updatedData.title}`);
    saveTasks();
    renderUI(); // Refresh UI
    closeModal();
  }

  function deleteTask(taskId) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.error("Task not found for deletion:", taskId);
      return;
    }

    const latestVersion = getLatestTaskVersion(taskId);
    if (!latestVersion) {
      console.warn("Task already deleted or no active versions:", taskId);
      closeModal();
      return;
    }

    console.log(`Attempting to delete task: ${taskId}`);

    const deletionRecord = {
      ...latestVersion,
      timestamp: Date.now(),
      deleted: true,
    };
    delete deletionRecord.id; // Remove redundant fields before storing in history
    delete deletionRecord.historyId;

    if (!tasks[taskIndex].history) {
      tasks[taskIndex].history = [];
    } // Ensure history array exists
    tasks[taskIndex].history.push(deletionRecord);
    saveTasks();
    renderUI(); // Refresh UI
    closeModal();
  }

  // ========================================
  // Rendering Functions
  // ========================================

  // --- Schedule Panel Rendering ---
  function navigateToDate(date) {
    // Ensure date is valid before proceeding
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error("Invalid date passed to navigateToDate:", date);
      date = new Date(); // Default to today if invalid
    }
    currentViewDate = new Date(date);
    currentViewDate.setHours(0, 0, 0, 0);

    const formattedDate = formatDate(currentViewDate);
    currentDateDisplay.textContent = formattedDate;
    timelineDateSpan.textContent = formattedDate; // Update span in timeline header

    renderSchedulerForDate(currentViewDate);
  }

  function renderSchedulerForDate(date) {
    if (!scheduledTasksList) {
      console.error("Scheduled tasks list element not found.");
      return;
    }
    scheduledTasksList.innerHTML = ""; // Clear current list

    const isoDateString = formatDateISO(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeTasks = getAllActiveTasks();

    console.log(`Rendering schedule for date: ${isoDateString}`);

    activeTasks.forEach((task) => {
      if (task.scheduledDate === isoDateString) {
        const taskElement = createTaskElement(task); // Create the element
        scheduledTasksList.appendChild(taskElement); // Append it
        // Add overdue class if needed
        if (
          task.scheduledDate &&
          new Date(task.scheduledDate + "T00:00:00") < today
        ) {
          taskElement.classList.add("overdue");
        }
      }
    });
    // Add drag listeners specifically to the tasks just rendered in this list
    addDragListenersToTasks(scheduledTasksList);
  }

  // --- Desktop Sidebar List Rendering ---
  function renderDesktopSidebarLists() {
    renderSidebarUnscheduledTasks();
    renderSidebarHistoryTasks();
  }

  function renderSidebarUnscheduledTasks() {
    if (!unscheduledTasksListSidebar) return; // Check if element exists
    unscheduledTasksListSidebar.innerHTML = "";
    const activeTasks = getAllActiveTasks();
    activeTasks.forEach((task) => {
      if (!task.scheduledDate) {
        const taskElement = createTaskElement(task);
        unscheduledTasksListSidebar.appendChild(taskElement);
      }
    });
    addDragListenersToTasks(unscheduledTasksListSidebar);
  }

  function renderSidebarHistoryTasks() {
    if (!taskHistoryListSidebar) return;
    taskHistoryListSidebar.innerHTML = "";
    const recentHistory = getAllTaskHistory().slice(0, 15); // Show latest 15 changes
    recentHistory.forEach((entry) => {
      const div = createHistoryElement(entry);
      taskHistoryListSidebar.appendChild(div);
    });
  }

  // --- Mobile Tab Panel Rendering ---
  function renderMobileUnscheduledTasks() {
    if (!unscheduledTasksListMobile) return;
    unscheduledTasksListMobile.innerHTML = "";
    const activeTasks = getAllActiveTasks();
    activeTasks.forEach((task) => {
      if (!task.scheduledDate) {
        const taskElement = createTaskElement(task);
        unscheduledTasksListMobile.appendChild(taskElement);
      }
    });
    addDragListenersToTasks(unscheduledTasksListMobile);
  }

  function renderMobileHistoryTasks() {
    if (!taskHistoryListMobile) return;
    taskHistoryListMobile.innerHTML = "";
    const fullHistory = getAllTaskHistory(); // Show full history
    if (fullHistory.length === 0) {
      taskHistoryListMobile.innerHTML =
        '<p style="padding: 10px; text-align: center; color: #777;">No task history yet.</p>';
    } else {
      fullHistory.forEach((entry) => {
        const div = createHistoryElement(entry);
        taskHistoryListMobile.appendChild(div);
      });
    }
    // Note: Pagination/lazy loading might be needed for very long histories
  }

  // --- Dashboard Panel Rendering ---
  function renderDashboard() {
    const activeTasks = getAllActiveTasks();
    renderTimePerSubject(activeTasks);
    renderFocusChart(activeTasks);
    renderUpcomingTasks(activeTasks);
    // Note: Weekly summary is user input, no render needed beyond initial HTML
  }

  function renderTimePerSubject(tasks) {
    if (!timePerSubjectUl || !subjectProgressBarsDiv) return;
    const timeMap = {};
    DISCIPLINES.forEach((cat) => (timeMap[cat] = 0));
    tasks.forEach((task) => {
      if (task.category && task.estTime > 0) {
        timeMap[task.category] = (timeMap[task.category] || 0) + task.estTime;
      }
    });
    timePerSubjectUl.innerHTML = "";
    subjectProgressBarsDiv.innerHTML = "";
    let totalEstTime = Object.values(timeMap).reduce(
      (sum, time) => sum + time,
      0
    );
    let contentAdded = false;
    Object.entries(timeMap).forEach(([category, time]) => {
      if (time > 0) {
        contentAdded = true;
        const li = document.createElement("li");
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        li.innerHTML = `<strong>${escapeHTML(
          category
        )}:</strong> ${hours}h ${minutes}m`;
        timePerSubjectUl.appendChild(li);
        const percentage =
          totalEstTime > 0 ? ((time / totalEstTime) * 100).toFixed(1) : 0;
        const barContainer = document.createElement("div");
        barContainer.classList.add("progress-bar-container");
        barContainer.innerHTML = `<span class="progress-bar-label">${escapeHTML(
          category
        )} (${percentage}%)</span><div class="progress-bar"><div class="progress-bar-fill" style="width: ${percentage}%;">${
          percentage > 15 ? `${hours}h ${minutes}m` : ""
        }</div></div>`;
        subjectProgressBarsDiv.appendChild(barContainer);
      }
    });
    if (!contentAdded) {
      timePerSubjectUl.innerHTML = "<li>No estimated time logged.</li>";
    }
  }

  function renderFocusChart(tasks) {
    if (!focusChartCanvas) return;
    const focusCounts = { deep: 0, medium: 0, shallow: 0, unknown: 0 };
    let hasData = false;
    tasks.forEach((task) => {
      if (task.focus === "deep") focusCounts.deep++;
      else if (task.focus === "medium") focusCounts.medium++;
      else if (task.focus === "shallow") focusCounts.shallow++;
      else focusCounts.unknown++;
      if (task.focus) hasData = true;
    });
    if (!hasData && focusCounts.unknown === tasks.length)
      hasData = tasks.length > 0; // Consider "unknown" as data if tasks exist

    const chartData = {
      labels: ["Deep", "Medium", "Shallow", "Not Set"],
      datasets: [
        {
          label: "Focus Level",
          data: [
            focusCounts.deep,
            focusCounts.medium,
            focusCounts.shallow,
            focusCounts.unknown,
          ],
          backgroundColor: ["#e74c3c", "#f1c40f", "#3498db", "#bdc3c7"],
          borderWidth: 1,
        },
      ],
    };
    const ctx = focusChartCanvas.getContext("2d");
    try {
      if (focusChartInstance) {
        if (hasData) {
          focusChartInstance.data = chartData;
          focusChartInstance.update();
        } else {
          focusChartInstance.destroy();
          focusChartInstance = null;
          /* Clear canvas */ ctx.clearRect(
            0,
            0,
            ctx.canvas.width,
            ctx.canvas.height
          );
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "No focus data.",
            ctx.canvas.width / 2,
            ctx.canvas.height / 2
          );
        }
      } else if (hasData) {
        focusChartInstance = new Chart(ctx, {
          type: "doughnut",
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom", labels: { padding: 15 } },
            },
          },
        });
      } else {
        /* Clear canvas if no instance and no data */ ctx.clearRect(
          0,
          0,
          ctx.canvas.width,
          ctx.canvas.height
        );
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "No focus data.",
          ctx.canvas.width / 2,
          ctx.canvas.height / 2
        );
      }
    } catch (error) {
      console.error("Error rendering focus chart:", error);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "red";
      ctx.fillText("Chart Error", ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
  }

  function renderUpcomingTasks(tasks) {
    if (!upcomingTasksUl) return;
    upcomingTasksUl.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const upcoming = tasks
      .filter((task) => task.scheduledDate && isValidDate(task.scheduledDate))
      .map((task) => ({
        ...task,
        dateObj: new Date(task.scheduledDate + "T00:00:00"),
      }))
      .filter(
        (task) =>
          !isNaN(task.dateObj) &&
          task.dateObj >= today &&
          task.dateObj < nextWeek
      )
      .sort((a, b) => a.dateObj - b.dateObj);
    if (upcoming.length === 0) {
      upcomingTasksUl.innerHTML =
        "<li>No tasks scheduled in the next 7 days.</li>";
      return;
    }
    upcoming.forEach((task) => {
      const li = document.createElement("li");
      let formattedDueDate = formatDate(task.dateObj);
      if (formattedDueDate === "Invalid Date")
        formattedDueDate = task.scheduledDate;
      li.innerHTML = `<strong>${escapeHTML(
        task.title
      )}</strong> - Due: ${formattedDueDate} (${escapeHTML(task.category)})`;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => openModalForEdit(task.id));
      upcomingTasksUl.appendChild(li);
    });
  }

  // --- Element Creation Helpers ---
  function createTaskElement(task) {
    const div = document.createElement("div");
    div.className = `task priority-${
      task.priority || "not-urgent-not-important"
    }`; // Use className for simplicity
    div.setAttribute("draggable", "true");
    div.setAttribute("data-task-id", task.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (
      task.scheduledDate &&
      new Date(task.scheduledDate + "T00:00:00") < today
    ) {
      div.classList.add("overdue");
    }

    let dueDateFormatted = "Unscheduled";
    if (task.scheduledDate) {
      dueDateFormatted = isValidDate(task.scheduledDate)
        ? `Due: ${formatDate(new Date(task.scheduledDate + "T00:00:00"))}`
        : "Due: Invalid Date";
    }

    div.innerHTML = `
          <h4>${escapeHTML(task.title || "No Title")}</h4>
          <p><strong>Category:</strong> ${escapeHTML(
            task.category || "N/A"
          )}</p>
          ${task.description ? `<p>${escapeHTML(task.description)}</p>` : ""}
          <div class="task-meta">
              <span>${task.estTime ? `Est: ${task.estTime} min` : ""}</span>
              <span>Focus: ${escapeHTML(task.focus || "N/A")}</span>
              <span>${dueDateFormatted}</span>
          </div>
          <div class="task-actions">
              <button class="btn edit-task-btn" aria-label="Edit Task"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn reschedule-task-btn" aria-label="Reschedule Task"><i class="fas fa-calendar-alt"></i> Reschedule</button>
          </div>
      `;

    // Add listeners directly here for edit/reschedule
    div.querySelector(".edit-task-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModalForEdit(task.id);
    });
    div.querySelector(".reschedule-task-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const currentScheduledDate =
        getLatestTaskVersion(task.id)?.scheduledDate || "";
      const newDateStr = prompt(
        `Reschedule "${task.title}"\nEnter new date (YYYY-MM-DD) or leave blank to unschedule:`,
        currentScheduledDate
      );
      if (newDateStr !== null) {
        const latestVersion = getLatestTaskVersion(task.id);
        if (!latestVersion) return;
        const updatedData = { ...latestVersion };
        delete updatedData.id;
        delete updatedData.historyId;
        const oldDate = updatedData.scheduledDate;
        if (newDateStr === "") {
          updatedData.scheduledDate = null;
        } else if (isValidDate(newDateStr)) {
          updatedData.scheduledDate = newDateStr;
        } else {
          alert("Invalid date format (YYYY-MM-DD).");
          return;
        }
        if (oldDate !== updatedData.scheduledDate) {
          updateTask(task.id, updatedData);
        }
      }
    });
    return div;
  }

  function createHistoryElement(entry) {
    const div = document.createElement("div");
    div.className = "task history-item"; // Reuse styles
    div.setAttribute("data-task-id", entry.taskId);
    let action = entry.deleted
      ? "Deleted"
      : entry.historyIndex === 0
      ? "Created"
      : "Updated";
    let title = entry.title || "N/A";
    let dateInfo = entry.scheduledDate
      ? ` on ${entry.scheduledDate}`
      : " (unscheduled)";
    if (entry.deleted) dateInfo = "";
    div.innerHTML = `<p><strong>${action}:</strong> ${escapeHTML(
      title
    )}${dateInfo}</p><div class="task-meta"><span>${new Date(
      entry.timestamp
    ).toLocaleString()}</span></div>`;
    div.addEventListener("click", () => openModalForEdit(entry.taskId));
    return div;
  }

  // ========================================
  // Modal Handling
  // ========================================
  function openModalForCreate(category = "") {
    modalTitle.textContent = "Create New Task";
    taskForm.reset();
    taskIdInput.value = "";
    deleteTaskBtn.style.display = "none";
    taskHistoryView.style.display = "none";
    taskHistoryItemsUl.innerHTML = "";
    if (category && DISCIPLINES.includes(category)) {
      document.getElementById("task-category").value = category;
    }
    // Set default priority if needed
    const defaultPriority = taskForm.querySelector(
      'input[name="priority"][value="not-urgent-important"]'
    );
    if (defaultPriority) defaultPriority.checked = true;

    modal.style.display = "block";
    document.getElementById("task-title").focus();
  }

  function openModalForEdit(taskId) {
    const task = getLatestTaskVersion(taskId);
    if (!task) {
      alert("Task not found or deleted.");
      return;
    }
    modalTitle.textContent = "Edit Task";
    taskForm.reset();
    taskIdInput.value = task.id;
    document.getElementById("task-title").value = task.title || "";
    document.getElementById("task-category").value = task.category || "";
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-est-time").value = task.estTime || "";
    document.getElementById("task-scheduled-date").value =
      task.scheduledDate || "";
    document.getElementById("task-focus").value = task.focus || "";
    let prioritySet = false;
    taskForm.querySelectorAll('input[name="priority"]').forEach((radio) => {
      radio.checked = radio.value === task.priority;
      if (radio.checked) prioritySet = true;
    });
    if (!prioritySet) {
      taskForm.querySelector(
        'input[name="priority"][value="not-urgent-not-important"]'
      ).checked = true;
    }
    deleteTaskBtn.style.display = "inline-block";
    renderTaskHistoryInModal(taskId);
    taskHistoryView.style.display = "block";
    modal.style.display = "block";
  }

  function renderTaskHistoryInModal(taskId) {
    taskHistoryItemsUl.innerHTML = "";
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.history) return;
    [...task.history].reverse().forEach((version, index) => {
      const li = document.createElement("li");
      const timestamp = new Date(version.timestamp).toLocaleString();
      let changeDesc = version.deleted
        ? "Deleted"
        : index === task.history.length - 1
        ? "Created"
        : "Updated";
      li.innerHTML = `<strong>${timestamp}:</strong> ${changeDesc} - ${escapeHTML(
        version.title || "N/A"
      )}`;
      taskHistoryItemsUl.appendChild(li);
    });
  }

  function closeModal() {
    modal.style.display = "none";
    taskForm.reset();
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const taskId = taskIdInput.value;
    const taskData = {
      title: document.getElementById("task-title").value.trim(),
      category: document.getElementById("task-category").value,
      description: document.getElementById("task-description").value.trim(),
      estTime:
        parseInt(document.getElementById("task-est-time").value, 10) || null,
      scheduledDate:
        document.getElementById("task-scheduled-date").value || null,
      priority:
        taskForm.querySelector('input[name="priority"]:checked')?.value ||
        "not-urgent-not-important",
      focus: document.getElementById("task-focus").value,
    };
    if (!taskData.title || !taskData.category || !taskData.focus) {
      alert("Title, Category, and Focus Level are required.");
      return;
    }
    if (taskData.scheduledDate && !isValidDate(taskData.scheduledDate)) {
      alert("Invalid date format (YYYY-MM-DD).");
      return;
    }
    console.log("Form Submit Data:", taskData);
    if (taskId) {
      updateTask(taskId, taskData);
    } else {
      createTask(taskData);
    }
  }

  // ========================================
  // Drag and Drop (No changes needed if structure is sound)
  // ========================================
  function addDragListenersToTasks(containerElement) {
    if (!containerElement) return;
    containerElement
      .querySelectorAll('.task[draggable="true"]')
      .forEach(addDragListenersToTask);
  }
  function addDragListenersToTask(taskElement) {
    taskElement.addEventListener("dragstart", handleDragStart);
    taskElement.addEventListener("dragend", handleDragEnd);
    taskElement.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    taskElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    taskElement.addEventListener("touchend", handleTouchEnd);
  }
  function handleDragStart(e) {
    const taskElement = e.target.closest(".task");
    if (!taskElement) return;
    draggedTaskId = taskElement.dataset.taskId;
    try {
      e.dataTransfer.setData("text/plain", draggedTaskId);
      e.dataTransfer.effectAllowed = "move";
    } catch (err) {
      console.error("DragStart Error:", err);
    }
    setTimeout(() => taskElement.classList.add("dragging"), 0);
  }
  function handleDragEnd(e) {
    const taskElement = e.target.closest(".task");
    if (taskElement) taskElement.classList.remove("dragging");
    draggedTaskId = null;
    document
      .querySelectorAll(".drop-zone.drag-over")
      .forEach((zone) => zone.classList.remove("drag-over"));
  } // Ensure hover removed
  function handleDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    const dropZone = e.target.closest(".drop-zone");
    if (dropZone && !dropZone.classList.contains("drag-over")) {
      document
        .querySelectorAll(".drop-zone.drag-over")
        .forEach((zone) => zone.classList.remove("drag-over"));
      dropZone.classList.add("drag-over");
    }
  }
  function handleDragLeave(e) {
    const dropZone = e.target.closest(".drop-zone");
    if (dropZone && (!e.relatedTarget || !dropZone.contains(e.relatedTarget))) {
      dropZone.classList.remove("drag-over");
    }
  }
  function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target.closest(".drop-zone");
    if (!dropZone) return;
    dropZone.classList.remove("drag-over");
    let taskIdToDrop = null;
    try {
      taskIdToDrop = e.dataTransfer.getData("text/plain");
    } catch (err) {}
    if (!taskIdToDrop && draggedTaskId) {
      taskIdToDrop = draggedTaskId;
    }
    if (!taskIdToDrop) {
      console.error("No task ID found on drop.");
      draggedTaskId = null;
      return;
    }
    const task = getLatestTaskVersion(taskIdToDrop);
    if (!task) {
      console.error(`Task data not found for dropped ID: ${taskIdToDrop}`);
      draggedTaskId = null;
      return;
    }
    const targetDate = dropZone.dataset.date;
    const updatedData = { ...task };
    delete updatedData.id;
    delete updatedData.historyId;
    const oldDate = updatedData.scheduledDate;
    updatedData.scheduledDate =
      targetDate === "unscheduled" ? null : targetDate;
    if (oldDate !== updatedData.scheduledDate) {
      updateTask(taskIdToDrop, updatedData);
    } // updateTask calls renderUI
    draggedTaskId = null;
  }
  // --- Touch Handlers ---
  let touchStartX, touchStartY;
  let draggedElement = null;
  let isDragging = false;
  function handleTouchStart(e) {
    draggedElement = e.target.closest(".task");
    if (!draggedElement) return;
    draggedTaskId = draggedElement.dataset.taskId;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isDragging = false;
  }
  function handleTouchMove(e) {
    if (!draggedElement || !draggedTaskId) return;
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY);
    const deltaX = Math.abs(touch.clientX - touchStartX);
    if (!isDragging && (deltaY > 10 || deltaX > 10)) {
      isDragging = true;
      draggedElement.classList.add("dragging");
    }
    if (isDragging) {
      e.preventDefault();
      draggedElement.style.visibility = "hidden";
      const elementUnderTouch = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      );
      draggedElement.style.visibility = "visible";
      const dropZone = elementUnderTouch
        ? elementUnderTouch.closest(".drop-zone")
        : null;
      document.querySelectorAll(".drop-zone").forEach((zone) => {
        zone.classList.toggle("drag-over", zone === dropZone);
      });
    }
  }
  function handleTouchEnd(e) {
    if (!draggedElement || !draggedTaskId || !isDragging) {
      if (draggedElement) draggedElement.classList.remove("dragging");
      draggedElement = null;
      draggedTaskId = null;
      isDragging = false;
      document
        .querySelectorAll(".drop-zone.drag-over")
        .forEach((zone) => zone.classList.remove("drag-over"));
      return;
    }
    const dropZone = document.querySelector(".drop-zone.drag-over");
    if (dropZone) {
      const taskId = draggedTaskId;
      const task = getLatestTaskVersion(taskId);
      if (task) {
        const targetDate = dropZone.dataset.date;
        const updatedData = { ...task };
        delete updatedData.id;
        delete updatedData.historyId;
        const oldDate = updatedData.scheduledDate;
        updatedData.scheduledDate =
          targetDate === "unscheduled" ? null : targetDate;
        if (oldDate !== updatedData.scheduledDate) {
          updateTask(taskId, updatedData);
        }
      }
    }
    draggedElement.classList.remove("dragging");
    draggedElement = null;
    draggedTaskId = null;
    isDragging = false;
    document
      .querySelectorAll(".drop-zone.drag-over")
      .forEach((zone) => zone.classList.remove("drag-over"));
  }

  // ========================================
  // Tab Switching
  // ========================================
  function activateTab(targetPanelSelector) {
    if (!targetPanelSelector) {
      console.warn("activateTab called with no target selector.");
      return;
    }
    console.log("Activating tab:", targetPanelSelector);

    // Update buttons state
    tabButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.tabTarget === targetPanelSelector
      );
    });

    // Update panels visibility
    let panelFound = false;
    tabPanels.forEach((panel) => {
      const panelId = `#${panel.id}`;
      const isActive = panelId === targetPanelSelector;
      panel.classList.toggle("active", isActive); // Use class for display
      if (isActive) {
        panelFound = true;
        // Scroll main content area to top when tab changes
        if (mainContent) mainContent.scrollTop = 0;
      }
    });

    if (!panelFound) {
      console.error(
        `Target panel not found for selector: ${targetPanelSelector}`
      );
      // Optionally activate a default tab if target is invalid
      // activateTab('#tab-panel-schedule');
      return;
    }

    currentActiveTabSelector = targetPanelSelector; // Store the current active tab

    // Trigger specific rendering for the activated tab if needed
    // (This ensures content is fresh when tab is selected)
    switch (targetPanelSelector) {
      case "#tab-panel-schedule":
        navigateToDate(currentViewDate); // Re-render current date's schedule
        break;
      case "#tab-panel-unscheduled":
        renderMobileUnscheduledTasks();
        break;
      case "#tab-panel-dashboard":
        renderDashboard(); // Re-render dashboard charts/lists
        break;
      case "#tab-panel-history":
        renderMobileHistoryTasks();
        break;
    }
  }

  // ========================================
  // Export & Utilities
  // ========================================
  function generateWeeklySummary() {
    /* Keep as is */
  }
  function exportToJson() {
    /* Keep as is */
  }
  function exportToCsv() {
    /* Keep as is */
  }
  function escapeCsvField(field) {
    /* Keep as is */
  }
  function escapeHTML(str) {
    /* Keep as is */
  }
  function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = new Date(date + "T00:00:00");
        if (isNaN(date)) return "Invalid Date";
      } else {
        return "Invalid Date";
      }
    }
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  function formatDateISO(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      return "";
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString + "T00:00:00Z");
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
  }

  // ========================================
  // Event Listeners Setup
  // ========================================
  function setupEventListeners() {
    console.log("Setting up event listeners...");
    // Create Task Buttons (Desktop + Mobile FAB)
    createTaskBtns.forEach((btn) => {
      btn?.addEventListener("click", () => openModalForCreate());
    });

    // Modal Listeners
    closeModalBtn?.addEventListener("click", closeModal);
    cancelModalBtn?.addEventListener("click", closeModal);
    taskForm?.addEventListener("submit", handleFormSubmit);
    deleteTaskBtn?.addEventListener("click", () => {
      const taskId = taskIdInput.value;
      if (
        taskId &&
        confirm(
          "Are you sure you want to delete this task? Its history will be kept."
        )
      ) {
        deleteTask(taskId);
      } else if (!taskId) {
        console.error("Delete button clicked but no Task ID found in modal.");
      }
    });
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    }); // Close modal on overlay click

    // Scheduler Navigation
    prevDayBtn?.addEventListener("click", () => {
      const d = new Date(currentViewDate);
      d.setDate(d.getDate() - 1);
      navigateToDate(d);
    });
    nextDayBtn?.addEventListener("click", () => {
      const d = new Date(currentViewDate);
      d.setDate(d.getDate() + 1);
      navigateToDate(d);
    });
    todayBtn?.addEventListener("click", () => {
      navigateToDate(new Date());
    });

    // Drag/Drop Zones (Initial attachment - more might be needed after dynamic rendering)
    // Re-attach listeners to drop zones more dynamically if needed after rendering
    document.querySelectorAll(".drop-zone").forEach((zone) => {
      zone.addEventListener("dragover", handleDragOver);
      zone.addEventListener("dragleave", handleDragLeave);
      zone.addEventListener("drop", handleDrop);
      zone.addEventListener("touchmove", handleTouchMove, { passive: false });
      zone.addEventListener("touchend", handleTouchEnd);
    });

    // Desktop Sidebar Discipline Clicks
    disciplineList?.addEventListener("click", (e) => {
      const listItem = e.target.closest("li");
      if (listItem && listItem.dataset.category) {
        openModalForCreate(listItem.dataset.category);
      }
    });

    // Dashboard Actions
    generateSummaryBtn?.addEventListener("click", generateWeeklySummary);
    exportJsonBtn?.addEventListener("click", exportToJson);
    exportCsvBtn?.addEventListener("click", exportToCsv);

    // Mobile Tab Button Listeners
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetPanelSelector = button.dataset.tabTarget;
        if (targetPanelSelector) {
          activateTab(targetPanelSelector);
        }
      });
    });

    // Resize Listener (Debounced)
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkAndUpdateView, 250); // Re-check view on resize
    });

    console.log("Event listeners setup complete.");
  }

  // --- Start the application ---
  init();
}); // End DOMContentLoaded
