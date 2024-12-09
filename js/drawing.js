/**
 * The source for ChickenBoard
 * Written by Luke Jones
 *
 * ██        ██    ██  ██    ██  ████████  ████████  ██    ██  ██        ██  ██    ██  ████████      ██    ██  ████████  ████████
 * ██        ██    ██  ██  ██    ██        ██    ██  ████  ██  ██        ██  ████  ██  ██            ████  ██  ██          ██
 * ██        ██    ██  ████      ████████  ██    ██  ██  ████  ██        ██  ██  ████  ████████      ██  ████  ████████    ██
 * ██        ██    ██  ██  ██    ██        ██    ██  ██    ██  ██        ██  ██    ██  ██            ██    ██  ██          ██
 * ████████  ████████  ██    ██  ████████  ████████  ██    ██  ████████  ██  ██    ██  ████████  ██  ██    ██  ████████    ██
 * https://www.lukeonline.net/ChickenBoard
 * V1.0
 */

/*
Math Functions
 */
const MathL = {
    clamp: function (v, mn, mx) {
        return Math.max(mn, Math.min(v, mx));
    },

    // Check if value is in range
    rangeCheck: function (v, mn, mx) {
        return (v <= mx && v >= mn);
    },

    // Linear Interpolation
    lerp: function (va, vb, ratio) {
        return va + ratio * (vb - va);
    }
}

// Initialise Program
const canvas = document.getElementById("drawing_canvas");
const overlay = document.getElementById("overlay_canvas");
const gtx = canvas.getContext("2d");
const otx = overlay.getContext("2d");
const canv_width = canvas.width, canv_height = canvas.height;
const size_selector = document.getElementById("tool_size_selector");
const size_selector_container = document.getElementById("tool_size_selector_container");
const spray_strength_selector = document.getElementById("spray_settings_container");
const colour_selector = document.getElementById("colour_selector");
let isDrawingLine = false, lineA = [], lineB = [];
let canvasBounds;

// Initialise usage Variables
const tools = { // Tool types
    BRUSH: 'BRUSH',
    ERASER: 'ERASER',
    PENCIL: 'PENCIL',
    SPRAY: 'SPRAY',
    LINE: 'LINE',
    PICKER: 'PICKER',
    FILL: 'FILL'
}
let toolSize = 8; // Tool size, in pixels
let primaryColour = "#000"; // Current selected colour
let secondaryColour = "#fff"; // Secondary colour (unused)
let spray_strength = 1; // Spray strength, either 1, 2 or 3

let mouseHeld = false; // Is mouse held?
let mouseClicked = false; // Has mouse just been clicked?
let mousepos = [0,0]; // Current mouse position (x, y)
let prevMouseMos = [0,0]; // Mouse position in the last frame (x, y)

/*
 Initialise board appearance
 */
clearCanvas(gtx, "#fff");
clearCanvas(otx, "rgba(0,0,0,0)");

/*
 Checks to see the mouse and engine state before
 beginning the action chain, if needed.
 */
function runMotion() {
    // Make sure tool size is up to date
    toolSize = MathL.clamp(size_selector.value,1,256);
    setPrimaryColour(colour_selector.value);
    updateOverlay();

    if(mouseHeld) {
        if(mouseInCanvas()){
            startAction();
        }
    }
}

/*
 Executes the beginning of the "action" chain where what happens under the users
 pointer is determined by current values, and is executed accordingly.
 Called when mouse is pressed
 */
function startAction() {
    if (currentTool === tools.LINE) {
        if (!mouseClicked) return;

        if (!isDrawingLine) {
            isDrawingLine = true;
            lineA = [...mousepos];
        } else {
            isDrawingLine = false;
            lineB = [...mousepos];

            gtx.beginPath();
            gtx.lineWidth = toolSize;
            gtx.lineCap = "round";
            gtx.moveTo(lineA[0], lineA[1]);
            gtx.lineTo(lineB[0], lineB[1]);
            gtx.stroke();

            lineA = [];
            lineB = [];
        }
        mouseClicked = false;
        return;
    }

    if (currentTool === tools.ERASER) {
        gtx.fillStyle = secondaryColour;
        gtx.strokeStyle = secondaryColour;
    } else {
        gtx.fillStyle = primaryColour;
        gtx.strokeStyle = primaryColour;
    }

    function act() {
        switch (currentTool) {
            case tools.PENCIL:
                gtx.fillRect(mousepos[0] - toolSize / 2, mousepos[1] - toolSize / 2, toolSize, toolSize);
                break;
            case tools.ERASER:
            case tools.BRUSH:
                gtx.beginPath();
                gtx.lineWidth = toolSize;
                gtx.lineCap = "round";
                gtx.moveTo(prevMouseMos[0], prevMouseMos[1]);
                gtx.lineTo(mousepos[0], mousepos[1]);
                gtx.stroke();
                break;
            case tools.SPRAY:
                for (let s = 0; s <= Math.pow(spray_strength, 3); s++) {
                    let dist = Math.random() * (toolSize / 2);
                    let ang = Math.random() * 2 * Math.PI;
                    let dot = [
                        mousepos[0] + dist * Math.cos(ang),
                        mousepos[1] + dist * Math.sin(ang),
                    ];
                    gtx.fillRect(dot[0], dot[1], 1, 1);
                }
                break;
            case tools.PICKER:
                setColourPicker(rgbaToHex(getColorAt(mousepos[0], mousepos[1])));
                break;
            default:
                break;
        }
    }
    act();
    mouseClicked = false;
}

