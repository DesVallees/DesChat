import * as THREE from "https://cdn.skypack.dev/three@0.133.1";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls.js";
import openSimplexNoise from 'https://cdn.skypack.dev/open-simplex-noise';

// Scene
let scene = new THREE.Scene();
// Camera
let camera = new THREE.PerspectiveCamera( 75, innerWidth/2 / innerHeight, 0.1, 1000 );
camera.position.set(1.5, -0.5, -0.005625*innerWidth+16.96875);
// Renderer
let renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize( innerWidth/2, innerHeight );
// Append our renderer to the webpage. Basically, this appends the `canvas` to our webpage.
document.body.appendChild( renderer.domElement );

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false

let sphereGeometry = new THREE.SphereGeometry(1.5, 100, 100);
sphereGeometry.positionData = [];
let v3 = new THREE.Vector3();
for (let i = 0; i < sphereGeometry.attributes.position.count; i++){
    v3.fromBufferAttribute(sphereGeometry.attributes.position, i);
    sphereGeometry.positionData.push(v3.clone());
}
let sphereMesh = new THREE.ShaderMaterial({
    uniforms: {      
        colorA: {type: 'vec3', value: new THREE.Vector3(0.5, 0.5, 0.5)},
    },
    vertexShader: document.getElementById('vertex').textContent,
    fragmentShader: document.getElementById('fragment').textContent,
});
let sphere = new THREE.Mesh(sphereGeometry, sphereMesh);
scene.add(sphere);

let noise = openSimplexNoise.makeNoise4D(Date.now());
let clock = new THREE.Clock();

window.addEventListener("resize", () => { 
    camera.aspect = innerWidth/2 / innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(innerWidth/2, innerHeight)
    camera.position.set(1.5, -0.5, -0.005625*innerWidth+16.96875);
});

renderer.setAnimationLoop( () => {
  let t = clock.getElapsedTime() / 1.;
    sphereGeometry.positionData.forEach((p, idx) => {
        let setNoise = noise(p.x, p.y, p.z, t * 1);
        v3.copy(p).addScaledVector(p, setNoise);
        sphereGeometry.attributes.position.setXYZ(idx, v3.x, v3.y, v3.z);
    })
    sphereGeometry.computeVertexNormals();
    sphereGeometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
})