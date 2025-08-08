VanillaJS-Schematic-Designer

A feature-rich, browser-based diagram editor built from the ground up with vanilla JavaScript. This project serves as a comprehensive demonstration of advanced front-end engineering, state management, and architectural design patterns without relying on a front-end framework.

The application provides a complete creative suite for visual design and planning, uniquely integrating a task management system directly onto the design components.

Key Features
The editor provides a robust set of features for a seamless design and planning experience.

Feature Category	Details
Interactive Canvas	Infinite pannable and zoomable workspace; Dynamic grid with snap-to-grid functionality.
Element Manipulation	Full support for selecting, moving, resizing, and rotating all elements with intuitive handles.
Component Tools	Upload and manage a library of personal SVG components; Drag-and-drop components onto the canvas.
Custom Drawing Suite	Integrated modal for creating custom SVG shapes from scratch (freehand, lines, shapes, text, eraser).
Visual Workflow System	Assign tasks to any component; Visualize single or multiple tasks with solid colors and gradients.
Element Joining	Create, persist, and adjust visual connection lines between any two elements on the canvas.
Data Persistence	Automatically saves drawings, components, and user preferences (theme) to the browser's localStorage.
Your contribution in adding new features or improving existing ones is highly appreciated. :)

Dependencies
Front-End: A modern web browser (e.g., Chrome, Firefox, Edge).

Back-End:

Python 3.6+

PIP (for package installation)

Python Libraries:

Flask

Flask-Cors

Usage
To use the editor, first you need to clone the repository:

Bash
git clone https://github.com/your-username/VanillaJS-Diagram-Editor.git
cd VanillaJS-Diagram-Editor
Next, follow the Installation & Setup instructions below to run the backend server.

You're done! Here are some ideas on what you can do next:

Design: Create complex diagrams using the built-in tools and your own SVG assets.

Plan: Use the integrated Task and Join modes to build visual project plans and workflows.

Customize: Modify the source code to add new features or improve existing modules.

Experiment: Change CSS variables to create new themes or adjust the behavior of the drawing tools.

Data Persistence
This application uses the browser's localStorage to save all user-generated content. This includes:

All saved drawings, including element positions, connections, and task assignments.

The user's current unsaved session.

The library of all uploaded SVG components.

The selected UI theme (light/dark).

To clear all data, you will need to clear your browser's localStorage for the application's domain.

Installation & Setup
These steps will guide you through setting up and running the required Python backend.

Prerequisites

Ensure you have Python 3 and PIP installed on your system.

Clone the repository to your local machine as described in the Usage section.

Backend Configuration

The backend is a lightweight Flask server responsible for handling user authentication logic.

Create a requirements.txt file in the root of the project directory with the following content:

Flask
Flask-Cors
Create and activate a Python virtual environment (recommended). In the project's root directory, run:

Bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
.\venv\Scripts\activate
Install the dependencies using PIP:

Bash
pip install -r requirements.txt
Run the backend server:

Bash
python server.py
The server will start and listen on http://localhost:3000. Keep this terminal window running.

Launch the application:
Open the index.html file directly in your web browser. The front-end will automatically connect to the running backend server.

Work in Progress & Future Improvements
This is an active project and a portfolio piece. Errors are possible. If you find any issues, please report them by submitting an issue. Contributions are welcome!

Some todos and ideas for future improvements include:

Real-time Collaboration: Integrate WebSockets to allow multiple users to edit the same diagram simultaneously.

Cloud Storage Backend: Replace localStorage with a cloud-based solution (e.g., Firebase, AWS S3) to allow users to access their drawings from any device.

Advanced Drawing Tools: Add support for curved lines, polygons, and path editing.

Export Options: Implement functionality to export the entire canvas as an SVG or high-resolution PNG.

Unit & Integration Tests: Develop a comprehensive test suite to ensure code quality and stability.

Keyboard Shortcut Expansion: Add more keyboard shortcuts for common actions to improve user workflow.

Proper Documentation: Add detailed code-level documentation for all major classes and functions.
