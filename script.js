document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  // (Assuming IDs from previous HTML are correct)
  const modal = document.getElementById("task-modal");
  const closeModalBtn = modal.querySelector(".close-btn");
  const cancelModalBtn = modal.querySelector(".cancel-btn");
  const taskForm = document.getElementById("task-form");
  const modalTitle = document.getElementById("modal-title");
  const taskIdInput = document.getElementById("task-id");
  const taskTitleInput = document.getElementById("task-title"); // Specific reference for title
  const taskCategorySelect = document.getElementById("task-category");
  const taskDescriptionTextarea = document.getElementById("task-description");
  const taskEstTimeInput = document.getElementById("task-est-time");
  const taskScheduledDateInput = document.getElementById("task-scheduled-date");
  const taskFocusSelect = document.getElementById("task-focus");
  const deleteTaskBtn = document.getElementById("delete-task-btn");
  const taskHistoryView = document.getElementById("task-history-view");
  const taskHistoryItemsUl = document.getElementById("task-history-items");

  // Desktop Specific
  const sidebar = document.querySelector(".sidebar");
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
  const mainContent = document.querySelector(".main-content");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const schedulerPanel = document.getElementById("tab-panel-schedule"); // Needed? maybe not directly
  const dashboardPanel = document.getElementById("tab-panel-dashboard"); // Needed? maybe not directly

  // Scheduler Elements
  const scheduledTasksList = document.getElementById("scheduled-tasks-list");
  const currentDateDisplay = document.getElementById("current-date-display");
  const timelineDateSpan = document.getElementById("timeline-date");
  const prevDayBtn = document.getElementById("prev-day-btn");
  const nextDayBtn = document.getElementById("next-day-btn");
  const todayBtn = document.getElementById("today-btn");

  // Dashboard Elements
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
  const createTaskBtns = document.querySelectorAll(".create-task-btn");

  // --- State ---
  let tasks = [];
  let currentViewDate = new Date(); // Use local time for view date
  let draggedTaskId = null;
  let focusChartInstance = null;
  let currentActiveTabSelector = "#tab-panel-schedule";
  let isMobileView = window.innerWidth <= 768;

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
  ];

  // ========================================
  // Initialization
  // ========================================
  function init() {
    console.log("Initializing App...");
    loadTasks();
    setupEventListeners();
    checkAndUpdateView(); // Initial render
  }

  function checkAndUpdateView() {
    isMobileView = window.innerWidth <= 768;
    console.log("checkAndUpdateView - isMobileView:", isMobileView);
    renderUI();
  }

  // Main UI Rendering Orchestrator
  function renderUI() {
    console.log("renderUI called. Mobile:", isMobileView);
    // Core content render calls
    renderSchedulerForDate(currentViewDate); // Always render current schedule view
    renderDashboard(); // Always render dashboard data

    if (isMobileView) {
      activateTab(currentActiveTabSelector, false); // Activate tab without triggering recursive render
      renderMobileUnscheduledTasks(); // Render mobile unscheduled list
      renderMobileHistoryTasks(); // Render mobile history list
    } else {
      // Ensure all panels are visible on desktop
      tabPanels.forEach((panel) => {
        if (panel) panel.style.display = "block";
      });
      renderDesktopSidebarLists(); // Render desktop sidebar lists
    }
    console.log("renderUI complete.");
  }

  // ========================================
  // localStorage Functions
  // ========================================
  function saveTasks() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
      console.log(`Tasks saved. Count: ${tasks.length}`);
    } catch (e) {
      console.error("Error saving tasks:", e); /* Alert omitted for brevity */
    }
  }

  function loadTasks() {
    const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        if (
          Array.isArray(parsedTasks) &&
          !parsedTasks.some((t) => !t || !t.id || !Array.isArray(t.history))
        ) {
          tasks = parsedTasks;
          tasks.forEach((task) => {
            // Migration/Validation
            task.id = task.id || generateUniqueId();
            if (!Array.isArray(task.history)) {
              console.warn(`Task ${task.id} missing history, migrating.`);
              const taskData = { ...task };
              delete taskData.id;
              delete taskData.history;
              task.history = [taskData];
            }
          });
          console.log(`Tasks loaded: ${tasks.length}`);
        } else {
          console.warn("Invalid task structure in localStorage. Resetting.");
          tasks = [];
          saveTasks();
        }
      } catch (e) {
        console.error("Error parsing tasks:", e);
        tasks = [];
      }
    } else {
      tasks = [];
      console.log("No tasks found in localStorage.");
    }
  }

  // ========================================
  // Task Utility Functions
  // ========================================
  function generateUniqueId() {
    /* ... keep as is ... */
  }
  function getLatestTaskVersion(taskId) {
    /* ... keep as is ... */
  }
  function getAllActiveTasks() {
    /* ... keep as is ... */
  }
  function getAllTaskHistory() {
    /* ... keep as is ... */
  }

  // ========================================
  // Task CRUD Operations
  // ========================================
  function createTask(taskData) {
    // Ensure essential data is present
    if (!taskData || !taskData.title) {
      console.error("Cannot create task: Missing data or title.");
      return;
    }
    const newTask = {
      id: generateUniqueId(),
      history: [{ timestamp: Date.now(), ...taskData, deleted: false }],
    };
    tasks.push(newTask);
    console.log(`Task created: ${newTask.id}, Title: ${taskData.title}`);
    saveTasks();
    renderUI(); // Refresh UI
    closeModal();
  }

  function updateTask(taskId, updatedData) {
    // Ensure essential data is present
    if (!updatedData || !updatedData.title) {
      console.error(`Cannot update task ${taskId}: Missing data or title.`);
      return;
    }
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.error("Update failed: Task not found:", taskId);
      return;
    }
    if (!tasks[taskIndex].history) tasks[taskIndex].history = []; // Ensure history array

    tasks[taskIndex].history.push({
      timestamp: Date.now(),
      ...updatedData,
      deleted: false,
    });
    console.log(`Task updated: ${taskId}, New Title: ${updatedData.title}`);
    saveTasks();
    renderUI(); // Refresh UI
    closeModal();
  }

  function deleteTask(taskId) {
    if (!taskId) {
      console.error("Delete failed: No taskId provided.");
      return;
    }
    console.log(`Attempting to delete task: ${taskId}`); // Debug log
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.error("Delete failed: Task not found:", taskId);
      closeModal();
      return;
    }

    const latestVersion = getLatestTaskVersion(taskId);
    if (!latestVersion) {
      console.warn("Task already deleted or no active versions:", taskId);
      closeModal();
      return;
    }

    const deletionRecord = {
      ...latestVersion,
      timestamp: Date.now(),
      deleted: true,
    };
    delete deletionRecord.id;
    delete deletionRecord.historyId;

    if (!tasks[taskIndex].history) tasks[taskIndex].history = [];
    tasks[taskIndex].history.push(deletionRecord);
    console.log(`Task marked as deleted: ${taskId}`);
    saveTasks();
    renderUI(); // Refresh UI
    closeModal();
  }

  // ========================================
  // Rendering Functions
  // ========================================

  // --- Schedule Panel Rendering ---
  function navigateToDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date();
    } // Default to today if invalid
    currentViewDate = new Date(date);
    currentViewDate.setHours(0, 0, 0, 0); // Normalize
    const formattedDate = formatDate(currentViewDate);
    if (currentDateDisplay) currentDateDisplay.textContent = formattedDate;
    if (timelineDateSpan) timelineDateSpan.textContent = formattedDate;
    renderSchedulerForDate(currentViewDate);
  }

  function renderSchedulerForDate(date) {
    if (!scheduledTasksList) return;
    scheduledTasksList.innerHTML = ""; // Clear previous
    const isoDateString = formatDateISO(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeTasks = getAllActiveTasks();
    console.log(
      `Rendering schedule for: ${isoDateString}. Found ${activeTasks.length} active tasks.`
    );

    activeTasks.forEach((task) => {
      // Strict comparison using the standardized ISO date string
      if (task.scheduledDate === isoDateString) {
        const taskElement = createTaskElement(task);
        scheduledTasksList.appendChild(taskElement);
        if (
          task.scheduledDate &&
          new Date(task.scheduledDate + "T00:00:00Z") < today
        ) {
          // Use Z for UTC comparison consistency
          taskElement.classList.add("overdue");
        }
      }
    });
    addDragListenersToTasks(scheduledTasksList);
  }

  // --- Desktop Sidebar List Rendering ---
  function renderDesktopSidebarLists() {
    renderSidebarUnscheduledTasks();
    renderSidebarHistoryTasks();
  }

  function renderSidebarUnscheduledTasks() {
    if (!unscheduledTasksListSidebar) return;
    unscheduledTasksListSidebar.innerHTML = "";
    getAllActiveTasks()
      .filter((task) => !task.scheduledDate)
      .forEach((task) => {
        unscheduledTasksListSidebar.appendChild(createTaskElement(task));
      });
    addDragListenersToTasks(unscheduledTasksListSidebar);
  }

  function renderSidebarHistoryTasks() {
    if (!taskHistoryListSidebar) return;
    taskHistoryListSidebar.innerHTML = "";
    getAllTaskHistory()
      .slice(0, 15)
      .forEach((entry) => {
        taskHistoryListSidebar.appendChild(createHistoryElement(entry));
      });
  }

  // --- Mobile Tab Panel Rendering ---
  function renderMobileUnscheduledTasks() {
    if (!unscheduledTasksListMobile) return;
    unscheduledTasksListMobile.innerHTML = "";
    const tasksToRender = getAllActiveTasks().filter(
      (task) => !task.scheduledDate
    );
    if (tasksToRender.length === 0) {
      unscheduledTasksListMobile.innerHTML =
        '<p style="padding: 15px; text-align: center; color: #777;">No unscheduled tasks.</p>';
    } else {
      tasksToRender.forEach((task) => {
        unscheduledTasksListMobile.appendChild(createTaskElement(task));
      });
    }
    addDragListenersToTasks(unscheduledTasksListMobile);
  }

  function renderMobileHistoryTasks() {
    if (!taskHistoryListMobile) return;
    taskHistoryListMobile.innerHTML = "";
    const fullHistory = getAllTaskHistory();
    if (fullHistory.length === 0) {
      taskHistoryListMobile.innerHTML =
        '<p style="padding: 15px; text-align: center; color: #777;">No task history yet.</p>';
    } else {
      fullHistory.forEach((entry) => {
        taskHistoryListMobile.appendChild(createHistoryElement(entry));
      });
    }
  }

  // --- Dashboard Panel Rendering (Keep sub-functions as before) ---
  function renderDashboard() {
    /* ... calls sub-renderers ... */
  }
  function renderTimePerSubject(tasks) {
    /* ... keep implementation ... */
  }
  function renderFocusChart(tasks) {
    /* ... keep implementation ... */
  }
  function renderUpcomingTasks(tasks) {
    /* ... keep implementation ... */
  }

  // --- Element Creation Helpers ---
  function createTaskElement(task) {
    // ... (Implementation from previous response - Ensure task title is accessed correctly) ...
    const div = document.createElement("div");
    // Use className for efficiency if replacing all classes
    div.className = `task priority-${
      task.priority || "not-urgent-not-important"
    }`;
    div.setAttribute("draggable", "true");
    div.setAttribute("data-task-id", task.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (
      task.scheduledDate &&
      new Date(task.scheduledDate + "T00:00:00Z") < today
    ) {
      // UTC compare
      div.classList.add("overdue");
    }

    let dueDateFormatted = "Unscheduled";
    // Ensure date formatting happens correctly
    if (task.scheduledDate && isValidDate(task.scheduledDate)) {
      // Use local time formatting for display
      dueDateFormatted = `Due: ${formatDate(
        new Date(task.scheduledDate + "T00:00:00")
      )}`;
    } else if (task.scheduledDate) {
      dueDateFormatted = "Due: Invalid Date";
    }

    // --- CRITICAL: Ensure task.title is used ---
    div.innerHTML = `
           <h4>${escapeHTML(task.title || "No Title Provided")}</h4>
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

    // --- Event listeners for buttons within the task ---
    const editBtn = div.querySelector(".edit-task-btn");
    const rescheduleBtn = div.querySelector(".reschedule-task-btn");

    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openModalForEdit(task.id);
      });
    }
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const latestTask = getLatestTaskVersion(task.id); // Get latest data for prompt default
        const currentScheduledDate = latestTask?.scheduledDate || "";
        const newDateStr = prompt(
          `Reschedule "${
            latestTask?.title || "task"
          }"\nEnter new date (YYYY-MM-DD) or leave blank to unschedule:`,
          currentScheduledDate
        );

        if (newDateStr !== null) {
          // Handle prompt cancellation
          if (!latestTask) return; // Should not happen if task exists
          const updatedData = { ...latestTask };
          delete updatedData.id;
          delete updatedData.historyId;
          const oldDate = updatedData.scheduledDate;

          if (newDateStr === "") {
            updatedData.scheduledDate = null; // Unschedule
          } else if (isValidDate(newDateStr)) {
            updatedData.scheduledDate = newDateStr; // Schedule to new date
          } else {
            alert("Invalid date format. Please use YYYY-MM-DD.");
            return; // Abort if invalid
          }

          // Only update if the date actually changed
          if (oldDate !== updatedData.scheduledDate) {
            console.log(
              `Rescheduling task ${task.id} from ${oldDate} to ${updatedData.scheduledDate}`
            );
            updateTask(task.id, updatedData); // updateTask triggers renderUI
          }
        }
      });
    }
    return div;
  }

  function createHistoryElement(entry) {
    /* ... keep as is ... */
  }

  // ========================================
  // Modal Handling
  // ========================================
  function openModalForCreate(category = "") {
    // ... (reset form as before) ...
    modalTitle.textContent = "Create New Task";
    taskForm.reset();
    taskIdInput.value = "";
    deleteTaskBtn.style.display = "none";
    taskHistoryView.style.display = "none";
    taskHistoryItemsUl.innerHTML = "";
    if (category && DISCIPLINES.includes(category)) {
      taskCategorySelect.value = category;
    }
    const defaultPriority = taskForm.querySelector(
      'input[name="priority"][value="not-urgent-important"]'
    );
    if (defaultPriority) defaultPriority.checked = true; // Default priority
    modal.style.display = "block";
    taskTitleInput.focus(); // Focus title input
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
    // --- Ensure all fields are populated correctly ---
    taskTitleInput.value = task.title || "";
    taskCategorySelect.value = task.category || "";
    taskDescriptionTextarea.value = task.description || "";
    taskEstTimeInput.value = task.estTime || "";
    taskScheduledDateInput.value = task.scheduledDate || "";
    taskFocusSelect.value = task.focus || "";
    // --- Repopulate Priority ---
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
    // --- Show delete button and history ---
    deleteTaskBtn.style.display = "inline-block";
    renderTaskHistoryInModal(taskId);
    taskHistoryView.style.display = "block";
    modal.style.display = "block";
  }

  function renderTaskHistoryInModal(taskId) {
    /* ... keep as is ... */
  }
  function closeModal() {
    /* ... keep as is ... */
  }

  // --- CRITICAL: Form Submit Handler ---
  function handleFormSubmit(event) {
    event.preventDefault();
    const taskId = taskIdInput.value; // Get task ID for editing, if any

    // --- Read values directly from elements inside the handler ---
    const title = taskTitleInput.value.trim(); // Get title value
    const category = taskCategorySelect.value;
    const description = taskDescriptionTextarea.value.trim();
    const estTime = parseInt(taskEstTimeInput.value, 10) || null;
    const scheduledDate = taskScheduledDateInput.value || null; // YYYY-MM-DD or null
    const focus = taskFocusSelect.value;
    const priority =
      taskForm.querySelector('input[name="priority"]:checked')?.value ||
      "not-urgent-not-important";

    // --- Validation ---
    if (!title || !category || !focus) {
      alert("Title, Category, and Focus Level are required.");
      return;
    }
    if (scheduledDate && !isValidDate(scheduledDate)) {
      alert("Invalid scheduled date format. Please use YYYY-MM-DD.");
      return;
    }

    // --- Create data object ---
    const taskData = {
      title,
      category,
      description,
      estTime,
      scheduledDate,
      priority,
      focus,
    };
    console.log(`Form Submit. TaskID: ${taskId || "NEW"}, Data:`, taskData); // Debug log

    // --- Call Create or Update ---
    if (taskId) {
      updateTask(taskId, taskData);
    } else {
      createTask(taskData);
    }
    // closeModal() is called within createTask/updateTask
  }

  // ========================================
  // Drag and Drop (Keep as is)
  // ========================================
  function addDragListenersToTasks(containerElement) {
    /* ... keep as is ... */
  }
  function addDragListenersToTask(taskElement) {
    /* ... keep as is ... */
  }
  function handleDragStart(e) {
    /* ... keep as is ... */
  }
  function handleDragEnd(e) {
    /* ... keep as is ... */
  }
  function handleDragOver(e) {
    /* ... keep as is ... */
  }
  function handleDragLeave(e) {
    /* ... keep as is ... */
  }
  function handleDrop(e) {
    /* ... keep as is, ensure updateTask is called correctly ... */
  }
  // --- Touch Handlers ---
  function handleTouchStart(e) {
    /* ... keep as is ... */
  }
  function handleTouchMove(e) {
    /* ... keep as is ... */
  }
  function handleTouchEnd(e) {
    /* ... keep as is, ensure updateTask is called correctly ... */
  }

  // ========================================
  // Tab Switching
  // ========================================
  function activateTab(targetPanelSelector, triggerRender = true) {
    if (!targetPanelSelector) return;
    console.log(
      `Activating tab: ${targetPanelSelector}, Trigger Render: ${triggerRender}`
    );

    // Update buttons
    tabButtons.forEach((button) =>
      button.classList.toggle(
        "active",
        button.dataset.tabTarget === targetPanelSelector
      )
    );

    // Update panels
    let panelActivated = false;
    tabPanels.forEach((panel) => {
      const isActive = `#${panel.id}` === targetPanelSelector;
      panel.classList.toggle("active", isActive); // Use class for display: block/none
      if (isActive) panelActivated = true;
    });

    if (!panelActivated) {
      console.error(`Panel not found: ${targetPanelSelector}`);
      return;
    }

    currentActiveTabSelector = targetPanelSelector; // Store active tab

    // Scroll main content to top for the new panel
    if (mainContent) mainContent.scrollTop = 0;

    // Refresh content only if requested (to avoid loops during initial render)
    if (triggerRender) {
      console.log(`Triggering render for ${targetPanelSelector}`);
      switch (targetPanelSelector) {
        case "#tab-panel-schedule":
          navigateToDate(currentViewDate);
          break;
        case "#tab-panel-unscheduled":
          renderMobileUnscheduledTasks();
          break;
        case "#tab-panel-dashboard":
          renderDashboard();
          break;
        case "#tab-panel-history":
          renderMobileHistoryTasks();
          break;
      }
    }
  }

  // ========================================
  // Export & Utilities
  // ========================================
  function generateWeeklySummary() {
    /* ... keep as is ... */
  }
  function exportToJson() {
    /* ... keep as is ... */
  }
  function exportToCsv() {
    /* ... keep as is ... */
  }
  function escapeCsvField(field) {
    /* ... keep as is ... */
  }
  function escapeHTML(str) {
    /* ... keep as is ... */
  }
  function formatDate(date) {
    /* ... keep as is (using local time for display) ... */
  }
  function formatDateISO(date) {
    /* ... keep as is (YYYY-MM-DD) ... */
  }
  function isValidDate(dateString) {
    /* ... keep as is (using UTC for validation) ... */
  }

  // ========================================
  // Event Listeners Setup
  // ========================================
  function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- Modal Related ---
    createTaskBtns.forEach((btn) =>
      btn?.addEventListener("click", () => openModalForCreate())
    ); // Desktop button + FAB
    closeModalBtn?.addEventListener("click", closeModal);
    cancelModalBtn?.addEventListener("click", closeModal);
    taskForm?.addEventListener("submit", handleFormSubmit); // Central submit handler
    deleteTaskBtn?.addEventListener("click", () => {
      // Delete button in modal
      const taskId = taskIdInput.value;
      if (
        taskId &&
        confirm(
          "Are you sure you want to delete this task? History will be kept."
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
    });

    // --- Scheduler Navigation ---
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

    // --- Drag/Drop Zone Setup (Initial - might need dynamic re-attachment if zones change) ---
    // Note: If drop zones are added/removed dynamically, listeners might need re-attachment
    document.querySelectorAll(".drop-zone").forEach((zone) => {
      zone.removeEventListener("dragover", handleDragOver);
      zone.addEventListener("dragover", handleDragOver); // Re-attach safely
      zone.removeEventListener("dragleave", handleDragLeave);
      zone.addEventListener("dragleave", handleDragLeave);
      zone.removeEventListener("drop", handleDrop);
      zone.addEventListener("drop", handleDrop);
      zone.removeEventListener("touchmove", handleTouchMove);
      zone.addEventListener("touchmove", handleTouchMove, { passive: false });
      zone.removeEventListener("touchend", handleTouchEnd);
      zone.addEventListener("touchend", handleTouchEnd);
    });

    // --- Desktop Sidebar ---
    disciplineList?.addEventListener("click", (e) => {
      const listItem = e.target.closest("li");
      if (!isMobileView && listItem && listItem.dataset.category) {
        // Only trigger from sidebar if not mobile
        openModalForCreate(listItem.dataset.category);
      }
    });

    // --- Dashboard ---
    generateSummaryBtn?.addEventListener("click", generateWeeklySummary);
    exportJsonBtn?.addEventListener("click", exportToJson);
    exportCsvBtn?.addEventListener("click", exportToCsv);

    // --- Mobile Tabs ---
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetPanelSelector = button.dataset.tabTarget;
        if (
          targetPanelSelector &&
          targetPanelSelector !== currentActiveTabSelector
        ) {
          // Only switch if different
          activateTab(targetPanelSelector, true); // Activate and trigger render
        }
      });
    });

    // --- Window Resize ---
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkAndUpdateView, 250); // Re-check view
    });

    console.log("Event listeners setup complete.");
  } // End setupEventListeners

  // --- Start the application ---
  init();
}); // End DOMContentLoaded
