inlets = 3;
outlets = 4;

// UI
var background_rgb = [0, 0, 0, 0];
var curve_rgb = [0., 0., 0., 1.];

var curve_width = 4.;
var handle_width = 4.;

var gradient_rgba = [0, 0, 0, 0.2];

var handle_size = 10.;
var handle_color = [0, 0, 0, 1.];

var handleClicked = 0.;

// Filter Coefficients
var a_coeff = [0.177235, 0.354469, 0.177235];
var b_coeff = [-0.508687, 0.217626];

// Filter Values
var Frequency = 8000.;
var Morph = 0.;
var Q = 0.707;
var filter_values = [Morph, Frequency, Q];

// Samplerate & Freq scaling
var sample_rate = 44100;
var mod_lo = Math.log(0.5);
var freq_lo = 20.;
var freq_hi = 20000;
var log_freq_lo = Math.log(freq_lo);
var log_freq_hi = Math.log(freq_hi);

var freq_consts = [];

// Grid
var freq_grid = [100, 1000, 10000];
var grid_color = [0., 0., 0., 1.];
var grid_line = (1.);


// Mouse
var isDragging = false;
var initialMouseX = 0;
var initialMouseY = 0;


// Canvas
var ui_width = box.rect[2] - box.rect[0];
var ui_height = box.rect[3] - box.rect[1];

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

function msg_float(val){
    switch(inlet) {
        case 0:
            Morph = val;
            break;
        case 1: 
            Frequency = val;
            break;
        case 2:
            Q = val;
            break;
    }

    Morph = Math.min(4, Math.max(0, Morph));
    Q = Math.min(100, Math.max(0.01, Q));
    Frequency = Math.min(sample_rate/2, Math.max(1, Frequency));

    filter_values = [Morph, Frequency, Q];
    var coeffs = calculateBiquadCoefficients(Morph, Frequency, Q);
    a_coeff = coeffs.a;
    b_coeff = coeffs.b;
    mgraphics.redraw(); 
}


function half_samplerate() {
	freq_hi = samplerate /2.;
}

function set_grid_line(val) {
    grid_line = (val);
    mgraphics.redraw();
}
   
fill_freq_consts();

function set_samplerate(sr) {
    sample_rate = (sr);
    mgraphics.redraw();
}

function set_curve_width(val) {
    curve_width = (val);
    mgraphics.redraw();
}

function set_handle_width(val) {
    handle_width = (val);
    mgraphics.redraw();
}

/// COLORS

function set_curve_rgba(r, g, b, a) {
    curve_rgb = [r, g, b, a];
    set_gradient_alpha(r, g, b, gradient_rgba[3]);
    mgraphics.redraw();
}

function set_gradient_alpha(a) {
    gradient_rgba = [curve_rgb[0], curve_rgb[1], curve_rgb[2], a];
    mgraphics.redraw();
}

function set_grid_rgba(r, g, b, a) {
    grid_color = [r, g, b, a];
    mgraphics.redraw();
}

function set_handle_size(radius) {
    handle_size = (radius);
    mgraphics.redraw();
}

function set_handle_rgba(r, g, b, a) {
    handle_color = [r, g, b, a];
    mgraphics.redraw();
}