/*
Queries the user before clearing the canvas.
- context is the canvas context to clear
- col is the colour to clear it with
 */
function clearCanvasRequest(context, col) {
    if(confirm("Clear the Canvas? This cannot be undone!")) {
        clearCanvas(context, col);
    }
}

/*
Clearing the given canvas with the given colour.
- context is the canvas context to clear
- col is the colour to clear it with. If transparent (rgba(0,0,0,0)) it will just wipe it clear.
 */
function clearCanvas(context, col) {
    context.fillStyle = col;
    if(col === "rgba(0,0,0,0)") {
        context.clearRect(0,0,canv_width,canv_height);
    } else {
        context.fillRect(0,0,canv_width,canv_height);
    }
}

/*
Updates the overlay canvas when called. Used for things like paint
previews, brush position, e.g.
 */
function updateOverlay() {
    clearCanvas(otx, "rgba(0,0,0,0)")
    otx.strokeStyle = "#666";
    otx.lineWidth = 2;
    switch (currentTool) {
        case "ERASER":
        case "BRUSH":
        case "SPRAY":
            otx.beginPath();
            otx.arc(mousepos[0], mousepos[1], toolSize/2, 0, 2 * Math.PI);
            otx.stroke();
            break;
        case "PENCIL":
            otx.strokeRect(mousepos[0]-(toolSize/2), mousepos[1]-(toolSize/2), toolSize, toolSize);
            break;
        case "LINE":
            if(isDrawingLine){
                otx.lineWidth = toolSize;
                otx.strokeStyle = "rgba(128,128,128,0.5)";
                otx.beginPath();
                otx.lineCap = "round";
                otx.moveTo(lineA[0],lineA[1]);
                otx.lineTo(mousepos[0],mousepos[1]);
                otx.stroke();
                otx.strokeStyle = "#666";
                otx.lineWidth = 2;
            }
        case "PICKER":
        case "FILL":
            otx.beginPath();
            otx.moveTo(mousepos[0]-12, mousepos[1]);
            otx.lineTo(mousepos[0]+12, mousepos[1]);
            otx.stroke();
            otx.beginPath();
            otx.moveTo(mousepos[0], mousepos[1]-12);
            otx.lineTo(mousepos[0], mousepos[1]+12);
            otx.stroke();
            break;
        default:
            break;

    }
}

/*
Updates the sprayStrength to a set value
- str is the new spray strength, either 1, 2 or 3 - weak, light and heavy respectively
 */
function sprayStrength(str) {
    spray_strength = MathL.clamp(str,1,3);
}

/*
 Returns array [R,G,B,A] of pixel at xy
 - x position of the pixel to query
 - y position of the pixel to query
 */
function getColorAt(x, y) {
    const data = gtx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
}
/*
Returns an rgba value as a hex colour value.
- rgba is the colour to convert to hex.
 */
