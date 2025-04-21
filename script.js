// DOM Elements
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const dashboardPanel = document.getElementById("dashboard-panel");
const dashboardToggle = document.getElementById("dashboard-toggle");
const newTaskBtn = document.getElementById("new-task-btn");
const taskModal = document.getElementById("task-modal");
const closeModal = document.getElementById("close-modal");
const taskForm = document.getElementById("task-form");
const deleteTaskBtn = document.getElementById("delete-task");
const exportBtn = document.getElementById("export-btn");
const exportModal = document.getElementById("export-modal");
const closeExportModal = document.getElementById("close-export-modal");
const exportJsonBtn = document.getElementById("export-json");
const exportCsvBtn = document.getElementById("export-csv");
const prevDayBtn = document.getElementById("prev-day");
const nextDayBtn = document.getElementById("next-day");
const currentDateEl = document.getElementById("current-date");
const dayViewBtn = document.getElementById("day-view-btn");
const weekViewBtn = document.getElementById("week-view-btn");
const timeSlots = document.getElementById("time-slots");
const taskContainer = document.getElementById("task-container");
const categoriesList = document.getElementById("categories-list");
const upcomingTasksList = document.getElementById("upcoming-tasks-list");
const taskFocusInput = document.getElementById("task-focus");
const taskFocusValue = document.querySelector(".focus-value");
const saveSummaryBtn = document.getElementById("save-summary");

// State
let tasks = [];
let currentDate = new Date();
let currentView = "day";
let draggedTask = null;
let dragStartY = 0;
let dragStartTop = 0;
let summaries = [];

// Initialize the app
function init() {
  loadTasks();
  loadSummaries();
  setupEventListeners();
  renderTimeSlots();
  updateCurrentDateDisplay();
  renderTasks();
  updateDashboard();
}

// Load tasks from localStorage
function loadTasks() {
  const storedTasks = localStorage.getItem("learningTasks");
  if (storedTasks) {
    tasks = JSON.parse(storedTasks);
  }
}

// Load summaries from localStorage
function loadSummaries() {
  const storedSummaries = localStorage.getItem("learningSummaries");
  if (storedSummaries) {
    summaries = JSON.parse(storedSummaries);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("show");
  });

  // Dashboard toggle
  dashboardToggle.addEventListener("click", () => {
    dashboardPanel.classList.toggle("show");
  });

  // New task button
  newTaskBtn.addEventListener("click", () => {
    openTaskModal();
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    taskModal.classList.remove("show");
  });

  // Task form submission
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveTask();
  });

  // Delete task
  deleteTaskBtn.addEventListener("click", () => {
    deleteTask();
  });

  // Export button
  exportBtn.addEventListener("click", () => {
    exportModal.classList.add("show");
  });

  // Close export modal
  closeExportModal.addEventListener("click", () => {
    exportModal.classList.remove("show");
  });

  // Export as JSON
  exportJsonBtn.addEventListener("click", () => {
    exportData("json");
  });

  // Export as CSV
  exportCsvBtn.addEventListener("click", () => {
    exportData("csv");
  });

  // Date navigation
  prevDayBtn.addEventListener("click", () => {
    navigateDate(-1);
  });

  nextDayBtn.addEventListener("click", () => {
    navigateDate(1);
  });

  // View controls
  dayViewBtn.addEventListener("click", () => {
    setView("day");
  });

  weekViewBtn.addEventListener("click", () => {
    setView("week");
  });

  // Category items drag
  categoriesList.querySelectorAll(".category-item").forEach((item) => {
    item.addEventListener("dragstart", handleCategoryDragStart);
    item.setAttribute("draggable", true);
  });

  // Task container drop zone
  taskContainer.addEventListener("dragover", handleDragOver);
  taskContainer.addEventListener("drop", handleDrop);

  // Focus level slider
  taskFocusInput.addEventListener("input", () => {
    taskFocusValue.textContent = taskFocusInput.value;
  });

  // Save weekly summary
  saveSummaryBtn.addEventListener("click", saveWeeklySummary);

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === taskModal) {
      taskModal.classList.remove("show");
    }
    if (e.target === exportModal) {
      exportModal.classList.remove("show");
    }
  });
}