function calculateBiquadCoefficients(Morph, Frequency, Q) {

    var w0 = 2 * Math.PI * Frequency / sample_rate;
    var cosw = Math.cos(w0);
    var sinw = Math.sin(w0);
    var alpha = sinw * 0.5 / Q;

    var BP_norm = Math.min(10, Math.max(1, Q));

    var a0, a1, a2, b0, b1, b2;

    var LP = {};
    var BP = {};
    var HP = {};
    var BS = {};

    // Lowpass
    LP.b0 = 1 / (1 + alpha);
    LP.b1 = -2 * cosw * LP.b0;
    LP.b2 = (1 - alpha) * LP.b0;
    LP.a0 = (1 - cosw) / 2 * LP.b0;
    LP.a1 = (1 - cosw) * LP.b0;
    LP.a2 = LP.a0;

    LP.morph = 1 - ((Math.min(1, Math.abs(Morph - 0)) + Math.min(1, Math.abs(Morph - 4))) - 1);

    // Bandpass
    BP.b0 = 1 / (1 + alpha);
    BP.b1 = -2 * cosw * BP.b0;
    BP.b2 = (1 - alpha) * BP.b0;
    BP.a0 = alpha * BP.b0 * BP_norm;
    BP.a1 = 0.;
    BP.a2 = -alpha * BP.b0 * BP_norm;

    BP.morph = 1 - Math.min(1, Math.abs(Morph - 1));

    // Highpass
    HP.b0 = 1/(1 + alpha);
    HP.b1 = (-2 * cosw) * HP.b0;
    HP.b2 = (1 - alpha) * HP.b0;
    HP.a0 = (1 + cosw) / 2 * HP.b0;
    HP.a1 = -(1 + cosw) * HP.b0;
    HP.a2 = HP.a0;

    HP.morph = 1 - Math.min(1, Math.abs(Morph - 2));

    // Bandstop
    BS.b0 = 1/(1 + alpha);
    BS.b1 = -2 * cosw * BS.b0;
    BS.b2 = (1 - alpha) * BS.b0;
    BS.a0 = BS.b0;
    BS.a1 = BS.b1;
    BS.a2 = BS.b0;

    BS.morph = 1 - Math.min(1, Math.abs(Morph - 3));
    
    // Interpolating
    a0 = (LP.a0*LP.morph) + (BP.a0*BP.morph) + (HP.a0*HP.morph) + (BS.a0*BS.morph);
    a1 = (LP.a1*LP.morph) + (BP.a1*BP.morph) + (HP.a1*HP.morph) + (BS.a1*BS.morph);
    a2 = (LP.a2*LP.morph) + (BP.a2*BP.morph) + (HP.a2*HP.morph) + (BS.a2*BS.morph);
    b0 = (LP.b0*LP.morph) + (BP.b0*BP.morph) + (HP.b0*HP.morph) + (BS.b0*BS.morph);
    b1 = (LP.b1*LP.morph) + (BP.b1*BP.morph) + (HP.b1*HP.morph) + (BS.b1*BS.morph);
    b2 = (LP.b2*LP.morph) + (BP.b2*BP.morph) + (HP.b2*HP.morph) + (BS.b2*BS.morph);

    return { a: [a0, a1, a2], b: [b1, b2] };
}

function fill_freq_consts()
{
    var i;  
    freq_consts = new Array;
    
    for (i = 0; i < ui_width + 1; i++)
        freq_consts[i] = x2freq(i);
}

function freq2x(freq)
{
    return ui_width * (Math.log(freq) - log_freq_lo) / (log_freq_hi - log_freq_lo);
}

function x2freq(x)
{
    return Math.exp((x / ui_width) * (log_freq_hi - log_freq_lo) + log_freq_lo);
}

function y2q(y) { 
    var y_range = Math.pow(100, 1-(y/ui_height)) / 10;
    return Math.max(0.01, Math.min(100, y_range));
}

function y2morph(y) { 
    var morphing;
    if (y > 0.) {
       morphing = y / 30. % 4.;
    } else {
        morphing = 4 - Math.abs(y / 30. % 4.);
    }
    return morphing;
}

function q2y(q) {
    var y = (1 - (Math.log(q) / Math.log(100) + 0.5)) * ui_height;
    return y;
}

function num_den(i) {
    w = Math.PI * 2. * freq_consts[i] * (1 / sample_rate);

    numerator = a_coeff[0]*a_coeff[0] + a_coeff[1]*a_coeff[1] + a_coeff[2]*a_coeff[2] + 2.0*(a_coeff[0]*a_coeff[1] + a_coeff[1]*a_coeff[2])*Math.cos(w) + 2.0*a_coeff[0]*a_coeff[2]* Math.cos(2.0*w);
    denominator = 1.0 + b_coeff[0]*b_coeff[0] + b_coeff[1]*b_coeff[1] + 2.0*(b_coeff[0] + b_coeff[0]*b_coeff[1])*Math.cos(w) + 2.0*b_coeff[1]* Math.cos(2.0*w);
    
    mag = (Math.sqrt(numerator / denominator));
    return mag2y = q2y(mag);
}

function handle_state(state) {
    handleClicked = (state);
}

var optionOnClick = 0.;
var initialMorph;

function onclick(x, y, button, mod1, shift, capslock, option, ctrl) {
    
    optionOnClick = option;

    if (button == true) {

        var handle_x = Math.round(freq2x(filter_values[1] - handle_size / 2)) + 0.5;
        var log_handle_y = Math.log(filter_values[2]) / Math.log(100);
        var handle_y = (ui_height / 2 - log_handle_y * ui_height + ui_height * 0.05);

        isDragging = true;
        initialMouseX = x;
        initialMouseY = y;
    } 
    
}

var prevOptionState = 0;

