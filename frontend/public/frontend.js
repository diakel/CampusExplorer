// sources: fetch documentation, chatGPT
let query = {
	"WHERE": { "GT": { "rooms_seats": 0 } },
	"OPTIONS": {
		"COLUMNS": [ "rooms_name", "rooms_fullname", "rooms_seats", "rooms_shortname", "rooms_number", "rooms_address", "rooms_lat", "rooms_lon" ]
	}
};

let requestOptions = {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json; charset=utf-8'
	},
	body: JSON.stringify(query)
};

let buildingCoordinates = [];
let roomData = [];

fetch('http://localhost:4321/query', requestOptions)
	.then(response => {
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	})
	.then(data => {
		const roomList = document.getElementById('roomList');
		for (let room of data.result) {
			let listItem = document.createElement('div');
			if ('rooms_name' in room) {
				listItem.textContent = room['rooms_name'];
				roomData.push(room);
				listItem.classList.add('roomItem');
			}

			listItem.addEventListener('click', function() {
				showRoomDetails(room);
				toggleSelected(room, listItem);
			});

			let coordinates = { lat: room["rooms_lat"], lng: room["rooms_lon"], building: room["rooms_fullname"] };
			if (!buildingCoordinates.some(coord => coord.lat === room["rooms_lat"] && coord.lng === room["rooms_lon"])) {
				buildingCoordinates.push(coordinates);
			}

			roomList.appendChild(listItem);
		}
		initMap().then(r => {
			console.log("yay");
		});
	})
	.catch(error => {
		console.error('There was a problem with the fetch operation:', error);
	});

function showRoomDetails(room) {
	const roomInfo = document.getElementById('roomInfo');
	roomInfo.innerHTML = `<h3>${room['rooms_name']}</h3>
                             <p>Full Name: ${room['rooms_fullname']}</p>
                             <p>Short Name: ${room['rooms_shortname']}</p>
							 <p>Number: ${room['rooms_number']}</p>
							 <p>Address: ${room['rooms_address']}</p>
							 <p>Seats: ${room['rooms_seats']}</p>`;
	roomInfo.style.display = 'block';
}

// source: chatGPT, https://stackoverflow.com/a/53177636
function toggleSelected(room, roomItem) {
	const selectedRoomsList = document.getElementById('selectedRoomsList');
	let selectedRooms = Array.from(selectedRoomsList.children);

	let roomIndex = selectedRooms.findIndex(selectedRoom => selectedRoom.textContent === room['rooms_name']);

	if (roomIndex === -1) {
		if (selectedRooms.length >= 5) {
			alert("You can select at most 5 rooms.");
			return;
		}
		let listItem = document.createElement('li');
		listItem.textContent = room['rooms_name'];
		roomItem.classList.add('active');
		selectedRoomsList.appendChild(listItem);
		document.getElementById('selectedRooms').style.display = "block";
	} else {
		roomItem.classList.remove('active');
		selectedRoomsList.removeChild(selectedRooms[roomIndex]);
	}

	calculateWalkingTime(selectedRoomsList.children);
}

// partially implemented using chatGPT

function calculateWalkingTime(selectedRooms) {
	const walkingSpeed = 83.33;
	const walkingTimeDiv = document.getElementById('walkingTime');
	walkingTimeDiv.innerHTML = "";

	for (let i = 0; i < selectedRooms.length - 1; i++) {
		for (let j = i + 1; j < selectedRooms.length; j++) {
			let room1 = roomData.find(room => room['rooms_name'] === selectedRooms[i].textContent);
			let room2 = roomData.find(room => room['rooms_name'] === selectedRooms[j].textContent);

			let distance = calculateDistance(room1['rooms_lat'], room1['rooms_lon'], room2['rooms_lat'], room2['rooms_lon']);
			let walkingTime = distance / walkingSpeed;

			if (walkingTime.toFixed(2) === "0.00") {
				walkingTimeDiv.innerHTML += `<p>Walking time between ${room1['rooms_name']} and ${room2['rooms_name']} is less than a minute</p>`;
			} else {
				walkingTimeDiv.innerHTML += `<p>Walking time between ${room1['rooms_name']} and ${room2['rooms_name']}: ${walkingTime.toFixed(2)} minutes</p>`;
			}
			// console.log(`Walking time between ${room1['rooms_name']} and ${room2['rooms_name']}: ${walkingTime.toFixed(2)} minutes`);
		}
	}
}

// Function to calculate distance between two latitude-longitude pairs using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371e3;
	const φ1 = lat1 * Math.PI / 180;
	const φ2 = lat2 * Math.PI / 180;
	const Δφ = (lat2 - lat1) * Math.PI / 180;
	const Δλ = (lon2 - lon1) * Math.PI / 180;

	const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) *
		Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c; // Distance in meters
}

let map;

// sources: https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers#set_descriptive_text
// https://developers.google.com/maps/documentation/javascript/adding-a-google-map
async function initMap() {
	console.log(buildingCoordinates.length);
	const position = {lat: buildingCoordinates[10].lat, lng: buildingCoordinates[10].lng} ;
	//@ts-ignore
	const { Map, InfoWindow } = await google.maps.importLibrary("maps");
	const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

	map = new Map(document.getElementById("map"), {
		zoom: 15,
		center: position,
		mapId: "DEMO_MAP_ID",
	});

	const infoWindow = new InfoWindow();

	buildingCoordinates.forEach(function(location) {
		let marker = new AdvancedMarkerElement({
			position: {lat: location.lat, lng: location.lng},
			map: map,
			title: location.building,
		});

		marker.addListener("click", ({ domEvent, latLng }) => {
			const { target } = domEvent;
			infoWindow.close();
			infoWindow.setContent(marker.title);
			infoWindow.open(marker.map, marker);
		});

	});
}