// Render time slots
function renderTimeSlots() {
  timeSlots.innerHTML = "";

  // Create time slots from 6 AM to 10 PM
  for (let hour = 6; hour <= 24; hour++) {
    const timeSlot = document.createElement("div");
    timeSlot.className = "time-slot";
    timeSlot.textContent = formatHour(hour);
    timeSlots.appendChild(timeSlot);
  }
}

// Format hour (24h to 12h)
function formatHour(hour) {
  if (hour === 12) return "12 PM";
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

// Update current date display
function updateCurrentDateDisplay() {
  const options = { weekday: "long", month: "long", day: "numeric" };
  currentDateEl.textContent = currentDate.toLocaleDateString("en-US", options);
}

// Navigate date
function navigateDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  updateCurrentDateDisplay();
  renderTasks();
}

// Set view (day or week)
function setView(view) {
  currentView = view;

  // Update active button
  dayViewBtn.classList.toggle("active", view === "day");
  weekViewBtn.classList.toggle("active", view === "week");

  renderTasks();
}

// Open task modal
function openTaskModal(taskId = null) {
  const modalTitle = document.getElementById("modal-title");
  const taskIdInput = document.getElementById("task-id");
  const taskTitleInput = document.getElementById("task-title");
  const taskCategoryInput = document.getElementById("task-category");
  const taskDescriptionInput = document.getElementById("task-description");
  const taskTimeInput = document.getElementById("task-time");
  const taskDateInput = document.getElementById("task-date");
  const taskStartTimeInput = document.getElementById("task-start-time");
  const taskPriorityInput = document.getElementById("task-priority");
  const taskFocusInput = document.getElementById("task-focus");
  const taskFocusValue = document.querySelector(".focus-value");

  // Reset form
  taskForm.reset();

  // Set default date to current date
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  taskDateInput.value = formattedDate;

  // Set default time to current hour
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String((Math.ceil(now.getMinutes() / 15) * 15) % 60).padStart(
    2,
    "0"
  );
  taskStartTimeInput.value = `${hours}:${minutes}`;

  if (taskId) {
    // Edit existing task
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      modalTitle.textContent = "Edit Task";
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskCategoryInput.value = task.category;
      taskDescriptionInput.value = task.description;
      taskTimeInput.value = task.estimatedTime;
      taskDateInput.value = task.date;
      taskStartTimeInput.value = task.startTime;
      taskPriorityInput.value = task.priority;
      taskFocusInput.value = task.focusLevel;
      taskFocusValue.textContent = task.focusLevel;
      deleteTaskBtn.style.display = "block";
    }
  } else {
    // Create new task
    modalTitle.textContent = "Create New Task";
    taskIdInput.value = "";
    deleteTaskBtn.style.display = "none";
  }

  taskModal.classList.add("show");
}

// Save task
function saveTask() {
  const taskId = document.getElementById("task-id").value;
  const taskTitle = document.getElementById("task-title").value;
  const taskCategory = document.getElementById("task-category").value;
  const taskDescription = document.getElementById("task-description").value;
  const taskTime = parseInt(document.getElementById("task-time").value);
  const taskDate = document.getElementById("task-date").value;
  const taskStartTime = document.getElementById("task-start-time").value;
  const taskPriority = document.getElementById("task-priority").value;
  const taskFocus = parseInt(document.getElementById("task-focus").value);

  const task = {
    id: taskId || generateId(),
    title: taskTitle,
    category: taskCategory,
    description: taskDescription,
    estimatedTime: taskTime,
    date: taskDate,
    startTime: taskStartTime,
    priority: taskPriority,
    focusLevel: taskFocus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (taskId) {
    // Update existing task
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      // Preserve creation date
      task.createdAt = tasks[index].createdAt;
      tasks[index] = task;
    }
  } else {
    // Add new task
    tasks.push(task);
  }

  // Save to localStorage
  saveTasks();

  // Close modal
  taskModal.classList.remove("show");

  // Render tasks
  renderTasks();

  // Update dashboard
  updateDashboard();
}