function ondrag(x, y, button, mod1, shift, capslock, option, ctrl) {
    if (isDragging) {
        
        handle_state(1);
        var dx = x - initialMouseX;
        var dy = y - initialMouseY;

        if (option) { 
            max.message("showcursor");

            if (prevOptionState === 0) {
                initialMorph = filter_values[0];

                MinitialMouseY = y;
            }
            
            var Mdy = y - MinitialMouseY;
    
                Morph = (initialMorph + y2morph(Mdy*(-1))) % 4.;
                if (shift) {
                    Morph = Math.round(Morph);
                 }
                Morph = Math.min(4, Math.max(0, Morph));
                filter_values[0] = Morph;
                
                outlet(1, Morph); 
                
                if (prevOptionState === 0) {
                    max.message("hidecursor");
                }
                

            var coeffs = calculateBiquadCoefficients(Morph, Frequency, Q);
            a_coeff = coeffs.a;
            b_coeff = coeffs.b;

            mgraphics.redraw();
            
        } else {  
            max.message("hidecursor");

            if (x < 0 || x > ui_width || y < 0 || y > ui_height){
                max.message("showcursor");
            }

            if (prevOptionState === 1) {
                max.message("showcursor");
            }
            var freq = x2freq(initialMouseX + dx);
            freq = Math.max(freq_lo, Math.min(freq_hi, freq));
            var q = y2q(y);

            q = parseFloat(q.toFixed(2));

            Frequency = freq;
            Q = q;

            outlet(2, freq); 
            outlet(3, q); 
            var coeffs = calculateBiquadCoefficients(filter_values[0], freq, q);
            a_coeff = coeffs.a;
            b_coeff = coeffs.b;

            mgraphics.redraw();   
        }
        prevOptionState = option;
    } 

    if (button == false) {
        max.message("showcursor");
        handle_state(0);
    }
}

function paint()
{        
    var i;

    with (mgraphics) 
    {
		internalresize(mgraphics.size[0], mgraphics.size[1]);

        set_source_rgba(0., 0., 0., 0.);
        rectangle(0, 0, ui_width, ui_height);
        fill();

        set_source_rgba(grid_color);
        set_line_width(grid_line);
        
        // Draw Grid
        for (i = 0; i < freq_grid.length; i++)
        {
            var x = Math.round(freq2x(freq_grid[i]));
            move_to(x, 0);
            line_to(x, ui_height);
        }

        move_to(0, q2y(1));
        line_to(ui_width, q2y(1));

        stroke();

        set_line_width(1.);
        set_source_rgba(gradient_rgba);

        // fill Curve
        for (i = 0.; i < ui_width; i++)
        {
            y = num_den(i);

            if (isNaN(y) || !isFinite(y)) {
                y = ui_height+curve_width;
            }

            move_to (i, y);
            line_to (i, ui_height);
        }
        stroke();

        // Draw Curve 
        set_line_width(curve_width);
        set_source_rgba(curve_rgb);
        set_line_join("round");
    
        for (i = 0.; i < ui_width; i++)
        {
            y = num_den(i);

            if (isNaN(y) || !isFinite(y)) {
                y = ui_height+curve_width;
            }

            if (i == 0)
            move_to (0, y); 
            else
            line_to (i, y);
        }
        stroke();

        // Draw Handle
        set_line_width(handle_width);
        set_source_rgba(curve_rgb);

        var handle_x = Math.round(freq2x(Frequency));
        var handle_y = q2y(Q);
        //handle_y = Math.max(0, Math.min(ui_height, handle_y));
        arc (handle_x, handle_y, handle_size, 0, Math.PI * 2);
        stroke();
        if (handleClicked) {
            arc (handle_x, handle_y, handle_size, 0, Math.PI * 2);
            fill();
        }

        if (handle_y+handle_size < 0) {
            set_line_cap("round")
            set_line_join("round")

            move_to(handle_x, handle_size/2);
            rel_line_to(handle_size, handle_size);
            move_to(handle_x, handle_size/2);
            rel_line_to(-handle_size, handle_size);
            stroke();
        }

        if (handle_y-handle_size > ui_height) {
            set_line_cap("round")
            set_line_join("round")

            move_to(handle_x, ui_height-handle_size/2);
            rel_line_to(handle_size, -handle_size);
            move_to(handle_x, ui_height-handle_size/2);
            rel_line_to(-handle_size, -handle_size);
            stroke();
        }
        outlet(0, a_coeff, b_coeff);
}
}

function internalresize(w,h)
{
    if (ui_width != w || ui_height != w)
	{
		ui_width = w;
    	ui_height = h;
	}
}
internalresize.local = 1; 

function onresize(w,h)
{
    ui_width = w;
    ui_height = h;

    internalresize(w, h);
    fill_freq_consts();
 	mgraphics.redraw();
}
onresize.local = 1; 