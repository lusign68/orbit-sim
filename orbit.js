var ctx=null;
var background = generate_background(1024);
var pos = new Vec(0,10000000);
var vel = new Vec(0,0);
var mouse = {
  x: null,
  y: null,
  buttons: null,
  start: null,
  scroll: 0
};

var system = {
  a: 0,
  M: 0,
  r: 695700000,
  m: 2e30,
  satellites: [
    {
      a: 10000000000,
      M: 0,
      r: 6000000,
      m: 6e24
    }
  ]
};

function setParents(body) {
  if(body.satellites) {
    for(var i in body.satellites) {
      body.satellites[i].parent = body;
      setParents(body.satellites[i]);
    }
  }
}
setParents(system);

var scale = 40000;
var initial_scale = scale;
var desired_scale = scale;
var zoom_end = null;

var debug_output = null;
var debug_lines = {};

document.addEventListener('DOMContentLoaded',function() {
  var canvas = document.getElementById('screen');

  canvas.addEventListener('mousedown', mouseEvent, false);
  canvas.addEventListener('mouseup',   mouseEvent, false);
  canvas.addEventListener('mousemove', mouseEvent, false);

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    mouse.scroll = e.deltaY;
  });

  function mouseEvent(e) {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    mouse.buttons = e.buttons;
    if(e.type == 'mousedown')
      mouse.start = {x: mouse.x, y: mouse.y};
    else if(e.type == 'mouseup')
      mouse.start = null;
  }

  debug_output = document.getElementById('d');

  ctx = canvas.getContext('2d');
  requestAnimationFrame(loop);
});

var last_time = null;
var phys_debt = 0;
var phys_step = 1000/60;

function loop(t) {
  var dt = t - last_time;
  phys_debt += Math.min(dt, 1000);
  last_time = t;
  var distance = Math.sqrt(Math.pow(pos.x, 2) + Math.pow(pos.y, 2));

  while(phys_debt > phys_step) {
    // thrust
    if(mouse.buttons & 1) {
      vel.add(new Vec(mouse.x - mouse.start.x, mouse.start.y - mouse.y).scale(5));
    }

    function updateBodyPos(body) {
      body.M += 0.001;
      if(body.M > Math.PI)
        body.M -= Math.PI;
      body.pos = new Vec(body.a * Math.cos(body.M), body.a * Math.sin(body.M));
      if(body.satellites)
        for(var i in body.satellites)
          updateBodyPos(body.satellites[i]);
    }
    updateBodyPos(system);

    // move
    pos.add(vel);

    debug_lines.pos = pos.x + ', ' + pos.y;

    phys_debt -= phys_step;
  }

  if(mouse.scroll) {
    zoom_end = t + 500;
    initial_scale = scale;
    desired_scale *= (mouse.scroll > 0) ? 1.6 : 0.625;

    mouse.scroll = 0;
  }

  if(desired_scale > 100000000)
    desired_scale = 100000000;
  else if(desired_scale < 1)
    desired_scale = 1;

  if(zoom_end > t) {
    scale = desired_scale + (initial_scale - desired_scale)*(zoom_end-t)/500;
  }
  else {
    scale = desired_scale;
    zoom_end = null;
  }

  debug_lines.scale = scale;

  /** render time **/

  ctx.drawImage(background,0,0);

  function drawBody(body) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = body.r/10 / scale;
    ctx.fillStyle = '#27e';
    ctx.beginPath();
    ctx.arc(
      300 + (body.pos.x - pos.x)/scale,
      300 + (body.pos.y + pos.y)/scale,
      body.r/scale,
      0, 2*Math.PI
    );
    ctx.fill();

    if(body.satellites)
      for(var i in body.satellites)
        drawBody(body.satellites[i]);
  }
  drawBody(system);

  ctx.shadowBlur = 0;

  if(mouse.buttons & 1) {
    ctx.strokeStyle = '#fd1';
    ctx.lineWidth = '3';
    ctx.beginPath();
    ctx.moveTo(300,300);
    ctx.lineTo(300 + (mouse.start.x - mouse.x)/3, 300 + (mouse.start.y - mouse.y)/3);
    ctx.stroke();
  }

  ctx.fillStyle = '#dec';
  ctx.beginPath();
  ctx.arc(300,300,5,0,2*Math.PI);
  ctx.fill();

  d.innerText = '';
  for(var name in debug_lines) {
    d.textContent += name + ': ' + debug_lines[name] + '\r\n';
  }

  requestAnimationFrame(loop);
}

function generate_background(size) {
  var canvas = document.createElement('canvas');
  canvas.height = size;
  canvas.width  = size;
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,size,size);

  for(var i = 0; i < Math.pow(size/16,2); i++) {
    var temp = 3000 + Math.floor(Math.random() * 15000);

    ctx.fillStyle = temp_to_colour(temp);
    ctx.beginPath();
    ctx.arc(
      Math.floor(Math.random() * size),
      Math.floor(Math.random() * size),
      temp/20000 + 1,
      0,2*Math.PI
    );
    ctx.fill();
  }

  return canvas;
}

function temp_to_colour(temp) {
  // http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
  temp /= 100;

  var r = (temp <= 66) ? 255 : Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592));
  var g = Math.min(255, (temp <= 66) ? 99.4708025861 * Math.log(temp) - 161.1195681661 : 288.1221695283 * Math.pow(temp - 60, -0.0755148492));
  var b = (temp >= 66) ? 255 : (temp <= 19) ? 0 : Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307);

  return 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';
}
