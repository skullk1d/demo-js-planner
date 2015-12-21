import { EventEmitter } from 'events';

class CalendarManager extends EventEmitter {
	constructor() {
		super();
		var self = this;

		// props
		this.eventsData = {}; // { raw data by ids }

		// get or init data
		this.eventsData = JSON.parse(localStorage.getItem('eventsData')) || this.eventsData;

		// setup events
		function writeData() {
			localStorage.setItem('eventsData', JSON.stringify(self.eventsData));
		}

		this.on('addEvent', writeData);
		this.on('deleteEvent', writeData);
		this.on('updateEvent', writeData);
	}

	addEvent(dateFrom, dateTo, description) {
		let id = new Date().getTime();

		this.eventsData[id] = {
			id: id,
			dateFrom: dateFrom,
			dateTo: dateTo,
			description: description
		};

		this.emit('addEvent', id);
	}

	removeEvent(id) {
		if (!this.getEvent(id)) {
			return;
		}

		var dateFrom = this.eventsData[id].dateFrom;
		delete this.eventsData[id];

		this.emit('removeEvent', id, dateFrom);
	}

	updateEvent(id, newData) {
		var event = this.getEvent(id);
		if (!event) {
			return;
		}

		// NOTE: newData props must match event object format
		for (var prop in newData) {
			if (!event[prop]) {
				console.warn(`${prop} is not a valid event property`);
				continue;
			}

			event[prop] = newData[prop];
		}

		this.emit('updateEvent', id);
	}

	getEvent(id) {
		var event = this.eventsData[id];
		if (!event) {
			return console.error(`Event ${id} does not exist`);
		}

		return event;
	}
}

var calendarManager = new CalendarManager();
export default calendarManager; // singleton
