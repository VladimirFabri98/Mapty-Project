'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const additionalOptionsDiv = document.querySelector('.additional__options');

const deleteAllButton = document.querySelector('.complete__delete--button');
const inputSortType = document.querySelector('.form__input--sort');

const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {

  date = new Date();
  id = (Date.now() + '').slice(-10);
  // marker = null;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    this.description = `${this.type === 'running' ? 'Running' : 'Cycling'} on 
    ${new Intl.DateTimeFormat('en-UK', { month: 'long' }).format(this.date)} ${this.date.getDate()}`;
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

  calcPace() {
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
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #workouts = [];
  #workoutMarkers = new Map();
  #map;
  #mapEvent;
  #editing = false;
  #workoutUnderEdit;
  #validForm;

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._formProcessing.bind(this));
    inputType.addEventListener('change', function () {
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
      inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    })
    containerWorkouts.addEventListener('click', this._clickHandler.bind(this));
    deleteAllButton.addEventListener('click', this._deleteAllWorkouts.bind(this));
    inputSortType.addEventListener('change', this._sortWorkouts.bind(this));

  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Unable to get your position!');
        }
      )
    }
  };

  _loadMap(position) {

    const { latitude, longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}z`);

    this.#map = L.map('map').setView([latitude, longitude], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    })

  };

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  };

  _hideform() {
    //Clear data
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    // Set default type to running
    // inputType.value = 'running';
    // if (inputCadence.closest('.form__row').classList.contains('form__row--hidden')) {
    //   inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    // }
    // inputElevation.closest('.form__row').classList.add('form__row--hidden');


    //Hide the form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(function () {
      form.style.display = 'grid';
    }, 1000);
  }

  _showAdditionalOptionsForm(active){
    if(this.#workouts.length > 0){
      if(active)
        additionalOptionsDiv.classList.remove('hidden');
    }

    if(!active)
      additionalOptionsDiv.classList.add('hidden');
  }

  _formProcessing(e) {
    e.preventDefault();
    !this.#editing ? this._newWorkout() : this._executeEdit(this.#workoutUnderEdit);
  }

  _formValidation(distance, duration, cadenceOrElevation) {
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    if (!validInputs(distance, duration, cadenceOrElevation) || !allPositive(distance, duration, cadenceOrElevation)) {
      this.#validForm = false;
      console.log(distance,duration,cadenceOrElevation);
      return alert('Inputs have to be a positive numbers');
    } else {
      this.#validForm = true;
    }
  }

  _newWorkout() {
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //Get form data
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    let cadenceOrElevation;
    type === 'running' ? cadenceOrElevation = Number(inputCadence.value) : cadenceOrElevation = Number(inputElevation.value);

    //Check validity of data
    this._formValidation(distance, duration, cadenceOrElevation);
    if (!this.#validForm) return;

    if (type === 'running') {
      workout = new Running([lat, lng], distance, duration, cadenceOrElevation);
    }

    else if (type === 'cycling') {
      workout = new Cycling([lat, lng], distance, duration, cadenceOrElevation);
    }

    this.#workouts.push(workout);

    //Render marker on the map
    this._renderWorkoutMarker(workout);

    //Render workout on the list
    this._renderWorkout(workout);

    //Show additional options
    this._showAdditionalOptionsForm(true);

    //Set local storage to all workouts
    this._setLocalStorage();

  };

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords).addTo(this.#map);

    marker.bindPopup(L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`
    }))
      .setPopupContent(`${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`)
      .openPopup();

    this.#workoutMarkers.set(workout.id, marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__actions">
            <button class="workout__button edit-button">
              <span class="workout__icon">🖋️</span>
            </button>
            <button class="workout__button delete-button">
              <span class="workout__icon">🗑️</span>
            </button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴'}</span>
            <span class="workout__value workout__distance">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value workout__duration">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value workout__pace">${Number(workout.pace).toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value workout__cadence">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `
    }

    else if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value workout__speed">${Number(workout.speed).toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value workout__elevation">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `
    }

    form.insertAdjacentHTML('afterend', html);
    this._hideform();
    
  }

  _clickHandler(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl)
      return;

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

    const clickedButton = e.target.closest('.workout__button');
    if (clickedButton) {
      clickedButton.classList.contains('edit-button') ? this._initializeEdit(workout) : this._deleteWorkout(workout);
      return;
    }

    this.#map.panTo(workout.coords, {
      animate: true,
      duration: 1
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;
    // console.log(Number(this.#workouts.at(1).pace).toFixed(1));

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    })
    this._showAdditionalOptionsForm(true);
  }

  _initializeEdit(workout) {
    this.#editing = true;
    this.#workoutUnderEdit = workout;

    const workoutsToBeHidden = [...document.querySelectorAll('.workout')];
    workoutsToBeHidden.forEach(element => {
      element.classList.toggle('hidden');
    });
    this._showAdditionalOptionsForm(false);
    this._setCorrectFormFields(workout.type);
    form.classList.remove('hidden');

    //CHECK WHAT IS THE TYPE OF AN OBJECT
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    workout.cadence ? inputCadence.value = workout.cadence : inputElevation.value = workout.elevationGain;
  }

  _executeEdit(workout) {
    const elementToBeEdited = this._findHTMLElementByDataID(workout);
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    let cadenceOrElevation;
    workout.type === 'running' ? cadenceOrElevation = Number(inputCadence.value) : cadenceOrElevation = Number(inputElevation.value);

    //Check validity of data
    this._formValidation(distance, duration, cadenceOrElevation);
    if (!this.#validForm) return;

    workout.distance = distance;
    workout.duration = duration;
    elementToBeEdited.querySelector('.workout__distance').textContent = workout.distance;
    elementToBeEdited.querySelector('.workout__duration').textContent = workout.duration;

    if (workout.type === 'running') {
      workout.cadence = cadenceOrElevation;
      workout.pace = (workout.duration / workout.distance).toFixed(1);
      elementToBeEdited.querySelector('.workout__cadence').textContent = workout.cadence;
      elementToBeEdited.querySelector('.workout__pace').textContent = workout.pace;

    }

    else if (workout.type === 'cycling') {
      workout.elevationGain = cadenceOrElevation;
      workout.speed = (workout.distance / workout.duration).toFixed(1);
      elementToBeEdited.querySelector('.workout__elevation').textContent = workout.elevationGain;
      elementToBeEdited.querySelector('.workout__speed').textContent = workout.speed;
    }

    this._setLocalStorage();

    const workoutsToBeHidden = [...document.querySelectorAll('.workout')];
    workoutsToBeHidden.forEach(element => {
      if (element.classList.contains('hidden')) element.classList.toggle('hidden');
    });

    this._showAdditionalOptionsForm(true);
    this._hideform();
    this.#editing = false;
    this.#workoutUnderEdit = null;
  }

  _deleteWorkout(workout) {
    const indexOfElementToBeRemoved = this.#workouts.findIndex(function (element) {
      return element.id === workout.id;
    })
    this.#workouts.splice(indexOfElementToBeRemoved, 1);
    this.#workoutMarkers.get(workout.id).remove();
    this.#workoutMarkers.delete(workout.id);
    this._findHTMLElementByDataID(workout).remove();
    this._setLocalStorage();

    if(this.#workouts.length === 0){
      this._showAdditionalOptionsForm(false);
    }
  }

  _deleteAllWorkouts(){
    // Clear workouts array
    this.#workouts = [];

    // Remove markers
    this.#workoutMarkers.values().forEach(value => {
      value.remove();
    })

    // Clear markers map
    this.#workoutMarkers.clear();

    // Get and remove all HTML workout elements
    const htmlWorkouts = [...document.querySelectorAll('.workout')];
    htmlWorkouts.forEach(element => {
      element.remove();
    })

    // Hide form for sorting and deleting
    this._showAdditionalOptionsForm(false);

    // Set local storage to an empty #workout array
    this._setLocalStorage();
  }

  _sortWorkouts(){
    if(inputSortType.value === 'distance-asc'){
      this.#workouts.sort((a,b)=>{
        return a.distance- b.distance;
        
      })
      // console.log(this.#workouts);
    }

    else if(inputSortType.value === 'distance-desc'){
      this.#workouts.sort((a,b)=>{
        return b.distance- a.distance;
      });
      // console.log(this.#workouts);
    }

    else if(inputSortType.value === 'duration-asc'){
      this.#workouts.sort( (a,b) => {
        return a.duration - b.duration;
      });
      // console.log(this.#workouts);
    }

    else if(inputSortType.value === 'duration-desc'){
      this.#workouts.sort( (a,b) => {
        return b.duration - a.duration;
      });
      // console.log(this.#workouts);
    }

    // workout HTML elements
    const elements = [...document.querySelectorAll('.workout')];
    const sortedElementsArr = [];
    for(let i = 0; i < this.#workouts.length; i++){
      for(let j = 0; j < elements.length; j ++){
        if(elements.at(j).dataset.id === this.#workouts.at(i).id){
          sortedElementsArr.push(elements.at(j));
          break;
        }
      }
    }
    // console.log(sortedElementsArr);

    sortedElementsArr.forEach(element => {
      containerWorkouts.appendChild(element);
    })
    
  }

  _findHTMLElementByDataID(workout) {
    return [...document.querySelectorAll(`[data-id="${workout.id}"]`)].at(0);
  }

  _setCorrectFormFields(type){
    if(type === 'running'){
      inputType.value = 'running';
      if(inputCadence.closest('.form__row').classList.contains('form__row--hidden'))
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')

      if(!inputElevation.closest('.form__row').classList.contains('form__row--hidden'))
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    }
    else if(type === 'cycling') {
      inputType.value = 'cycling';
      if(!inputCadence.closest('.form__row').classList.contains('form__row--hidden'))
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')

      if(inputElevation.closest('.form__row').classList.contains('form__row--hidden'))
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    }

    console.log(`Input type after the method: ${inputType.value}`);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

}


const app = new App();