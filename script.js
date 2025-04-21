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
        // Basic validation: Ensure it's an array and tasks have history
        if (
          !Array.isArray(tasks) ||
          tasks.some((t) => !t.id || !Array.isArray(t.history))
        ) {
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
    }
    // Ensure every task has an ID and history array (migration for older formats if needed)
    tasks = tasks.map((task) => ({
      id: task.id || generateUniqueId(), // Assign ID if missing
      history: Array.isArray(task.history) ? task.history : [task], // Convert old format if necessary
    }));
  }

  // --- Task Utility Functions ---
  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  function getLatestTaskVersion(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.history.length === 0) return null;
    // Find the last entry that isn't marked as deleted
    for (let i = task.history.length - 1; i >= 0; i--) {
      if (!task.history[i].deleted) {
        return { ...task.history[i], id: task.id, historyId: i }; // Return a copy with ID and history index
      }
    }
    return null; // All versions are deleted or history is empty
  }

  function getAllActiveTasks() {
    return tasks
      .map((task) => getLatestTaskVersion(task.id))
      .filter((task) => task !== null);
  }

  function getAllTaskHistory() {
    // Flattens history for export or detailed views
    let flatHistory = [];
    tasks.forEach((task) => {
      task.history.forEach((version, index) => {
        flatHistory.push({
          taskId: task.id,
          historyIndex: index,
          timestamp: version.timestamp,
          ...version, // Spread the rest of the version data
        });
      });
    });
    return flatHistory.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
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
    renderTask(newTask.id); // Render the new task in the correct list
    renderDashboard();
    renderSidebarHistory(); // Update sidebar history
  }

  function updateTask(taskId, updatedData) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      console.error("Task not found for update:", taskId);
      return;
    }
    // Add a new history entry
    tasks[taskIndex].history.push({
      timestamp: Date.now(),
      ...updatedData,
      deleted: false,
    });
    saveTasks();
    // Re-render the specific task and dashboard
    renderTask(taskId);
    renderDashboard();
    renderSidebarHistory(); // Update sidebar history
    closeModal(); // Close modal after update
  }

  function deleteTask(taskId) {
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const latestVersion = getLatestTaskVersion(taskId);
    if (!latestVersion) return; // Already deleted or no history

    // Mark the latest version as deleted by adding a new history entry
    const deletionRecord = {
      ...latestVersion, // Copy data from the last active state
      timestamp: Date.now(),
      deleted: true,
    };
    delete deletionRecord.id; // Remove redundant id from history record
    delete deletionRecord.historyId; // Remove redundant historyId

    tasks[taskIndex].history.push(deletionRecord);

    saveTasks();

    // Remove the task element from the DOM
    const taskElement = document.querySelector(
      `.task[data-task-id="${taskId}"]`
    );
    if (taskElement) {
      taskElement.remove();
    }

    renderDashboard();
    renderSidebarHistory(); // Update sidebar history
    closeModal();
  }

  // --- Rendering Functions ---

  function formatDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateISO(date) {
    // Ensure the date is treated as local time when converting to ISO string
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function navigateToDate(date) {
    currentViewDate = new Date(date); // Ensure it's a new Date object
    currentViewDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const formattedDate = formatDate(currentViewDate);
    currentDateDisplay.textContent = formattedDate;
    timelineDateSpan.textContent = formattedDate;

    renderSchedulerForDate(currentViewDate);
  }

  function renderSchedulerForDate(date) {
    scheduledTasksList.innerHTML = ""; // Clear current scheduled tasks
    unscheduledTasksList.innerHTML = ""; // Clear current unscheduled tasks

    const isoDateString = formatDateISO(date);
    const todayIsoString = formatDateISO(new Date());
    const activeTasks = getAllActiveTasks();

    activeTasks.forEach((task) => {
      const taskElement = createTaskElement(task);
      if (task.scheduledDate === isoDateString) {
        scheduledTasksList.appendChild(taskElement);
        // Highlight overdue *before* adding to list
        if (task.scheduledDate < todayIsoString) {
          taskElement.classList.add("overdue");
        }
      } else if (!task.scheduledDate) {
        unscheduledTasksList.appendChild(taskElement);
      }
      // Tasks scheduled for other dates are not rendered here
    });

    // Add drag listeners to newly rendered tasks
    addDragListenersToTasks();
  }

  function renderTask(taskId) {
    // Find the task element if it exists and remove it before re-rendering
    const existingElement = document.querySelector(
      `.task[data-task-id="${taskId}"]`
    );
    if (existingElement) {
      existingElement.remove();
    }

    const task = getLatestTaskVersion(taskId);
    if (!task) return; // Task might have been deleted

    const taskElement = createTaskElement(task);
    const todayIsoString = formatDateISO(new Date());

    // Append to the correct list
    if (task.scheduledDate === formatDateISO(currentViewDate)) {
      scheduledTasksList.appendChild(taskElement);
      if (task.scheduledDate < todayIsoString) {
        taskElement.classList.add("overdue");
      }
    } else if (!task.scheduledDate) {
      unscheduledTasksList.appendChild(taskElement);
    }
    // No need to append if it's for a different date than currently viewed

    addDragListenersToTask(taskElement); // Add listeners to the specific new/updated task
  }

  function createTaskElement(task) {
    const div = document.createElement("div");
    div.classList.add("task");
    div.classList.add(
      `priority-${task.priority || "not-urgent-not-important"}`
    ); // Add priority class
    div.setAttribute("draggable", "true");
    div.setAttribute("data-task-id", task.id);

    // Add overdue class if applicable (check against today's date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (task.scheduledDate && new Date(task.scheduledDate) < today) {
      div.classList.add("overdue");
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
                ${
                  task.scheduledDate
                    ? `<span>Due: ${formatDate(
                        new Date(task.scheduledDate + "T00:00:00")
                      )}</span>`
                    : "<span>Unscheduled</span>"
                }
            </div>
            <div class="task-actions">
                <button class="btn edit-task-btn"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn reschedule-task-btn"><i class="fas fa-calendar-alt"></i> Reschedule</button>
            </div>
        `;

    // Add event listeners for buttons within the task element
    div.querySelector(".edit-task-btn").addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering drag start
      openModalForEdit(task.id);
    });

    div.querySelector(".reschedule-task-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      // Simple reschedule: Prompt for a new date or open modal focused on date
      const newDateStr = prompt(
        `Reschedule "${task.title}"\nEnter new date (YYYY-MM-DD) or leave blank to unschedule:`,
        task.scheduledDate || ""
      );
      if (newDateStr !== null) {
        // Handle cancel vs empty string
        const updatedData = { ...getLatestTaskVersion(task.id) };
        delete updatedData.id; // Don't store id in history data
        delete updatedData.historyId;
        updatedData.scheduledDate = newDateStr === "" ? null : newDateStr; // Handle unscheduling
        if (newDateStr && !isValidDate(newDateStr)) {
          alert("Invalid date format. Please use YYYY-MM-DD.");
          return;
        }
        updateTask(task.id, updatedData);
        // Re-render the current view if the task moved in/out of it
        if (task.scheduledDate !== updatedData.scheduledDate) {
          navigateToDate(currentViewDate);
        }
      }
    });

    return div;
  }

  function renderSidebarHistory() {
    taskHistorySidebarList.innerHTML = "";
    const recentHistory = getAllTaskHistory().slice(0, 10); // Show latest 10 changes

    recentHistory.forEach((entry) => {
      // Create a simplified, non-draggable task element for history
      const div = document.createElement("div");
      div.classList.add("task", "history-item"); // Add 'history-item' class
      div.setAttribute("data-task-id", entry.taskId); // Still link to the task

      let action = entry.deleted
        ? "Deleted"
        : entry.historyIndex === 0
        ? "Created"
        : "Updated";
      let title = entry.title || "N/A";
      let dateInfo = entry.scheduledDate
        ? ` on ${entry.scheduledDate}`
        : " (unscheduled)";
      if (entry.deleted) dateInfo = ""; // No date needed for deletion record

      div.innerHTML = `
                <p><strong>${action}:</strong> ${escapeHTML(
        title
      )}${dateInfo}</p>
                <div class="task-meta">
                    <span>${new Date(entry.timestamp).toLocaleString()}</span>
                     <span>By: System</span> </div>
             `;
      // Optional: Add click listener to view full task details/history in modal
      div.addEventListener("click", () => openModalForEdit(entry.taskId));
      taskHistorySidebarList.appendChild(div);
    });
  }

  // --- Modal Handling ---
  function openModalForCreate(category = "") {
    modalTitle.textContent = "Create New Task";
    taskForm.reset(); // Clear previous values
    taskIdInput.value = ""; // Ensure no ID is set for creation
    deleteTaskBtn.style.display = "none"; // Hide delete button
    taskHistoryView.style.display = "none"; // Hide history view
    taskHistoryItemsUl.innerHTML = ""; // Clear history list

    // Pre-fill category if provided (e.g., from sidebar click)
    if (category && DISCIPLINES.includes(category)) {
      document.getElementById("task-category").value = category;
    }

    taskModal.style.display = "block";
    document.getElementById("task-title").focus(); // Focus the first field
  }

  function openModalForEdit(taskId) {
    const task = getLatestTaskVersion(taskId);
    if (!task) {
      alert("Task not found or has been deleted.");
      return;
    }

    modalTitle.textContent = "Edit Task";
    taskForm.reset(); // Clear previous potentially invalid state

    // Populate form
    taskIdInput.value = task.id;
    document.getElementById("task-title").value = task.title || "";
    document.getElementById("task-category").value = task.category || "";
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("task-est-time").value = task.estTime || "";
    document.getElementById("task-scheduled-date").value =
      task.scheduledDate || "";
    document.getElementById("task-focus").value = task.focus || "";

    // Set priority radio button
    const priorityRadios = taskForm.querySelectorAll('input[name="priority"]');
    priorityRadios.forEach((radio) => {
      radio.checked = radio.value === task.priority;
    });
    if (!task.priority) {
      // Ensure one is checked if none was saved previously
      priorityRadios[3].checked = true; // Default to not urgent/not important
    }

    deleteTaskBtn.style.display = "inline-block"; // Show delete button
    renderTaskHistoryInModal(taskId); // Show history
    taskHistoryView.style.display = "block";

    taskModal.style.display = "block";
  }

  function renderTaskHistoryInModal(taskId) {
    taskHistoryItemsUl.innerHTML = "";
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.history) return;

    // Reverse history to show latest first
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
      // Optional: Add more details on hover or click
      taskHistoryItemsUl.appendChild(li);
    });
  }

  function closeModal() {
    taskModal.style.display = "none";
    taskForm.reset(); // Clear form when closing
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
        document.getElementById("task-scheduled-date").value || null, // Store null if empty
      priority:
        taskForm.querySelector('input[name="priority"]:checked')?.value ||
        "not-urgent-not-important",
      focus: document.getElementById("task-focus").value,
    };

    // Basic validation
    if (!taskData.title) {
      alert("Task title is required.");
      return;
    }
    if (!taskData.category) {
      alert("Please select a category.");
      return;
    }
    if (taskData.scheduledDate && !isValidDate(taskData.scheduledDate)) {
      alert("Invalid scheduled date format.");
      return;
    }

    if (taskId) {
      // Editing existing task - create a new history entry
      updateTask(taskId, taskData);
    } else {
      // Creating new task
      createTask(taskData);
    }

    // No need to close modal here, updateTask/createTask calls it
    // Or we can close explicitly:
    // closeModal();
  }

  // --- Drag and Drop ---
  function addDragListenersToTasks() {
    const taskElements = document.querySelectorAll('.task[draggable="true"]');
    taskElements.forEach(addDragListenersToTask);
  }

  function addDragListenersToTask(taskElement) {
    taskElement.addEventListener("dragstart", handleDragStart);
    taskElement.addEventListener("dragend", handleDragEnd);
    // Touch events for mobile compatibility
    taskElement.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    }); // Need passive:false to preventDefault potentially
    taskElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    taskElement.addEventListener("touchend", handleTouchEnd);
  }

  // --- Drag and Drop Handlers ---
  function handleDragStart(e) {
    draggedTaskId = e.target.closest(".task").dataset.taskId;
    e.dataTransfer.setData("text/plain", draggedTaskId);
    e.dataTransfer.effectAllowed = "move";
    // Use setTimeout to allow the browser to render the drag image before adding class
    setTimeout(() => e.target.closest(".task").classList.add("dragging"), 0);
  }

  function handleDragEnd(e) {
    e.target.closest(".task").classList.remove("dragging");
    draggedTaskId = null;
    // Remove hover effect from all drop zones
    document
      .querySelectorAll(".drop-zone")
      .forEach((zone) => zone.classList.remove("drag-over"));
  }

  function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
    // Add hover effect to the drop zone
    const dropZone = e.target.closest(".drop-zone");
    if (dropZone && !dropZone.classList.contains("drag-over")) {
      // Remove from other zones first
      document
        .querySelectorAll(".drop-zone")
        .forEach((zone) => zone.classList.remove("drag-over"));
      dropZone.classList.add("drag-over");
    }
  }

  function handleDragLeave(e) {
    // Remove hover effect if leaving the drop zone or its children
    const dropZone = e.target.closest(".drop-zone");
    if (dropZone && e.relatedTarget && !dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove("drag-over");
    } else if (!e.relatedTarget && dropZone) {
      // Handle leaving the browser window edge case
      dropZone.classList.remove("drag-over");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target.closest(".drop-zone");
    if (!dropZone || !draggedTaskId) return;

    dropZone.classList.remove("drag-over");
    const taskId = draggedTaskId; // Use the variable set in dragstart
    const task = getLatestTaskVersion(taskId);
    if (!task) return;

    const targetDate = dropZone.dataset.date; // 'YYYY-MM-DD' or 'unscheduled'

    // Prepare updated data based on the latest version
    const updatedData = { ...task };
    delete updatedData.id; // Don't store id in history data
    delete updatedData.historyId;

    if (targetDate === "unscheduled") {
      updatedData.scheduledDate = null;
    } else {
      updatedData.scheduledDate = targetDate; // Assume drop zone has 'YYYY-MM-DD'
    }

    // Only update if the date actually changed
    if (task.scheduledDate !== updatedData.scheduledDate) {
      updateTask(taskId, updatedData);
      // Manually move the element in the DOM for immediate feedback,
      // or rely on re-rendering triggered by updateTask.
      // For simplicity, rely on re-rendering the current view:
      navigateToDate(currentViewDate);
    }

    draggedTaskId = null; // Reset after drop
  }

  // --- Touch Event Handlers for Drag/Drop (Simplified) ---
  // Note: This is a basic implementation. Robust touch drag-and-drop often requires libraries
  // or more complex logic to handle scrolling, precision, and visual feedback.
  let touchStartX, touchStartY;
  let draggedElement = null;
  let placeholder = null; // Element to show where item will drop

  function handleTouchStart(e) {
    // Prevent default scroll behavior only if dragging starts
    // e.preventDefault(); // Maybe prevent later based on movement
    draggedElement = e.target.closest(".task");
    if (!draggedElement) return;

    draggedTaskId = draggedElement.dataset.taskId;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    // Style the element being dragged (optional)
    draggedElement.classList.add("dragging"); // Use existing class

    // Create placeholder (optional but good UX)
    placeholder = draggedElement.cloneNode(false); // shallow clone
    placeholder.style.height = `${draggedElement.offsetHeight}px`;
    placeholder.style.backgroundColor = "#e0e0e0";
    placeholder.style.opacity = "0.5";
    placeholder.style.border = "1px dashed #999";
    placeholder.innerText = "Drop here..."; // Clear content
    // Insert placeholder after the dragged element temporarily
    // draggedElement.parentNode.insertBefore(placeholder, draggedElement.nextSibling);

    // Make the original slightly transparent while dragging
    // draggedElement.style.opacity = '0.8';

    // We might need to append the dragged element to the body for free movement
    // and position it absolutely based on touch coords. This gets complex quickly.
    // Let's stick to simpler visual cues for now.
  }

  function handleTouchMove(e) {
    if (!draggedElement || !draggedTaskId) return;
    e.preventDefault(); // Prevent scrolling *while* dragging

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    // Basic movement check (can be improved)
    // const dx = currentX - touchStartX;
    // const dy = currentY - touchStartY;

    // Find the element under the touch point
    draggedElement.style.display = "none"; // Temporarily hide original to find element underneath
    const elementUnderTouch = document.elementFromPoint(currentX, currentY);
    draggedElement.style.display = ""; // Show original again

    // Find the nearest drop zone
    const dropZone = elementUnderTouch
      ? elementUnderTouch.closest(".drop-zone")
      : null;

    // Update drop zone highlight
    document.querySelectorAll(".drop-zone").forEach((zone) => {
      if (zone === dropZone) {
        zone.classList.add("drag-over");
      } else {
        zone.classList.remove("drag-over");
      }
    });

    // Move the placeholder (if using one)
    // if (placeholder && dropZone) {
    //     const taskUnder = elementUnderTouch.closest('.task');
    //     if (taskUnder && taskUnder !== draggedElement) {
    //         dropZone.insertBefore(placeholder, taskUnder);
    //     } else {
    //         dropZone.appendChild(placeholder); // Append to end if not over another task
    //     }
    // }

    // Update position of absolutely positioned drag element (if implemented)
    // draggedElement.style.left = `${currentX - offsetX}px`;
    // draggedElement.style.top = `${currentY - offsetY}px`;
  }

  function handleTouchEnd(e) {
    if (!draggedElement || !draggedTaskId) return;

    // Find the final drop zone based on the last touch point (might be less reliable than elementFromPoint)
    const dropZone = document.querySelector(".drop-zone.drag-over");

    if (dropZone) {
      dropZone.classList.remove("drag-over");
      const taskId = draggedTaskId;
      const task = getLatestTaskVersion(taskId);
      if (task) {
        const targetDate = dropZone.dataset.date;
        const updatedData = { ...task };
        delete updatedData.id;
        delete updatedData.historyId;

        updatedData.scheduledDate =
          targetDate === "unscheduled" ? null : targetDate;

        if (task.scheduledDate !== updatedData.scheduledDate) {
          updateTask(taskId, updatedData);
          navigateToDate(currentViewDate); // Re-render
        }
      }
    }

    // Clean up styles and placeholder
    draggedElement.classList.remove("dragging");
    // draggedElement.style.opacity = '1';
    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }

    draggedElement = null;
    draggedTaskId = null;
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
    // Weekly summary is user-driven, just ensure fields are present
  }

  function renderTimePerSubject(tasks) {
    const timeMap = {};
    DISCIPLINES.forEach((cat) => (timeMap[cat] = 0)); // Initialize all categories

    tasks.forEach((task) => {
      if (task.category && task.estTime > 0) {
        if (!timeMap[task.category]) timeMap[task.category] = 0; // Handle 'Other' or new categories
        timeMap[task.category] += task.estTime;
      }
    });

    timePerSubjectUl.innerHTML = "";
    subjectProgressBarsDiv.innerHTML = ""; // Clear progress bars
    let totalEstTime = 0;
    Object.values(timeMap).forEach((time) => (totalEstTime += time));

    Object.entries(timeMap).forEach(([category, time]) => {
      if (time > 0) {
        // Only show categories with time > 0
        const li = document.createElement("li");
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        li.innerHTML = `<strong>${escapeHTML(
          category
        )}:</strong> ${hours}h ${minutes}m`;
        timePerSubjectUl.appendChild(li);

        // Optional: Add Progress Bar
        const percentage =
          totalEstTime > 0 ? ((time / totalEstTime) * 100).toFixed(1) : 0;
        const barContainer = document.createElement("div");
        barContainer.classList.add("progress-bar-container");
        barContainer.innerHTML = `
                    <span class="progress-bar-label">${escapeHTML(
                      category
                    )} (${percentage}%)</span>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${percentage}%;">${hours}h ${minutes}m</div>
                    </div>
                `;
        subjectProgressBarsDiv.appendChild(barContainer);
      }
    });
    if (timePerSubjectUl.children.length === 0) {
      timePerSubjectUl.innerHTML = "<li>No estimated time logged yet.</li>";
    }
  }

  function renderFocusChart(tasks) {
    const focusCounts = { deep: 0, medium: 0, shallow: 0, unknown: 0 };
    let totalTasksWithFocus = 0;

    tasks.forEach((task) => {
      if (task.focus === "deep") focusCounts.deep++;
      else if (task.focus === "medium") focusCounts.medium++;
      else if (task.focus === "shallow") focusCounts.shallow++;
      else focusCounts.unknown++; // Count tasks without a focus level

      if (task.focus) totalTasksWithFocus++;
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
            "rgba(231, 76, 60, 0.7)", // Red (Deep)
            "rgba(241, 196, 15, 0.7)", // Yellow (Medium)
            "rgba(52, 152, 219, 0.7)", // Blue (Shallow)
            "rgba(149, 165, 166, 0.5)", // Gray (Unknown)
          ],
          borderColor: [
            "rgba(192, 57, 43, 1)",
            "rgba(194, 150, 10, 1)",
            "rgba(41, 128, 185, 1)",
            "rgba(127, 140, 141, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    const ctx = focusChartCanvas.getContext("2d");

    if (focusChartInstance) {
      focusChartInstance.data = chartData; // Update data
      focusChartInstance.update();
    } else if (totalTasksWithFocus > 0 || focusCounts.unknown > 0) {
      // Only create chart if there's data
      focusChartInstance = new Chart(ctx, {
        type: "pie", // Or 'doughnut' or 'bar'
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false, // Allow chart to fill container better
          plugins: {
            legend: {
              position: "top",
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed !== null) {
                    label += context.parsed + " tasks";
                  }
                  return label;
                },
              },
            },
          },
        },
      });
    } else {
      // Optional: Display a message if no data
      ctx.clearRect(0, 0, focusChartCanvas.width, focusChartCanvas.height);
      ctx.textAlign = "center";
      ctx.fillText(
        "No focus data available.",
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
      .filter((task) => task.scheduledDate) // Must have a scheduled date
      .map((task) => ({
        ...task,
        dateObj: new Date(task.scheduledDate + "T00:00:00"),
      })) // Add Date object for sorting/filtering
      .filter((task) => task.dateObj >= today && task.dateObj < nextWeek) // Filter for next 7 days
      .sort((a, b) => a.dateObj - b.dateObj); // Sort by date

    if (upcoming.length === 0) {
      upcomingTasksUl.innerHTML =
        "<li>No tasks scheduled in the next 7 days.</li>";
      return;
    }

    upcoming.forEach((task) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHTML(
        task.title
      )}</strong> - Due: ${formatDate(task.dateObj)} (${escapeHTML(
        task.category
      )})`;
      // Optional: Add click handler to view/edit task
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
        "Please fill in at least one section to generate the summary.";
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
    // Optional: Add a "Copy to Clipboard" button here
  }

  // --- Export Functions ---
  function exportToJson() {
    const dataStr = JSON.stringify(tasks, null, 2); // Pretty print JSON
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
    // Use flattened history for a more detailed CSV
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
      "EstTime (min)",
      "ScheduledDate",
      "Priority",
      "Focus",
    ];
    // Map data to CSV rows
    const rows = flatHistory.map((entry) => {
      const action = entry.deleted
        ? "Deleted"
        : entry.historyIndex === 0
        ? "Created"
        : "Updated";
      return [
        entry.taskId,
        entry.historyIndex,
        new Date(entry.timestamp).toISOString(), // Use ISO format for consistency
        action,
        `"${escapeCsvField(entry.title || "")}"`, // Quote fields that might contain commas or newlines
        `"${escapeCsvField(entry.category || "")}"`,
        `"${escapeCsvField(entry.description || "")}"`,
        entry.estTime || "",
        entry.scheduledDate || "",
        entry.priority || "",
        entry.focus || "",
      ].join(","); // Join fields with commas
    });

    const csvContent = [headers.join(","), ...rows].join("\n"); // Join header and rows with newlines

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

  // Helper to escape CSV fields containing commas or quotes
  function escapeCsvField(field) {
    if (field === null || field === undefined) return "";
    // Replace quotes with double quotes and wrap in quotes if it contains comma, quote, or newline
    let escaped = String(field).replace(/"/g, '""');
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
    // Basic check for YYYY-MM-DD format and valid date components
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    const date = new Date(dateString + "T00:00:00"); // Use T00:00:00 to avoid timezone issues converting *back* to string
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}` === dateString && !isNaN(date.getTime());
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
          "Are you sure you want to delete this task? This action cannot be undone, but history will be kept."
        )
      ) {
        deleteTask(taskId);
      }
    });

    // Modal close on outside click
    window.addEventListener("click", (event) => {
      if (event.target === taskModal) {
        closeModal();
      }
    });

    // Scheduler Navigation
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
      navigateToDate(new Date()); // Navigate back to today
    });

    // Drop Zone Listeners
    const dropZones = document.querySelectorAll(".drop-zone");
    dropZones.forEach((zone) => {
      zone.addEventListener("dragover", handleDragOver);
      zone.addEventListener("dragleave", handleDragLeave);
      zone.addEventListener("drop", handleDrop);
      // Add touch listeners to drop zones as well (needed for elementFromPoint detection)
      zone.addEventListener("touchmove", handleTouchMove, { passive: false }); // Can potentially detect entering zone here
      zone.addEventListener("touchend", handleTouchEnd);
    });

    // Sidebar Discipline Clicks -> Open modal with pre-filled category
    disciplineList.addEventListener("click", (e) => {
      const listItem = e.target.closest("li");
      if (listItem && listItem.dataset.category) {
        openModalForCreate(listItem.dataset.category);
      }
    });

    // Dashboard Actions
    generateSummaryBtn.addEventListener("click", generateWeeklySummary);
    exportJsonBtn.addEventListener("click", exportToJson);
    exportCsvBtn.addEventListener("click", exportToCsv);
  }

  // --- Start the application ---
  init();
});
