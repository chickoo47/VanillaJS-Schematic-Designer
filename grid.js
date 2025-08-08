/**
 * GridManager for Circuit Designer
 *
 * This class handles drawing a grid on the canvas and snapping elements to it.
 */
class GridManager {
    constructor(board, container, getScale, getPan) {
        this.board = board;
        this.container = container;
        this.getScale = getScale;
        this.getPan = getPan;
        this.gridSize = 20; // Virtual pixels
        this.gridEnabled = false;
        this.snapEnabled = false;

        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.id = 'gridCanvas';
        this.gridCanvas.style.position = 'absolute';
        this.gridCanvas.style.top = '0';
        this.gridCanvas.style.left = '0';
        this.gridCanvas.style.pointerEvents = 'none';
        this.gridCanvas.style.zIndex = '1'; // Just above the drawing board background
        this.container.insertBefore(this.gridCanvas, this.board);

        this.resizeGridCanvas();
        window.addEventListener('resize', () => this.resizeGridCanvas());

        // Add buttons to the toolbar
        this.addToolbarButtons();
    }

    addToolbarButtons() {
        const toolbar = document.getElementById('toolbar');
        
        const gridBtn = document.createElement('button');
        gridBtn.className = 'tool-btn';
        gridBtn.id = 'gridToggleBtn';
        gridBtn.innerHTML = 'Grid Off';
        gridBtn.onclick = () => this.toggleGrid();
        
        const snapBtn = document.createElement('button');
        snapBtn.className = 'tool-btn';
        snapBtn.id = 'snapToggleBtn';
        snapBtn.innerHTML = 'Snap Off';
        snapBtn.onclick = () => this.toggleSnap();

        toolbar.appendChild(gridBtn);
        toolbar.appendChild(snapBtn);
    }

    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        document.getElementById('gridToggleBtn').innerHTML = this.gridEnabled ? 'Grid On' : 'Grid Off';
        document.getElementById('gridToggleBtn').classList.toggle('active', this.gridEnabled);
        this.drawGrid();
    }

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        document.getElementById('snapToggleBtn').innerHTML = this.snapEnabled ? 'Snap On' : 'Snap Off';
        document.getElementById('snapToggleBtn').classList.toggle('active', this.snapEnabled);
    }

    resizeGridCanvas() {
        this.gridCanvas.width = this.container.offsetWidth;
        this.gridCanvas.height = this.container.offsetHeight;
        this.drawGrid();
    }

    drawGrid() {
        if (!this.gridEnabled) {
            this.gridCanvas.getContext('2d').clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
            return;
        }

        const ctx = this.gridCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);

        const scale = this.getScale();
        const { panX, panY } = this.getPan();
        
        const scaledGridSize = this.gridSize * scale;

        // Don't draw if grid lines are too dense
        if (scaledGridSize < 5) return;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        const startX = panX % scaledGridSize;
        const startY = panY % scaledGridSize;

        for (let x = startX; x < this.gridCanvas.width; x += scaledGridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridCanvas.height);
        }

        for (let y = startY; y < this.gridCanvas.height; y += scaledGridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridCanvas.width, y);
        }

        ctx.stroke();
    }

    snapValue(value) {
        if (!this.snapEnabled) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    snapDrag(element, newLeft, newTop) {
        if (!this.snapEnabled) {
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
            return;
        }
        element.style.left = `${this.snapValue(newLeft)}px`;
        element.style.top = `${this.snapValue(newTop)}px`;
    }
}