function rgbaToHex(rgba) {
    const { r, g, b } = rgba;
    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/*
Checks to see if two colours match.
 */
function colorsMatch(c1, c2) {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
}

/*
Sets the colour picker selector to a given colour value
- colour is the colour to set the colour picker to.
 */
function setColourPicker(colour){
    colour_selector.value = colour;
}

/*
Sets the primary colour to a given colour value
- colour is the colour to set the primary colour to.
 */
function setPrimaryColour (colour) {
    primaryColour = colour;
}

/*
- - UNUSED
Starts the fill algorithm
- x is the x position of the pixel to fill from
- y is the y position of the pixel to fill from
 */
function startFill(x, y) {
    let startColor = getColorAt(x, y);
    let visited = new Set();
    let queue = [];
    queue.push([x, y]);
    while (queue.length > 0) {
        let [startX, startY] = queue.shift();
        if (visited.has(`${startX},${startY}`)) continue;
        visited.add(`${startX},${startY}`);
        if (!MathL.rangeCheck(startX, 0, canv_width) || !MathL.rangeCheck(startY, 0, canv_height)) continue;
        let currentColor = getColorAt(startX, startY);
        if (!colorsMatch(currentColor, startColor)) continue;
        gtx.fillRect(startX, startY, 1, 1);
        let left = startX;
        while (left >= 0 && colorsMatch(getColorAt(left, startY), startColor)) {
            visited.add(`${left},${startY}`);
            gtx.fillRect(left, startY, 1, 1);
            left--;
        }
        let right = startX + 1;
        while (right < canv_width && colorsMatch(getColorAt(right, startY), startColor)) {
            visited.add(`${right},${startY}`);
            gtx.fillRect(right, startY, 1, 1);
            right++;
        }
        if (startY - 1 >= 0) {
            let newLeft = left + 1;
            while (newLeft < right) {
                if (colorsMatch(getColorAt(newLeft, startY - 1), startColor) && !visited.has(`${newLeft},${startY - 1}`)) {
                    queue.push([newLeft, startY - 1]);
                }
                newLeft++;
            }
        }
        if (startY + 1 < canv_height) {
            let newLeft = left + 1;
            while (newLeft < right) {
                if (colorsMatch(getColorAt(newLeft, startY + 1), startColor) && !visited.has(`${newLeft},${startY + 1}`)) {
                    queue.push([newLeft, startY + 1]);
                }
                newLeft++;
            }
        }
    }
}

/*
Sets the tool to the given tool value and updates the interface and
functionality accordingly
- tool is the tool to set the currentTool to.
 */
function changeTool(tool) {
    size_selector_container.style.display = "none";
    spray_strength_selector.style.display = "none";
    $(".tool_button").css = "";
    let selected;
    switch (tool) {
        case 0:
            currentTool = tools.BRUSH;
            size_selector_container.style.display = "inline-block";
            selected = document.getElementById("button_brush");
            break;
        case 1:
            currentTool = tools.ERASER;
            size_selector_container.style.display = "inline-block";
            selected = document.getElementById("button_eraser");
            break;
        case 2:
            currentTool = tools.PENCIL;
            size_selector_container.style.display = "inline-block";
            selected = document.getElementById("button_pencil");
            break;
        case 3:
            currentTool = tools.SPRAY;
            size_selector_container.style.display = "inline-block";
            spray_strength_selector.style.display = "inline-block";
            selected = document.getElementById("button_spray");
            break;
        case 4:
            currentTool = tools.LINE;
            size_selector_container.style.display = "inline-block";
            selected = document.getElementById("button_line");
            break;
        case 5:
            currentTool = tools.PICKER;
            selected = document.getElementById("button_picker");
            break;
        /*case 6:
            currentTool = tools.FILL;
            break;*/
        default:
            break;
    }
    selected.css = "border: '2px inset #bbccff'; borderRadius: '4px'; background: '#779'";
}

/*
Loads any bitmap image into the canvas
 */
function loadInImage() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function () {
                gtx.drawImage(img, 0,0,canv_width,canv_height);
            };

        };

        reader.readAsDataURL(file);
    }
}

/*
Provides a download dialog for the current canvas viewport
 */
function saveAsImage() {
    if (canvas) {
        const dataURL = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = "canvas.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        console.error("Canvas element not found!");
    }
}

/*
 Check to ensure the mouse is inside the canvas
 */
function mouseInCanvas() {
    return (
        MathL.rangeCheck(mousepos[0], 0, canv_width) &&
        MathL.rangeCheck(mousepos[1], 0, canv_height)
    );
}

/*
 Update mouse variables on movement
 */
document.onmousemove = function (event) {
    prevMouseMos = mousepos;
    canvasBounds = canvas.getBoundingClientRect();
    mousepos = [Math.trunc(event.clientX - canvasBounds.left), Math.trunc(event.clientY - canvasBounds.top)];

    runMotion();
    if (mouseHeld && mouseInCanvas()) {
        startAction();
    }
};
document.onmousedown = function (event) {
    mouseHeld = true;
    mouseClicked = true;
    prevMouseMos = mousepos;
    canvasBounds = canvas.getBoundingClientRect();
    mousepos = [Math.trunc(event.clientX - canvasBounds.left), Math.trunc(event.clientY - canvasBounds.top)];
    if (mouseInCanvas()) {
        startAction();
    }
};
document.onmouseup = function () {
    mouseHeld = false;
};


changeTool(0);

