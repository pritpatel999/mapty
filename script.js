'use strict';

// prettier-ignore
// console.log(test); // //we defined this variable in test.js file. we can access that variable in this file if this file is being called after test.js.
// let map, mapEvent;

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;
    constructor(coords, distance, duration){
        console.log(this.id);
        this.coords = coords;   // [lat,lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        this.description = `${this.type[0].toUpperCase()}${this.type.substring(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        // // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // // km/hr
        this.speed = this.distance / this.duration / 60;
        return this.speed;
    }
}

// const run1 = new Running([23.0719488, 72.6401024], 5, 20, 77);
// const cycling1 = new Cycling([23.0719488, 72.6401024], 10, 20, 660);
// console.log(run1,cycling1);


////////////////////////////////////////
// //application architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];
    constructor() {
        // //get user's position
        this._getPosition();

        // //get data from local storage
        this._getLocalStorage();

        // //attach event handler's
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        // //getCurrentPosition get 2 parameter, 1st parameter is a success function and 2nd parameter is a error function.
        if(navigator.geolocation){ // //we are checking because for some old browsers nvaigator.geolocation is not supported.
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
                alert('cound not get your position');
            });
        }
    }

    _loadMap(position) { // //this position will be added behind the scene automatically, we just have to call the function.
        console.log(position);
        // const latitude = position.coords.latitude;
        // const longitude = position.coords.longitude;
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        const coords = [latitude, longitude];
        // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
        console.log(this);
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // // second parameter which is 13 is a zoom level of map.
        // console.log(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        console.log(this);
        this.#map.on('click', this._showForm.bind(this));
        
        // //get data from local storage and display it on page load.
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work)
        });
    }

    _showForm(mapE) {
        console.log(this);
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        // //empty input
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }
    
    _newWorkout(e) {
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        e.preventDefault();
        const allPossitive = (...inputs) => inputs.every(inp => inp > 0);

        // //get data form form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat,lng} = this.#mapEvent.latlng;
        let workout;

        // //if activity running, create running object
        if(type === 'running') {
            const cadence = +inputCadence.value;
            // //check data is valid
            // if(!Number.isFinite(distance) || !Number.isFinite(duration) || !Number.isFinite(cadence)) {
            if(!validInput(distance, duration, cadence) || !allPossitive(distance, duration, cadence)) {
                return alert('Inputs have to be possitive numbers!');
            }
            workout = new Running([lat, lng], distance, duration, cadence);
        }
        
        // //if activity cycling, create cycling object
        if(type === 'cycling') {
            const elevation = +inputElevation.value;
            if(!validInput(distance, duration, elevation) || !allPossitive(distance, duration)) {
                return alert('Inputs have to be possitive numbers!');
            }
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        
        // //add new object to workout array
        this.#workouts.push(workout);
        console.log(workout);
        
        // //render workout on map as a marker
        this._renderWorkoutMarker(workout);
        // //render workout on list
        this._renderWorkout(workout);

        // //hide form + cleare input fields
        this._hideForm();

        // //set local storage to add workouts
        this._setLocalstorage();
    }

    _renderWorkoutMarker(workout) {
        // const {lat,lng} = this.#mapEvent.latlng;
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if(workout.type === 'running') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>`;
        }

        if(workout.type === 'cycling') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`;
        }

        html += `</li>`;
        form.insertAdjacentHTML('afterend',html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        console.log(workoutEl);
        
        if(!workoutEl) return;
        console.log(this.#workouts);
        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        console.log(workout);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        // //using the public interface.
        // workout.click();
    }

    _setLocalstorage() {
        // //localStorage is an API which browser provide us to store data in local storage.
        localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // //JSON.stringify is used to convert object into string.
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);
        if(!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
            // this._renderWorkoutMarker(work)
        });

    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();
// app._getPosition();
















