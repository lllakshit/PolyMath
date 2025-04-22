document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('main-content');
  const createTaskBtn = document.getElementById('create-task-btn');
  const taskModal = document.getElementById('task-modal');
  const modalTitle = document.getElementById('modal-title');
  const closeModalBtn = taskModal.querySelector('.close-btn');
  const cancelModalBtn = taskModal.querySelector('.cancel-btn');
  const taskForm = document.getElementById('task-form');
  const taskIdInput = document.getElementById('task-id');
  const taskTitleInput = document.getElementById('task-title');
  const taskSubjectInput = document.getElementById('task-subject');
  const taskDescriptionInput = document.getElementById('task-description');
  const taskEstimatedTimeInput = document.getElementById('task-estimated-time');
  const taskScheduledDateInput = document.getElementById('task-scheduled-date');
  const taskFocusLevelInput = document.getElementById('task-focus-level');
  const taskStatusInput = document.getElementById('task-status');
  const deleteTaskBtn = document.getElementById('delete-task-btn');
  const taskHistoryList = document.getElementById('task-history-list');
  const timelineContainer = document.getElementById('timeline-container');
  const currentDateDisplay = document.getElementById('current-date-display');
  const prevDayBtn = document.getElementById('prev-day-btn');
  const nextDayBtn = document.getElementById('next-day-btn');
  const viewModeSelect = document.getElementById('view-mode-select');
  const viewDashboardBtn = document.getElementById('view-dashboard-btn');
  const viewSchedulerBtn = document.getElementById('view-scheduler-btn');
  const schedulerView = document.getElementById('scheduler-view');
  const dashboardView = document.getElementById('dashboard-view');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');

  // Dashboard elements
  const subjectTimeChartCanvas = document.getElementById('subject-time-chart');
  const focusQualityChartCanvas = document.getElementById('focus-quality-chart');
  const upcomingTasksList = document.getElementById('upcoming-tasks-list');
  const weeklySummaryWell = document.getElementById('summary-well');
  const weeklySummaryBlockers = document.getElementById('summary-blockers');
  const weeklySummaryNext = document.getElementById('summary-next');
  const saveSummaryBtn = document.getElementById('save-summary-btn');
  const subjectProgressBarsContainer = document.getElementById('subject-progress-bars');


  // --- State Variables ---
  let tasks = [];
  let currentViewDate = new Date();
  let currentSchedulerMode = 'daily'; // 'daily' or 'weekly'
  let draggedTaskId = null;
  let subjectTimeChart = null;
  let focusQualityChart = null;
  const disciplines = ["AI/ML", "Quantum Computing", "Physics", "Math", "Content Creation", "Freelancing", "Other"];


  // --- Initialization ---
  loadTasks();
  loadWeeklySummary();
  setupEventListeners();
  renderScheduler(); // Initial render


  // --- Core Functions ---

  function loadTasks() {
      const storedTasks = localStorage.getItem('learningTasks');
      tasks = storedTasks ? JSON.parse(storedTasks) : [];
      console.log(`Loaded ${tasks.length} tasks.`);
      // Ensure necessary fields exist (backward compatibility)
      tasks.forEach(task => {
          if (!task.history) task.history = [];
          if (!task.createdAt) task.createdAt = new Date().toISOString(); // Add createdAt if missing
          if (task.scheduledDate && typeof task.scheduledDate === 'string') {
               task.scheduledDate = new Date(task.scheduledDate); // Ensure date object
          }
           if (!task.status) task.status = 'pending'; // Add default status if missing
      });
  }

  function saveTasks() {
      localStorage.setItem('learningTasks', JSON.stringify(tasks));
      console.log('Tasks saved.');
      // Re-render views that depend on task data
      renderScheduler();
      updateDashboard();
  }

  function generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function clearForm() {
      taskForm.reset();
      taskIdInput.value = '';
      modalTitle.textContent = 'Create Task';
      deleteTaskBtn.style.display = 'none';
      taskHistoryList.innerHTML = ''; // Clear history display
      document.querySelector('input[name="priority"]').checked = false; // Uncheck radio buttons
  }

  function populateForm(task) {
      clearForm();
      modalTitle.textContent = 'Edit Task';
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskSubjectInput.value = task.subject;
      taskDescriptionInput.value = task.description || '';
      taskEstimatedTimeInput.value = task.estimatedTime || '';
      taskFocusLevelInput.value = task.focusLevel || 'medium';
      taskStatusInput.value = task.status || 'pending';

      // Format date for datetime-local input: YYYY-MM-DDTHH:mm
      if (task.scheduledDate instanceof Date && !isNaN(task.scheduledDate)) {
          // Adjust for timezone offset to display correctly in local time input
           const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
           const localISOTime = (new Date(task.scheduledDate.getTime() - tzoffset)).toISOString().slice(0, 16);
          taskScheduledDateInput.value = localISOTime;
      } else {
          taskScheduledDateInput.value = '';
      }


      // Set priority radio button
      const priorityRadioButton = taskForm.querySelector(`input[name="priority"][value="${task.priority}"]`);
      if (priorityRadioButton) {
          priorityRadioButton.checked = true;
      }

      deleteTaskBtn.style.display = 'inline-block';

      // Populate history
       taskHistoryList.innerHTML = '';
       if(task.history && task.history.length > 0) {
           task.history.forEach(entry => {
               const li = document.createElement('li');
               const timestamp = new Date(entry.timestamp).toLocaleString();
               li.textContent = `${timestamp}: ${entry.change}`;
               // You could store more detailed changes in the history entry
               taskHistoryList.appendChild(li);
           });
       } else {
            const li = document.createElement('li');
            li.textContent = "No recorded changes.";
            taskHistoryList.appendChild(li);
       }

  }

  function handleFormSubmit(event) {
      event.preventDefault();
      const id = taskIdInput.value;
      const scheduledDateRaw = taskScheduledDateInput.value;
      const priorityElement = taskForm.querySelector('input[name="priority"]:checked');

      if (!priorityElement) {
           alert("Please select a priority.");
           return;
      }

      const taskData = {
          title: taskTitleInput.value.trim(),
          subject: taskSubjectInput.value,
          description: taskDescriptionInput.value.trim(),
          estimatedTime: parseFloat(taskEstimatedTimeInput.value) || null,
          // Store date as Date object or null
          scheduledDate: scheduledDateRaw ? new Date(scheduledDateRaw) : null,
          priority: priorityElement.value,
          focusLevel: taskFocusLevelInput.value,
          status: taskStatusInput.value,
          // history and createdAt are handled below
      };


      if (!taskData.title) {
          alert("Task title is required.");
          return;
      }


      const now = new Date().toISOString();
      let changeMessage = '';

      if (id) { // Editing existing task
          const taskIndex = tasks.findIndex(task => task.id === id);
          if (taskIndex > -1) {
              const originalTask = tasks[taskIndex];
               changeMessage = `Task updated. Status: ${taskData.status}`; // Simple history message
              // Create a history entry before updating
              const historyEntry = {
                   timestamp: now,
                   change: changeMessage, // Or capture specific field changes
                   previousState: { ...originalTask } // Store a snapshot if needed (can consume space)
              };
               // Initialize history array if it doesn't exist
               if (!tasks[taskIndex].history) {
                   tasks[taskIndex].history = [];
               }
              tasks[taskIndex].history.push(historyEntry);

              // Update task fields
              tasks[taskIndex] = { ...originalTask, ...taskData, updatedAt: now }; // Merge changes
               console.log(`Task ${id} updated.`);
          }
      } else { // Creating new task
          taskData.id = generateId();
          taskData.createdAt = now;
          taskData.history = [{ timestamp: now, change: "Task created." }];
          tasks.push(taskData);
           console.log(`Task ${taskData.id} created.`);
      }

      saveTasks();
      closeModal();
      renderScheduler(); // Update the view
  }

  function deleteTask(id) {
       if (!id) return;
       if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            // Instead of fully deleting, maybe mark as deleted for history?
            // Option 1: Mark as deleted
            // const taskIndex = tasks.findIndex(task => task.id === id);
            // if (taskIndex > -1) {
            //     tasks[taskIndex].status = 'deleted';
            //     tasks[taskIndex].deletedAt = new Date().toISOString();
            //      const historyEntry = { timestamp: new Date().toISOString(), change: "Task marked as deleted." };
            //      if (!tasks[taskIndex].history) tasks[taskIndex].history = [];
            //       tasks[taskIndex].history.push(historyEntry);
            // }

            // Option 2: Full deletion (as implemented here)
            tasks = tasks.filter(task => task.id !== id);
            console.log(`Task ${id} deleted.`);
            saveTasks();
            closeModal(); // Close modal if open for this task
            renderScheduler();
       }
  }


  function openModal(task = null) {
      if (task) {
          populateForm(task);
      } else {
          clearForm();
      }
      taskModal.style.display = 'block';
  }

  function closeModal() {
      taskModal.style.display = 'none';
      clearForm();
  }

  // --- Scheduler Rendering ---

  function renderScheduler() {
      updateDateDisplay();
      timelineContainer.innerHTML = ''; // Clear previous content
      timelineContainer.className = ''; // Reset class
      timelineContainer.classList.add(`timeline-${currentSchedulerMode}`);

      if (currentSchedulerMode === 'daily') {
          renderDailyView();
      } else {
          renderWeeklyView();
      }
       attachDragAndDropListeners(); // Re-attach listeners after rendering
  }

  function renderDailyView() {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date

      for (let hour = 0; hour < 24; hour++) {
          const slot = document.createElement('div');
          slot.classList.add('time-slot');
          slot.dataset.hour = hour;
          slot.dataset.date = currentViewDate.toISOString().split('T')[0]; // Store YYYY-MM-DD

          // Add drop zone listeners
          slot.addEventListener('dragover', handleDragOver);
          slot.addEventListener('dragleave', handleDragLeave);
          slot.addEventListener('drop', handleDrop);

          timelineContainer.appendChild(slot);
      }

      // Filter tasks for the current day
      const startOfDay = new Date(currentViewDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentViewDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayTasks = tasks.filter(task =>
          task.scheduledDate &&
          task.scheduledDate >= startOfDay &&
          task.scheduledDate <= endOfDay &&
           task.status !== 'deleted' // Exclude deleted tasks
      );

      // Place tasks in their respective hour slots
      dayTasks.forEach(task => {
          const taskHour = task.scheduledDate.getHours();
          const targetSlot = timelineContainer.querySelector(`.time-slot[data-hour="${taskHour}"]`);
          if (targetSlot) {
              const taskElement = createTaskElement(task);
              targetSlot.appendChild(taskElement);
          }
      });
  }

   function renderWeeklyView() {
       const weekStart = getStartOfWeek(currentViewDate);
       timelineContainer.style.display = 'grid'; // Ensure grid display

       for (let i = 0; i < 7; i++) {
           const dayDate = new Date(weekStart);
           dayDate.setDate(weekStart.getDate() + i);
           const dayIdentifier = dayDate.toISOString().split('T')[0]; // YYYY-MM-DD

           const dayColumn = document.createElement('div');
           dayColumn.classList.add('day-column');
           dayColumn.dataset.date = dayIdentifier;

           const dayHeader = document.createElement('h4');
           dayHeader.textContent = dayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
           dayColumn.appendChild(dayHeader);

           // Add drop zone listeners
           dayColumn.addEventListener('dragover', handleDragOver);
           dayColumn.addEventListener('dragleave', handleDragLeave);
           dayColumn.addEventListener('drop', handleDrop);


           timelineContainer.appendChild(dayColumn);

           // Filter tasks for this specific day
           const startOfDay = new Date(dayDate);
           startOfDay.setHours(0, 0, 0, 0);
           const endOfDay = new Date(dayDate);
           endOfDay.setHours(23, 59, 59, 999);

           const dayTasks = tasks.filter(task =>
               task.scheduledDate &&
               task.scheduledDate >= startOfDay &&
               task.scheduledDate <= endOfDay &&
                task.status !== 'deleted'
           );

           // Append tasks to this day's column
           dayTasks.forEach(task => {
               const taskElement = createTaskElement(task);
               dayColumn.appendChild(taskElement);
           });
       }
   }


  function createTaskElement(task) {
      const div = document.createElement('div');
      div.classList.add('task-item');
      div.setAttribute('draggable', 'true');
      div.dataset.taskId = task.id;
      div.dataset.priority = task.priority; // For CSS styling

      const now = new Date();
       const isOverdue = task.scheduledDate && task.scheduledDate < now && task.status !== 'completed';
       if (isOverdue) {
           div.classList.add('overdue');
       }

       const title = document.createElement('h5');
       title.textContent = task.title;

       const subject = document.createElement('p');
       subject.textContent = `Sub: ${task.subject}`;

       const timeInfo = document.createElement('p');
       let timeText = '';
       if (task.scheduledDate) {
           timeText += `Sched: ${task.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
       }
        if (task.estimatedTime) {
           timeText += ` (${task.estimatedTime}h)`;
        }
       timeInfo.textContent = timeText || 'No time set';
       timeInfo.style.fontSize = '0.75em';


      div.appendChild(title);
      div.appendChild(subject);
      div.appendChild(timeInfo);

      // Add Edit/Reschedule buttons directly on the task for quick actions? (Optional)
       const actions = document.createElement('div');
       actions.classList.add('task-actions');

       const editBtn = document.createElement('button');
       editBtn.textContent = 'Edit';
       editBtn.onclick = (e) => {
           e.stopPropagation(); // Prevent drag start
           openModal(task);
       };

       const completeBtn = document.createElement('button');
       completeBtn.textContent = task.status === 'completed' ? 'Reopen' : 'Done';
       completeBtn.onclick = (e) => {
           e.stopPropagation();
           toggleTaskComplete(task.id);
       };

       actions.appendChild(editBtn);
       actions.appendChild(completeBtn);
       // Only show actions on hover? Consider mobile usability.
       // div.appendChild(actions);


      div.addEventListener('dragstart', handleDragStart);
      div.addEventListener('dragend', handleDragEnd);

       // Add click listener to open modal for editing
       div.addEventListener('click', () => openModal(task));

      return div;
  }

   function toggleTaskComplete(taskId) {
       const taskIndex = tasks.findIndex(task => task.id === taskId);
       if (taskIndex > -1) {
           const task = tasks[taskIndex];
           const newStatus = task.status === 'completed' ? 'pending' : 'completed';
           const changeMessage = `Status changed to ${newStatus}`;
           const now = new Date().toISOString();

            const historyEntry = { timestamp: now, change: changeMessage };
            if (!task.history) task.history = [];
             task.history.push(historyEntry);

           task.status = newStatus;
           task.updatedAt = now;
           if (newStatus === 'completed' && !task.completedAt) {
              task.completedAt = now;
           } else if (newStatus !== 'completed') {
               task.completedAt = null; // Clear completion date if reopened
           }

           saveTasks(); // This will trigger re-render and dashboard update
       }
   }


  // --- Drag and Drop Handlers ---

  function attachDragAndDropListeners() {
      // Elements are created dynamically, so delegate or re-attach
      // Task items have listeners attached during creation (createTaskElement)
      // Drop zones (time-slots, day-columns) have listeners attached during view rendering
  }

  function handleDragStart(event) {
      draggedTaskId = event.target.dataset.taskId;
      event.dataTransfer.setData('text/plain', draggedTaskId);
      event.target.classList.add('dragging');
      console.log(`Dragging task: ${draggedTaskId}`);
  }

  function handleDragEnd(event) {
      if (draggedTaskId) {
           event.target.classList.remove('dragging');
           console.log(`Drag end for task: ${draggedTaskId}`);
      }
      draggedTaskId = null;
      // Remove highlight from all potential drop zones
       document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  function handleDragOver(event) {
      event.preventDefault(); // Necessary to allow dropping
      event.dataTransfer.dropEffect = 'move';
      // Add visual feedback to the potential drop target
      event.currentTarget.classList.add('drag-over');
  }

   function handleDragLeave(event) {
       // Remove visual feedback when dragging away
        event.currentTarget.classList.remove('drag-over');
   }


  function handleDrop(event) {
      event.preventDefault();
      event.currentTarget.classList.remove('drag-over'); // Remove highlight
      const taskId = event.dataTransfer.getData('text/plain');
      const targetElement = event.currentTarget; // The element where it was dropped (time-slot or day-column)
      const taskIndex = tasks.findIndex(task => task.id === taskId);

      if (taskIndex === -1 || !targetElement) {
          console.error('Drop failed: Task or target not found.');
          return;
      }

      const task = tasks[taskIndex];
      const targetDateStr = targetElement.dataset.date; // YYYY-MM-DD
      let newScheduledDate = null;

       try {
           if (targetElement.classList.contains('time-slot')) {
               // Dropped onto a specific hour in daily view
               const targetHour = parseInt(targetElement.dataset.hour, 10);
               newScheduledDate = new Date(targetDateStr);
               newScheduledDate.setHours(targetHour, task.scheduledDate ? task.scheduledDate.getMinutes() : 0, 0, 0); // Keep original minutes or default to 0
           } else if (targetElement.classList.contains('day-column')) {
               // Dropped onto a day column in weekly view
               newScheduledDate = new Date(targetDateStr);
               // Keep original time or set to a default (e.g., 9 AM) if none exists?
               const originalTime = task.scheduledDate instanceof Date ? task.scheduledDate.getHours() : 9;
                const originalMinutes = task.scheduledDate instanceof Date ? task.scheduledDate.getMinutes() : 0;
               newScheduledDate.setHours(originalTime, originalMinutes, 0, 0);
           } else {
               console.error("Dropped on invalid target:", targetElement);
               return;
           }

          // Update task data
          const oldDate = task.scheduledDate ? task.scheduledDate.toLocaleString() : 'None';
           const changeMessage = `Rescheduled from ${oldDate} to ${newScheduledDate.toLocaleString()}`;
           const now = new Date().toISOString();
           const historyEntry = { timestamp: now, change: changeMessage };
            if (!task.history) task.history = [];
             task.history.push(historyEntry);


          task.scheduledDate = newScheduledDate;
          task.updatedAt = now;
           if(task.status === 'overdue') task.status = 'pending'; // If rescheduling an overdue task, reset status

           console.log(`Task ${taskId} dropped onto ${targetElement.className} for date ${newScheduledDate.toISOString()}`);
          saveTasks(); // Save and trigger re-render
       } catch (error) {
            console.error("Error parsing date during drop:", error);
       }
  }


  // --- Date Navigation & View Mode ---

  function updateDateDisplay() {
      if (currentSchedulerMode === 'daily') {
          currentDateDisplay.textContent = currentViewDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } else {
          const weekStart = getStartOfWeek(currentViewDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          currentDateDisplay.textContent = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
  }

  function getStartOfWeek(date) {
      const dt = new Date(date);
      const day = dt.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday as start of week
      return new Date(dt.setDate(diff));
  }

  function changeDate(days) {
      currentViewDate.setDate(currentViewDate.getDate() + days);
      renderScheduler();
  }

  function changeWeek(weeks) {
      currentViewDate.setDate(currentViewDate.getDate() + (weeks * 7));
       renderScheduler();
  }


  // --- View Switching ---
  function switchView(viewToShow) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
      document.querySelectorAll('#sidebar .btn').forEach(b => b.classList.remove('active'));

      if (viewToShow === 'dashboard') {
          dashboardView.classList.add('active-view');
          viewDashboardBtn.classList.add('active');
          updateDashboard(); // Refresh dashboard data
      } else { // Scheduler
          schedulerView.classList.add('active-view');
          viewSchedulerBtn.classList.add('active');
          renderScheduler(); // Refresh scheduler
      }
  }

  // --- Dashboard ---

  function updateDashboard() {
      if (!dashboardView.classList.contains('active-view')) return; // Don't update if not visible

      updateSubjectTimeChart();
      updateFocusQualityChart();
      updateUpcomingTasks();
      updateSubjectProgressBars();
      // Weekly summary is loaded/saved separately
  }

  function aggregateTimePerSubject() {
      const timeMap = {};
      disciplines.forEach(d => timeMap[d] = 0); // Initialize all disciplines
      timeMap['Other'] = 0; // Ensure 'Other' is present

      tasks.filter(t => t.status === 'completed' && t.estimatedTime > 0)
           .forEach(task => {
               const subject = task.subject || 'Other';
               if (timeMap.hasOwnProperty(subject)) {
                   timeMap[subject] += task.estimatedTime;
               } else {
                    timeMap['Other'] += task.estimatedTime; // Add to 'Other' if subject not listed
               }
           });
      return timeMap;
  }

  function updateSubjectTimeChart() {
       const timeData = aggregateTimePerSubject();
       const labels = Object.keys(timeData).filter(key => timeData[key] > 0); // Only show subjects with time
       const data = Object.values(timeData).filter(value => value > 0);

      if (subjectTimeChart) {
          subjectTimeChart.destroy(); // Destroy previous chart instance
      }

      if(labels.length === 0) {
          subjectTimeChartCanvas.getContext('2d').clearRect(0, 0, subjectTimeChartCanvas.width, subjectTimeChartCanvas.height); // Clear canvas
          // Optional: Display a message
           return;
      }


      subjectTimeChart = new Chart(subjectTimeChartCanvas, {
          type: 'doughnut', // Or 'bar'
          data: {
              labels: labels,
              datasets: [{
                  label: 'Hours Spent',
                  data: data,
                   backgroundColor: [ // Add more colors if needed
                       'rgba(255, 99, 132, 0.7)',
                       'rgba(54, 162, 235, 0.7)',
                       'rgba(255, 206, 86, 0.7)',
                       'rgba(75, 192, 192, 0.7)',
                       'rgba(153, 102, 255, 0.7)',
                       'rgba(255, 159, 64, 0.7)',
                       'rgba(199, 199, 199, 0.7)',
                   ],
                   borderColor: '#fff',
                   borderWidth: 1
              }]
          },
           options: {
               responsive: true,
               maintainAspectRatio: false,
               plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Time Allocation per Subject (Completed Tasks)' }
               }
          }
      });
  }

   function aggregateFocusQuality() {
       const focusMap = { 'deep': 0, 'medium': 0, 'shallow': 0, 'break': 0 };
       // Count tasks based on focus level (could also use estimated time)
       tasks.filter(t => t.focusLevel).forEach(task => {
           if (focusMap.hasOwnProperty(task.focusLevel)) {
               focusMap[task.focusLevel]++; // Simple count
           }
       });
       return focusMap;
   }


  function updateFocusQualityChart() {
      const focusData = aggregateFocusQuality();
       const labels = Object.keys(focusData).filter(key => focusData[key] > 0);
       const data = Object.values(focusData).filter(value => value > 0);

      if (focusQualityChart) {
          focusQualityChart.destroy();
      }

      if(labels.length === 0) {
          focusQualityChartCanvas.getContext('2d').clearRect(0, 0, focusQualityChartCanvas.width, focusQualityChartCanvas.height);
          return;
      }

      focusQualityChart = new Chart(focusQualityChartCanvas, {
          type: 'pie',
          data: {
              labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1) + ' Work'), // Nicer labels
              datasets: [{
                  label: 'Task Count by Focus',
                  data: data,
                  backgroundColor: [
                      'rgba(75, 192, 192, 0.7)', // Deep
                      'rgba(54, 162, 235, 0.7)', // Medium
                      'rgba(255, 206, 86, 0.7)', // Shallow
                      'rgba(201, 203, 207, 0.7)'  // Break
                  ],
                   borderColor: '#fff',
                   borderWidth: 1
              }]
          },
           options: {
              responsive: true,
              maintainAspectRatio: false,
               plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Task Distribution by Focus Level' }
               }
          }
      });
  }

  function updateUpcomingTasks() {
      upcomingTasksList.innerHTML = '';
      const now = new Date();
      const upcoming = tasks
          .filter(task => task.status !== 'completed' && task.status !== 'deleted' && task.scheduledDate && task.scheduledDate >= now)
          .sort((a, b) => a.scheduledDate - b.scheduledDate) // Sort by date
          .slice(0, 10); // Show top 10 upcoming

      if (upcoming.length === 0) {
          upcomingTasksList.innerHTML = '<li>No upcoming tasks scheduled.</li>';
          return;
      }

      upcoming.forEach(task => {
          const li = document.createElement('li');
          const dateStr = task.scheduledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          li.innerHTML = `<strong>${task.title}</strong> <small>(${task.subject})</small> - ${dateStr}`;
          upcomingTasksList.appendChild(li);
      });
  }

   // Basic progress calculation (e.g., % of tasks completed per subject)
   function calculateSubjectProgress() {
       const progressMap = {};
       disciplines.forEach(d => progressMap[d] = { completed: 0, total: 0 });
        progressMap['Other'] = { completed: 0, total: 0 };

       tasks.filter(t => t.status !== 'deleted').forEach(task => {
           const subject = task.subject || 'Other';
           if (progressMap.hasOwnProperty(subject)) {
               progressMap[subject].total++;
               if (task.status === 'completed') {
                   progressMap[subject].completed++;
               }
           } else { // Handle if subject somehow isn't in the initial list
               progressMap['Other'].total++;
                if (task.status === 'completed') {
                   progressMap['Other'].completed++;
               }
           }
       });
       return progressMap;
   }


   function updateSubjectProgressBars() {
       subjectProgressBarsContainer.innerHTML = '';
       const progressData = calculateSubjectProgress();

       Object.entries(progressData).forEach(([subject, data]) => {
           if (data.total > 0) { // Only show subjects with tasks
               const percentage = (data.completed / data.total) * 100;

               const container = document.createElement('div');
               container.classList.add('progress-bar-container');

               const label = document.createElement('label');
               label.textContent = `${subject} (${data.completed}/${data.total} tasks)`;

               const progress = document.createElement('progress');
               progress.value = percentage;
               progress.max = 100;

               container.appendChild(label);
               container.appendChild(progress);
               subjectProgressBarsContainer.appendChild(container);
           }
       });
        if(subjectProgressBarsContainer.innerHTML === '') {
           subjectProgressBarsContainer.innerHTML = '<p>No task data for progress bars.</p>';
        }
   }


  // --- Weekly Summary ---
  function loadWeeklySummary() {
      const summary = localStorage.getItem('weeklySummary');
      if (summary) {
          const { well, blockers, next } = JSON.parse(summary);
          weeklySummaryWell.value = well || '';
          weeklySummaryBlockers.value = blockers || '';
          weeklySummaryNext.value = next || '';
      }
  }

  function saveWeeklySummary() {
      const summary = {
          well: weeklySummaryWell.value,
          blockers: weeklySummaryBlockers.value,
          next: weeklySummaryNext.value,
          timestamp: new Date().toISOString() // Record when saved
      };
      localStorage.setItem('weeklySummary', JSON.stringify(summary));
      alert('Weekly summary saved!');
  }


  // --- Export Functionality ---
  function exportTasks(format) {
      if (tasks.length === 0) {
          alert('No tasks to export.');
          return;
      }

      let dataStr = '';
      let filename = '';
      let mimeType = '';

       // Deep copy and convert dates to ISO strings for consistent export
      const tasksToExport = JSON.parse(JSON.stringify(tasks));
      tasksToExport.forEach(task => {
           if(task.scheduledDate) task.scheduledDate = new Date(task.scheduledDate).toISOString();
           if(task.createdAt) task.createdAt = new Date(task.createdAt).toISOString();
            if(task.updatedAt) task.updatedAt = new Date(task.updatedAt).toISOString();
            // Optionally simplify history for export
            if(task.history) {
               task.history = task.history.map(h => ({
                   timestamp: new Date(h.timestamp).toISOString(),
                   change: h.change
               }));
            }
      });


      if (format === 'json') {
          dataStr = JSON.stringify(tasksToExport, null, 2); // Pretty print JSON
          filename = `learning_tasks_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
      } else if (format === 'csv') {
           // Define CSV headers - match the properties you want to export
           const headers = ['id', 'title', 'subject', 'description', 'estimatedTime', 'scheduledDate', 'priority', 'focusLevel', 'status', 'createdAt', 'updatedAt', 'completedAt'];
           const csvRows = [headers.join(',')]; // Header row

           // Add data rows
           tasksToExport.forEach(task => {
               const row = headers.map(header => {
                   let value = task[header] === null || task[header] === undefined ? '' : task[header];
                   // Handle potential commas or quotes within fields
                   if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                       // Escape double quotes by doubling them and enclose in double quotes
                       value = `"${value.replace(/"/g, '""')}"`;
                   }
                   return value;
               });
               csvRows.push(row.join(','));
           });

          dataStr = csvRows.join('\n');
          filename = `learning_tasks_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
      } else {
          return; // Unknown format
      }

      // Create and trigger download link
      const blob = new Blob([dataStr], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); // Append link to body
      a.click(); // Simulate click
      document.body.removeChild(a); // Clean up link
      URL.revokeObjectURL(url); // Release object URL
  }


  // --- Event Listeners Setup ---
  function setupEventListeners() {
      createTaskBtn.addEventListener('click', () => openModal());
      closeModalBtn.addEventListener('click', closeModal);
      cancelModalBtn.addEventListener('click', closeModal);
      taskForm.addEventListener('submit', handleFormSubmit);
      deleteTaskBtn.addEventListener('click', () => {
          const id = taskIdInput.value;
          if (id) {
               deleteTask(id);
          }
      });

      // Close modal if clicked outside the content
      window.addEventListener('click', (event) => {
          if (event.target === taskModal) {
              closeModal();
          }
      });

      // Date navigation
      prevDayBtn.addEventListener('click', () => {
           if (currentSchedulerMode === 'daily') changeDate(-1);
           else changeWeek(-1);
      });
      nextDayBtn.addEventListener('click', () => {
            if (currentSchedulerMode === 'daily') changeDate(1);
            else changeWeek(1);
      });

       // View mode change
       viewModeSelect.addEventListener('change', (event) => {
            currentSchedulerMode = event.target.value;
           // Adjust button text based on mode
            prevDayBtn.textContent = currentSchedulerMode === 'daily' ? '< Day' : '< Week';
            nextDayBtn.textContent = currentSchedulerMode === 'daily' ? 'Day >' : 'Week >';
            renderScheduler();
       });

       // Main view switching
       viewDashboardBtn.addEventListener('click', () => switchView('dashboard'));
       viewSchedulerBtn.addEventListener('click', () => switchView('scheduler'));

       // Weekly Summary Save
        saveSummaryBtn.addEventListener('click', saveWeeklySummary);


       // Export buttons
       exportJsonBtn.addEventListener('click', () => exportTasks('json'));
       exportCsvBtn.addEventListener('click', () => exportTasks('csv'));
  }
});