// Delete task
function deleteTask() {
  const taskId = document.getElementById("task-id").value;
  if (taskId) {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    taskModal.classList.remove("show");
    renderTasks();
    updateDashboard();
  }
}

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem("learningTasks", JSON.stringify(tasks));
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Render tasks
function renderTasks() {
  taskContainer.innerHTML = "";

  let filteredTasks;

  if (currentView === "day") {
    // Filter tasks for current day
    const dateString = currentDate.toISOString().split("T")[0];
    filteredTasks = tasks.filter((task) => task.date === dateString);
  } else {
    // Filter tasks for current week
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    filteredTasks = tasks.filter((task) => {
      const taskDate = new Date(task.date);
      return taskDate >= weekStart && taskDate <= weekEnd;
    });
  }

  // Render each task
  filteredTasks.forEach((task) => {
    const taskCard = createTaskCard(task);
    taskContainer.appendChild(taskCard);
  });
}

// Create task card
function createTaskCard(task) {
  const taskCard = document.createElement("div");
  taskCard.className = "task-card";
  taskCard.id = `task-${task.id}`;
  taskCard.setAttribute("data-id", task.id);
  taskCard.setAttribute("draggable", true);

  // Calculate position based on time
  const [hours, minutes] = task.startTime.split(":").map(Number);
  const top = (hours - 6) * 60 + minutes;
  const height = task.estimatedTime;

  taskCard.style.top = `${top}px`;
  taskCard.style.height = `${height}px`;

  // Set category color
  let categoryColor;
  switch (task.category) {
    case "AI/ML":
      categoryColor = "var(--ai-ml-color)";
      break;
    case "Quantum Computing":
      categoryColor = "var(--quantum-color)";
      break;
    case "Physics":
      categoryColor = "var(--physics-color)";
      break;
    case "Math":
      categoryColor = "var(--math-color)";
      break;
    case "Content Creation":
      categoryColor = "var(--content-color)";
      break;
    case "Freelancing":
      categoryColor = "var(--freelance-color)";
      break;
    default:
      categoryColor = "var(--primary-color)";
  }

  taskCard.style.borderLeft = `4px solid ${categoryColor}`;

  // Task content
  taskCard.innerHTML = `
        <div class="task-header">
            <div>
                <h3 class="task-title">${task.title}</h3>
                <span class="task-time">${formatTime(
                  task.startTime
                )} - ${formatEndTime(task.startTime, task.estimatedTime)}</span>
            </div>
            <span class="task-category" style="background-color: ${categoryColor}">${
    task.category
  }</span>
        </div>
        <p class="task-description">${task.description || "No description"}</p>
        <div class="task-footer">
            <div class="task-priority">
                <span class="priority-indicator ${task.priority}"></span>
                ${formatPriority(task.priority)}
            </div>
            <div class="task-focus">
                Focus: ${renderFocusIndicator(task.focusLevel)}
            </div>
        </div>
    `;

  // Add event listeners for drag and drop
  taskCard.addEventListener("dragstart", handleTaskDragStart);
  taskCard.addEventListener("dragend", handleTaskDragEnd);

  // Add event listener for editing
  taskCard.addEventListener("click", () => {
    openTaskModal(task.id);
  });

  return taskCard;
}

// Format time (24h to 12h)
function formatTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Calculate and format end time
function formatEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(":").map(Number);
  let endMinutes = minutes + durationMinutes;
  let endHours = hours + Math.floor(endMinutes / 60);
  endMinutes = endMinutes % 60;

  const period = endHours >= 12 ? "PM" : "AM";
  const hour12 = endHours % 12 || 12;
  return `${hour12}:${endMinutes.toString().padStart(2, "0")} ${period}`;
}

// Format priority
function formatPriority(priority) {
  switch (priority) {
    case "urgent-important":
      return "Urgent & Important";
    case "not-urgent-important":
      return "Important";
    case "urgent-not-important":
      return "Urgent";
    case "not-urgent-not-important":
      return "Normal";
    default:
      return priority;
  }
}

// Render focus indicator
function renderFocusIndicator(level) {
  let dots = "";
  for (let i = 1; i <= 5; i++) {
    dots += `<span class="focus-dot${i <= level ? "" : " empty"}"></span>`;
  }
  return dots;
}

// Handle category drag start
function handleCategoryDragStart(e) {
  const category = e.target.dataset.category;
  e.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      type: "category",
      category: category,
    })
  );
}

// Handle task drag start
function handleTaskDragStart(e) {
  draggedTask = e.target;
  draggedTask.classList.add("dragging");

  // Store initial position
  dragStartY = e.clientY;
  dragStartTop = parseInt(draggedTask.style.top);

  e.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      type: "task",
      id: draggedTask.dataset.id,
    })
  );

  // Set drag image
  const dragImage = draggedTask.cloneNode(true);
  dragImage.style.width = `${draggedTask.offsetWidth}px`;
  dragImage.style.opacity = "0.7";
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  setTimeout(() => {
    document.body.removeChild(dragImage);
  }, 0);
}

