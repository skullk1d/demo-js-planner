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
		var eventData = this.getEvent(id);
		if (!eventData) {
			return;
		}

		// NOTE: newData props must match eventData object format
		for (var prop in newData) {
			if (!eventData.hasOwnProperty(prop)) {
				console.warn(`${prop} is not a valid eventData property`);
				continue;
			}

			eventData[prop] = newData[prop];
		}

		this.emit('updateEvent', id);
	}

	getEvent(id) {
		var eventData = this.eventsData[id];
		if (!eventData) {
			return console.error(`Event ${id} does not exist`);
		}

		return eventData;
	}

	setNodes(id, nodeIds) {
		var eventData = this.eventsData[id];
		eventData.nodes = nodeIds;
	}
}

var calendarManager = new CalendarManager();
export default calendarManager; // singleton
