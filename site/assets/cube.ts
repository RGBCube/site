"use strict";

class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static zero() {
    return new Vec3(0, 0, 0);
  }

  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }

  scale(factor: number) {
    this.x *= factor;
    this.y *= factor;
    this.z *= factor;

    return this;
  }

  normalize() {
    const length = this.length();

    if (length != 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }

    return this;
  }

  static sub(v: Vec3, t: Vec3) {
    return new Vec3(
      v.x - t.x,
      v.y - t.y,
      v.z - t.z,
    );
  }

  static sum(v: Vec3, t: Vec3) {
    return new Vec3(
      v.x + t.x,
      v.y + t.y,
      v.z + t.z,
    );
  }
}

class Quat {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x: number, y: number, z: number, w: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static fromAxis(axis: Vec3) {
    const angle = axis.length();

    axis.normalize();

    const half = angle / 2;

    const sinHalf = Math.sin(half);
    const cosHalf = Math.cos(half);

    const x = axis.x * sinHalf;
    const y = axis.y * sinHalf;
    const z = axis.z * sinHalf;
    const w = cosHalf;

    return new Quat(x, y, z, w);
  }

  static mul(q: Quat, r: Quat) {
    return new Quat(
      q.w * r.x + q.x * r.w + q.y * r.z - q.z * r.y,
      q.w * r.y - q.x * r.z + q.y * r.w + q.z * r.x,
      q.w * r.z + q.x * r.y - q.y * r.x + q.z * r.w,
      q.w * r.w - q.x * r.x - q.y * r.y - q.z * r.z,
    );
  }
}

const friction = 3;
const sensitivity = 0.01;

const mouse = {
  down: false,
  lastMove: -10000,
  previous: Vec3.zero(),
};

const orient = {
  __cube: document.querySelector(".cube"),
  __value: new Quat(0, 0, 0, 1),

  set(value: Quat) {
    this.__value = value;

    const q = this.__value;

    // @ts-ignore: Style will never be null.
    this.__cube.style.transform = `rotate3d(${q.x}, ${q.y}, ${q.z}, ${
      Math.acos(q.w) * 2
    }rad)`;
  },

  get(): Quat {
    return this.__value;
  },
};

let velocity = Vec3.zero();
let impulseThisFrame = Vec3.zero();

const handleUp = () => {
  mouse.down = false;
};

document.addEventListener("mouseup", handleUp);
document.addEventListener("touchend", handleUp);

const handleDown = (event: MouseEvent | TouchEvent) => {
  // Disables link dragging that occurs when spinning.
  event.preventDefault();

  mouse.down = true;

  velocity = Vec3.zero();
};

document.addEventListener("mousedown", handleDown);
document.addEventListener("touchstart", handleDown);

const handleMove = (event: MouseEvent) => {
  // Disables scrolling.
  event.preventDefault();

  if (!mouse.down) return;

  const newMouse = new Vec3(event.clientX, event.clientY, 0);

  const timeDelta = (globalThis.performance.now() - mouse.lastMove) / 1000;

  if (timeDelta > 0.1) {
    // This is a fresh scroll.
    mouse.previous = newMouse;
  }

  const delta = Vec3.sub(newMouse, mouse.previous);

  mouse.previous = newMouse;
  mouse.lastMove = globalThis.performance.now();

  const axis = new Vec3(-delta.y, delta.x, 0)
    .normalize()
    .scale(delta.length() * sensitivity);

  impulseThisFrame = Vec3.sum(impulseThisFrame, axis);

  const rotation = Quat.fromAxis(axis);

  orient.set(Quat.mul(rotation, orient.get()));
};

document.addEventListener("mousemove", handleMove);
document.addEventListener("touchmove", (event) => {
  const delta = event.changedTouches[0];

  // @ts-ignore: We are overriding this for it to work as a MouseEvent.
  event.clientX = delta.clientX;
  // @ts-ignore:
  event.clientY = delta.clientY;

  handleMove(event as object as MouseEvent);
});

let lastUpdate = 0;

const updateFrame = (timestamp: number) => {
  if (lastUpdate == 0) lastUpdate = timestamp;

  const delta = (timestamp - lastUpdate) / 1000;
  lastUpdate = timestamp;

  if (mouse.down) {
    velocity = impulseThisFrame.scale(1 / delta);
    impulseThisFrame = Vec3.zero();
  } else {
    const decay = Math.exp(-delta * friction);

    const effectiveDelta = friction > 0 ? (1 - decay) / friction : delta;

    let theta = effectiveDelta * velocity.length();

    velocity.x *= decay;
    velocity.y *= decay;
    velocity.z *= decay;

    if (friction > 0 && velocity.length() < 0.00001) {
      theta += velocity.length() / friction;

      velocity.x = 0;
      velocity.y = 0;
      velocity.z = 0;
    }

    if (globalThis.performance.now() - mouse.lastMove > 10000) {
      const impulse = new Vec3(0.7, 0.7, -0.7);
      velocity = Vec3.sum(impulse.scale(effectiveDelta * 3), velocity);
    }

    const axis = new Vec3(velocity.x, velocity.y, velocity.z)
      .normalize()
      .scale(theta);

    const rotation = Quat.fromAxis(axis);

    orient.set(Quat.mul(rotation, orient.get()));
  }

  requestAnimationFrame(updateFrame);
};

updateFrame(0);