// Handle task drag end
function handleTaskDragEnd(e) {
  if (draggedTask) {
    draggedTask.classList.remove("dragging");
    draggedTask = null;
  }
}

// Handle drag over
function handleDragOver(e) {
  e.preventDefault();

  if (draggedTask) {
    // Calculate new position
    const deltaY = e.clientY - dragStartY;
    let newTop = dragStartTop + deltaY;

    // Snap to 15-minute intervals (15px = 15 minutes)
    newTop = Math.round(newTop / 15) * 15;

    // Constrain to scheduler bounds
    newTop = Math.max(0, newTop);
    newTop = Math.min(16 * 60, newTop); // 16 hours (6 AM to 10 PM)

    draggedTask.style.top = `${newTop}px`;
  }
}

// Handle drop
function handleDrop(e) {
  e.preventDefault();

  const data = JSON.parse(e.dataTransfer.getData("text/plain"));

  if (data.type === "category") {
    // Create new task from category
    const rect = taskContainer.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Calculate time from y position
    const minutes = Math.round(y / 15) * 15;
    const hours = 6 + Math.floor(minutes / 60);
    const mins = minutes % 60;

    const now = new Date();
    const startTime = `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;

    // Open task modal with pre-filled category
    document.getElementById("task-category").value = data.category;
    document.getElementById("task-start-time").value = startTime;
    openTaskModal();
  } else if (data.type === "task" && draggedTask) {
    // Update task time
    const taskId = data.id;
    const task = tasks.find((t) => t.id === taskId);

    if (task) {
      const newTop = parseInt(draggedTask.style.top);
      const hours = 6 + Math.floor(newTop / 60);
      const minutes = newTop % 60;

      task.startTime = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      task.updatedAt = new Date().toISOString();

      saveTasks();
      renderTasks();
    }
  }
}

// Update dashboard
function updateDashboard() {
  updateSubjectChart();
  updateFocusChart();
  updateUpcomingTasks();
}

// Update subject chart
function updateSubjectChart() {
  const subjectChartCanvas = document.getElementById("subject-chart");

  // Calculate time spent per subject
  const subjectData = {};
  const categories = [
    "AI/ML",
    "Quantum Computing",
    "Physics",
    "Math",
    "Content Creation",
    "Freelancing",
  ];

  categories.forEach((category) => {
    subjectData[category] = 0;
  });

  tasks.forEach((task) => {
    if (subjectData.hasOwnProperty(task.category)) {
      subjectData[task.category] += task.estimatedTime;
    }
  });

  // Prepare chart data
  const labels = Object.keys(subjectData);
  const data = Object.values(subjectData);
  const backgroundColors = [
    "rgba(66, 133, 244, 0.7)", // AI/ML
    "rgba(234, 67, 53, 0.7)", // Quantum Computing
    "rgba(251, 188, 5, 0.7)", // Physics
    "rgba(52, 168, 83, 0.7)", // Math
    "rgba(156, 39, 176, 0.7)", // Content Creation
    "rgba(255, 152, 0, 0.7)", // Freelancing
  ];

  // Create chart
  if (window.subjectChart) {
    window.subjectChart.destroy();
  }

  window.subjectChart = new Chart(subjectChartCanvas, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColors,
          borderColor: "rgba(255, 255, 255, 0.8)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            font: {
              size: 10,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const minutes = context.raw;
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              return `${context.label}: ${hours}h ${mins}m`;
            },
          },
        },
      },
    },
  });
}

// Update focus chart
function updateFocusChart() {
  const focusChartCanvas = document.getElementById("focus-chart");

  // Calculate focus distribution
  const focusData = [0, 0, 0, 0, 0];

  tasks.forEach((task) => {
    if (task.focusLevel >= 1 && task.focusLevel <= 5) {
      focusData[task.focusLevel - 1]++;
    }
  });

  // Prepare chart data
  const labels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];
  const backgroundColors = [
    "rgba(66, 133, 244, 0.2)",
    "rgba(66, 133, 244, 0.4)",
    "rgba(66, 133, 244, 0.6)",
    "rgba(66, 133, 244, 0.8)",
    "rgba(66, 133, 244, 1.0)",
  ];

  // Create chart
  if (window.focusChart) {
    window.focusChart.destroy();
  }

  window.focusChart = new Chart(focusChartCanvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Tasks by Focus Level",
          data: focusData,
          backgroundColor: backgroundColors,
          borderColor: "rgba(66, 133, 244, 1.0)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

// Update upcoming tasks
function updateUpcomingTasks() {
  upcomingTasksList.innerHTML = "";

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter and sort upcoming tasks
  const upcomingTasks = tasks
    .filter((task) => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate >= today;
    })
    .sort((a, b) => {
      // Sort by date, then by start time
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }

      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5); // Show only 5 upcoming tasks

  // Render upcoming tasks
  upcomingTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "upcoming-task-item";

    // Get category color
    let categoryColor;
    switch (task.category) {
      case "AI/ML":
        categoryColor = "var(--ai-ml-color)";
        break;
      case "Quantum Computing":
        categoryColor = "var(--quantum-color)";
        break;
      case "Physics":
        categoryColor = "var(--physics-color)";
        break;
      case "Math":
        categoryColor = "var(--math-color)";
        break;
      case "Content Creation":
        categoryColor = "var(--content-color)";
        break;
      case "Freelancing":
        categoryColor = "var(--freelance-color)";
        break;
      default:
        categoryColor = "var(--primary-color)";
    }

    // Format date
    const taskDate = new Date(task.date);
    const isToday = taskDate.toDateString() === today.toDateString();
    const dateText = isToday
      ? "Today"
      : taskDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

    li.innerHTML = `
            <span class="upcoming-task-color" style="background-color: ${categoryColor}"></span>
            <div class="upcoming-task-details">
                <div class="upcoming-task-title">${task.title}</div>
                <div class="upcoming-task-date">${dateText} at ${formatTime(
      task.startTime
    )}</div>
            </div>
        `;

    li.addEventListener("click", () => {
      openTaskModal(task.id);
    });

    upcomingTasksList.appendChild(li);
  });

  // Show message if no upcoming tasks
  if (upcomingTasks.length === 0) {
    const li = document.createElement("li");
    li.className = "upcoming-task-item";
    li.innerHTML =
      '<div class="upcoming-task-details"><div class="upcoming-task-title">No upcoming tasks</div></div>';
    upcomingTasksList.appendChild(li);
  }
}

// Save weekly summary
function saveWeeklySummary() {
  const wentWell = document.getElementById("went-well").value;
  const blockers = document.getElementById("blockers").value;
  const nextSteps = document.getElementById("next-steps").value;

  const summary = {
    id: generateId(),
    week: getWeekNumber(currentDate),
    year: currentDate.getFullYear(),
    wentWell: wentWell,
    blockers: blockers,
    nextSteps: nextSteps,
    createdAt: new Date().toISOString(),
  };

  summaries.push(summary);
  localStorage.setItem("learningSummaries", JSON.stringify(summaries));

  // Clear form
  document.getElementById("went-well").value = "";
  document.getElementById("blockers").value = "";
  document.getElementById("next-steps").value = "";

  alert("Weekly summary saved!");
}

// Get week number
function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Export data
function exportData(format) {
  let content, filename, type;

  if (format === "json") {
    content = JSON.stringify(tasks, null, 2);
    filename = `learning-tasks-${new Date().toISOString().split("T")[0]}.json`;
    type = "application/json";
  } else if (format === "csv") {
    // CSV header
    content =
      "ID,Title,Category,Description,Estimated Time,Date,Start Time,Priority,Focus Level,Created At,Updated At\n";

    // CSV rows
    tasks.forEach((task) => {
      content += `"${task.id}","${task.title}","${
        task.category
      }","${task.description.replace(/"/g, '""')}",${task.estimatedTime},"${
        task.date
      }","${task.startTime}","${task.priority}",${task.focusLevel},"${
        task.createdAt
      }","${task.updatedAt}"\n`;
    });

    filename = `learning-tasks-${new Date().toISOString().split("T")[0]}.csv`;
    type = "text/csv";
  }

  // Create download link
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Close export modal
  exportModal.classList.remove("show");
}

// Initialize the app
document.addEventListener("DOMContentLoaded", init);
