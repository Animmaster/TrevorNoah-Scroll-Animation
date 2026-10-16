import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { vertexShader, fragmentShader } from "./shaders.js";

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

const container = document.querySelector(".hero-img");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const canvas = renderer.domElement;
canvas.classList.add("hero-canvas");
container.appendChild(canvas);

const uniforms = {
  uTexture: { value: null },
  uImageSize: { value: new THREE.Vector2(1, 1) },
  uPlaneSize: { value: new THREE.Vector2(1, 1) },
  uPad: { value: new THREE.Vector2(0.25, 0.25) },
  uProgress: { value: 0 },
};

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  transparent: true,
});
scene.add(new THREE.Mesh(geometry, material));

gsap.ticker.add(() => renderer.render(scene, camera));

new THREE.TextureLoader().load("/hero-img.jpg", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  uniforms.uTexture.value = texture;
  uniforms.uImageSize.value.set(texture.image.width, texture.image.height);
});

function resize() {
  const rect = container.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  renderer.setSize(rect.width * 2, rect.height * 2, false);
  uniforms.uPlaneSize.value.set(rect.width, rect.height);
}
window.addEventListener("resize", resize);
resize();

ScrollTrigger.create({
  trigger: ".hero",
  start: "top top",
  end: "+=85%",
  scrub: true,
  onUpdate: (self) => (uniforms.uProgress.value = self.progress),
});
