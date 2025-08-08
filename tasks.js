class TaskManager {

    constructor() {
        this.taskMode = false;
        this.availableTasks = ['A', 'B', 'C', 'D', 'E'];
        // Defines the color for each task
        this.taskColors = {
            'A': '#e74c3c', // Red
            'B': '#3498db', // Blue
            'C': '#2ecc71', // Green
            'D': '#f1c40f', // Yellow
            'E': '#9b59b6'  // Purple
        };
        this.taskPopup = null;
        this.currentHoveredElement = null;
        this.leaveTimeout = null; // Manages delay before hiding the popup

        // Bind methods for task assignment mode
        this.boundHandleMouseOver = this.handleMouseOver.bind(this);
        this.boundHandleMouseOut = this.handleMouseOut.bind(this);

        // Bind methods for hover-highlight functionality
        this.boundTaskMouseEnter = this.taskMouseEnter.bind(this);
        this.boundTaskMouseLeave = this.taskMouseLeave.bind(this);
        this.boundImageMouseEnter = this.imageMouseEnter.bind(this);
        this.boundImageMouseLeave = this.imageMouseLeave.bind(this);
    }

    /**
     * Gets a set of all tasks that are currently assigned to any element on the board.
     * @returns {Set<string>} A set of assigned task identifiers.
     */
    getAllAssignedTasks() {
        const assigned = new Set();
        // Check both the image data-attributes and the task containers themselves
        document.querySelectorAll('[data-assigned-tasks]').forEach(element => {
            const tasks = JSON.parse(element.dataset.assignedTasks || '[]');
            tasks.forEach(task => assigned.add(task));
        });
        return assigned;
    }

    toggleTaskMode() {
        // In a real application, you would have a global state manager.
        // For this example, we'll assume a global variable `currentAppMode`.
        if (typeof currentAppMode !== 'undefined' && currentAppMode !== 'server') {
            showCustomAlert("Task assignment is only available in Server View.");
            return;
        }

        const taskButton = document.getElementById('task');

        // If we are currently IN task mode, the only action is to turn it OFF.
        if (this.taskMode) {
            this.taskMode = false;
            if (taskButton) {
                taskButton.classList.remove('active');
                taskButton.innerHTML = '☰ Task';
            }
            this.disableTaskMode();
            if (typeof showCustomAlert === 'function') showCustomAlert('Task Mode OFF.');
            return;
        }

        // --- If we are NOT in task mode, we now turn it ON. ---

        // 1. Deactivate all other tools first. This won't cause a loop because this.taskMode is still false.
        if (typeof deactivateAllTools === 'function') {
            deactivateAllTools();
        }

        // 2. Now, enable task mode.
        this.taskMode = true;
        if (taskButton) {
            taskButton.classList.add('active');
            taskButton.innerHTML = '☰ Exit Task Mode';
        }
        this.enableTaskMode();
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Task Mode ON. Hover over an SVG image to assign tasks.');
        }
    }


    /**
     * Enables task mode by adding delegated event listeners to the drawing board.
     * This is efficient and handles dynamically added elements.
     */
    enableTaskMode() {
        const drawingBoard = document.getElementById('drawingBoard');
        if (!drawingBoard) return;
        drawingBoard.addEventListener('mouseover', this.boundHandleMouseOver);
        drawingBoard.addEventListener('mouseout', this.boundHandleMouseOut);
        document.body.style.cursor = 'help'; // Indicate interactive mode
    }

    /**
     * Disables task mode and cleans up listeners and UI elements.
     */
    disableTaskMode() {
        const drawingBoard = document.getElementById('drawingBoard');
        if (!drawingBoard) return;
        drawingBoard.removeEventListener('mouseover', this.boundHandleMouseOver);
        drawingBoard.removeEventListener('mouseout', this.boundHandleMouseOut);
        
        this.hideTaskPopup();
        document.body.style.cursor = 'default';
        this.currentHoveredElement = null;
    }

    /**
     * Handles the 'mouseover' event on the drawing board.
     * If the mouse is over an image container, it shows the task popup.
     * @param {MouseEvent} event - The mouseover event.
     */
    handleMouseOver(event) {
        if (!this.taskMode) return;
        
        // Target only SVG image containers
        const element = event.target.closest('.image-container');
        
        if (element && element !== this.currentHoveredElement) {
            if (this.leaveTimeout) clearTimeout(this.leaveTimeout);
            this.currentHoveredElement = element;
            this.showTaskPopup(element);
        }
    }

    /**
     * Handles the 'mouseout' event on the drawing board.
     * Hides the popup with a delay to allow the user to move the cursor onto the popup.
     * @param {MouseEvent} event - The mouseout event.
     */
    handleMouseOut(event) {
        if (!this.taskMode || !this.currentHoveredElement) return;

        // Check if the mouse is leaving the element or going to a child of it.
        const relatedTarget = event.relatedTarget;
        if (!this.currentHoveredElement.contains(relatedTarget) && relatedTarget !== this.taskPopup && !this.taskPopup?.contains(relatedTarget)) {
            this.leaveTimeout = setTimeout(() => {
                this.hideTaskPopup();
            }, 200);
        }
    }

    /**
     * Removes the task popup from the DOM.
     */
    hideTaskPopup() {
        if (this.taskPopup) {
            this.taskPopup.remove();
            this.taskPopup = null;
            this.currentHoveredElement = null;
        }
    }

    /**
     * Creates and displays the multi-select task popup next to the target element.
     * @param {HTMLElement} element - The element to show the popup for.
     */
    showTaskPopup(element) {
        this.hideTaskPopup(); // Ensure no other popups are open

        const rect = element.getBoundingClientRect();
        this.taskPopup = document.createElement('div');
        this.taskPopup.className = 'task-popup';
        // Position popup relative to the viewport
        this.taskPopup.style.cssText = `
            position: fixed;
            top: ${window.scrollY + rect.top}px;
            left: ${window.scrollX + rect.right + 10}px;
            z-index: 2000;
        `;

        // Get tasks already assigned from the element's dataset
        const assignedTasks = element.dataset.assignedTasks ? JSON.parse(element.dataset.assignedTasks) : [];
        
        let optionsHTML = '<div class="task-popup-header">Assign Tasks</div>';
        
        this.availableTasks.forEach(task => {
            const isChecked = assignedTasks.includes(task);
            optionsHTML += `
                <div class="task-popup-option">
                    <input type="checkbox" id="task-${task}" value="${task}" ${isChecked ? 'checked' : ''}>
                    <label for="task-${task}" style="color: ${this.taskColors[task]};">Task ${task}</label>
                </div>
            `;
        });

        this.taskPopup.innerHTML = optionsHTML;

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'task-popup-apply-btn';
        applyBtn.onclick = () => this.applyTasks(element);
        this.taskPopup.appendChild(applyBtn);

        document.body.appendChild(this.taskPopup);

        // Add listeners to the popup itself to prevent it from closing prematurely
        this.taskPopup.addEventListener('mouseenter', () => {
            if (this.leaveTimeout) clearTimeout(this.leaveTimeout);
        });

        this.taskPopup.addEventListener('mouseleave', () => {
            this.hideTaskPopup();
        });
    }
    
    /**
     * [FIXED] Applies tasks by preserving the state of existing task displays.
     * @param {HTMLElement} element - The element to apply tasks to.
     */
    applyTasks(element) {
        if (!element || !this.taskPopup) return;

        // 1. Get the new, complete list of selected tasks from the popup.
        const selectedTasks = [];
        this.taskPopup.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            selectedTasks.push(checkbox.value);
        });

        // 2. Before deleting, find all old task containers and store their state (position, progress, etc.).
        const oldState = new Map();
        const oldContainers = document.querySelectorAll(`.task-container[data-linked-element-id="${element.dataset.id}"]`);
        
        oldContainers.forEach(container => {
            const assigned = JSON.parse(container.dataset.assignedTasks || '[]');
            if (assigned.length > 0) {
                const taskName = assigned[0];
                // Save the essential properties of the old container.
                oldState.set(taskName, {
                    progress: parseInt(container.dataset.progress, 10) || 0,
                    position: { x: parseFloat(container.style.left), y: parseFloat(container.style.top) },
                    id: container.id,
                    dimensions: { 
                         width: container.style.width,
                         height: container.style.height,
                         rotation: typeof getRotationFromElement === 'function' ? getRotationFromElement(container) : 0
                    }
                });
            }
            // 3. Remove the old container from the DOM.
            container.remove();
        });
        
        // 4. Update the source image's main task list.
        if (selectedTasks.length > 0) {
            element.dataset.assignedTasks = JSON.stringify(selectedTasks);

            if (typeof screenToVirtual === 'function' && typeof createMovableTaskDisplay === 'function') {
                const elementRect = element.getBoundingClientRect();
                let defaultPosition = screenToVirtual(elementRect.left, elementRect.top - 80);
                let yOffsetForNewTasks = 0;

                // 5. Iterate through the new list and recreate the displays.
                selectedTasks.forEach(task => {
                    const preservedState = oldState.get(task);

                    if (preservedState) {
                        // If this task existed before, recreate it using its saved state.
                        createMovableTaskDisplay(preservedState.position, element.dataset.id, [task], preservedState.id, preservedState.progress, preservedState.dimensions);
                    } else {
                        // If this is a brand new task, create it at a default, offset position.
                        const newPosition = { x: defaultPosition.x, y: defaultPosition.y + yOffsetForNewTasks };
                        createMovableTaskDisplay(newPosition, element.dataset.id, [task]);
                        yOffsetForNewTasks += 50; // Stack new tasks below each other.
                    }
                });
            }
        } else {
            // If no tasks are selected, just clear the attribute.
            delete element.dataset.assignedTasks;
        }

        // 6. Update the image's fill color/gradient and save everything.
        this.updateTaskDisplay(element);
        this.hideTaskPopup();
        if (typeof saveDrawingState === 'function') {
            saveDrawingState();
        }
    }

    /**
     * Updates the visual display (SVG fill color) of the source image based on its assigned tasks.
     * For multiple tasks, it creates a dynamic SVG linear gradient.
     * @param {HTMLElement} element - The image element to style.
     */
    updateTaskDisplay(element) {
        const svg = element.querySelector('svg');
        if (!svg) return;

        // --- Cleanup previous state before applying new styles ---
        const oldDefs = svg.querySelector('defs.task-gradient-defs');
        if (oldDefs) oldDefs.remove();
        svg.querySelectorAll('path, rect, circle, polygon, ellipse').forEach(child => {
            child.style.fill = '';
        });

        const tasks = element.dataset.assignedTasks ? JSON.parse(element.dataset.assignedTasks) : [];

        if (tasks.length > 0) {
            if (tasks.length === 1) {
                // --- SINGLE TASK: Apply a solid color fill ---
                const color = this.taskColors[tasks[0]] || '#ccc';
                svg.querySelectorAll('path, rect, circle, polygon, ellipse').forEach(child => {
                    child.style.fill = color;
                });
            } else {
                // --- MULTIPLE TASKS: Create and apply a linear gradient fill ---
                let defs = svg.querySelector('defs');
                if (!defs) {
                    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                    defs.classList.add('task-gradient-defs');
                    svg.prepend(defs);
                }
                const gradientId = `task-gradient-${element.id || Math.random().toString(36).substr(2, 9)}`;
                const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                gradient.setAttribute('id', gradientId);
                
                const segmentWidth = 100 / tasks.length;
                tasks.forEach((task, i) => {
                    const color = this.taskColors[task] || '#ccc';
                    const startOffset = i * segmentWidth;
                    const endOffset = (i + 1) * segmentWidth;
                    
                    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                    stop1.setAttribute('offset', `${startOffset}%`);
                    stop1.setAttribute('stop-color', color);
                    gradient.appendChild(stop1);

                    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                    stop2.setAttribute('offset', `${endOffset}%`);
                    stop2.setAttribute('stop-color', color);
                    gradient.appendChild(stop2);
                });
                defs.appendChild(gradient);
                
                svg.querySelectorAll('path, rect, circle, polygon, ellipse').forEach(child => {
                    child.style.fill = `url(#${gradientId})`;
                });
            }
        }
    }

    /**
     * Iterates through all elements with tasks and updates their display.
     * Useful for restoring state when the drawing is loaded.
     */
    restoreAllTaskDisplays() {
        document.querySelectorAll('.image-container[data-assigned-tasks]').forEach(element => {
            this.updateTaskDisplay(element);
        });
    }

    /**
     * Enables highlight on hover for both task and image containers.
     * Call this after creating/moving a task container.
     */
    enableTaskHoverHighlight() {
        // Highlight when hovering over a task container
        document.querySelectorAll('.task-container').forEach(taskContainer => {
            // Remove previous listeners to avoid duplicates
            taskContainer.removeEventListener('mouseenter', this.boundTaskMouseEnter);
            taskContainer.removeEventListener('mouseleave', this.boundTaskMouseLeave);

            taskContainer.addEventListener('mouseenter', this.boundTaskMouseEnter);
            taskContainer.addEventListener('mouseleave', this.boundTaskMouseLeave);
        });

        // Highlight when hovering over an image container
        document.querySelectorAll('.image-container').forEach(imageContainer => {
            imageContainer.removeEventListener('mouseenter', this.boundImageMouseEnter);
            imageContainer.removeEventListener('mouseleave', this.boundImageMouseLeave);

            imageContainer.addEventListener('mouseenter', this.boundImageMouseEnter);
            imageContainer.addEventListener('mouseleave', this.boundImageMouseLeave);
        });
    }

    // Highlight logic for task container hover
    taskMouseEnter(event) {
        const task = event.currentTarget;
        task.classList.add('highlighted');
        const linkedId = task.dataset.linkedElementId;
        if (linkedId) {
            const image = document.querySelector(`.image-container[data-id="${linkedId}"]`);
            if (image) {
                image.classList.add('highlighted');
                this.showTaskLinkLine(task, image);
            }
        }
    }

    taskMouseLeave(event) {
        const task = event.currentTarget;
        task.classList.remove('highlighted');
        const linkedId = task.dataset.linkedElementId;
        if (linkedId) {
            const image = document.querySelector(`.image-container[data-id="${linkedId}"]`);
            if (image) {
                image.classList.remove('highlighted');
                this.hideTaskLinkLine();
            }
        }
    }

    // Highlight logic for image container hover
    imageMouseEnter(event) {
        const image = event.currentTarget;
        image.classList.add('highlighted');
        // Find all task containers linked to this image
        document.querySelectorAll(`.task-container[data-linked-element-id="${image.dataset.id}"]`).forEach(task => {
            task.classList.add('highlighted');
            this.showTaskLinkLine(task, image);
        });
    }

    imageMouseLeave(event) {
        const image = event.currentTarget;
        image.classList.remove('highlighted');
        document.querySelectorAll(`.task-container[data-linked-element-id="${image.dataset.id}"]`).forEach(task => {
            task.classList.remove('highlighted');
            this.hideTaskLinkLine();
        });
    }

    /**
     * Optionally, draw a temporary SVG line between task and image when hovered.
     */
    showTaskLinkLine(task, image) {
        if (!task || !image) return;
        // Remove any existing line
        this.hideTaskLinkLine();

        // Get center positions (relative to viewport)
        const taskRect = task.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        const taskCenter = { x: taskRect.left + taskRect.width/2, y: taskRect.top + taskRect.height/2 };
        const imageCenter = { x: imageRect.left + imageRect.width/2, y: imageRect.top + imageRect.height/2 };

        // Create SVG overlay
        let svg = document.getElementById('task-link-svg');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'task-link-svg';
            svg.style.position = 'fixed';
            svg.style.left = '0';
            svg.style.top = '0';
            svg.style.width = '100vw';
            svg.style.height = '100vh';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '2002';
            document.body.appendChild(svg);
        }
        svg.innerHTML = `<line x1="${taskCenter.x}" y1="${taskCenter.y}" x2="${imageCenter.x}" y2="${imageCenter.y}" stroke="#f39c12" stroke-width="3" stroke-dasharray="6,4" />`;
    }
    
    hideTaskLinkLine() {
        const svg = document.getElementById('task-link-svg');
        if (svg) svg.innerHTML = '';
    }
}

// --- Initialization ---
// Ensure this script runs after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create a single global instance of the TaskManager
    const taskManager = new TaskManager();

    // Attach the main event listener to the task button in the toolbar
    const taskButton = document.getElementById('task');
    if (taskButton) {
        taskButton.addEventListener('click', () => taskManager.toggleTaskMode());
    }

    // Expose the manager globally for other scripts to use
    window.taskManager = taskManager;
    
    // Initialize hover highlights for any elements already on the page
    taskManager.enableTaskHoverHighlight();
});

/**
 * A standalone function to update task progress from an external source (e.g., backend).
 * @param {string} taskId - The ID of the task container element.
 * @param {number} progress - The progress value (0-100).
 */
function setTaskProgress(taskId, progress) {
    const taskContainer = document.getElementById(taskId);
    if (taskContainer && taskContainer.classList.contains('task-container')) {
        taskContainer.dataset.progress = progress;
        // Assumes existence of an 'updateCircularProgress' function
        if (typeof updateCircularProgress === 'function') {
            updateCircularProgress(taskContainer, progress);
        }
        if (typeof saveDrawingState === 'function') {
            saveDrawingState();
        }
    }
}