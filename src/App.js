import React from 'react';
import './App.css';
import loadedMap from './map.json';
import Matrix from './lib/matrix.js';
import NeuralNetwork from './lib/nn.js';

const WIDTH = 1000;
const HEIGHT = 600;
const POPULATION = 150;
var SHOW_SENSORS = true;
let Map = [];

class Sensor {
  constructor(ctx, x0, y0, distance) {
    this.x0 = x0;
    this.y0 = y0;
    this.ctx = ctx;
    this.distance = distance;
    this.data = -1;
  }

  draw = (angle) => {
    this.ctx.moveTo(this.x0, this.y0);
    this.ctx.lineTo(this.x0 + this.distance * Math.cos(angle), this.y0 + this.distance * Math.sin(angle));
    this.ctx.stroke();
  }

  update = (car) => {
    this.x0 = car.x + car.width / 2;
    this.y0 = car.y;
    this.x1 = car.x + car.width / 2;
    this.y1 = car.y;
  }

  detectCollusion = (angle) => {
    var _x1 = this.x0;
    var _x2 = this.x0 + this.distance * Math.cos(angle);
    var _y1 = this.y0;
    var _y2 = this.y0 + this.distance * Math.sin(angle);


    var canvas = document.getElementById("can");
    var ctx = canvas.getContext('2d');

    var minLength = [];
    var point = {};
    Map.forEach(element => {
      point = this.getIntersectionPointOfTwoLines({
        x1: _x1,
        y1: _y1,
        x2: _x2,
        y2: _y2
      },
        {
          x1: element.x1,
          y1: element.y1,
          x2: element.x2,
          y2: element.y2
        });

      if (point != null) {
        //print
        if(SHOW_SENSORS)
        {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
          ctx.fillStyle = "#0F0";
          ctx.fill();
        }

        minLength.push(Math.sqrt(Math.pow(point.x - _x1, 2) + Math.pow(point.y - _y1, 2)));
      }
      else {
        minLength.push(99999);
      }
    });

    for (let value of minLength) {
      if (value != 99999) {
        this.data = Math.min(...minLength);
        break;
      }
      else
        this.data = -1;
    }


    // console.log(this.data);
  }

  getIntersectionPointOfTwoLines = (lineA, lineB) => {
    var x1 = lineA.x1;
    var y1 = lineA.y1;
    var x2 = lineA.x2;
    var y2 = lineA.y2;

    var x3 = lineB.x1;
    var y3 = lineB.y1;
    var x4 = lineB.x2;
    var y4 = lineB.y2;

    var uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    var uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    var intersectionX = x1 + (uA * (x2 - x1));
    var intersectionY = y1 + (uA * (y2 - y1));
    var p;

    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
      p = {
        x: intersectionX,
        y: intersectionY
      };
    }

    return p;
  }
}

class Car {
  constructor(ctx, driver) {
    this.ctx = ctx;
    this.x = 250;
    this.y = 530;
    this.width = 30;
    this.height = 15;
    this.steeringSensivity = 5;
    this.angle = 0;
    this.speed = 5;
    this.isCollusion = false;

    let centerX = this.x + this.width / 2;
    let centerY = this.y + this.height / 2;
    this.sensors = [];
    this.sensors.push(new Sensor(ctx, centerX, this.y, 100));
    this.sensors.push(new Sensor(ctx, centerX, centerY, 100));
    this.sensors.push(new Sensor(ctx, centerX, centerY, 100));


    if (driver instanceof NeuralNetwork) {
      
      var randomGaussian = 0;
      var rand = 0;

      for (var i = 0; i < 6; i += 1) {
        rand += Math.random();
      }

      randomGaussian = rand / 6;

      this.driver = driver.copy();
      this.driver.mutate(x => {
        if (Math.random(1) < 0.1) {
          let offset = randomGaussian * 0.5;
          let newx = x + offset;
          return newx;
        } else {
          return x;
        }
      });
    } else 
    {
      this.driver = new NeuralNetwork(4, 8, 2);
    }
    this.score = 0;
    this.fitness = 0;
  }

  copy = () => {
    return new Car(this.ctx, this.driver);
  }

  draw = () => {
    //---Draw car---
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    this.ctx.rotate(this.angle * Math.PI / 180);

    this.ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);

    this.ctx.fillStyle = "#000";
    this.ctx.fill();
    this.ctx.restore();
    //!---Draw car---

