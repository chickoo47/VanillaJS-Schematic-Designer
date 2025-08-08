// --- Custom Drawing Modal Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Element Declarations ---
    const customDrawingModal = document.getElementById('customDrawingModal');
    const customDrawBtn = document.getElementById('customDrawBtn');
    const drawingCanvas = document.getElementById('drawingCanvas');
    const drawingCtx = drawingCanvas.getContext('2d');
    const brushColorInput = document.getElementById('brushColor');
    const brushSizeInput = document.getElementById('brushSize');
    const drawingDoneBtn = document.getElementById('drawingDoneBtn');
    const drawingClearBtn = document.getElementById('drawingClearBtn');
    const drawingCancelBtn = document.getElementById('drawingCancelBtn');
    const drawFreehandBtn = document.getElementById('drawFreehandBtn');
    const drawSquareBtn = document.getElementById('drawSquareBtn');
    const drawCircleBtn = document.getElementById('drawCircleBtn');
    const drawLineBtn = document.getElementById('drawLineBtn');
    const drawArrowBtn = document.getElementById('drawArrowBtn');
    const drawTextBtn = document.getElementById('drawTextBtn');
    const drawChevronLeftBtn = document.getElementById('drawChevronLeftBtn');
    const drawChevronRightBtn = document.getElementById('drawChevronRightBtn');
    const drawEraseBtn = document.getElementById('drawEraseBtn');
    const drawSelectBtn = document.getElementById('drawSelectBtn');
    const drawingTextControls = document.getElementById('drawingTextControls');
    const drawingFontFamily = document.getElementById('drawingFontFamily');
    const drawingFontSize = document.getElementById('drawingFontSize');

    // --- State Variables ---
    let isDrawing = false;
    let startX, startY;
    let currentDrawingMode = 'freehand';
    let drawnPaths = [];
    let currentPath = [];
    let isErasing = false;
    let lastErasePoint = null;
    let previousDrawingMode = 'freehand';

    // --- State for Selection and Transformation ---
    let selectedItemIndex = -1;
    let isDraggingItem = false;
    let isRotatingItem = false;
    let isResizingItem = false; 
    let resizeHandleType = ''; 
    let dragStartCoords = { x: 0, y: 0 };
    let dragStartItemState = null;
    let rotationHandlePos = { x: 0, y: 0 };
    let initialRotationAngle = 0;
    const resizeHandleSize = 8;


    // --- Modal and Canvas Functions ---
    function openCustomDrawModal() {
        customDrawingModal.style.display = 'flex';
        
        requestAnimationFrame(() => {
            const rect = drawingCanvas.getBoundingClientRect();
            drawingCanvas.width = rect.width;
            drawingCanvas.height = rect.height;
            setDrawingMode('freehand');
            clearDrawingCanvas(); 
        });
    }

    function closeCustomDrawModal() {
        customDrawingModal.style.display = 'none';
    }

    function clearDrawingCanvas() {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        drawnPaths = [];
        currentPath = [];
        selectedItemIndex = -1;
        redrawAllPaths();
    }

    // --- Helper and Geometry Functions ---
    function getCanvasCoords(e) {
        const rect = drawingCanvas.getBoundingClientRect();
        const scaleX = drawingCanvas.width / rect.width;
        const scaleY = drawingCanvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    function isPointOnLine(point, item, tolerance = 10) {
        const p1 = {x: item.startX, y: item.startY};
        const p2 = {x: item.endX, y: item.endY};
        const L = distance(p1, p2);
        if (L === 0) return distance(point, p1) < tolerance;
        const t = ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / (L*L);
        if (t < 0 || t > 1) return false; // Not on the segment
        const projection = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
        return distance(point, projection) < tolerance;
    }

    function densifyPath(path, minSegmentLength = 2) {
        const newPath = [];
        if (!path || path.length < 2) return path;

        newPath.push(path[0]);
        for (let i = 1; i < path.length; i++) {
            const p1 = path[i-1];
            const p2 = path[i];
            const dist = distance(p1, p2);
            const segments = Math.ceil(dist / minSegmentLength);

            if (segments > 1) {
                for (let j = 1; j <= segments; j++) {
                    const t = j / segments;
                    const interpX = p1.x + (p2.x - p1.x) * t;
                    const interpY = p1.y + (p2.y - p1.y) * t;
                    newPath.push({ x: interpX, y: interpY });
                }
            } else {
                newPath.push(p2);
            }
        }
        return newPath;
    }

    function getBoundingBox(item) {
        if (!item) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const processPoint = (p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        };
        
        const path = getPathFromItem(item);
        if (path) {
             const center = { cx: (item.startX + item.endX) / 2, cy: (item.startY + item.endY) / 2 };
             path.forEach(p => {
                 const rotatedP = item.rotation ? rotatePoint(p, center, item.rotation) : p;
                 processPoint(rotatedP);
             });
        } else if (item.type === 'text') {
            drawingCtx.font = `${item.size}px ${item.family}`;
            const textWidth = drawingCtx.measureText(item.text).width;
            const textHeight = parseFloat(item.size);
            minX = item.x;
            minY = item.y - textHeight / 1.5;
            maxX = item.x + textWidth;
            maxY = item.y + textHeight / 1.5;
        }

        if(minX === Infinity) return null;
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: minX + (maxX-minX)/2, cy: minY + (maxY-minY)/2 };
    }

    function isPointInBox(point, box) {
        if (!box) return false;
        return point.x >= box.x && point.x <= box.x + box.width &&
               point.y >= box.y && point.y <= box.y + box.height;
    }
    
    function rotatePoint(point, center, angle) {
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    }
    
    function getPathFromItem(item){
        if (item.type === 'freehand') return item.path;
        if (['square', 'circle', 'line', 'arrow', 'chevronLeft', 'chevronRight'].includes(item.type)) {
             let path;
             if(item.type === 'line') path = [{x: item.startX, y: item.startY}, {x: item.endX, y: item.endY}];
             else if(item.type === 'square') path = convertSquareToPath(item);
             else if(item.type === 'circle') path = convertCircleToPath(item);
             else if(item.type === 'arrow') path = convertArrowToPath(item);
             else path = convertChevronToPath(item);
             return path;
        }
        return null;
    }

    function convertSquareToPath(item) {
        const x1 = item.startX, y1 = item.startY, x2 = item.endX, y2 = item.endY;
        return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }, { x: x1, y: y1 }];
    }

    function convertCircleToPath(item, numSegments = 50) {
        const path = [];
        const cx = item.startX + (item.endX - item.startX) / 2;
        const cy = item.startY + (item.endY - item.startY) / 2;
        const rx = Math.abs(item.endX - item.startX) / 2;
        const ry = Math.abs(item.endY - item.startY) / 2;

        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * 2 * Math.PI;
            const x = cx + rx * Math.cos(angle);
            const y = cy + ry * Math.sin(angle);
            path.push({ x, y });
        }
        return path;
    }

    function convertArrowToPath(item) {
        const x1 = item.startX, y1 = item.startY, x2 = item.endX, y2 = item.endY;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = Math.min(distance({x:x1, y:y1}, {x:x2, y:y2}) * 0.4, 15);
        
        const p3 = { x: x2 - headLength * Math.cos(angle - Math.PI / 6), y: y2 - headLength * Math.sin(angle - Math.PI / 6) };
        const p4 = { x: x2 - headLength * Math.cos(angle + Math.PI / 6), y: y2 - headLength * Math.sin(angle + Math.PI / 6) };
        
        return [{x:x1, y:y1}, {x:x2, y:y2}, p3, {x:x2,y:y2}, p4];
    }
    
    function convertChevronToPath(item) {
        const x1 = item.startX, y1 = item.startY, x2 = item.endX, y2 = item.endY;
        const midY = (y1 + y2) / 2;
        
        if (item.type === 'chevronLeft') return [{x: x2, y: y1}, {x: x1, y: midY}, {x: x2, y: y2}];
        else return [{x: x1, y: y1}, {x: x2, y: midY}, {x: x1, y: y2}];
    }

    function setDrawingMode(mode) {
        currentDrawingMode = mode;
        const buttons = document.querySelectorAll('#customDrawingModal .tool-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const btnId = `draw${mode.charAt(0).toUpperCase() + mode.slice(1)}Btn`;
        const activeBtn = document.getElementById(btnId);

        if (activeBtn) activeBtn.classList.add('active');

        drawingTextControls.style.display = mode === 'text' ? 'flex' : 'none';
        
        if (mode === 'select') {
             drawingCanvas.style.cursor = 'default';
        } else if (mode === 'erase') {
            const size = brushSizeInput.value;
            drawingCanvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size*2}" height="${size*2}" viewBox="0 0 ${size*2} ${size*2}"><circle cx="${size}" cy="${size}" r="${size-1}" fill="none" stroke="red" stroke-width="2"/></svg>') ${size} ${size}, auto`;
        } else if (mode === 'text') {
            drawingCanvas.style.cursor = 'text';
        } else {
            drawingCanvas.style.cursor = 'crosshair';
        }
        
        if (mode !== 'select') {
            selectedItemIndex = -1;
            redrawAllPaths();
        }
    }
    
    function eraseAtPoint(coords) {
        let wasAnythingErased = false;
        const eraserRadius = parseInt(brushSizeInput.value, 10);

        for (let i = drawnPaths.length - 1; i >= 0; i--) {
            let item = drawnPaths[i];
            
            if (item.type === 'text') {
                const box = getBoundingBox(item);
                if (isPointInBox(coords, box)) {
                    drawnPaths.splice(i, 1);
                    wasAnythingErased = true;
                }
                continue;
            }

            if (['square', 'circle', 'line', 'arrow', 'chevronLeft', 'chevronRight'].includes(item.type)) {
                 const newPath = densifyPath(getPathFromItem(item), 1);
                 item = { type: 'freehand', path: newPath, color: item.color, size: item.size, rotation: item.rotation, center: item.center };
                 drawnPaths[i] = item;
            }
            
            if (item.type !== 'freehand' || !item.path) continue;

            let pathModified = false;
            const newPolylines = [];
            let currentPoly = [];

            for (let j = 0; j < item.path.length; j++) {
                const point = item.path[j];
                const isInsideEraser = distance(point, coords) < eraserRadius;

                if (!isInsideEraser) {
                    currentPoly.push(point);
                } else {
                    pathModified = true;
                    if (currentPoly.length > 1) newPolylines.push(currentPoly);
                    currentPoly = [];
                }
            }
            if (currentPoly.length > 1) newPolylines.push(currentPoly);

            if (pathModified) {
                wasAnythingErased = true;
                const newPathItems = newPolylines.map(poly => ({...item, path: poly}));
                drawnPaths.splice(i, 1, ...newPathItems);
            }
        }

        if (wasAnythingErased) redrawAllPaths();
    }

    function startDraw(e) {
        const coords = getCanvasCoords(e);
        startX = coords.x;
        startY = coords.y;
        
        if (currentDrawingMode === 'select') {
            if (selectedItemIndex > -1) {
                const item = drawnPaths[selectedItemIndex];
                const center = { cx: (item.startX + item.endX) / 2, cy: (item.startY + item.endY) / 2 };
                const rotatedStart = rotatePoint({x: item.startX, y: item.startY}, center, item.rotation);
                const rotatedEnd = rotatePoint({x: item.endX, y: item.endY}, center, item.rotation);

                if (item.type === 'line' || item.type === 'arrow') {
                    if (distance(coords, rotatedStart) < resizeHandleSize + 5) {
                        isResizingItem = true;
                        resizeHandleType = 'start-point';
                        drawingCanvas.style.cursor = 'move';
                        return;
                    }
                    if (distance(coords, rotatedEnd) < resizeHandleSize + 5) {
                        isResizingItem = true;
                        resizeHandleType = 'end-point';
                        drawingCanvas.style.cursor = 'move';
                        return;
                    }
                }
                
                const box = getBoundingBox(item);
                if (distance(coords, rotationHandlePos) < 15) {
                    isRotatingItem = true;
                    isResizingItem = false;
                    isDraggingItem = false;
                    const rotationCenter = {cx: box.cx, cy: box.cy};
                    initialRotationAngle = Math.atan2(startY - rotationCenter.cy, startX - rotationCenter.cx) - ((item.rotation || 0) * Math.PI / 180);
                    drawingCanvas.style.cursor = 'grabbing';
                    return;
                }
            }

            let foundItem = false;
            for (let i = drawnPaths.length - 1; i >= 0; i--) {
                const item = drawnPaths[i];
                let isHit = false;
                if (item.type === 'line' || item.type === 'arrow') {
                    isHit = isPointOnLine(coords, item);
                } else {
                    const itemBox = getBoundingBox(item);
                    if (itemBox) {
                        let clickPoint = coords;
                        if (item.rotation && item.center) {
                            clickPoint = rotatePoint(coords, item.center, -item.rotation);
                        }
                        isHit = isPointInBox(clickPoint, itemBox);
                    }
                }
                
                if (isHit) {
                    selectedItemIndex = i;
                    isDraggingItem = true;
                    dragStartCoords = coords;
                    dragStartItemState = JSON.parse(JSON.stringify(item));
                    foundItem = true;
                    drawingCanvas.style.cursor = 'grabbing';
                    break;
                }
            }
            
            if (!foundItem) {
                selectedItemIndex = -1;
                drawingCanvas.style.cursor = 'default';
            }

            redrawAllPaths();
            return;
        }

        isDrawing = true;

        if (currentDrawingMode === 'text') {
            isDrawing = false;
            const text = prompt("Enter text:", "Label");
            if (text) {
                 drawnPaths.push({ type: 'text', text, x: startX, y: startY, color: brushColorInput.value, size: drawingFontSize.value, family: drawingFontFamily.value, rotation: 0 });
                redrawAllPaths();
            }
        } else if (currentDrawingMode === 'erase') {
            isErasing = true;
            lastErasePoint = coords;
            eraseAtPoint(coords);
        } else if (currentDrawingMode === 'freehand') {
            currentPath = [{ x: startX, y: startY }];
        }
    }


    function draw(e) {
        if (!isDrawing && !isDraggingItem && !isRotatingItem && !isResizingItem) return;
        const coords = getCanvasCoords(e);

        if (isRotatingItem && selectedItemIndex > -1) {
            const item = drawnPaths[selectedItemIndex];
            const box = getBoundingBox(item);
            const center = {cx: box.cx, cy: box.cy};
            const currentAngle = Math.atan2(coords.y - center.cy, coords.x - center.cx);
            item.rotation = (currentAngle - initialRotationAngle) * (180 / Math.PI);
            redrawAllPaths();
            return;
        }

        if (isResizingItem && selectedItemIndex > -1) {
            const item = drawnPaths[selectedItemIndex];
            if (item.type === 'line' || item.type === 'arrow') {
                if (resizeHandleType === 'start-point') {
                    item.startX = coords.x;
                    item.startY = coords.y;
                } else { // end-point
                    item.endX = coords.x;
                    item.endY = coords.y;
                }
                redrawAllPaths();
            }
            return;
        }

        if(isDraggingItem && selectedItemIndex > -1){
            const item = drawnPaths[selectedItemIndex];
            const totalDx = coords.x - dragStartCoords.x;
            const totalDy = coords.y - dragStartCoords.y;

            if (item.type === 'text') {
                item.x = dragStartItemState.x + totalDx;
                item.y = dragStartItemState.y + totalDy;
            } else if (item.type === 'line' || item.type === 'arrow') {
                item.startX = dragStartItemState.startX + totalDx;
                item.startY = dragStartItemState.startY + totalDy;
                item.endX = dragStartItemState.endX + totalDx;
                item.endY = dragStartItemState.endY + totalDy;
            } else if (item.path) { // freehand
                for (let i = 0; i < item.path.length; i++) {
                    item.path[i].x = dragStartItemState.path[i].x + totalDx;
                    item.path[i].y = dragStartItemState.path[i].y + totalDy;
                }
            } else { // other shapes
                item.startX = dragStartItemState.startX + totalDx;
                item.startY = dragStartItemState.startY + totalDy;
                item.endX = dragStartItemState.endX + totalDx;
                item.endY = dragStartItemState.endY + totalDy;
            }
            redrawAllPaths();
            return;
        }
        
        if (isErasing) {
            const dist = distance(coords, lastErasePoint);
            const steps = Math.max(1, Math.floor(dist / (parseInt(brushSizeInput.value, 10) / 4)));
             for (let i = 0; i < steps; i++) {
                const t = i / steps;
                eraseAtPoint({ 
                    x: lastErasePoint.x + (coords.x - lastErasePoint.x) * t, 
                    y: lastErasePoint.y + (coords.y - lastErasePoint.y) * t 
                });
            }
            lastErasePoint = coords;
            return;
        }

        redrawAllPaths();

        if (currentDrawingMode === 'freehand') {
            drawingCtx.beginPath();
            drawingCtx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
            drawingCtx.lineTo(coords.x, coords.y);
            drawingCtx.strokeStyle = brushColorInput.value;
            drawingCtx.lineWidth = brushSizeInput.value;
            drawingCtx.lineCap = 'round';
            drawingCtx.lineJoin = 'round';
            drawingCtx.stroke();
            currentPath.push({ x: coords.x, y: coords.y });
        } else {
            drawShape(startX, startY, coords.x, coords.y, brushColorInput.value, brushSizeInput.value, currentDrawingMode, drawingCtx);
        }
    }

    function stopDraw(e) {
        if (!isDrawing && !isDraggingItem && !isRotatingItem && !isResizingItem) return;
        
        isDrawing = false;
        isErasing = false;
        isDraggingItem = false;
        isRotatingItem = false;
        isResizingItem = false;
        lastErasePoint = null;
        dragStartItemState = null;

        setDrawingMode(currentDrawingMode);

        if (currentDrawingMode === 'select' || currentDrawingMode === 'erase') {
            redrawAllPaths();
            return;
        }

        const coords = getCanvasCoords(e);
        const newItem = {
            type: currentDrawingMode,
            startX: startX,
            startY: startY,
            endX: coords.x,
            endY: coords.y,
            color: brushColorInput.value,
            size: brushSizeInput.value,
            rotation: 0,
        };

        if (currentDrawingMode === 'freehand') {
            if (currentPath.length > 1) {
                newItem.path = currentPath;
                drawnPaths.push(newItem);
            }
        } else if (currentDrawingMode !== 'text') {
             drawnPaths.push(newItem);
        }
        
        redrawAllPaths();
        currentPath = [];
    }

    function redrawAllPaths() {
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        
        drawnPaths.forEach((item) => {
            drawingCtx.save();
            const center = { cx: (item.startX + item.endX) / 2, cy: (item.startY + item.endY) / 2 };
            
            if (item.rotation && (item.type === 'line' || item.type === 'arrow')) {
                drawingCtx.translate(center.cx, center.cy);
                drawingCtx.rotate(item.rotation * Math.PI / 180);
                drawingCtx.translate(-center.cx, -center.cy);
            } else if (item.rotation && item.center) {
                drawingCtx.translate(item.center.cx, item.center.cy);
                drawingCtx.rotate(item.rotation * Math.PI / 180);
                drawingCtx.translate(-item.center.cx, -item.center.cy);
            }

            if (item.type === 'freehand' || item.type === 'text' || item.type === 'square' || item.type === 'circle' || item.type === 'chevronLeft' || item.type === 'chevronRight') {
                drawShape(item.startX, item.startY, item.endX, item.endY, item.color, item.size, item.type, drawingCtx, item);
            } else {
                drawShape(item.startX, item.startY, item.endX, item.endY, item.color, item.size, item.type, drawingCtx);
            }
            drawingCtx.restore();
        });
        
        if (selectedItemIndex > -1) {
            const item = drawnPaths[selectedItemIndex];
            drawingCtx.save();

            const isLine = item.type === 'line' || item.type === 'arrow';
            const center = isLine ? { cx: (item.startX + item.endX) / 2, cy: (item.startY + item.endY) / 2 } : getBoundingBox(item);

            if (isLine) {
                const rotatedStart = rotatePoint({x: item.startX, y: item.startY}, center, item.rotation);
                const rotatedEnd = rotatePoint({x: item.endX, y: item.endY}, center, item.rotation);
                
                // Draw line selection indicator
                drawingCtx.beginPath();
                drawingCtx.moveTo(rotatedStart.x, rotatedStart.y);
                drawingCtx.lineTo(rotatedEnd.x, rotatedEnd.y);
                drawingCtx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
                drawingCtx.lineWidth = item.size + 5;
                drawingCtx.lineCap = 'round';
                drawingCtx.stroke();

                // Draw handles for line
                [rotatedStart, rotatedEnd].forEach(p => {
                    drawingCtx.beginPath();
                    drawingCtx.arc(p.x, p.y, resizeHandleSize, 0, Math.PI * 2);
                    drawingCtx.fillStyle = 'rgba(0, 150, 255, 0.9)';
                    drawingCtx.fill();
                    drawingCtx.strokeStyle = 'white';
                    drawingCtx.stroke();
                });
            } else {
                const box = getBoundingBox(item);
                if (box) {
                    item.center = {cx: box.x + box.width / 2, cy: box.y + box.height / 2}; 
                    if (item.rotation) {
                        drawingCtx.translate(item.center.cx, item.center.cy);
                        drawingCtx.rotate(item.rotation * Math.PI / 180);
                        drawingCtx.translate(-item.center.cx, -item.center.cy);
                    }
                    drawingCtx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
                    drawingCtx.lineWidth = 2;
                    drawingCtx.setLineDash([5, 5]);
                    drawingCtx.strokeRect(box.x, box.y, box.width, box.height);
                    drawingCtx.setLineDash([]);
                }
            }

            // Rotation handle (common for all)
            const boxForRotation = getBoundingBox(item);
            if (boxForRotation) {
                const rotationCenter = {cx: boxForRotation.cx, cy: boxForRotation.cy};
                const handleUnrotatedY = boxForRotation.y - 20;
                const handleUnrotatedX = boxForRotation.x + boxForRotation.width / 2;
                rotationHandlePos = rotatePoint({x: handleUnrotatedX, y: handleUnrotatedY}, rotationCenter, item.rotation || 0);

                drawingCtx.beginPath();
                drawingCtx.moveTo(rotationCenter.x, rotationCenter.y);
                drawingCtx.lineTo(rotationHandlePos.x, rotationHandlePos.y);
                drawingCtx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
                drawingCtx.stroke();
                
                drawingCtx.beginPath();
                drawingCtx.arc(rotationHandlePos.x, rotationHandlePos.y, 8, 0, Math.PI * 2);
                drawingCtx.fillStyle = 'rgba(0, 150, 255, 0.9)';
                drawingCtx.fill();
            }
            drawingCtx.restore();
        }
    }


    function drawShape(x1, y1, x2, y2, color, size, type, ctx, item) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.fillStyle = color; // for text
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (type) {
            case 'line': ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); break;
            case 'square': ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); break;
            case 'circle':
                ctx.beginPath();
                ctx.ellipse(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            case 'arrow':
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const headLength = Math.min(distance({x:x1, y:y1}, {x:x2, y:y2}) * 0.4, 20);
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.moveTo(x2, y2);
                ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(x2, y2);
                ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
                break;
            case 'chevronLeft': case 'chevronRight':
                const chevronPath = convertChevronToPath({startX: x1, startY: y1, endX: x2, endY: y2, type: type});
                ctx.moveTo(chevronPath[0].x, chevronPath[0].y); ctx.lineTo(chevronPath[1].x, chevronPath[1].y); ctx.lineTo(chevronPath[2].x, chevronPath[2].y);
                break;
            case 'text':
                 ctx.font = `${item.size}px ${item.family}`;
                 ctx.textAlign = 'left';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(item.text, item.x, item.y);
                 break;
            case 'freehand':
                 if (!item.path || item.path.length < 2) return;
                 ctx.moveTo(item.path[0].x, item.path[0].y);
                 for(let i = 1; i < item.path.length; i++) {
                    ctx.lineTo(item.path[i].x, item.path[i].y);
                 }
                 break;
        }
        ctx.stroke();
    }

    function pathsToSvg() {
        if (drawnPaths.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const pathElements = drawnPaths.map(item => {
            let elementString = '';
            const isLine = item.type === 'line' || item.type === 'arrow';
            const center = isLine ? { cx: (item.startX + item.endX) / 2, cy: (item.startY + item.endY) / 2 } : (item.center || getBoundingBox(item));
            const rotation = item.rotation || 0;
            const transform = (rotation && center) ? `transform="rotate(${rotation} ${center.cx} ${center.cy})"` : '';
            
            const updateBoundsFromPath = (path) => {
                if (!path) return;
                 path.forEach(p => {
                    const rp = transform ? rotatePoint(p, center, rotation) : p;
                    minX = Math.min(minX, rp.x - (item.size/2 || 0));
                    minY = Math.min(minY, rp.y - (item.size/2 || 0));
                    maxX = Math.max(maxX, rp.x + (item.size/2 || 0));
                    maxY = Math.max(maxY, rp.y + (item.size/2 || 0));
                });
            };

            if (item.type === 'text') {
                 const box = getBoundingBox(item);
                 if(box) updateBoundsFromPath([{x:box.x, y:box.y}, {x:box.x+box.width, y:box.y+box.height}]);
                 return `<text x="${item.x}" y="${item.y}" font-family="${item.family}" font-size="${item.size}" fill="${item.color}" dominant-baseline="middle" ${transform}>${item.text}</text>`;
            }

            const itemPath = getPathFromItem(item);
            updateBoundsFromPath(itemPath);

            if (itemPath && itemPath.length > 0) {
                let d = `M ${itemPath[0].x} ${itemPath[0].y}`;
                if(item.type === 'arrow'){
                    d = `M ${itemPath[0].x} ${itemPath[0].y} L ${itemPath[1].x} ${itemPath[1].y} M ${itemPath[2].x} ${itemPath[2].y} L ${itemPath[1].x} ${itemPath[1].y} L ${itemPath[4].x} ${itemPath[4].y}`;
                } else {
                     itemPath.forEach((point, index) => {
                        if(index > 0) d += ` L ${point.x} ${point.y}`;
                    });
                }
                elementString = `<path d="${d}" stroke="${item.color}" stroke-width="${item.size}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${transform} />`;
            }
            return elementString;
        }).join('');

        if (minX === Infinity) return null;
        const padding = 20;
        const width = Math.max(1, maxX - minX + (2 * padding));
        const height = Math.max(1, maxY - minY + (2 * padding));
        const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${pathElements}</svg>`;
    }


    // --- Event Listeners ---
    customDrawBtn.addEventListener('click', openCustomDrawModal);
    drawingCanvas.addEventListener('mousedown', startDraw);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDraw);
    drawingCanvas.addEventListener('mouseleave', stopDraw);
    drawingClearBtn.addEventListener('click', clearDrawingCanvas);
    drawingCancelBtn.addEventListener('click', closeCustomDrawModal);

    drawFreehandBtn.addEventListener('click', () => setDrawingMode('freehand'));
    drawSquareBtn.addEventListener('click', () => setDrawingMode('square'));
    drawCircleBtn.addEventListener('click', () => setDrawingMode('circle'));
    drawLineBtn.addEventListener('click', () => setDrawingMode('line'));
    drawArrowBtn.addEventListener('click', () => setDrawingMode('arrow'));
    drawTextBtn.addEventListener('click', () => setDrawingMode('text'));
    drawChevronLeftBtn.addEventListener('click', () => setDrawingMode('chevronLeft'));
    drawChevronRightBtn.addEventListener('click', () => setDrawingMode('chevronRight'));
    drawEraseBtn.addEventListener('click', () => setDrawingMode('erase'));
    drawSelectBtn.addEventListener('click', () => setDrawingMode('select'));

    drawingDoneBtn.addEventListener('click', () => {
        const svgContent = pathsToSvg();
        if (svgContent) {
            if (typeof uploadedSvgs !== 'undefined' && typeof renderUploadedSvgs !== 'undefined') {
                uploadedSvgs.push({ id: Date.now() + Math.random(), svg: svgContent });
                localStorage.setItem('uploadedSvgs', JSON.stringify(uploadedSvgs));
                renderUploadedSvgs();
                closeCustomDrawModal();
            } else {
                 showCustomAlert("Could not save the SVG. Main script components not found.");
            }
        } else {
            showCustomAlert("Nothing was drawn. Please draw something before saving.");
        }
    });

    brushSizeInput.addEventListener('input', () => {
        if (currentDrawingMode === 'erase') setDrawingMode('erase');
    });

    drawingCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (currentDrawingMode === 'erase' || currentDrawingMode === 'select') {
            setDrawingMode(previousDrawingMode);
        } else {
            previousDrawingMode = currentDrawingMode;
            setDrawingMode('erase');
        }
    });
});
