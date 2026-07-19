import * as THREE from 'three';

import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

document.getElementById('user-name').textContent = sessionStorage.getItem('user_name') || '';

const API_KEY = "AIzaSyCUYhPs7fjgzZuRmeNF8iwtdWPUv1dP_PU";
const SHEET_ID = "1b4BynefFo-ik7Qfa0UdhgcuXdSTB8kE-ReIlnLV8xzI";
const RANGE = "'Data Template'";

async function loadData() {

	const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
	const res = await fetch(url);
	const json = await res.json();

	const [headers, ...rows] = json.values;

	return rows.map((row, i) => {

		const obj = {};
		headers.forEach((h, idx) => obj[h] = row[idx]);

		return {
			id: i,
			name: obj["Name"] || "",
			photo: obj["Photo"] || "",
			age: obj["Age"] || "",
			country: obj["Country"] || "",
			interest: obj["Interest"] || "",
			netWorth: parseFloat((obj["Net Worth"] || "0").replace(/[^0-9.]/g, "")),
		};

	});

}

function getColor(netWorth) {

	if (netWorth < 100000) return 'rgba(239,48,34,0.55)';
	if (netWorth < 200000) return 'rgba(253,202,53,0.55)';
	return 'rgba(58,159,72,0.55)';

}

// SCENE SETUP

let camera, scene, renderer;
let controls;

const objects = [];
const targets = {table: [], sphere: [], helix: [], grid: []};

let people = [];

loadData().then((data) => {

	people = data;
	init();
	animate();

}).catch((err) => {

	console.error('Failed to load data from Google Sheets:', err);

});

function init() {

	camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 3000;

	scene = new THREE.Scene();

	// tile layout

	for (let i = 0; i < people.length; i++) {

		const person = people[i];

		const element = document.createElement('div');
		element.className = 'element';
		element.style.backgroundColor = getColor(person.netWorth);

		const country = document.createElement('div');
		country.className = 'country';
		country.textContent = person.country;
		element.appendChild(country);

		const age = document.createElement('div');
		age.className = 'age';
		age.textContent = person.age;
		element.appendChild(age);

		const photo = document.createElement('img');
		photo.className = 'photo';
		photo.src = person.photo;
		photo.onerror = () => {photo.style.display = 'none';};
		element.appendChild(photo);

		const name = document.createElement('div');
		name.className = 'name';
		name.textContent = person.name;
		element.appendChild(name);

		const interest = document.createElement('div');
		interest.className = 'interest';
		interest.textContent = person.interest;
		element.appendChild(interest);

		const objectCSS = new CSS3DObject(element);
		objectCSS.position.x = Math.random() * 4000 - 2000;
		objectCSS.position.y = Math.random() * 4000 - 2000;
		objectCSS.position.z = Math.random() * 4000 - 2000;
		scene.add(objectCSS);

		objects.push(objectCSS);

	}

	// TABLE layout

	const COLS = 20;
	const ROWS = 10;

	for (let i = 0; i < objects.length; i++) {

		const col = i % COLS;
		const row = Math.floor(i / COLS);

		const object = new THREE.Object3D();
		object.position.x = (col * 140) - ((COLS - 1) * 140) / 2;
		object.position.y = -(row * 180) + ((ROWS - 1) * 180) / 2;

		targets.table.push(object);

	}

	// SPHERE layout

	const vector = new THREE.Vector3();

	for (let i = 0, l = objects.length; i < l; i++) {

		const phi = Math.acos(-1 + (2 * i) / l);
		const theta = Math.sqrt(l * Math.PI) * phi;

		const object = new THREE.Object3D();

		object.position.setFromSphericalCoords(800, phi, theta);

		vector.copy(object.position).multiplyScalar(2);

		object.lookAt(vector);

		targets.sphere.push(object);

	}

	// DOUBLE HELIX layout

	for (let i = 0, l = objects.length; i < l; i++) {

		const strand = i % 2;
		const idx = Math.floor(i / 2);

		const theta = idx * 0.12 + (strand * Math.PI);
		const y = -(idx * 26) + 450;

		const object = new THREE.Object3D();

		object.position.setFromCylindricalCoords(1100, theta, y);

		vector.x = object.position.x * 2;
		vector.y = object.position.y;
		vector.z = object.position.z * 2;

		object.lookAt(vector);

		targets.helix.push(object);

	}

	// GRID layout

	const GRID_X = 5;
	const GRID_Y = 4;

	for (let i = 0; i < objects.length; i++) {

		const object = new THREE.Object3D();

		object.position.x = ((i % GRID_X) * 400) - ((GRID_X - 1) * 400) / 2;
		object.position.y = (-(Math.floor(i / GRID_X) % GRID_Y) * 400) + ((GRID_Y - 1) * 400) / 2;
		object.position.z = (Math.floor(i / (GRID_X * GRID_Y))) * 1000 - 4500;

		targets.grid.push(object);

	}

	// renderer / controls / buttons

	renderer = new CSS3DRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.getElementById('container').appendChild(renderer.domElement);

	controls = new TrackballControls(camera, renderer.domElement);
	controls.minDistance = 500;
	controls.maxDistance = 6000;
	controls.addEventListener('change', render);

	const buttonTable = document.getElementById('table');
	buttonTable.addEventListener('click', function () {

		transform(targets.table, 2000);

	});

	const buttonSphere = document.getElementById('sphere');
	buttonSphere.addEventListener('click', function () {

		transform(targets.sphere, 2000);

	});

	const buttonHelix = document.getElementById('helix');
	buttonHelix.addEventListener('click', function () {

		transform(targets.helix, 2000);

	});

	const buttonGrid = document.getElementById('grid');
	buttonGrid.addEventListener('click', function () {

		transform(targets.grid, 2000);

	});

	transform(targets.table, 2000);

	window.addEventListener('resize', onWindowResize);

}

function transform(targets, duration) {

	TWEEN.removeAll();

	for (let i = 0; i < objects.length; i++) {

		const object = objects[i];
		const target = targets[i];

		new TWEEN.Tween(object.position)
			.to({x: target.position.x, y: target.position.y, z: target.position.z}, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

		new TWEEN.Tween(object.rotation)
			.to({x: target.rotation.x, y: target.rotation.y, z: target.rotation.z}, Math.random() * duration + duration)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();

	}

	new TWEEN.Tween(this)
		.to({}, duration * 2)
		.onUpdate(render)
		.start();

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

	render();

}

function animate() {

	requestAnimationFrame(animate);

	TWEEN.update();

	controls.update();

}

function render() {

	renderer.render(scene, camera);

}