    //---Draw sensors and detect collusion---
    if(SHOW_SENSORS)
    {
      this.sensors[0].draw(this.angle * Math.PI / 180);
      this.sensors[1].draw((this.angle + 90) * Math.PI / 180);
      this.sensors[2].draw((this.angle - 90) * Math.PI / 180);
    }

    this.sensors.forEach((sensor) => sensor.update(this));

    this.sensors[0].detectCollusion(this.angle * Math.PI / 180);
    this.sensors[1].detectCollusion((this.angle + 90) * Math.PI / 180);
    this.sensors[2].detectCollusion((this.angle - 90) * Math.PI / 180);

    // console.log("front:"+this.sensors[0].data);
    // console.log("right:"+this.sensors[1].data);
    // console.log("left:"+this.sensors[2].data);


    //!---Draw sensors and detect collusion---
  }

  steerRight() {
    if (this.angle % 360 == 0)
      this.angle = 0;

    this.angle += this.steeringSensivity;
  }

  steerLeft() {
    if (this.angle == 0)
      this.angle = 360;

    this.angle -= 5;
  }

  forward() {
    this.x += this.speed * Math.cos(this.angle * Math.PI / 180);
    this.y += this.speed * Math.sin(this.angle * Math.PI / 180);
  }

  backward() {
    this.x -= this.speed * Math.cos(this.angle * Math.PI / 180);
    this.y -= this.speed * Math.sin(this.angle * Math.PI / 180);
  }

  drive() {
    var inputs = [];
    inputs[0] = this.sensors[0].data;
    inputs[1] = this.sensors[1].data;
    inputs[2] = this.sensors[2].data;
    inputs[3] = this.angle;

    let action = this.driver.predict(inputs);

    // if (action[0] > action[1] && action[0] > action[2]) {
    //   this.forward();
    // }
    // else if (action[1] > action[0] && action[1] > action[2]) {
    //   this.steerLeft();
    // }
    // else if (action[2] > action[0] && action[2] > action[1]) {
    //   this.steerRight();
    // }
    this.forward();
    if(action[0] > action[1])
    {
      this.steerRight();
    }
    else
    {
      this.steerLeft();
    }
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.canvas = React.createRef();
    window.addEventListener("keydown", this.keyDownHandler, false);
    window.addEventListener("keyup", this.keyUpHandler, false);
    this.keyD = false;
    this.keyW = false;
    this.keyS = false;
    this.keyA = false;
    this.fps = 60;
    this.tempMap = [];
    this.lineWidth = 5;
  }

  gameLoop = () => {
    var ctx = this.canvas.current.getContext("2d");

    ctx.clearRect(0, 0, 1000, 600);
    this.draw();
    this.cars.forEach(car => {
      if (this.detectCollusion(car)) {
        car.isCollusion = true;
      }
    });

    this.cars.forEach(car => {
      if(car.isCollusion == false)
      {
        car.drive();
        car.score++;
      }
    });

    //isFinish ?
    var filter = this.cars.filter(x=>x.isCollusion == true);
    if(filter.length == POPULATION)
      this.nextGeneration(this.cars);


    if (this.keyW) {
      // this.cars[0].forward();
    }
    if (this.keyA) {
      this.cars[0].steerLeft();
    }
    if (this.keyD) {
      this.cars[0].steerRight();
    }
    if (this.keyS) {
      this.cars[0].backward();
    }

  }

  componentDidMount() {
    var ctx = this.canvas.current.getContext("2d");
    this.cars = [];
    for (let i = 0; i < POPULATION; i++)
      this.cars.push(new Car(ctx));

    this.timer = setInterval(this.gameLoop, 1000 / this.fps);
    this.mouseDownLocation = { x: 0, y: 0 };
    this.mouseUpLocation = { x: 0, y: 0 };
    this.loadMap();
    // this.sensors = [];
  }

  keyDownHandler = (e) => {
    //D
    if (e.keyCode == 68) {
      this.keyD = true;
    }//A
    else if (e.keyCode == 65) {
      this.keyA = true;
    }//W
    else if (e.keyCode == 87) {
      this.keyW = true;
    }//S
    else if (e.keyCode == 83) {
      this.keyS = true;
    }//shift
    else if (e.keyCode == 16) {
      clearInterval(this.timer);
      this.fps += 60;
      if (this.fps >= 240)
        this.fps = 240;
      this.timer = setInterval(this.gameLoop, 1000 / this.fps);
    }//ctrl
    else if (e.keyCode == 17) {
      clearInterval(this.timer);
      this.fps -= 60;
      if (this.fps <= 0)
        this.fps = 60;
      this.timer = setInterval(this.gameLoop, 1000 / this.fps);
    }//space
    else if (e.keyCode == 32)
    {
      SHOW_SENSORS = !SHOW_SENSORS;
    }
  }

  keyUpHandler = (e) => {
    if (e.keyCode == 68) {
      this.keyD = false;
    }//A
    else if (e.keyCode == 65) {
      this.keyA = false;
    }//W
    else if (e.keyCode == 87) {
      this.keyW = false;
    }//S
    else if (e.keyCode == 83) {
      this.keyS = false;
    }
  }

  detectCollusion = (car) => {
    var checkCollusion = new Sensor(null, null, null, null);
    var top, bot, left, right;
    for (let element of Map) {
      top = checkCollusion.getIntersectionPointOfTwoLines({
        x1: car.x,
        y1: car.y,
        x2: car.x + car.width,
        y2: car.y
      },
        element);

      bot = checkCollusion.getIntersectionPointOfTwoLines({
        x1: car.x,
        y1: car.y + car.height,
        x2: car.x + car.width,
        y2: car.y + car.height
      }, element);

      left = checkCollusion.getIntersectionPointOfTwoLines({
        x1: car.x,
        y1: car.y,
        x2: car.x,
        y2: car.y + car.height
      }, element);

      right = checkCollusion.getIntersectionPointOfTwoLines({
        x1: car.x + car.width,
        y1: car.y,
        x2: car.x + car.width,
        y2: car.y + car.height
      }, element);

      if (top != null || bot != null || left != null || right != null) {
        return true;
      }
    }
    return false;
  }

  draw() {
    this.cars.forEach(car => car.isCollusion ? 1 : car.draw());
    this.drawMap();
  }

  drawMap = () => {
    var ctx = this.canvas.current.getContext("2d");
    Map.forEach((element) => {
      ctx.beginPath();
      ctx.moveTo(element.x1, element.y1);
      ctx.lineTo(element.x2, element.y2);
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
      ctx.lineWidth = 1;
    });

  }
  //--------------------GeneticAlgorithm-----------------------//

  nextGeneration = (cars) => {
    this.normalizeFitness(cars);
    // console.log("fit");
    this.cars = [];
    this.cars = this.generate(cars);
  }


  generate = (oldCars) => {
    let newCars = [];
    for (let i = 0; i < oldCars.length; i++) {
      // Select a car based on fitness
      let car = this.poolSelection(oldCars);
      newCars[i] = car;
    }
    return newCars;
  }

  normalizeFitness = (cars) => {
    // Make score exponentially better?
    for (let i = 0; i < cars.length; i++) {
      cars[i].score = Math.pow(cars[i].score, 2);
    }

    // Add up all the scores
    let sum = 0;
    for (let i = 0; i < cars.length; i++) {
      sum += cars[i].score;
    }
    // Divide by the sum
    for (let i = 0; i < cars.length; i++) {
      cars[i].fitness = cars[i].score / sum;
    }
    // console.log("fitness");
    // console.log(cars);
  }

  poolSelection = (cars) => {
    // Start at 0
    let index = 0;

    // Pick a random number between 0 and 1
    let r = Math.random(1);

    // Keep subtracting probabilities until you get less than zero
    // Higher probabilities will be more likely to be fixed since they will
    // subtract a larger number towards zero
    while (r > 0) {
      r -= cars[index].fitness;
      // And move on to the next
      index += 1;
    }

    // Go back one
    index -= 1;

    return cars[index].copy();
  }

  //!-------------------GeneticAlgorithm----------------------//




  //-------------------Create/Edit Map-------------------------//
  showEditButtons = (btnDraw, btnSave, btnCancel, btnReset) => {
    document.getElementById("btnDraw").style.display = btnDraw ? "" : "none";
    document.getElementById("btnSave").style.display = btnSave ? "" : "none";
    document.getElementById("btnCancel").style.display = btnCancel ? "" : "none";
    document.getElementById("btnReset").style.display = btnReset ? "" : "none";
  }

  bindDelegates = (bind) => {
    if (bind === true) {
      document.addEventListener("mousedown", this.mouseDownHandler, false);
      document.addEventListener("mouseup", this.mouseUpHandler, false);
    }
    else if (bind === false) {
      document.removeEventListener("mousedown", this.mouseDownHandler, false);
      document.removeEventListener("mouseup", this.mouseUpHandler, false);
    }
  }


  save = () => {
    this.showEditButtons(true, false, false, false);

    this.bindDelegates(false);

    this.timer = setInterval(this.gameLoop, 1000 / this.fps);

  }

  downloadMap = () => {
    this.saveText(JSON.stringify(Map), "map.json");
  }

  loadMap = () => {
    Map = loadedMap;
  }

  saveText = (text, filename) => {
    var a = document.createElement('a');
    a.setAttribute('href', 'data:text/plain;charset=utf-u,' + encodeURIComponent(text));
    a.setAttribute('download', filename);
    a.click();
  }

  cancel = () => {
    this.showEditButtons(true, false, false, false);

    this.bindDelegates(false);

    this.timer = setInterval(this.gameLoop, 1000 / this.fps);

    Map = [...this.tempMap];
    this.tempMap = [];
  }

  reset = () => {
    Map = [];
    this.tempMap = [];

    this.showEditButtons(true, false, false, false);

    this.bindDelegates(false);

    this.timer = setInterval(this.gameLoop, 1000 / this.fps);
  }

  editMap = () => {
    this.showEditButtons(false, true, true, true);

    clearInterval(this.timer);

    this.tempMap = [];
    this.tempMap = [...Map];

    this.bindDelegates(true);
  }

  mouseUpHandler = (e) => {
    document.removeEventListener("mousemove", this.mouseMoveHandler, false);
    var rect = this.canvas.current.getBoundingClientRect();

    var relativeX = e.clientX - rect.left;
    var relativeY = e.clientY - rect.top;

    this.mouseUpLocation = {
      x: relativeX,
      y: relativeY
    };

    var ctx = this.canvas.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(this.mouseDownLocation.x, this.mouseDownLocation.y);
    ctx.lineTo(this.mouseUpLocation.x, this.mouseUpLocation.y);
    ctx.lineWidth = this.lineWidth;
    ctx.stroke();
    ctx.lineWidth = 1;

    Map.push({
      x1: this.mouseDownLocation.x,
      y1: this.mouseDownLocation.y,
      x2: this.mouseUpLocation.x,
      y2: this.mouseUpLocation.y
    });
  }

  mouseDownHandler = (e) => {
    document.addEventListener("mousemove", this.mouseMoveHandler, false);
    var rect = this.canvas.current.getBoundingClientRect();

    var relativeX = e.clientX - rect.left;
    var relativeY = e.clientY - rect.top;

    this.mouseDownLocation = {
      x: relativeX,
      y: relativeY
    };
  }

  mouseMoveHandler = (e) => {
    var ctx = this.canvas.current.getContext("2d");
    var rect = this.canvas.current.getBoundingClientRect();
    var relativeX = e.clientX - rect.left;
    var relativeY = e.clientY - rect.top;

    ctx.clearRect(0, 0, 1000, 600);
    this.draw();

    ctx.beginPath();
    ctx.moveTo(this.mouseDownLocation.x, this.mouseDownLocation.y);
    ctx.lineTo(relativeX, relativeY);
    ctx.lineWidth = this.lineWidth;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  //-------------------!Create/Edit Map-------------------------//

  render() {
    return (
      <div id="app" className="App">
        <canvas
          id="can"
          ref={this.canvas}
          width={WIDTH}
          height={HEIGHT}
          style={{ marginTop: '24px', border: '1px solid #000' }}>
          Your browser does not support the canvas element.
        </canvas>
        <div>
          <button id="btnDraw" className="btn btn-primary" onClick={this.editMap}>Draw map</button>
          <button id="btnSave" className="btn btn-success" style={{ display: "none" }} onClick={this.save}>Save</button>
          <button id="btnReset" className="btn btn-danger" style={{ display: "none" }} onClick={this.reset}>Reset</button>
          <button id="btnCancel" className="btn btn-warning" style={{ display: "none" }} onClick={this.cancel}>Cancel</button>
        </div>
        <div>
          <button id="btnDownload" className="btn btn-success" onClick={this.downloadMap}>Download map</button>
          <button id="btnLoad" className="btn btn-primary" onClick={this.loadMap}>Load map</button>
        </div>
      </div>
    );
  }
}

export default App;
