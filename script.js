document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const createTaskBtn = document.getElementById("create-task-btn");
  const taskModal = document.getElementById("task-modal");
  const closeModalBtn = taskModal.querySelector(".close-btn");
  const cancelModalBtn = taskModal.querySelector(".cancel-btn");
  const taskForm = document.getElementById("task-form");
  const modalTitle = document.getElementById("modal-title");
  const taskIdInput = document.getElementById("task-id");
  const taskHistoryIdInput = document.getElementById("task-history-id"); // Usually not needed to set directly
  const deleteTaskBtn = document.getElementById("delete-task-btn");
  const taskHistoryView = document.getElementById("task-history-view");
  const taskHistoryItemsUl = document.getElementById("task-history-items");

  const timelineContainer = document.getElementById("timeline-container");
  const scheduledTasksList = document.getElementById("scheduled-tasks-list");
  const unscheduledTasksList = document.getElementById(
    "unscheduled-tasks-list"
  );
  const currentDateDisplay = document.getElementById("current-date-display");
  const timelineDateSpan = document.getElementById("timeline-date");
  const prevDayBtn = document.getElementById("prev-day-btn");
  const nextDayBtn = document.getElementById("next-day-btn");
  const todayBtn = document.getElementById("today-btn");

  const disciplineList = document.getElementById("discipline-list");
  const taskHistorySidebarList = document.getElementById("task-history-list"); // Sidebar history

  // Dashboard Elements
  const timePerSubjectUl = document.getElementById("time-per-subject");
  const subjectProgressBarsDiv = document.getElementById(
    "subject-progress-bars"
  ); // Optional progress bars
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

  // --- State ---
  let tasks = []; // Array to hold all task objects { id: '...', history: [{...}, {...}] }
  let currentViewDate = new Date(); // Date currently shown in the scheduler
  let draggedTaskId = null;
  let focusChartInstance = null;

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

  // --- Initialization ---
  function init() {
    loadTasks();
    setupEventListeners();
    navigateToDate(currentViewDate); // Render initial view for today
    renderDashboard();
    renderSidebarHistory();
  }

  // --- localStorage Functions ---
  function saveTasks() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error("Error saving tasks to localStorage:", e);
      alert("Could not save tasks. LocalStorage might be full or disabled.");
    }
  }

  function loadTasks() {
    const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTasks) {
      try {
        tasks = JSON.parse(storedTasks);
        if (
          !Array.isArray(tasks) ||
          tasks.some((t) => !t.id || !Array.isArray(t.history))
        ) {
          console.warn(
            "Invalid task structure found in localStorage. Resetting."
          );
          tasks = [];
          saveTasks();
        }
      } catch (e) {
        console.error("Error parsing tasks from localStorage:", e);
        tasks = [];
      }
    } else {
      tasks = [];
    }
    tasks = tasks.map((task) => ({
      id: task.id || generateUniqueId(),
      history: Array.isArray(task.history) ? task.history : [task],
    }));
  }

  // --- Task Utility Functions ---
  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  function getLatestTaskVersion(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.history.length === 0) return null;
    for (let i = task.history.length - 1; i >= 0; i--) {
      if (!task.history[i].deleted) {
        return { ...task.history[i], id: task.id, historyId: i };
      }
    }
    return null;
  }

  function getAllActiveTasks() {
    return tasks
      .map((task) => getLatestTaskVersion(task.id))
      .filter((task) => task !== null);
  }

  function getAllTaskHistory() {
    let flatHistory = [];
    tasks.forEach((task) => {
      task.history.forEach((version, index) => {
        flatHistory.push({
          taskId: task.id,
          historyIndex: index,
          timestamp: version.timestamp,
          ...version,
        });
      });
    });
    return flatHistory.sort((a, b) => b.timestamp - a.timestamp);
  }

  // --- Task CRUD Functions ---
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
    saveTasks();
    // Re-render the current date's view to show the new task if applicable
    navigateToDate(currentViewDate); // Changed this to re-render the whole view
    renderDashboard();
    renderSidebarHistory();
    closeModal(); // Ensure modal closes after creation
  }

  function updateTask(taskId, updatedData) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.error("Task not found for update:", taskId);
      return;
    }
    tasks[taskIndex].history.push({
      timestamp: Date.now(),
      ...updatedData,
      deleted: false,
    });
    saveTasks();
    // Re-render the current date's view to update task or move it
    navigateToDate(currentViewDate); // Changed this to re-render the whole view
    renderDashboard();
    renderSidebarHistory();
    closeModal(); // Ensure modal closes after update
  }

  function deleteTask(taskId) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const latestVersion = getLatestTaskVersion(taskId);
    if (!latestVersion) return;

    const deletionRecord = {
      ...latestVersion,
      timestamp: Date.now(),
      deleted: true,
    };
    delete deletionRecord.id;
    delete deletionRecord.historyId;

    tasks[taskIndex].history.push(deletionRecord);
    saveTasks();

    // Re-render the current view to remove the task visually
    navigateToDate(currentViewDate); // Changed this to re-render the whole view
    renderDashboard();
    renderSidebarHistory();
    closeModal();
  }

  // --- Rendering Functions ---

  function formatDate(date) {
    // Ensure input is a Date object
    if (!(date instanceof Date) || isNaN(date)) {
      // Try parsing if it's a string like YYYY-MM-DD
      if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        date = new Date(date + "T00:00:00"); // Treat as local time start of day
        if (isNaN(date)) return "Invalid Date"; // Still invalid after parsing
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

  function navigateToDate(date) {
    currentViewDate = new Date(date);
    currentViewDate.setHours(0, 0, 0, 0);

    const formattedDate = formatDate(currentViewDate);
    currentDateDisplay.textContent = formattedDate;
    timelineDateSpan.textContent = formattedDate;

    renderSchedulerForDate(currentViewDate);
  }

  function renderSchedulerForDate(date) {
    scheduledTasksList.innerHTML = "";
    unscheduledTasksList.innerHTML = "";

    const isoDateString = formatDateISO(date);
    const today = new Date(); // Get today's date for overdue check
    today.setHours(0, 0, 0, 0);
    const activeTasks = getAllActiveTasks();

    // --- Add Debug Logs ---
    console.log(
      `Mobile Debug: Rendering for date: ${isoDateString}. Found ${activeTasks.length} active tasks.`
    );
    if (activeTasks.length > 0) {
      console.log(
        "Mobile Debug: First active task data:",
        JSON.stringify(activeTasks[0])
      );
    }
    // ---------------------

    activeTasks.forEach((task) => {
      // --- Add Debug Log ---
      console.log(
        `Mobile Debug: Checking Task ID ${task.id}, Title: ${task.title}, Scheduled: ${task.scheduledDate}`
      );
      // --------------------
      const taskElement = createTaskElement(task);
      // Check if task is scheduled for the currently viewed date
      if (task.scheduledDate === isoDateString) {
        console.log(
          `Mobile Debug: -> Adding task ${task.id} to SCHEDULED list.`
        ); // DEBUG
        scheduledTasksList.appendChild(taskElement);
        // Check if overdue (and actually has a date)
        if (
          task.scheduledDate &&
          new Date(task.scheduledDate + "T00:00:00") < today
        ) {
          taskElement.classList.add("overdue");
        }
        // Check if task is unscheduled
      } else if (!task.scheduledDate) {
        console.log(
          `Mobile Debug: -> Adding task ${task.id} to UNSCHEDULED list.`
        ); // DEBUG
        unscheduledTasksList.appendChild(taskElement);
      }
      // Otherwise, task is for a different date, do nothing here
    });

    // --- Add Debug Logs ---
    console.log(
      "Mobile Debug: Scheduled List Child Count:",
      scheduledTasksList.children.length
    );
    console.log(
      "Mobile Debug: Unscheduled List Child Count:",
      unscheduledTasksList.children.length
    );
    // ---------------------

    addDragListenersToTasks();
  }

  /* // Removed renderTask as primary render function, now handled by navigateToDate/renderSchedulerForDate
  function renderTask(taskId) { ... }
  */

  function createTaskElement(task) {
    const div = document.createElement("div");
    div.classList.add("task");
    div.classList.add(
      `priority-${task.priority || "not-urgent-not-important"}`
    );
    div.setAttribute("draggable", "true");
    div.setAttribute("data-task-id", task.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Check if overdue (and has a valid date)
    if (
      task.scheduledDate &&
      new Date(task.scheduledDate + "T00:00:00") < today
    ) {
      div.classList.add("overdue");
    }

    // Format due date safely
    let dueDateFormatted = "Unscheduled";
    if (task.scheduledDate) {
      try {
        dueDateFormatted = `Due: ${formatDate(
          new Date(task.scheduledDate + "T00:00:00")
        )}`;
      } catch (e) {
        dueDateFormatted = "Due: Invalid Date";
      }
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
              <button class="btn edit-task-btn"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn reschedule-task-btn"><i class="fas fa-calendar-alt"></i> Reschedule</button>
          </div>
      `;

    div.querySelector(".edit-task-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModalForEdit(task.id);
    });

    div.querySelector(".reschedule-task-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const currentScheduledDate =
        getLatestTaskVersion(task.id)?.scheduledDate || ""; // Get latest date for prompt
      const newDateStr = prompt(
        `Reschedule "${task.title}"\nEnter new date (YYYY-MM-DD) or leave blank to unschedule:`,
        currentScheduledDate
      );

      if (newDateStr !== null) {
        const latestVersion = getLatestTaskVersion(task.id);
        if (!latestVersion) return; // Should not happen if element exists

        const updatedData = { ...latestVersion }; // Copy latest data
        delete updatedData.id;
        delete updatedData.historyId;
        const oldDate = updatedData.scheduledDate;

        if (newDateStr === "") {
          updatedData.scheduledDate = null; // Unschedule
        } else if (isValidDate(newDateStr)) {
          updatedData.scheduledDate = newDateStr;
        } else {
          alert("Invalid date format. Please use YYYY-MM-DD.");
          return; // Don't proceed if date is invalid
        }

        // Only update if the date actually changed
        if (oldDate !== updatedData.scheduledDate) {
          updateTask(task.id, updatedData);
        }
      }
    });

    return div;
  }

  function renderSidebarHistory() {
    taskHistorySidebarList.innerHTML = "";
    const recentHistory = getAllTaskHistory().slice(0, 10); // Show latest 10 changes

    recentHistory.forEach((entry) => {
      const div = document.createElement("div");
      div.classList.add("task", "history-item");
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

      div.innerHTML = `
              <p><strong>${action}:</strong> ${escapeHTML(title)}${dateInfo}</p>
              <div class="task-meta">
                  <span>${new Date(entry.timestamp).toLocaleString()}</span>
                   <span>By: System</span>
               </div>
           `;
      div.addEventListener("click", () => openModalForEdit(entry.taskId));
      taskHistorySidebarList.appendChild(div);
    });
  }

  // --- Modal Handling ---
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

    taskModal.style.display = "block";
    document.getElementById("task-title").focus();
  }

  function openModalForEdit(taskId) {
    const task = getLatestTaskVersion(taskId);
    if (!task) {
      alert("Task not found or has been deleted.");
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

    const priorityRadios = taskForm.querySelectorAll('input[name="priority"]');
    let prioritySet = false;
    priorityRadios.forEach((radio) => {
      radio.checked = radio.value === task.priority;
      if (radio.checked) prioritySet = true;
    });
    if (!prioritySet) {
      // Default if no priority was saved
      taskForm.querySelector(
        'input[name="priority"][value="not-urgent-not-important"]'
      ).checked = true;
    }

    deleteTaskBtn.style.display = "inline-block";
    renderTaskHistoryInModal(taskId);
    taskHistoryView.style.display = "block";

    taskModal.style.display = "block";
  }

  function renderTaskHistoryInModal(taskId) {
    taskHistoryItemsUl.innerHTML = "";
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.history) return;

    [...task.history].reverse().forEach((version, index) => {
      const li = document.createElement("li");
      const timestamp = new Date(version.timestamp).toLocaleString();
      let changeDesc = `Version ${task.history.length - index}`;
      if (version.deleted) changeDesc += " (Deleted)";
      else if (index === task.history.length - 1) changeDesc += " (Created)";
      else changeDesc += " (Updated)";

      li.innerHTML = `<strong>${timestamp}:</strong> ${changeDesc} - Title: ${escapeHTML(
        version.title || "N/A"
      )}, Due: ${version.scheduledDate || "Unscheduled"}`;
      taskHistoryItemsUl.appendChild(li);
    });
  }

  function closeModal() {
    taskModal.style.display = "none";
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

    // --- Add This Debug Log ---
    console.log(
      "Mobile Debug: Task Data Being Saved:",
      JSON.stringify(taskData)
    );
    // -------------------------

    if (!taskData.title) {
      alert("Task title is required.");
      return;
    }
    if (!taskData.category) {
      alert("Please select a category.");
      return;
    }
    // Validate date format only if a date is provided
    if (taskData.scheduledDate && !isValidDate(taskData.scheduledDate)) {
      alert("Invalid scheduled date format. Please use YYYY-MM-DD.");
      return;
    }

    if (taskId) {
      updateTask(taskId, taskData);
    } else {
      createTask(taskData);
    }
  }

  // --- Drag and Drop ---
  function addDragListenersToTasks() {
    const taskElements = document.querySelectorAll('.task[draggable="true"]');
    taskElements.forEach(addDragListenersToTask);
  }

  function addDragListenersToTask(taskElement) {
    taskElement.addEventListener("dragstart", handleDragStart);
    taskElement.addEventListener("dragend", handleDragEnd);
    // Touch events
    taskElement.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    taskElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    taskElement.addEventListener("touchend", handleTouchEnd);
  }

  function handleDragStart(e) {
    // Make sure we're targeting the task element itself
    const taskElement = e.target.closest(".task");
    if (!taskElement) return;

    draggedTaskId = taskElement.dataset.taskId;
    // Use try-catch for dataTransfer in case of edge cases/browser issues
    try {
      e.dataTransfer.setData("text/plain", draggedTaskId);
      e.dataTransfer.effectAllowed = "move";
    } catch (err) {
      console.error("Error setting drag data:", err);
      // Fallback or alternative handling might be needed
    }
    setTimeout(() => taskElement.classList.add("dragging"), 0);
  }

  function handleDragEnd(e) {
    const taskElement = e.target.closest(".task");
    if (taskElement) {
      // Check if element still exists
      taskElement.classList.remove("dragging");
    }
    draggedTaskId = null;
    document
      .querySelectorAll(".drop-zone")
      .forEach((zone) => zone.classList.remove("drag-over"));
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) {
      // Check if dataTransfer is available
      e.dataTransfer.dropEffect = "move";
    }
    const dropZone = e.target.closest(".drop-zone");
    if (dropZone && !dropZone.classList.contains("drag-over")) {
      document
        .querySelectorAll(".drop-zone")
        .forEach((zone) => zone.classList.remove("drag-over"));
      dropZone.classList.add("drag-over");
    }
  }

  function handleDragLeave(e) {
    const dropZone = e.target.closest(".drop-zone");
    // Check if the relatedTarget (where the mouse entered) is outside the current dropZone
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

    // Try getting data from dataTransfer first (standard)
    try {
      taskIdToDrop = e.dataTransfer.getData("text/plain");
    } catch (err) {
      console.error("Error getting drag data from dataTransfer:", err);
    }

    // Fallback to the globally stored ID if dataTransfer failed
    if (!taskIdToDrop && draggedTaskId) {
      console.warn("Using globally stored draggedTaskId as fallback.");
      taskIdToDrop = draggedTaskId;
    }

    if (!taskIdToDrop) {
      console.error("Could not determine dropped task ID.");
      draggedTaskId = null; // Reset global just in case
      return;
    }

    const task = getLatestTaskVersion(taskIdToDrop);
    if (!task) {
      console.error(`Task data not found for dropped ID: ${taskIdToDrop}`);
      draggedTaskId = null; // Reset global
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
    }

    draggedTaskId = null; // Reset global ID after successful drop
  }

  // --- Touch Event Handlers (Simplified) ---
  let touchStartX, touchStartY;
  let draggedElement = null;
  let isDragging = false; // Flag to confirm drag intent

  function handleTouchStart(e) {
    draggedElement = e.target.closest(".task");
    if (!draggedElement) return;

    // Only prevent default if we intend to drag (e.g., long press or specific handle)
    // For now, let's assume any touch might start a drag
    // e.preventDefault(); // This can prevent scrolling, use carefully

    draggedTaskId = draggedElement.dataset.taskId;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isDragging = false; // Reset drag flag

    // Add subtle visual cue immediately
    // draggedElement.style.opacity = '0.9';
  }

  function handleTouchMove(e) {
    if (!draggedElement || !draggedTaskId) return;

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = Math.abs(currentX - touchStartX);
    const deltaY = Math.abs(currentY - touchStartY);

    // Only initiate 'drag mode' if moved beyond a threshold
    // and primarily vertically (or adjust as needed)
    if (!isDragging && (deltaY > 10 || deltaX > 10)) {
      // Threshold of 10px
      isDragging = true;
      // Add dragging class only when confirmed drag starts
      draggedElement.classList.add("dragging");
    }

    if (isDragging) {
      e.preventDefault(); // Prevent scrolling *while* dragging

      // Temporarily hide element to find what's underneath
      draggedElement.style.visibility = "hidden";
      const elementUnderTouch = document.elementFromPoint(currentX, currentY);
      draggedElement.style.visibility = "visible";

      const dropZone = elementUnderTouch
        ? elementUnderTouch.closest(".drop-zone")
        : null;

      document.querySelectorAll(".drop-zone").forEach((zone) => {
        if (zone === dropZone) {
          zone.classList.add("drag-over");
        } else {
          zone.classList.remove("drag-over");
        }
      });
    }
  }

  function handleTouchEnd(e) {
    if (!draggedElement || !draggedTaskId || !isDragging) {
      // Cleanup if no drag occurred or invalid state
      if (draggedElement) draggedElement.classList.remove("dragging");
      draggedElement = null;
      draggedTaskId = null;
      isDragging = false;
      document
        .querySelectorAll(".drop-zone")
        .forEach((zone) => zone.classList.remove("drag-over"));
      return;
    }

    // Find the drop zone that has the hover effect
    const dropZone = document.querySelector(".drop-zone.drag-over");

    if (dropZone) {
      const taskId = draggedTaskId; // Use ID captured at start
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
          // navigateToDate(currentViewDate) called within updateTask now
        }
      } else {
        console.error(`Task data not found for touch-dropped ID: ${taskId}`);
      }
    }

    // Cleanup
    draggedElement.classList.remove("dragging");
    // draggedElement.style.opacity = '1';
    draggedElement = null;
    draggedTaskId = null;
    isDragging = false;
    document
      .querySelectorAll(".drop-zone")
      .forEach((zone) => zone.classList.remove("drag-over"));
  }

  // --- Dashboard Functions ---
  function renderDashboard() {
    const activeTasks = getAllActiveTasks();
    renderTimePerSubject(activeTasks);
    renderFocusChart(activeTasks);
    renderUpcomingTasks(activeTasks);
  }

  function renderTimePerSubject(tasks) {
    const timeMap = {};
    DISCIPLINES.forEach((cat) => (timeMap[cat] = 0));

    tasks.forEach((task) => {
      if (task.category && task.estTime > 0) {
        if (!timeMap[task.category]) timeMap[task.category] = 0;
        timeMap[task.category] += task.estTime;
      }
    });

    timePerSubjectUl.innerHTML = "";
    subjectProgressBarsDiv.innerHTML = "";
    let totalEstTime = Object.values(timeMap).reduce(
      (sum, time) => sum + time,
      0
    );

    Object.entries(timeMap).forEach(([category, time]) => {
      if (time > 0) {
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
        barContainer.innerHTML = `
                  <span class="progress-bar-label">${escapeHTML(
                    category
                  )} (${percentage}%)</span>
                  <div class="progress-bar">
                      <div class="progress-bar-fill" style="width: ${percentage}%;">${
          percentage > 10 ? `${hours}h ${minutes}m` : ""
        }</div>
                  </div>
              `; // Only show text if bar is wide enough
        subjectProgressBarsDiv.appendChild(barContainer);
      }
    });
    if (timePerSubjectUl.children.length === 0) {
      timePerSubjectUl.innerHTML = "<li>No estimated time logged yet.</li>";
    }
  }

  function renderFocusChart(tasks) {
    const focusCounts = { deep: 0, medium: 0, shallow: 0, unknown: 0 };
    let totalValidTasks = 0; // Count tasks where focus level could be determined

    tasks.forEach((task) => {
      if (
        task.focus === "deep" ||
        task.focus === "medium" ||
        task.focus === "shallow"
      ) {
        focusCounts[task.focus]++;
        totalValidTasks++;
      } else {
        focusCounts.unknown++;
      }
    });

    const chartData = {
      labels: ["Deep Work", "Medium Focus", "Shallow Work", "Not Set"],
      datasets: [
        {
          label: "Focus Level Distribution (Tasks)",
          data: [
            focusCounts.deep,
            focusCounts.medium,
            focusCounts.shallow,
            focusCounts.unknown,
          ],
          backgroundColor: [
            /* Colors... */
          ],
          borderColor: [
            /* Border colors... */
          ],
          borderWidth: 1,
        },
      ],
    };
    // Re-add colors if they were removed accidentally
    chartData.datasets[0].backgroundColor = [
      "rgba(231, 76, 60, 0.7)",
      "rgba(241, 196, 15, 0.7)",
      "rgba(52, 152, 219, 0.7)",
      "rgba(149, 165, 166, 0.5)",
    ];
    chartData.datasets[0].borderColor = [
      "rgba(192, 57, 43, 1)",
      "rgba(194, 150, 10, 1)",
      "rgba(41, 128, 185, 1)",
      "rgba(127, 140, 141, 1)",
    ];

    const ctx = focusChartCanvas.getContext("2d");

    try {
      // --- Wrap in try-catch ---
      if (focusChartInstance) {
        // Only update if data actually exists to prevent errors
        if (totalValidTasks > 0 || focusCounts.unknown > 0) {
          focusChartInstance.data = chartData;
          focusChartInstance.update();
          console.log("Mobile Debug: Focus chart updated."); // DEBUG
        } else {
          // Optional: Clear chart if no data? Or leave as is?
          console.log("Mobile Debug: No data to update chart.");
        }
      } else if (totalValidTasks > 0 || focusCounts.unknown > 0) {
        // Check if there is *any* data
        console.log(
          "Mobile Debug: Creating new focus chart. Data:",
          JSON.stringify(chartData)
        ); // DEBUG
        focusChartInstance = new Chart(ctx, {
          type: "pie",
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false, // Important
            plugins: {
              legend: { position: "top" },
              tooltip: {
                /* callbacks */
              },
            },
          },
        });
      } else {
        ctx.clearRect(0, 0, focusChartCanvas.width, focusChartCanvas.height);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // Center vertically
        ctx.fillText(
          "No focus data available.",
          focusChartCanvas.width / 2,
          focusChartCanvas.height / 2
        );
        console.log("Mobile Debug: No focus data for chart."); // DEBUG
      }
    } catch (error) {
      // --- Catch errors ---
      console.error("Mobile Debug: Error rendering focus chart:", error);
      // Optionally display error message on canvas
      ctx.clearRect(0, 0, focusChartCanvas.width, focusChartCanvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "red";
      ctx.fillText(
        "Chart Error.",
        focusChartCanvas.width / 2,
        focusChartCanvas.height / 2
      );
    }
  }

  function renderUpcomingTasks(tasks) {
    upcomingTasksUl.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcoming = tasks
      .filter((task) => task.scheduledDate && isValidDate(task.scheduledDate)) // Ensure valid date
      .map((task) => ({
        ...task,
        dateObj: new Date(task.scheduledDate + "T00:00:00"),
      }))
      .filter(
        (task) =>
          !isNaN(task.dateObj) &&
          task.dateObj >= today &&
          task.dateObj < nextWeek
      ) // Check valid & in range
      .sort((a, b) => a.dateObj - b.dateObj);

    if (upcoming.length === 0) {
      upcomingTasksUl.innerHTML =
        "<li>No tasks scheduled in the next 7 days.</li>";
      return;
    }

    upcoming.forEach((task) => {
      const li = document.createElement("li");
      // Use safe date formatting here too
      let formattedDueDate = formatDate(task.dateObj);
      if (formattedDueDate === "Invalid Date")
        formattedDueDate = task.scheduledDate; // Fallback

      li.innerHTML = `<strong>${escapeHTML(
        task.title
      )}</strong> - Due: ${formattedDueDate} (${escapeHTML(task.category)})`;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => openModalForEdit(task.id));
      upcomingTasksUl.appendChild(li);
    });
  }

  function generateWeeklySummary() {
    const well = summaryWellTextarea.value.trim();
    const blockers = summaryBlockersTextarea.value.trim();
    const next = summaryNextTextarea.value.trim();

    if (!well && !blockers && !next) {
      generatedSummaryOutput.textContent =
        "Please fill in at least one section.";
      return;
    }

    let summary = `## Weekly Learning Summary (${formatDate(
      new Date()
    )}) ##\n\n`;
    if (well)
      summary += `**What went well:**\n- ${well.replace(/\n/g, "\n- ")}\n\n`;
    if (blockers)
      summary += `**Blockers:**\n- ${blockers.replace(/\n/g, "\n- ")}\n\n`;
    if (next) summary += `**Next Steps:**\n- ${next.replace(/\n/g, "\n- ")}\n`;

    generatedSummaryOutput.textContent = summary;
  }

  // --- Export Functions ---
  function exportToJson() {
    // Export only the tasks array structure
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `learning_tasks_${formatDateISO(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportToCsv() {
    const flatHistory = getAllTaskHistory();
    if (flatHistory.length === 0) {
      alert("No task data to export.");
      return;
    }
    const headers = [
      "TaskId",
      "HistoryIndex",
      "Timestamp",
      "Action",
      "Title",
      "Category",
      "Description",
      "EstTime(min)",
      "ScheduledDate",
      "Priority",
      "Focus",
    ];
    const rows = flatHistory.map((entry) => {
      const action = entry.deleted
        ? "Deleted"
        : entry.historyIndex === 0
        ? "Created"
        : "Updated";
      return [
        entry.taskId,
        entry.historyIndex,
        new Date(entry.timestamp).toISOString(),
        action,
        escapeCsvField(entry.title),
        escapeCsvField(entry.category),
        escapeCsvField(entry.description),
        entry.estTime || "",
        entry.scheduledDate || "",
        entry.priority || "",
        entry.focus || "",
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `learning_tasks_history_${formatDateISO(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeCsvField(field) {
    const stringField = String(field || ""); // Ensure it's a string, handle null/undefined
    // Replace quote with double quote, then wrap if necessary
    let escaped = stringField.replace(/"/g, '""');
    if (
      escaped.includes(",") ||
      escaped.includes('"') ||
      escaped.includes("\n")
    ) {
      escaped = `"${escaped}"`;
    }
    return escaped;
  }

  // --- Utility Functions ---
  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isValidDate(dateString) {
    // Checks YYYY-MM-DD format and validates the date components
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString + "T00:00:00Z"); // Use UTC to avoid timezone shift issues during validation
    // Check if the components match after Date object creation
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = date.getUTCDate().toString().padStart(2, "0");
    // Check if parsing resulted in a valid date and components match string
    return !isNaN(date.getTime()) && `${year}-${month}-${day}` === dateString;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    createTaskBtn.addEventListener("click", () => openModalForCreate());
    closeModalBtn.addEventListener("click", closeModal);
    cancelModalBtn.addEventListener("click", closeModal);
    taskForm.addEventListener("submit", handleFormSubmit);
    deleteTaskBtn.addEventListener("click", () => {
      const taskId = taskIdInput.value;
      if (
        taskId &&
        confirm(
          "Are you sure you want to delete this task? History will be kept."
        )
      ) {
        deleteTask(taskId);
      }
    });

    window.addEventListener("click", (event) => {
      if (event.target === taskModal) {
        closeModal();
      }
    });

    prevDayBtn.addEventListener("click", () => {
      const prevDate = new Date(currentViewDate);
      prevDate.setDate(currentViewDate.getDate() - 1);
      navigateToDate(prevDate);
    });
    nextDayBtn.addEventListener("click", () => {
      const nextDate = new Date(currentViewDate);
      nextDate.setDate(currentViewDate.getDate() + 1);
      navigateToDate(nextDate);
    });
    todayBtn.addEventListener("click", () => {
      navigateToDate(new Date());
    });

    const dropZones = document.querySelectorAll(".drop-zone");
    dropZones.forEach((zone) => {
      zone.addEventListener("dragover", handleDragOver);
      zone.addEventListener("dragleave", handleDragLeave);
      zone.addEventListener("drop", handleDrop);
      // Touch listeners for drop zones
      zone.addEventListener("touchmove", handleTouchMove, { passive: false });
      zone.addEventListener("touchend", handleTouchEnd);
    });

    disciplineList.addEventListener("click", (e) => {
      const listItem = e.target.closest("li");
      if (listItem && listItem.dataset.category) {
        openModalForCreate(listItem.dataset.category);
      }
    });

    generateSummaryBtn.addEventListener("click", generateWeeklySummary);
    exportJsonBtn.addEventListener("click", exportToJson);
    exportCsvBtn.addEventListener("click", exportToCsv);
  }

  // --- Start the application ---
  init();
});
